const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const { pipeline } = require("stream/promises");

const {
    CreateMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    ListPartsCommand,
    UploadPartCommand,
    GetObjectCommand,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = require("../config/s3");
const logger = require("../utils/logger");

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Initiates a multipart upload on S3/MinIO.
 * Returns the UploadId assigned by the storage backend.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} contentType
 * @returns {Promise<{ uploadId: string }>}
 */
async function createMultipartUpload(bucket, key, contentType) {

    const command = new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
    });

    const response = await s3.send(command);

    logger.info({
        message: "Multipart upload created",
        uploadId: response.UploadId,
        key
    });

    return {
        uploadId: response.UploadId
    };

}

/**
 * Generates presigned URLs for each part of a multipart upload.
 * The browser will PUT chunk data directly to these URLs.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 * @param {number} totalParts
 * @returns {Promise<Array<{ partNumber: number, url: string }>>}
 */
async function generatePresignedUploadUrls(bucket, key, uploadId, totalParts) {

    const urls = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {

        const command = new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber
        });

        const url = await getSignedUrl(s3, command, {
            expiresIn: PRESIGNED_URL_EXPIRY
        });

        urls.push({
            partNumber,
            url
        });

    }

    logger.info({
        message: "Presigned URLs generated",
        uploadId,
        count: totalParts
    });

    return urls;

}

/**
 * Completes a multipart upload by assembling all parts.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 * @param {Array<{ PartNumber: number, ETag: string }>} parts
 * @returns {Promise<{ location: string, etag: string }>}
 */
async function completeMultipartUpload(bucket, key, uploadId, parts) {

    const sortedParts = [...parts].sort(
        (a, b) => a.PartNumber - b.PartNumber
    );

    const command = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: sortedParts
        }
    });

    const response = await s3.send(command);

    logger.info({
        message: "Multipart upload completed",
        uploadId,
        location: response.Location
    });

    return {
        location: response.Location || "",
        etag: response.ETag || ""
    };

}

/**
 * Aborts a multipart upload and cleans up uploaded parts.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 * @returns {Promise<void>}
 */
async function abortMultipartUpload(bucket, key, uploadId) {

    const command = new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId
    });

    await s3.send(command);

    logger.info({
        message: "Multipart upload aborted",
        uploadId,
        key
    });

}

/**
 * Lists all parts that have been uploaded for a multipart upload.
 * Used for resume functionality — browser can check which parts
 * are already uploaded and skip them.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} uploadId
 * @returns {Promise<Array<{ partNumber: number, etag: string, size: number }>>}
 */
async function listUploadedParts(bucket, key, uploadId) {

    const allParts = [];
    let partNumberMarker;

    // ListParts is paginated (max 1000 per response)
    do {

        const command = new ListPartsCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: partNumberMarker
        });

        const response = await s3.send(command);

        if (response.Parts) {
            for (const part of response.Parts) {
                allParts.push({
                    partNumber: part.PartNumber,
                    etag: part.ETag,
                    size: part.Size
                });
            }
        }

        partNumberMarker = response.IsTruncated
            ? response.NextPartNumberMarker
            : undefined;

    } while (partNumberMarker);

    return allParts;

}

/**
 * Downloads an object from S3 to the local filesystem.
 *
 * @param {string} bucket
 * @param {string} key
 * @param {string} destinationPath
 */
async function downloadObject(bucket, key, destinationPath) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    const response = await s3.send(command);
    
    // Ensure the directory exists
    await fsp.mkdir(path.dirname(destinationPath), { recursive: true });

    // Stream the body to a local file
    await pipeline(response.Body, fs.createWriteStream(destinationPath));

    logger.info({
        message: "Object downloaded",
        key,
        destinationPath
    });
}

/**
 * Uploads all files in a local directory to S3.
 *
 * @param {string} bucket
 * @param {string} folderPrefix (e.g., 'userId/videoId/hls/')
 * @param {string} localDir
 */
async function uploadFolder(bucket, folderPrefix, localDir) {
    const files = await fsp.readdir(localDir, { withFileTypes: true });

    for (const file of files) {
        if (file.isDirectory()) {
            // Recursively upload subdirectories
            await uploadFolder(
                bucket, 
                path.join(folderPrefix, file.name).replace(/\\/g, '/'), 
                path.join(localDir, file.name)
            );
        } else {
            const localFilePath = path.join(localDir, file.name);
            const objectKey = path.join(folderPrefix, file.name).replace(/\\/g, '/'); // Normalize slashes for S3

            let contentType = "application/octet-stream";
            if (file.name.endsWith(".m3u8")) contentType = "application/vnd.apple.mpegurl";
            if (file.name.endsWith(".ts")) contentType = "video/MP2T";

            const fileStream = fs.createReadStream(localFilePath);

            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: objectKey,
                Body: fileStream,
                ContentType: contentType
            });

            await s3.send(command);
            
            logger.debug(`Uploaded ${file.name} to ${objectKey}`);
        }
    }

    logger.info({
        message: "Folder uploaded successfully",
        folderPrefix,
        localDir
    });
}

/**
 * Deletes a folder (prefix) and all its objects from S3.
 *
 * @param {string} bucket
 * @param {string} folderPrefix
 */
async function deleteFolder(bucket, folderPrefix) {
    let isTruncated = true;
    let continuationToken = undefined;
    
    while (isTruncated) {
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: folderPrefix,
            ContinuationToken: continuationToken
        });
        
        const listResponse = await s3.send(listCommand);
        
        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            break;
        }
        
        const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: listResponse.Contents.map(c => ({ Key: c.Key })),
                Quiet: true
            }
        });
        
        await s3.send(deleteCommand);
        
        isTruncated = listResponse.IsTruncated;
        continuationToken = listResponse.NextContinuationToken;
    }
    
    logger.info({
        message: "Folder deleted successfully",
        bucket,
        folderPrefix
    });
}

/**
 * Uploads a single file to S3.
 *
 * @param {string} bucket
 * @param {string} objectKey
 * @param {string} localFilePath
 * @param {string} contentType
 */
async function uploadFile(bucket, objectKey, localFilePath, contentType = "application/octet-stream") {
    const fileStream = fs.createReadStream(localFilePath);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: fileStream,
        ContentType: contentType
    });

    await s3.send(command);
    
    logger.info({
        message: "File uploaded successfully",
        bucket,
        objectKey
    });
}

module.exports = {
    createMultipartUpload,
    generatePresignedUploadUrls,
    completeMultipartUpload,
    abortMultipartUpload,
    listUploadedParts,
    downloadObject,
    uploadFolder,
    uploadFile,
    deleteFolder
};
