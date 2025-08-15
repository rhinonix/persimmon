-- Add missing processing_error column to rss_feed_items table
-- This is the only column missing based on your table structure

ALTER TABLE rss_feed_items ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_processing_error ON rss_feed_items(processing_error);

-- Verify the column was added
SELECT 'processing_error column added successfully' as status;

-- Show updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rss_feed_items' 
AND column_name = 'processing_error';
