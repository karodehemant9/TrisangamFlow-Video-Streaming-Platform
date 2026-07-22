const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {

    if (err.isOperational) {
        logger.warn({
            message: err.message,
            statusCode: err.statusCode,
            path: req.originalUrl,
            method: req.method
        });

        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
    });

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });

};