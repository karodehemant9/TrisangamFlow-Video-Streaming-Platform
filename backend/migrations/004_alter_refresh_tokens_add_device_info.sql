IF COL_LENGTH('refresh_tokens', 'device_name') IS NULL
BEGIN

ALTER TABLE refresh_tokens
ADD
    device_name NVARCHAR(255) NULL,
    ip_address NVARCHAR(50) NULL,
    user_agent NVARCHAR(1000) NULL;

END;