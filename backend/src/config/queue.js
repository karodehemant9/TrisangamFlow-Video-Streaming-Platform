const { Queue } = require('bullmq');
const { redisConfig } = require('./redis');
const logger = require('../utils/logger');
const { VIDEO_PROCESSING_QUEUE_NAME } = require('./constants');

// Create the video processing queue
const videoQueue = new Queue(VIDEO_PROCESSING_QUEUE_NAME, {
    connection: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true, // Don't keep completed jobs in Redis (they are tracked in SQL)
        removeOnFail: 100 // Keep last 100 failed jobs for debugging
    }
});

logger.info('Video processing queue initialized');

module.exports = {
    videoQueue
};
