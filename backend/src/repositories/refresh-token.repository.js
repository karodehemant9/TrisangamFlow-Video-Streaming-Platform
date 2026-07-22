const { getPool } = require("../database/connection");

async function create(data) {

    const pool = getPool();

    await pool
        .request()
        .input("user_id", data.userId)
        .input("token_hash", data.tokenHash)
        .input("expires_at", data.expiresAt)
        .input("device_name", data.deviceName)
        .input("ip_address", data.ipAddress)
        .input("user_agent", data.userAgent)
        .query(`
            INSERT INTO refresh_tokens
            (
                user_id,
                token_hash,
                expires_at,
                device_name,
                ip_address,
                user_agent
            )
            VALUES
            (
                @user_id,
                @token_hash,
                @expires_at,
                @device_name,
                @ip_address,
                @user_agent
            )
        `);

}

async function findByHash(tokenHash) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("token_hash", tokenHash)
        .query(`
            SELECT *
            FROM refresh_tokens
            WHERE token_hash = @token_hash
              AND revoked_at IS NULL
        `);

    return result.recordset[0];

}

async function revoke(id) {

    const pool = getPool();

    await pool
        .request()
        .input("id", id)
        .query(`
            UPDATE refresh_tokens
            SET revoked_at = SYSUTCDATETIME()
            WHERE id=@id
        `);

}

module.exports = {
    create,
    findByHash,
    revoke
};