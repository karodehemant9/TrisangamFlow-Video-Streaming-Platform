IF NOT EXISTS (
SELECT 1
FROM sys.tables
WHERE name='upload_sessions'
)
BEGIN

CREATE TABLE upload_sessions
(
    id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    user_id UNIQUEIDENTIFIER
        NOT NULL,

    upload_id NVARCHAR(255)
        NOT NULL,

    object_key NVARCHAR(500)
        NOT NULL,

    original_filename NVARCHAR(500)
        NOT NULL,

    mime_type NVARCHAR(200)
        NOT NULL,

    total_size BIGINT
        NOT NULL,

    status NVARCHAR(20)
        DEFAULT 'INITIATED',

    created_at DATETIME2
        DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_upload_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
);

END;