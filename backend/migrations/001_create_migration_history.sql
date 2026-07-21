IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = 'migration_history'
)
BEGIN
    CREATE TABLE migration_history
    (
        id INT IDENTITY(1,1) PRIMARY KEY,

        filename NVARCHAR(255)
            NOT NULL UNIQUE,

        executed_at DATETIME2
            NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;