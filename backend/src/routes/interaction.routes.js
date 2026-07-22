const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interaction.controller');
const auth = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optional-auth.middleware');

// Likes
router.post('/:videoId/like', auth, interactionController.toggleLike);
router.get('/:videoId/likes', optionalAuth, interactionController.getLikeStatus);

// Comments
router.post('/:videoId/comment', auth, interactionController.addComment);
router.get('/:videoId/comments', interactionController.getComments);

// Views
router.post('/:videoId/view', optionalAuth, interactionController.recordView);

module.exports = router;
