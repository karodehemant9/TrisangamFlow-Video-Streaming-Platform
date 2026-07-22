const { getPool } = require("../database/connection");

async function create(data) {
    const pool = getPool();

    const result = await pool
        .request()
        .input("video_id", data.videoId)
        .input("job_type", data.jobType)
        .input("status", "PENDING")
        .query(`
            INSERT INTO processing_jobs
            (
                video_id,
                job_type,
                status
            )
            OUTPUT INSERTED.id
            VALUES
            (
                @video_id,
                @job_type,
                @status
            )
        `);

    return result.recordset[0].id;
}

async function updateStatus(id, status, errorMessage = null) {
    const pool = getPool();

    let query = `
        UPDATE processing_jobs
        SET 
            status = @status,
            updated_at = SYSUTCDATETIME()
    `;

    if (status === 'PROCESSING') {
        query += `, started_at = SYSUTCDATETIME()`;
    } else if (status === 'COMPLETED' || status === 'FAILED') {
        query += `, completed_at = SYSUTCDATETIME()`;
    }

    if (errorMessage) {
        query += `, error_message = @error_message`;
    }

    query += ` WHERE id = @id`;

    const request = pool.request()
        .input("id", id)
        .input("status", status);

    if (errorMessage) {
        request.input("error_message", errorMessage);
    }

    await request.query(query);
}

async function updateProgress(id, progress) {
    const pool = getPool();

    await pool
        .request()
        .input("id", id)
        .input("progress", progress)
        .query(`
            UPDATE processing_jobs
            SET 
                progress = @progress,
                updated_at = SYSUTCDATETIME()
            WHERE id = @id
        `);
}

async function findByVideoId(videoId) {
    const pool = getPool();

    const result = await pool
        .request()
        .input("video_id", videoId)
        .query(`
            SELECT TOP 1
                id,
                job_type,
                status,
                progress,
                error_message,
                started_at,
                completed_at
            FROM processing_jobs
            WHERE video_id = @video_id
            ORDER BY created_at DESC
        `);

    return result.recordset[0];
}

module.exports = {
    create,
    updateStatus,
    updateProgress,
    findByVideoId
};
