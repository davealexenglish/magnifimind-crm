-- Truncate pdat_passwd table to prepare for new encryption scheme
-- This removes all existing password data as it will be migrated to the new AES-256-CBC encryption

-- Display warning
DO $$
BEGIN
    RAISE NOTICE 'WARNING: This will delete all existing password data from pdat_passwd table';
    RAISE NOTICE 'Make sure you have backed up any important data before proceeding';
END $$;

-- Truncate the table
TRUNCATE TABLE pdat_passwd RESTART IDENTITY CASCADE;

-- Verify truncation
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM pdat_passwd;
    RAISE NOTICE 'pdat_passwd table truncated. Remaining rows: %', row_count;
END $$;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully truncated pdat_passwd table';
    RAISE NOTICE 'New password entries will use AES-256-CBC encryption with random salts';
    RAISE NOTICE 'Make sure MASTER_PASSWORD environment variable is set before using the application';
END $$;
