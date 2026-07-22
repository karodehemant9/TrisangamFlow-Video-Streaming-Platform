const interactionService = require('../services/interaction.service');

async function toggleLike(req, res, next) {
    try {
        const { videoId } = req.params;
        const userId = req.user.id || req.user.userId;
        
        const result = await interactionService.toggleLike(videoId, userId);
        
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getLikeStatus(req, res, next) {
    try {
        const { videoId } = req.params;
        // userId is optional here because even logged out users can see like counts
        const userId = (req.user?.id || req.user?.userId) || null;
        
        const result = await interactionService.getLikeStatus(videoId, userId);
        
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function addComment(req, res, next) {
    try {
        const { videoId } = req.params;
        const userId = req.user.id || req.user.userId;
        const { content } = req.body;
        
        const result = await interactionService.addComment(videoId, userId, content);
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function getComments(req, res, next) {
    try {
        const { videoId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        
        const result = await interactionService.getComments(videoId, page, limit);
        
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
}

async function recordView(req, res, next) {
    try {
        const { videoId } = req.params;
        const userId = (req.user?.id || req.user?.userId) || null; // optional auth
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        const recorded = await interactionService.recordView(videoId, userId, ipAddress);
        
        res.json({
            success: true,
            recorded
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    toggleLike,
    getLikeStatus,
    addComment,
    getComments,
    recordView
};
