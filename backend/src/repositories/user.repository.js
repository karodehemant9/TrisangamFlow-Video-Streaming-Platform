const { getPool } = require("../database/connection");

async function findByEmail(email) {
    const pool = getPool();

    const result = await pool
        .request()
        .input("email", email)
        .query(`
            SELECT *
            FROM users
            WHERE email = @email
        `);

    return result.recordset[0];
}

async function create(user) {

    const pool = getPool();

    await pool
        .request()
        .input("email", user.email)
        .input("username", user.username)
        .input("password_hash", user.passwordHash)
        .query(`
            INSERT INTO users
            (
                email,
                username,
                password_hash
            )
            VALUES
            (
                @email,
                @username,
                @password_hash
            )
        `);
}

module.exports = {
    findByEmail,
    create
};