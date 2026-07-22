require("dotenv").config();
const app = require("./app");
const logger = require("./utils/logger");
const { connectDatabase } = require("./database/connection");
const ensureBucketExists = require("./config/bucket");
const { runMigrations } = require("./database/migration.runner");

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDatabase();
    await runMigrations();
    await ensureBucketExists();

    // Start background workers
    require('./workers/video.worker');

    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

startServer();