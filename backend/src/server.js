require("dotenv").config();
const app = require("./app");
const logger = require("./utils/logger");
const { connectDatabase } = require("./database/connection");
const { runMigrations } = require("./database/migration.runner");

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDatabase();
    await runMigrations();
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

startServer();