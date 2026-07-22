const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null, // Required by BullMQ
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
    logger.info('Connected to Redis');
});

redis.on('error', (err) => {
    logger.error({
        message: 'Redis connection error',
        error: err.message
    });
});

module.exports = {
    redis,
    redisConfig
};
