const express = require('express');
const router = express.Router();
const streamController = require('../controllers/stream.controller');
const auth = require('../middleware/auth.middleware');

// GET /api/videos/:videoId/stream
// We can make this public or protected depending on business logic. Let's make it public for now so sharing works easily.
router.get('/:videoId/stream', streamController.getStreamUrl);

module.exports = router;
