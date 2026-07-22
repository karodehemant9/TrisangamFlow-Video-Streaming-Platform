const { getPool } = require("../database/connection");

async function create(data) {
    const pool = getPool();

    const result = await pool
        .request()
        .input("video_id", data.videoId)
        .input("quality", data.quality)
        .input("file_path", data.filePath)
        .query(`
            INSERT INTO video_files (video_id, quality, file_path)
            OUTPUT INSERTED.id
            VALUES (@video_id, @quality, @file_path)
        `);

    return result.recordset[0].id;
}

async function findByVideoId(videoId) {
    const pool = getPool();

    const result = await pool
        .request()
        .input("video_id", videoId)
        .query(`
            SELECT quality, file_path, created_at
            FROM video_files
            WHERE video_id = @video_id
        `);

    return result.recordset;
}

module.exports = {
    create,
    findByVideoId
};
