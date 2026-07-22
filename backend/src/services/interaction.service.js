const interactionRepository = require('../repositories/interaction.repository');
const videoRepository = require('../repositories/video.repository');
const AppError = require('../utils/AppError');

async function toggleLike(videoId, userId) {
    const video = await videoRepository.findById(videoId);
    if (!video) throw AppError.notFound('Video not found');
    
    return await interactionRepository.toggleLike(videoId, userId);
}

async function getLikeStatus(videoId, userId) {
    const video = await videoRepository.findById(videoId);
    if (!video) throw AppError.notFound('Video not found');
    
    return await interactionRepository.getLikeStatus(videoId, userId);
}

async function addComment(videoId, userId, content) {
    if (!content || content.trim().length === 0) {
        throw AppError.badRequest('Comment content cannot be empty');
    }
    
    const video = await videoRepository.findById(videoId);
    if (!video) throw AppError.notFound('Video not found');
    
    return await interactionRepository.addComment(videoId, userId, content.trim());
}

async function getComments(videoId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const video = await videoRepository.findById(videoId);
    if (!video) throw AppError.notFound('Video not found');
    
    return await interactionRepository.getComments(videoId, limit, offset);
}

async function recordView(videoId, userId, ipAddress) {
    const video = await videoRepository.findById(videoId);
    if (!video) throw AppError.notFound('Video not found');
    
    return await interactionRepository.recordView(videoId, userId, ipAddress);
}

module.exports = {
    toggleLike,
    getLikeStatus,
    addComment,
    getComments,
    recordView
};
