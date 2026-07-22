const { getPool } = require("../database/connection");

async function findByEmail(email) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("email", email)
        .query(`
            SELECT
                id,
                email,
                username,
                password_hash
            FROM users
            WHERE email=@email
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

async function findById(id) {

    const pool = getPool();

    const result = await pool
        .request()
        .input("id", id)
        .query(`
            SELECT
                id,
                email,
                username
            FROM users
            WHERE id=@id
        `);

    return result.recordset[0];

}

module.exports = {
    findByEmail,
    findById,
    create
};