const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: "us-east-1",

    endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,

    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY
    },

    forcePathStyle: true
});

module.exports = s3;