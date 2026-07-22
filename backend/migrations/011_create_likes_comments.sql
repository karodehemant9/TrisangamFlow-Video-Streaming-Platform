IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[likes]') AND type in (N'U'))
BEGIN
    CREATE TABLE likes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        video_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        -- Prevent a user from liking the same video multiple times
        CONSTRAINT UQ_likes_video_user UNIQUE (video_id, user_id),
        CONSTRAINT FK_likes_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        CONSTRAINT FK_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_likes_video_id ON likes(video_id);
END;

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[comments]') AND type in (N'U'))
BEGIN
    CREATE TABLE comments (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        video_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        
        CONSTRAINT FK_comments_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        CONSTRAINT FK_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION -- Cannot CASCADE both paths (multiple cascade paths issue in SQL Server), so NO ACTION, application layer or triggers handle it. Wait, actually, let's keep it CASCADE for users too if SQL Server allows it (it might throw error 1785). Let's use CASCADE for video, NO ACTION for user. If user is deleted, their comments can remain or be cleaned up by a job. Let's just use NO ACTION for now.
    );

    CREATE INDEX IX_comments_video_id ON comments(video_id);
END;
