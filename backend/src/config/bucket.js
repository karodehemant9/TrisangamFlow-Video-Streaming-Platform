const { 
    HeadBucketCommand, 
    CreateBucketCommand,
    PutBucketCorsCommand,
    PutBucketPolicyCommand
} = require("@aws-sdk/client-s3");
const s3 = require("./s3");
const logger = require("../utils/logger");
const { BUCKET } = require("./constants");

async function ensureBucketExists() {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
        logger.info(`Bucket '${BUCKET}' already exists.`);
    } catch (err) {
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
            logger.info(`Bucket '${BUCKET}' not found. Creating...`);
            await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
            logger.info(`Bucket '${BUCKET}' created successfully.`);
        } else {
            logger.error(`Error checking bucket: ${err.message}`);
            throw err;
        }
    }

    try {
        // Set CORS to allow frontend to upload chunks and read ETags directly
        const corsCommand = new PutBucketCorsCommand({
            Bucket: BUCKET,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"], // Restrict to frontend URL in production
                        ExposeHeaders: ["ETag"], // CRITICAL for multipart uploads
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        });
        await s3.send(corsCommand);
        logger.info(`CORS configuration applied to bucket '${BUCKET}'`);
    } catch (err) {
        logger.warn(`Failed to apply bucket CORS: ${err.message}. (This is often safe to ignore if MinIO global CORS is enabled)`);
    }

    try {
        // Set Bucket Policy to Public Read (so HLS streaming works directly from S3/MinIO)
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: { AWS: ["*"] }, // Use AWS: ["*"] for AWS compatibility, or "*" for MinIO
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${BUCKET}/*`]
                }
            ]
        };

        const policyCommand = new PutBucketPolicyCommand({
            Bucket: BUCKET,
            Policy: JSON.stringify(policy)
        });
        await s3.send(policyCommand);
        logger.info(`Public read policy applied to bucket '${BUCKET}'`);
    } catch (err) {
        logger.error(`Failed to apply bucket Policy: ${err.message}`);
    }
}

module.exports = ensureBucketExists;