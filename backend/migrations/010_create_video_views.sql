IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[video_views]') AND type in (N'U'))
BEGIN
    CREATE TABLE video_views (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        video_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NULL, -- Null if anonymous
        ip_address VARCHAR(45) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_video_views_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        CONSTRAINT FK_video_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IX_video_views_video_id ON video_views(video_id);
    CREATE INDEX IX_video_views_created_at ON video_views(created_at);
END;
