IF COL_LENGTH('upload_sessions', 'chunk_size') IS NULL
BEGIN

    ALTER TABLE upload_sessions ADD
        chunk_size INT NOT NULL
            CONSTRAINT DF_upload_chunk_size DEFAULT 10485760,

        total_parts INT NOT NULL
            CONSTRAINT DF_upload_total_parts DEFAULT 1,

        completed_at DATETIME2 NULL,

        video_id UNIQUEIDENTIFIER NULL;

END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_upload_sessions_video'
)
BEGIN

    ALTER TABLE upload_sessions ADD
        CONSTRAINT FK_upload_sessions_video
        FOREIGN KEY(video_id)
        REFERENCES videos(id);

END;
