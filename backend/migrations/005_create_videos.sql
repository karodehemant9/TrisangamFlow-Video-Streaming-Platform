IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name='videos'
)
BEGIN

CREATE TABLE videos
(
    id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    user_id UNIQUEIDENTIFIER
        NOT NULL,

    title NVARCHAR(255)
        NOT NULL,

    description NVARCHAR(MAX)
        NULL,

    original_filename NVARCHAR(500)
        NOT NULL,

    storage_key NVARCHAR(500)
        NULL,

    thumbnail_key NVARCHAR(500)
        NULL,

    duration_seconds INT NULL,

    file_size BIGINT NULL,

    status NVARCHAR(30)
        NOT NULL
        DEFAULT 'UPLOADING',

    visibility NVARCHAR(20)
        NOT NULL
        DEFAULT 'PUBLIC',

    created_at DATETIME2
        DEFAULT SYSUTCDATETIME(),

    updated_at DATETIME2
        DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_videos_user
    FOREIGN KEY(user_id)
    REFERENCES users(id)
);

END;