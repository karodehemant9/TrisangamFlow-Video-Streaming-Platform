const videoFileRepository = require('../repositories/video-file.repository');
const videoRepository = require('../repositories/video.repository');
const AppError = require('../utils/AppError');

// The public endpoint for the MinIO bucket
// In production, this would be a CDN URL (e.g., https://cdn.trisangamflow.com/)
const CDN_BASE_URL = process.env.CDN_BASE_URL || `http://localhost:9000/${process.env.MINIO_BUCKET || 'videos'}`;

async function getStreamUrl(req, res, next) {
    try {
        const { videoId } = req.params;

        // Check if video exists and is processed
        const video = await videoRepository.findById(videoId);
        if (!video) {
            throw AppError.notFound('Video not found');
        }

        if (video.status !== 'PROCESSED') {
            throw AppError.badRequest('Video is not fully processed yet');
        }

        // Get the master playlist path from the database
        const files = await videoFileRepository.findByVideoId(videoId);
        const masterFile = files.find(f => f.quality === 'master');

        if (!masterFile) {
            throw AppError.internal('Master playlist not found for this video');
        }

        // Construct the full public URL to the HLS master playlist
        const streamUrl = `${CDN_BASE_URL}/${masterFile.file_path}`;

        res.json({
            success: true,
            data: {
                streamUrl,
                video: {
                    id: video.id,
                    title: video.title,
                    status: video.status
                }
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getStreamUrl
};
