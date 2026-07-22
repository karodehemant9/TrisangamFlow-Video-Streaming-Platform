const { getPool } = require("../database/connection");

// LIKES
async function toggleLike(videoId, userId) {
    const pool = getPool();
    
    // Check if like exists
    const checkResult = await pool.request()
        .input("video_id", videoId)
        .input("user_id", userId)
        .query(`SELECT id FROM likes WHERE video_id = @video_id AND user_id = @user_id`);
        
    if (checkResult.recordset.length > 0) {
        // Unlike
        await pool.request()
            .input("video_id", videoId)
            .input("user_id", userId)
            .query(`DELETE FROM likes WHERE video_id = @video_id AND user_id = @user_id`);
        return { liked: false };
    } else {
        // Like
        await pool.request()
            .input("video_id", videoId)
            .input("user_id", userId)
            .query(`INSERT INTO likes (video_id, user_id) VALUES (@video_id, @user_id)`);
        return { liked: true };
    }
}

async function getLikeStatus(videoId, userId) {
    const pool = getPool();
    
    const countResult = await pool.request()
        .input("video_id", videoId)
        .query(`SELECT COUNT(*) as count FROM likes WHERE video_id = @video_id`);
        
    let isLiked = false;
    if (userId) {
        const userLike = await pool.request()
            .input("video_id", videoId)
            .input("user_id", userId)
            .query(`SELECT 1 FROM likes WHERE video_id = @video_id AND user_id = @user_id`);
        isLiked = userLike.recordset.length > 0;
    }
    
    return {
        count: countResult.recordset[0].count,
        isLiked
    };
}

// COMMENTS
async function addComment(videoId, userId, content) {
    const pool = getPool();
    
    const result = await pool.request()
        .input("video_id", videoId)
        .input("user_id", userId)
        .input("content", content)
        .query(`
            INSERT INTO comments (video_id, user_id, content)
            OUTPUT INSERTED.id, INSERTED.content, INSERTED.created_at
            VALUES (@video_id, @user_id, @content)
        `);
        
    return result.recordset[0];
}

async function getComments(videoId, limit = 50, offset = 0) {
    const pool = getPool();
    
    const result = await pool.request()
        .input("video_id", videoId)
        .input("limit", limit)
        .input("offset", offset)
        .query(`
            SELECT 
                c.id, c.content, c.created_at,
                u.id as user_id, u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.video_id = @video_id
            ORDER BY c.created_at DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);
        
    return result.recordset;
}

// VIEWS
async function recordView(videoId, userId, ipAddress) {
    const pool = getPool();
    
    // Use an atomic operation with UPDLOCK and SERIALIZABLE to prevent race conditions (like React double-fetching)
    let query = '';
    if (userId) {
        query = `
            BEGIN TRAN;
            BEGIN TRY
                IF NOT EXISTS (SELECT 1 FROM video_views WITH (UPDLOCK, SERIALIZABLE) WHERE video_id = @video_id AND user_id = @user_id)
                BEGIN
                    INSERT INTO video_views (video_id, user_id, ip_address) VALUES (@video_id, @user_id, @ip_address);
                    SELECT 1 as inserted;
                END
                ELSE
                BEGIN
                    SELECT 0 as inserted;
                END
                COMMIT TRAN;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRAN;
                THROW;
            END CATCH
        `;
    } else {
        query = `
            BEGIN TRAN;
            BEGIN TRY
                IF NOT EXISTS (SELECT 1 FROM video_views WITH (UPDLOCK, SERIALIZABLE) WHERE video_id = @video_id AND ip_address = @ip_address)
                BEGIN
                    INSERT INTO video_views (video_id, user_id, ip_address) VALUES (@video_id, @user_id, @ip_address);
                    SELECT 1 as inserted;
                END
                ELSE
                BEGIN
                    SELECT 0 as inserted;
                END
                COMMIT TRAN;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRAN;
                THROW;
            END CATCH
        `;
    }

    const checkResult = await pool.request()
        .input("video_id", videoId)
        .input("user_id", userId)
        .input("ip_address", ipAddress)
        .query(query);

    // checkResult.recordset[0].inserted will be 1 if a new view was recorded, 0 if it already existed
    return checkResult.recordset[0].inserted === 1;
}

module.exports = {
    toggleLike,
    getLikeStatus,
    addComment,
    getComments,
    recordView
};
