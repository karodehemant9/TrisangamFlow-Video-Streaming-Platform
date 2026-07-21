IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = 'users'
)
BEGIN

CREATE TABLE users
(
    id UNIQUEIDENTIFIER
        NOT NULL
        PRIMARY KEY
        DEFAULT NEWID(),

    email NVARCHAR(255)
        NOT NULL
        UNIQUE,

    username NVARCHAR(100)
        NOT NULL
        UNIQUE,

    password_hash NVARCHAR(255)
        NOT NULL,

    profile_picture_url NVARCHAR(500)
        NULL,

    email_verified BIT
        NOT NULL
        DEFAULT 0,

    is_active BIT
        NOT NULL
        DEFAULT 1,

    created_at DATETIME2
        NOT NULL
        DEFAULT SYSUTCDATETIME(),

    updated_at DATETIME2
        NOT NULL
        DEFAULT SYSUTCDATETIME()
);

END;