const MIN_CHUNK_SIZE = 5 * 1024 * 1024;         // 5 MB  — S3 minimum for multipart
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;     // 10 MB — reasonable default
const MAX_PARTS = 10000;                          // S3 hard limit

/**
 * Calculates the optimal chunk size for a given file.
 *
 * Strategy:
 *   - Use DEFAULT (10 MB) if the file fits within MAX_PARTS at that size
 *   - Otherwise, increase chunk size so the file fits within MAX_PARTS
 *   - Never go below MIN (5 MB) — S3 rejects smaller parts
 *
 * @param {number} totalSize - File size in bytes
 * @returns {{ chunkSize: number, totalParts: number }}
 */
function calculateChunkConfig(totalSize) {

    if (totalSize <= 0) {
        throw new Error("File size must be greater than 0");
    }

    let chunkSize = DEFAULT_CHUNK_SIZE;

    if (Math.ceil(totalSize / chunkSize) > MAX_PARTS) {
        chunkSize = Math.ceil(totalSize / MAX_PARTS);
    }

    chunkSize = Math.max(chunkSize, MIN_CHUNK_SIZE);

    const totalParts = Math.ceil(totalSize / chunkSize);

    return {
        chunkSize,
        totalParts
    };

}

module.exports = {
    calculateChunkConfig,
    MIN_CHUNK_SIZE,
    DEFAULT_CHUNK_SIZE,
    MAX_PARTS
};
