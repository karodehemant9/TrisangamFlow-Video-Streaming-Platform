-- Add deleted_at to videos table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[videos]') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE videos ADD deleted_at DATETIME2 NULL;
END;

-- Add deleted_at to video_views table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[video_views]') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE video_views ADD deleted_at DATETIME2 NULL;
END;

-- Add deleted_at to likes table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[likes]') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE likes ADD deleted_at DATETIME2 NULL;
END;

-- Add deleted_at to comments table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[comments]') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE comments ADD deleted_at DATETIME2 NULL;
END;

-- Add deleted_at to video_files table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[video_files]') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE video_files ADD deleted_at DATETIME2 NULL;
END;

-- Add deleted_at to processing_jobs table
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[processing_jobs]') AND name = 'deleted_at'
)
BEGIN
    ALTER TABLE processing_jobs ADD deleted_at DATETIME2 NULL;
END;
