IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = 'refresh_tokens'
)
BEGIN

CREATE TABLE refresh_tokens
(
    id UNIQUEIDENTIFIER
        PRIMARY KEY
        DEFAULT NEWID(),

    user_id UNIQUEIDENTIFIER
        NOT NULL,

    token_hash NVARCHAR(500)
        NOT NULL,

    expires_at DATETIME2
        NOT NULL,

    revoked_at DATETIME2
        NULL,

    created_at DATETIME2
        NOT NULL
        DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_refresh_tokens_users
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

END;