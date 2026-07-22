const videoService = require('../services/video.service');

async function getFeed(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const videos = await videoService.getFeed(page, limit);

        res.json({
            success: true,
            data: videos
        });
    } catch (err) {
        next(err);
    }
}

async function getMyVideos(req, res, next) {
    try {
        const userId = req.user.id || req.user.userId;
        const videos = await videoService.getMyVideos(userId);

        res.json({
            success: true,
            data: videos
        });
    } catch (err) {
        next(err);
    }
}

async function getVideoDetails(req, res, next) {
    try {
        const { videoId } = req.params;
        const video = await videoService.getVideoDetails(videoId);

        res.json({
            success: true,
            data: video
        });
    } catch (err) {
        next(err);
    }
}

async function getVideoStatus(req, res, next) {
    try {
        const { videoId } = req.params;
        const status = await videoService.getVideoStatus(videoId);

        res.json({
            success: true,
            data: status
        });
    } catch (err) {
        next(err);
    }
}

async function renameVideo(req, res, next) {
    try {
        const { videoId } = req.params;
        const { title } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }

        const userId = req.user.id || req.user.userId;
        const video = await videoService.renameVideo(userId, videoId, title);

        res.json({
            success: true,
            data: video
        });
    } catch (err) {
        next(err);
    }
}

async function deleteVideo(req, res, next) {
    try {
        const { videoId } = req.params;
        const userId = req.user.id || req.user.userId;
        
        await videoService.deleteVideo(userId, videoId);

        res.json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getFeed,
    getMyVideos,
    getVideoDetails,
    getVideoStatus,
    renameVideo,
    deleteVideo
};
