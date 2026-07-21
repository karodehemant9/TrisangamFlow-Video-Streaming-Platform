const fs = require("fs");
const path = require("path");
const { getPool } = require("./connection");

const migrationsDir = path.join(__dirname, "../../migrations");

async function ensureMigrationTable() {
    const pool = getPool();

    await pool.request().query(`
        IF NOT EXISTS (
            SELECT 1
            FROM sys.tables
            WHERE name='migration_history'
        )
        BEGIN
            CREATE TABLE migration_history
            (
                id INT IDENTITY(1,1) PRIMARY KEY,
                filename NVARCHAR(255) NOT NULL UNIQUE,
                executed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
            )
        END
    `);
}

async function runMigrations() {

    await ensureMigrationTable();

    const pool = getPool();

    const executedResult = await pool.request().query(`
        SELECT filename
        FROM migration_history
    `);

    const executed = new Set(
        executedResult.recordset.map(row => row.filename)
    );

    const files = fs
        .readdirSync(migrationsDir)
        .filter(file => file.endsWith(".sql"))
        .sort();

    for (const file of files) {

        if (executed.has(file)) {
            console.log(`Skipping ${file}`);
            continue;
        }

        console.log(`Running ${file}`);

        const sql = fs.readFileSync(
            path.join(migrationsDir, file),
            "utf8"
        );

        const transaction = pool.transaction();

        await transaction.begin();

        try {

            await transaction.request().batch(sql);

            await transaction
                .request()
                .input("filename", file)
                .query(`
                    INSERT INTO migration_history(filename)
                    VALUES(@filename)
                `);

            await transaction.commit();

            console.log(`${file} completed`);

        } catch (err) {

            await transaction.rollback();

            throw err;
        }
    }
}

module.exports = {
    runMigrations
};