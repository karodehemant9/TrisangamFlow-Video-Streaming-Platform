const { spawn } = require('child_process');
const path = require('path');
const fsp = require('fs').promises;
const ffmpegPath = require('ffmpeg-static');
const logger = require('../utils/logger');

// Resolutions we want to generate
const RESOLUTIONS = [
    { name: '1080p', scale: '-2:1080', bitrate: '5000k', resolution: '1920x1080' },
    { name: '720p', scale: '-2:720', bitrate: '2800k', resolution: '1280x720' },
    { name: '480p', scale: '-2:480', bitrate: '1400k', resolution: '854x480' },
    { name: '360p', scale: '-2:360', bitrate: '800k', resolution: '640x360' }
];

/**
 * Transcodes a video file into an HLS stream (m3u8 + ts segments) for a specific resolution.
 * 
 * @param {string} inputPath 
 * @param {string} outputDir 
 * @param {object} resolution 
 * @param {function} onProgress 
 */
function transcodeResolution(inputPath, outputDir, resolution, onProgress) {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(outputDir, `${resolution.name}.m3u8`);

        const ffmpegArgs = [
            '-y', // Force overwrite without prompting
            '-i', inputPath,
            '-profile:v', 'main', // H264 Profile Main
            '-vf', `scale=${resolution.scale}`,
            '-c:v', 'libx264',
            '-b:v', resolution.bitrate,
            '-c:a', 'aac',
            '-ar', '48000',
            '-b:a', '128k',
            '-f', 'hls',
            '-hls_time', '10', // 10 second segments
            '-hls_playlist_type', 'vod', // Video on Demand
            '-hls_segment_filename', path.join(outputDir, `${resolution.name}_%03d.ts`),
            '-preset', 'fast', // fast preset for decent speed/compression ratio
            '-threads', '2', // limit threads to prevent CPU starvation on local machine
            outputPath
        ];

        logger.info(`Starting FFmpeg for ${resolution.name}...`);
        
        // Ignore stdin (prevent hanging on prompts) and stdout (prevent buffer fill), keep stderr for logs
        const ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ['ignore', 'ignore', 'pipe'] });

        ffmpeg.stderr.on('data', (data) => {
            const str = data.toString();
            // Log FFmpeg output to help debug why it hangs
            logger.info(`FFmpeg ${resolution.name}: ${str}`);
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                logger.info(`FFmpeg completed ${resolution.name}`);
                resolve(outputPath);
            } else {
                logger.error(`FFmpeg failed for ${resolution.name} with code ${code}`);
                reject(new Error(`FFmpeg exited with code ${code}`));
            }
        });
        
        ffmpeg.on('error', (err) => {
            logger.error(`FFmpeg process error: ${err.message}`);
            reject(err);
        });
    });
}

/**
 * Generates the master M3U8 playlist that points to all the resolution playlists.
 * 
 * @param {string} outputDir 
 * @param {Array<object>} generatedResolutions 
 */
async function generateMasterPlaylist(outputDir, generatedResolutions) {
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

    for (const res of generatedResolutions) {
        // Map bitrate string to integer bandwidth (rough estimate)
        const bandwidth = parseInt(res.bitrate.replace('k', '000'), 10);
        content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res.resolution}\n`;
        content += `${res.name}.m3u8\n`;
    }

    const masterPath = path.join(outputDir, 'master.m3u8');
    await fsp.writeFile(masterPath, content);
    return masterPath;
}

/**
 * Main transcoding pipeline.
 * Runs all resolutions in parallel.
 * 
 * @param {string} inputPath 
 * @param {string} outputDir 
 * @param {function} onProgress (percent)
 */
async function transcodeToHLS(inputPath, outputDir, onProgress) {
    // Ensure output directory exists
    await fsp.mkdir(outputDir, { recursive: true });

    const total = RESOLUTIONS.length;
    let completed = 0;
    
    // Helper to map resolution names to dimensions
    const resMap = {
        '1080p': '1920x1080',
        '720p': '1280x720',
        '480p': '854x480',
        '360p': '640x360'
    };

    // Run all FFmpeg processes sequentially to prevent CPU/memory starvation on local machine
    const generatedResolutions = [];
    for (const res of RESOLUTIONS) {
        try {
            await transcodeResolution(inputPath, outputDir, res, onProgress);
            
            completed++;
            // Basic progress reporting: 0-90% based on resolutions done
            onProgress(Math.floor((completed / total) * 90));
            
            generatedResolutions.push({
                name: res.name,
                bitrate: res.bitrate,
                resolution: resMap[res.name]
            });
        } catch (err) {
            logger.error(`Failed to transcode ${res.name}: ${err.message}.`);
            throw err;
        }
    }

    // Sort them by highest to lowest quality (1080p -> 360p) for the master playlist
    // since Promise.all results maintain the original mapping order, it should naturally be sorted.
    // However, it's good to ensure it. The original RESOLUTIONS array is already highest to lowest.

    // Generate Master Playlist
    const masterPath = await generateMasterPlaylist(outputDir, generatedResolutions);
    
    // Set 100% progress
    onProgress(100);

    return {
        masterPlaylist: masterPath,
        resolutions: generatedResolutions
    };
}

/**
 * Extracts a single frame from a video to use as a thumbnail.
 * Attempts to grab the frame at 00:00:01, falling back to 00:00:00 if the video is too short.
 * 
 * @param {string} inputPath 
 * @param {string} outputPath 
 */
async function extractThumbnail(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        // -ss 00:00:01 seeks to 1 second.
        // -vframes 1 grabs exactly one frame.
        const ffmpegArgs = [
            '-y',
            '-ss', '00:00:01',
            '-i', inputPath,
            '-vframes', '1',
            '-q:v', '2', // Good quality JPEG
            outputPath
        ];

        logger.info(`Extracting thumbnail for ${inputPath}...`);
        
        const ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ['ignore', 'ignore', 'pipe'] });

        let stderrOutput = '';
        ffmpeg.stderr.on('data', (data) => {
            stderrOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                logger.info(`Thumbnail extracted to ${outputPath}`);
                resolve(outputPath);
            } else {
                // If it failed (maybe video is < 1s), try without -ss
                logger.warn(`Thumbnail extraction at 1s failed. Retrying at 0s...`);
                
                const fallbackArgs = [
                    '-y',
                    '-i', inputPath,
                    '-vframes', '1',
                    '-q:v', '2',
                    outputPath
                ];
                
                const fallbackFfmpeg = spawn(ffmpegPath, fallbackArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
                fallbackFfmpeg.on('close', (fallbackCode) => {
                    if (fallbackCode === 0) {
                        logger.info(`Fallback thumbnail extracted to ${outputPath}`);
                        resolve(outputPath);
                    } else {
                        reject(new Error(`FFmpeg thumbnail extraction failed with code ${fallbackCode}`));
                    }
                });
                
                fallbackFfmpeg.on('error', (err) => {
                    reject(err);
                });
            }
        });
        
        ffmpeg.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = {
    transcodeToHLS,
    extractThumbnail,
    RESOLUTIONS
};
