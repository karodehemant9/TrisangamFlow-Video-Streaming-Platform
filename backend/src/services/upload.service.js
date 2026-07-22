const path = require("path");
const { v4: uuid } = require("uuid");

const s3Ops = require("../storage/s3.operations");
const uploadRepository = require("../repositories/upload.repository");
const videoRepository = require("../repositories/video.repository");
const { calculateChunkConfig } = require("../utils/chunk");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { BUCKET, ALLOWED_MIME_TYPES } = require("../config/constants");

/**
 * Generates a storage-safe object key.
 * Format: userId/uuid.extension
 * Never includes the original filename.
 */
function generateObjectKey(userId, originalFilename) {

    const ext = path.extname(originalFilename).toLowerCase() || ".mp4";

    return `${userId}/${uuid()}${ext}`;

}

/**
 * Initiates a multipart upload.
 *
 * 1. Validates mime type
 * 2. Generates a storage-safe object key
 * 3. Calculates optimal chunk size
 * 4. Creates a multipart upload on MinIO → gets real UploadId
 * 5. Generates presigned URLs for each part
 * 6. Saves the upload session to SQL Server
 * 7. Returns everything the browser needs to start uploading chunks
 */
async function initiateUpload({ userId, fileName, mimeType, totalSize }) {

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw AppError.badRequest(`Unsupported file type: ${mimeType}`);
    }

    const objectKey = generateObjectKey(userId, fileName);

    const { chunkSize, totalParts } = calculateChunkConfig(totalSize);

    // Create multipart upload on MinIO — this returns the real UploadId
    const { uploadId } = await s3Ops.createMultipartUpload(
        BUCKET,
        objectKey,
        mimeType
    );

    // Generate presigned URLs for every part
    const presignedUrls = await s3Ops.generatePresignedUploadUrls(
        BUCKET,
        objectKey,
        uploadId,
        totalParts
    );

    // Save upload session to database
    await uploadRepository.create({
        userId,
        uploadId,
        objectKey,
        originalFilename: fileName,
        mimeType,
        totalSize,
        chunkSize,
        totalParts
    });

    logger.info({
        message: "Upload initiated",
        uploadId,
        objectKey,
        totalParts,
        chunkSize,
        userId
    });

    return {
        uploadId,
        objectKey,
        chunkSize,
        totalParts,
        presignedUrls
    };

}

/**
 * Completes a multipart upload.
 *
 * 1. Looks up session and verifies ownership
 * 2. Calls CompleteMultipartUpload on MinIO
 * 3. Creates a video record in the database
 * 4. Links the upload session to the video
 * 5. Returns the video ID
 */
async function completeUpload({ userId, uploadId, parts, title, description }) {

    const session = await uploadRepository.findByUploadIdAndUser(
        uploadId,
        userId
    );

    if (!session) {
        throw AppError.notFound("Upload session not found");
    }

    if (session.status !== "INITIATED") {
        throw AppError.conflict(
            `Upload session is already ${session.status.toLowerCase()}`
        );
    }

    // Build parts array in S3 format
    const s3Parts = parts.map(p => ({
        PartNumber: p.partNumber,
        ETag: p.etag
    })).sort((a, b) => a.PartNumber - b.PartNumber);

    // Complete the multipart upload on MinIO
    await s3Ops.completeMultipartUpload(
        BUCKET,
        session.object_key,
        uploadId,
        s3Parts
    );

    // Determine the video title
    const videoTitle = title
        || path.basename(
            session.original_filename,
            path.extname(session.original_filename)
        );

    // Create the video record
    const videoId = await videoRepository.create({
        userId,
        title: videoTitle,
        originalFilename: session.original_filename,
        storageKey: session.object_key,
        fileSize: session.total_size,
        status: "UPLOADED"
    });

    // Link upload session to video
    await uploadRepository.updateCompleted(session.id, videoId);

    // Enqueue transcoding job
    const { videoQueue } = require("../config/queue");
    const jobRepository = require("../repositories/job.repository");

    const sqlJobId = await jobRepository.create({
        videoId,
        jobType: "TRANSCODE_HLS"
    });

    await videoQueue.add(
        "transcode",
        {
            videoId,
            sqlJobId,
            storageKey: session.object_key,
            originalFilename: session.original_filename
        },
        {
            jobId: sqlJobId // Use SQL ID as BullMQ ID for deduplication/tracking
        }
    );

    logger.info({
        message: "Upload completed and job enqueued",
        uploadId,
        videoId,
        sqlJobId,
        userId
    });

    return {
        videoId,
        status: "PROCESSING"
    };

}

/**
 * Aborts a multipart upload.
 *
 * 1. Looks up session and verifies ownership
 * 2. Calls AbortMultipartUpload on MinIO to clean up parts
 * 3. Updates session status to ABORTED
 */
async function abortUpload({ userId, uploadId }) {

    const session = await uploadRepository.findByUploadIdAndUser(
        uploadId,
        userId
    );

    if (!session) {
        throw AppError.notFound("Upload session not found");
    }

    if (session.status !== "INITIATED") {
        throw AppError.conflict(
            `Upload session is already ${session.status.toLowerCase()}`
        );
    }

    await s3Ops.abortMultipartUpload(
        BUCKET,
        session.object_key,
        uploadId
    );

    await uploadRepository.updateStatus(session.id, "ABORTED");

    logger.info({
        message: "Upload aborted",
        uploadId,
        userId
    });

}

/**
 * Gets the status of an upload session.
 *
 * Queries both the database (for session metadata) and MinIO
 * (for which parts have been uploaded). This enables the browser
 * to resume an interrupted upload by skipping already-uploaded parts.
 */
async function getUploadStatus({ userId, uploadId }) {

    const session = await uploadRepository.findByUploadIdAndUser(
        uploadId,
        userId
    );

    if (!session) {
        throw AppError.notFound("Upload session not found");
    }

    let uploadedParts = [];
    let presignedUrls = [];

    // Only query MinIO for active uploads
    if (session.status === "INITIATED") {
        try {
            uploadedParts = await s3Ops.listUploadedParts(
                BUCKET,
                session.object_key,
                uploadId
            );
            
            // Generate fresh presigned URLs for resume operations
            presignedUrls = await s3Ops.generatePresignedUploadUrls(
                BUCKET,
                session.object_key,
                uploadId,
                session.total_parts
            );
        } catch (err) {
            // If MinIO can't find the upload, it may have expired
            logger.warn({
                message: "Failed to list parts or generate URLs from MinIO",
                uploadId,
                error: err.message
            });
        }
    }

    return {
        uploadId: session.upload_id,
        objectKey: session.object_key,
        fileName: session.original_filename,
        mimeType: session.mime_type,
        totalSize: session.total_size,
        chunkSize: session.chunk_size,
        totalParts: session.total_parts,
        status: session.status,
        videoId: session.video_id,
        createdAt: session.created_at,
        completedAt: session.completed_at,
        uploadedParts,
        presignedUrls
    };

}

module.exports = {
    initiateUpload,
    completeUpload,
    abortUpload,
    getUploadStatus
};