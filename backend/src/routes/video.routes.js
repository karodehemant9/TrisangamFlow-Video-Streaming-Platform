const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const streamController = require('../controllers/stream.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.get('/', videoController.getFeed);
router.get('/:videoId', videoController.getVideoDetails);
router.get('/:videoId/stream', streamController.getStreamUrl);

// Protected routes
router.get('/me/my-videos', auth, videoController.getMyVideos);
router.get('/:videoId/status', auth, videoController.getVideoStatus);
router.patch('/:videoId/rename', auth, videoController.renameVideo);
router.delete('/:videoId', auth, videoController.deleteVideo);

module.exports = router;
