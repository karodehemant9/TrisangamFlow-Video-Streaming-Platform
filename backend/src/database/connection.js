const sql = require("mssql");

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

let pool;

async function connectDatabase() {
    try {
        pool = await sql.connect(config);
        console.log("SQL Server Connected");
        return pool;
    } catch (error) {
        console.error("Database connection failed", error);
        process.exit(1);
    }
}

function getPool() {
    if (!pool) {
        throw new Error("Database not initialized");
    }

    return pool;
}

module.exports = {
    connectDatabase,
    getPool
};