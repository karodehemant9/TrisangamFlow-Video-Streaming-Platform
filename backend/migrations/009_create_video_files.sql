IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[video_files]') AND type in (N'U'))
BEGIN
    CREATE TABLE video_files (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        video_id UNIQUEIDENTIFIER NOT NULL,
        quality VARCHAR(20) NOT NULL, -- '360p', '480p', '720p', '1080p', or 'master'
        file_path VARCHAR(255) NOT NULL, -- S3 key (e.g. video_id/hls/1080p.m3u8)
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_video_files_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_video_files_video_id ON video_files(video_id);
END;
