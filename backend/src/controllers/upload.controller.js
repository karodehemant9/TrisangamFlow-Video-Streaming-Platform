const uploadService = require("../services/upload.service");

async function initiateUpload(req, res, next) {
    try {
        const result = await uploadService.initiateUpload({
            userId: req.user.userId,
            fileName: req.body.fileName,
            mimeType: req.body.mimeType,
            totalSize: req.body.totalSize
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

async function completeUpload(req, res, next) {
    try {
        const result = await uploadService.completeUpload({
            userId: req.user.userId,
            uploadId: req.body.uploadId,
            parts: req.body.parts,
            title: req.body.title,
            description: req.body.description
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

async function abortUpload(req, res, next) {
    try {
        await uploadService.abortUpload({
            userId: req.user.userId,
            uploadId: req.body.uploadId
        });

        res.status(200).json({
            success: true,
            message: "Upload aborted"
        });
    } catch (error) {
        next(error);
    }
}

async function getUploadStatus(req, res, next) {
    try {
        const result = await uploadService.getUploadStatus({
            userId: req.user.userId,
            uploadId: req.params.uploadId
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    initiateUpload,
    completeUpload,
    abortUpload,
    getUploadStatus
};