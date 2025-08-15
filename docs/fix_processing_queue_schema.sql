-- Fix processing_queue table schema
-- Add missing columns that are causing the 400 errors

-- Add missing columns to processing_queue table
DO $$ 
BEGIN
  -- Add processed_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_queue' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE processing_queue ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added processed_at column to processing_queue';
  END IF;

  -- Add error_message column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_queue' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE processing_queue ADD COLUMN error_message TEXT;
    RAISE NOTICE 'Added error_message column to processing_queue';
  END IF;

END $$;

-- Show current processing_queue table structure
SELECT 'Processing Queue table structure:' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'processing_queue' 
ORDER BY ordinal_position;

-- Show current processing_queue data
SELECT 'Current processing_queue data:' as status;
SELECT id, status, priority, attempts, max_attempts, created_at, processed_at, error_message
FROM processing_queue 
ORDER BY created_at DESC 
LIMIT 10;
