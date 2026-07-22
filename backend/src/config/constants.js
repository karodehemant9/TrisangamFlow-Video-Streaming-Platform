/**
 * Centralized constants used across multiple modules.
 * 
 * If a constant is only used in a single file, keep it there.
 * Only add constants here when they are shared by 2+ files.
 */

// --- Storage ---
const BUCKET = process.env.MINIO_BUCKET || "videos";

// --- Queue ---
const VIDEO_PROCESSING_QUEUE_NAME = "video-processing";

// --- Upload ---
const ALLOWED_MIME_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/mkv",
    "video/matroska"
];

module.exports = {
    BUCKET,
    VIDEO_PROCESSING_QUEUE_NAME,
    ALLOWED_MIME_TYPES
};
