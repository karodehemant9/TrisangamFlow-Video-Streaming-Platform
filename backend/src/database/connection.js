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

async function ensureDatabaseExists() {
    // Connect to the default 'master' database to check/create our target database
    const masterConfig = { ...config, database: "master" };
    
    try {
        const masterPool = await sql.connect(masterConfig);
        const dbName = config.database;
        
        // Check if database exists
        const result = await masterPool.request()
            .input("dbname", sql.NVarChar, dbName)
            .query(`SELECT name FROM sys.databases WHERE name = @dbname`);
            
        if (result.recordset.length === 0) {
            console.log(`Database '${dbName}' does not exist. Creating...`);
            // We cannot use parameters in CREATE DATABASE, so we safely interpolate
            // Assuming dbName comes from .env and is trusted.
            await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
            console.log(`Database '${dbName}' created successfully.`);
        }
        
        await masterPool.close();
    } catch (err) {
        console.error("Failed to check or create database:", err);
        throw err;
    }
}

async function connectDatabase() {
    try {
        await ensureDatabaseExists();

        pool = await sql.connect(config);
        console.log(`SQL Server Connected to database '${config.database}'`);
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