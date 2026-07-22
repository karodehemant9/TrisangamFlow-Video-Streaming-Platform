const { Worker } = require('bullmq');
const path = require('path');
const fsp = require('fs').promises;
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const { redisConfig } = require('../config/redis');
const jobRepository = require('../repositories/job.repository');
const videoRepository = require('../repositories/video.repository');
const videoFileRepository = require('../repositories/video-file.repository');
const s3Ops = require('../storage/s3.operations');
const ffmpegService = require('../services/ffmpeg.service');
const logger = require('../utils/logger');
const { BUCKET, VIDEO_PROCESSING_QUEUE_NAME } = require('../config/constants');

const worker = new Worker(VIDEO_PROCESSING_QUEUE_NAME, async (job) => {

    const { videoId, sqlJobId, storageKey, originalFilename } = job.data;

    logger.info({
        message: 'Started processing video job',
        jobId: job.id,
        sqlJobId,
        videoId
    });

    const parentTempDir = path.join(__dirname, '../../video_processing_temp');
    const tempDir = path.join(parentTempDir, videoId);

    // Ensure the temp directory exists
    await fsp.mkdir(tempDir, { recursive: true });
    const originalFilePath = path.join(tempDir, 'original.mp4');
    const hlsOutputDir = path.join(tempDir, 'hls');

    try {
        // 1. Mark job as processing
        await jobRepository.updateStatus(sqlJobId, 'PROCESSING');
        await videoRepository.updateStatus(videoId, 'PROCESSING');

        await job.updateProgress(5);
        await jobRepository.updateProgress(sqlJobId, 5);

        // 2. Download original video from S3
        logger.info(`Downloading original video from S3: ${storageKey}`);
        await s3Ops.downloadObject(BUCKET, storageKey, originalFilePath);

        await job.updateProgress(15);
        await jobRepository.updateProgress(sqlJobId, 15);

        // 2.5 Extract duration
        logger.info(`Extracting duration for video...`);
        try {
            const durationSeconds = await new Promise((resolve) => {
                const p = spawn(ffmpegPath, ['-i', originalFilePath]);
                let output = '';
                p.stderr.on('data', d => output += d);
                p.on('close', () => {
                    const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                    if (match) {
                        const h = parseInt(match[1], 10);
                        const m = parseInt(match[2], 10);
                        const s = parseFloat(match[3]);
                        resolve(Math.round(h * 3600 + m * 60 + s));
                    } else {
                        resolve(0);
                    }
                });
            });

            if (durationSeconds > 0) {
                await videoRepository.updateDuration(videoId, durationSeconds);
                logger.info(`Extracted duration: ${durationSeconds} seconds`);
            }
        } catch (err) {
            logger.warn(`Failed to extract duration: ${err.message}`);
        }

        // 2.75 Extract Thumbnail
        logger.info(`Extracting thumbnail for video...`);
        try {
            const thumbnailLocalPath = path.join(tempDir, 'thumbnail.jpg');
            await ffmpegService.extractThumbnail(originalFilePath, thumbnailLocalPath);

            const thumbnailS3Key = `${videoId}/thumbnail.jpg`;
            logger.info(`Uploading thumbnail to S3: ${thumbnailS3Key}`);
            await s3Ops.uploadFile(BUCKET, thumbnailS3Key, thumbnailLocalPath, 'image/jpeg');

            await videoRepository.updateThumbnailKey(videoId, thumbnailS3Key);
            logger.info(`Thumbnail saved successfully`);
        } catch (err) {
            logger.warn(`Failed to generate or upload thumbnail: ${err.message}`);
        }

        // 3. Transcode to HLS
        logger.info(`Transcoding video to HLS...`);
        const { masterPlaylist, resolutions } = await ffmpegService.transcodeToHLS(
            originalFilePath,
            hlsOutputDir,
            async (percent) => {
                // Map the 0-100% of ffmpeg to the 15-85% overall job progress
                const overallProgress = 15 + Math.floor(percent * 0.70);
                await job.updateProgress(overallProgress);
                await jobRepository.updateProgress(sqlJobId, overallProgress);
            }
        );

        // 4. Upload HLS files to S3
        logger.info(`Uploading HLS files to S3...`);
        const s3FolderPrefix = `${videoId}/hls/`; // e.g. 'userId/videoId/hls/'
        await s3Ops.uploadFolder(BUCKET, s3FolderPrefix, hlsOutputDir);

        await job.updateProgress(95);
        await jobRepository.updateProgress(sqlJobId, 95);

        // 5. Save metadata to Database
        await videoFileRepository.create({
            videoId,
            quality: 'master',
            filePath: `${s3FolderPrefix}master.m3u8`
        });

        for (const res of resolutions) {
            await videoFileRepository.create({
                videoId,
                quality: res.name,
                filePath: `${s3FolderPrefix}${res.name}.m3u8`
            });
        }

        // 6. Complete Job
        await job.updateProgress(100);
        await jobRepository.updateProgress(sqlJobId, 100);
        await jobRepository.updateStatus(sqlJobId, 'COMPLETED');
        await videoRepository.updateStatus(videoId, 'PROCESSED');

        logger.info({
            message: 'Completed processing video job',
            jobId: job.id,
            sqlJobId,
            videoId
        });

    } catch (err) {
        logger.error({
            message: 'Failed to process video job',
            jobId: job.id,
            sqlJobId,
            error: err.message
        });

        await jobRepository.updateStatus(sqlJobId, 'FAILED', err.message);
        await videoRepository.updateStatus(videoId, 'FAILED');
        throw err;
    } finally {
        // 7. Cleanup temp files
        try {
            await fsp.rm(tempDir, { recursive: true, force: true });
            logger.info(`Cleaned up temporary directory: ${tempDir}`);

            // Attempt to remove the parent directory. This will naturally fail and be ignored 
            // if other concurrent jobs are currently processing their own videos inside it.
            try {
                await fsp.rmdir(parentTempDir);
            } catch (e) {
                // Ignored (e.g., ENOTEMPTY)
            }
        } catch (cleanupErr) {
            logger.error(`Failed to cleanup temp directory: ${cleanupErr.message}`);
        }
    }

}, {
    connection: redisConfig,
    concurrency: 1, // Number of concurrent jobs (1 job = 4 parallel FFmpeg processes)
    lockDuration: 300000 // 5 minutes lock duration to prevent stalled jobs during heavy CPU tasks
});

worker.on('failed', (job, err) => {
    logger.error(`BullMQ job ${job.id} failed with error ${err.message}`);
});

logger.info('Video worker initialized and listening for jobs');

module.exports = worker;
