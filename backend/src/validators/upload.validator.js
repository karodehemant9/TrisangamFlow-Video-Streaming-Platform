const { body, param } = require("express-validator");
const { ALLOWED_MIME_TYPES } = require("../config/constants");

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

const initiateValidator = [

    body("fileName")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("fileName is required"),

    body("mimeType")
        .isString()
        .isIn(ALLOWED_MIME_TYPES)
        .withMessage(
            `mimeType must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`
        ),

    body("totalSize")
        .isInt({ min: 1, max: MAX_FILE_SIZE })
        .withMessage(
            `totalSize must be between 1 byte and ${MAX_FILE_SIZE} bytes (5 GB)`
        )

];

const completeValidator = [

    body("uploadId")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("uploadId is required"),

    body("parts")
        .isArray({ min: 1 })
        .withMessage("parts must be a non-empty array"),

    body("parts.*.partNumber")
        .isInt({ min: 1 })
        .withMessage("Each part must have a valid partNumber"),

    body("parts.*.etag")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("Each part must have an etag"),

    body("title")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("title must be between 1 and 255 characters"),

    body("description")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 5000 })
        .withMessage("description must not exceed 5000 characters")

];

const abortValidator = [

    body("uploadId")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("uploadId is required")

];

const statusValidator = [

    param("uploadId")
        .isString()
        .trim()
        .notEmpty()
        .withMessage("uploadId is required")

];

module.exports = {
    initiateValidator,
    completeValidator,
    abortValidator,
    statusValidator
};
