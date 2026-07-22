const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const uploadController = require("../controllers/upload.controller");
const {
    initiateValidator,
    completeValidator,
    abortValidator,
    statusValidator
} = require("../validators/upload.validator");

// POST /api/uploads/initiate
// Creates a multipart upload on MinIO and returns presigned URLs
router.post(
    "/initiate",
    auth,
    initiateValidator,
    validate,
    uploadController.initiateUpload
);

// POST /api/uploads/complete
// Assembles all uploaded parts into the final object
router.post(
    "/complete",
    auth,
    completeValidator,
    validate,
    uploadController.completeUpload
);

// POST /api/uploads/abort
// Aborts the multipart upload and cleans up parts on MinIO
router.post(
    "/abort",
    auth,
    abortValidator,
    validate,
    uploadController.abortUpload
);

// GET /api/uploads/:uploadId/status
// Returns upload session info + list of uploaded parts (for resume)
router.get(
    "/:uploadId/status",
    auth,
    statusValidator,
    validate,
    uploadController.getUploadStatus
);

module.exports = router;