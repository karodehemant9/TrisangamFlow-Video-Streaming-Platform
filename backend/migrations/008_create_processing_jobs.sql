IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[processing_jobs]') AND type in (N'U'))
BEGIN
    CREATE TABLE processing_jobs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        video_id UNIQUEIDENTIFIER NOT NULL,
        job_type VARCHAR(50) NOT NULL, -- e.g., 'TRANSCODE_HLS'
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
        progress INT NOT NULL DEFAULT 0,
        error_message NVARCHAR(MAX) NULL,
        started_at DATETIME2 NULL,
        completed_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_processing_jobs_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_processing_jobs_video_id ON processing_jobs(video_id);
    CREATE INDEX IX_processing_jobs_status ON processing_jobs(status);
END;
