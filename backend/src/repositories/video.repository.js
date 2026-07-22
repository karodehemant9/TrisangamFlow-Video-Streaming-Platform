const { getPool } = require("../database/connection");

async function create(data) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("user_id", data.userId)
        .input("title", data.title)
        .input("original_filename", data.originalFilename)
        .input("storage_key", data.storageKey)
        .input("file_size", data.fileSize)
        .input("status", data.status || "UPLOADING")
        .query(`
            INSERT INTO videos
            (
                user_id,
                title,
                original_filename,
                storage_key,
                file_size,
                status
            )
            OUTPUT INSERTED.id
            VALUES
            (
                @user_id,
                @title,
                @original_filename,
                @storage_key,
                @file_size,
                @status
            )
        `);

    return result.recordset[0].id;

}

async function findById(id) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id", id)
        .query(`
            SELECT
                id,
                user_id,
                title,
                description,
                original_filename,
                storage_key,
                thumbnail_key,
                duration_seconds,
                file_size,
                status,
                visibility,
                created_at,
                updated_at
            FROM videos
            WHERE id = @id AND deleted_at IS NULL
        `);

    return result.recordset[0];

}

async function updateStatus(id, status) {

    const pool = getPool();

    await pool
        .request()
        .input("id", id)
        .input("status", status)
        .query(`
            UPDATE videos
            SET
                status = @status,
                updated_at = SYSUTCDATETIME()
            WHERE id = @id
        `);

}

async function findPublicVideos(limit = 20, offset = 0) {
    const pool = getPool();
    const result = await pool
        .request()
        .input("limit", limit)
        .input("offset", offset)
        .query(`
            SELECT 
                v.id, v.title, v.description, v.thumbnail_key, v.duration_seconds, 
                v.created_at, v.status,
                u.id as user_id, u.username,
                (SELECT COUNT(*) FROM video_views WHERE video_id = v.id AND deleted_at IS NULL) as view_count
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.status = 'PROCESSED' AND v.visibility = 'PUBLIC' AND v.deleted_at IS NULL
            ORDER BY v.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);
    return result.recordset;
}

async function findVideosByUser(userId) {
    const pool = getPool();
    const result = await pool
        .request()
        .input("user_id", userId)
        .query(`
            SELECT 
                id, title, description, thumbnail_key, duration_seconds, 
                status, visibility, created_at, file_size,
                (SELECT COUNT(*) FROM video_views WHERE video_id = videos.id AND deleted_at IS NULL) as view_count
            FROM videos
            WHERE user_id = @user_id AND deleted_at IS NULL
            ORDER BY created_at DESC
        `);
    return result.recordset;
}

async function findByIdWithDetails(id) {
    const pool = getPool();
    const result = await pool
        .request()
        .input("id", id)
        .query(`
            SELECT 
                v.id, v.title, v.description, v.thumbnail_key, v.duration_seconds, 
                v.status, v.visibility, v.created_at,
                u.id as user_id, u.username,
                (SELECT COUNT(*) FROM video_views WHERE video_id = v.id) as view_count
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = @id AND v.deleted_at IS NULL
        `);
    return result.recordset[0];
}

async function updateDuration(id, durationSeconds) {
    const pool = getPool();
    await pool
        .request()
        .input("id", id)
        .input("duration", durationSeconds)
        .query(`
            UPDATE videos
            SET duration_seconds = @duration, updated_at = SYSUTCDATETIME()
            WHERE id = @id
        `);
}

async function updateTitle(id, title) {
    const pool = getPool();
    await pool
        .request()
        .input("id", id)
        .input("title", title)
        .query(`
            UPDATE videos
            SET title = @title, updated_at = SYSUTCDATETIME()
            WHERE id = @id
        `);
}

async function updateThumbnailKey(id, thumbnailKey) {
    const pool = getPool();
    await pool
        .request()
        .input("id", id)
        .input("thumbnail_key", thumbnailKey)
        .query(`
            UPDATE videos
            SET thumbnail_key = @thumbnail_key, updated_at = SYSUTCDATETIME()
            WHERE id = @id
        `);
}

async function softDeleteVideo(id) {
    const pool = getPool();
    const transaction = pool.transaction();
    
    try {
        await transaction.begin();
        const request = transaction.request();
        request.input("id", id);
        
        // Soft delete video
        await request.query(`UPDATE videos SET deleted_at = SYSUTCDATETIME() WHERE id = @id`);
        // Soft delete related entries
        await request.query(`UPDATE video_views SET deleted_at = SYSUTCDATETIME() WHERE video_id = @id`);
        await request.query(`UPDATE likes SET deleted_at = SYSUTCDATETIME() WHERE video_id = @id`);
        await request.query(`UPDATE comments SET deleted_at = SYSUTCDATETIME() WHERE video_id = @id`);
        await request.query(`UPDATE video_files SET deleted_at = SYSUTCDATETIME() WHERE video_id = @id`);
        await request.query(`UPDATE processing_jobs SET deleted_at = SYSUTCDATETIME() WHERE video_id = @id`);
        
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

module.exports = {
    create,
    findById,
    updateStatus,
    findPublicVideos,
    findVideosByUser,
    findByIdWithDetails,
    updateDuration,
    updateTitle,
    updateThumbnailKey,
    softDeleteVideo
};
