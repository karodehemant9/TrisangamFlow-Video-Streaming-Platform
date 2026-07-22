const videoRepository = require('../repositories/video.repository');
const jobRepository = require('../repositories/job.repository');
const AppError = require('../utils/AppError');
const { BUCKET } = require('../config/constants');

async function getFeed(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const videos = await videoRepository.findPublicVideos(limit, offset);
    return videos;
}

async function getMyVideos(userId) {
    const videos = await videoRepository.findVideosByUser(userId);
    return videos;
}

async function getVideoDetails(videoId) {
    const video = await videoRepository.findByIdWithDetails(videoId);
    if (!video) {
        throw AppError.notFound('Video not found');
    }
    return video;
}

async function getVideoStatus(videoId) {
    const video = await videoRepository.findById(videoId);
    if (!video) {
        throw AppError.notFound('Video not found');
    }
    
    const job = await jobRepository.findByVideoId(videoId);
    
    return {
        videoId: video.id,
        status: video.status,
        progress: job ? job.progress : 0,
        jobStatus: job ? job.status : null,
        errorMessage: job ? job.error_message : null
    };
}

async function renameVideo(userId, videoId, newTitle) {
    const video = await videoRepository.findById(videoId);
    if (!video) {
        throw AppError.notFound('Video not found');
    }
    if (video.user_id !== userId) {
        throw AppError.forbidden('You do not have permission to rename this video');
    }
    
    await videoRepository.updateTitle(videoId, newTitle);
    return { ...video, title: newTitle };
}

async function deleteVideo(userId, videoId) {
    const video = await videoRepository.findById(videoId);
    if (!video) {
        throw AppError.notFound('Video not found');
    }
    if (video.user_id !== userId) {
        throw AppError.forbidden('You do not have permission to delete this video');
    }
    
    // Soft delete in database
    await videoRepository.softDeleteVideo(videoId);
    
    // Delete files from S3/MinIO
    const s3Operations = require('../storage/s3.operations');
    
    try {
        // Delete original uploaded MP4
        if (video.storage_key) {
            await s3Operations.deleteFolder(BUCKET, video.storage_key);
        }
        // Delete HLS chunks folder
        await s3Operations.deleteFolder(BUCKET, `${videoId}/`);
    } catch (err) {
        const logger = require('../utils/logger');
        logger.error(`Failed to delete video files from S3: ${err.message}`);
        // We don't throw here to ensure DB remains soft-deleted even if S3 fails
    }
}

// TODO: In the future, we could add a recordView function here that inserts into video_views

module.exports = {
    getFeed,
    getMyVideos,
    getVideoDetails,
    getVideoStatus,
    renameVideo,
    deleteVideo
};
