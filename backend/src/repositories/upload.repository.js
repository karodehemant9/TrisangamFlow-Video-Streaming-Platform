const { getPool } = require("../database/connection");

async function create(data) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("user_id", data.userId)
        .input("upload_id", data.uploadId)
        .input("object_key", data.objectKey)
        .input("original_filename", data.originalFilename)
        .input("mime_type", data.mimeType)
        .input("total_size", data.totalSize)
        .input("chunk_size", data.chunkSize)
        .input("total_parts", data.totalParts)
        .query(`
            INSERT INTO upload_sessions
            (
                user_id,
                upload_id,
                object_key,
                original_filename,
                mime_type,
                total_size,
                chunk_size,
                total_parts
            )
            OUTPUT INSERTED.id
            VALUES
            (
                @user_id,
                @upload_id,
                @object_key,
                @original_filename,
                @mime_type,
                @total_size,
                @chunk_size,
                @total_parts
            )
        `);

    return result.recordset[0].id;

}

async function findByUploadIdAndUser(uploadId, userId) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("upload_id", uploadId)
        .input("user_id", userId)
        .query(`
            SELECT
                id,
                user_id,
                upload_id,
                object_key,
                original_filename,
                mime_type,
                total_size,
                chunk_size,
                total_parts,
                status,
                video_id,
                created_at,
                completed_at
            FROM upload_sessions
            WHERE upload_id = @upload_id
              AND user_id = @user_id
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
            UPDATE upload_sessions
            SET status = @status
            WHERE id = @id
        `);

}

async function updateCompleted(id, videoId) {

    const pool = getPool();

    await pool
        .request()
        .input("id", id)
        .input("video_id", videoId)
        .query(`
            UPDATE upload_sessions
            SET
                status = 'COMPLETED',
                video_id = @video_id,
                completed_at = SYSUTCDATETIME()
            WHERE id = @id
        `);

}

async function findActiveByUser(userId) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("user_id", userId)
        .query(`
            SELECT
                id,
                upload_id,
                object_key,
                original_filename,
                mime_type,
                total_size,
                chunk_size,
                total_parts,
                status,
                created_at
            FROM upload_sessions
            WHERE user_id = @user_id
              AND status = 'INITIATED'
            ORDER BY created_at DESC
        `);

    return result.recordset;

}

module.exports = {
    create,
    findByUploadIdAndUser,
    updateStatus,
    updateCompleted,
    findActiveByUser
};