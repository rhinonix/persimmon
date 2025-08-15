-- Add rss_feed_item_id column to processing_queue table
-- This allows RSS feed items to be processed without requiring intelligence_items first

-- Add the new column
ALTER TABLE processing_queue 
ADD COLUMN rss_feed_item_id UUID REFERENCES rss_feed_items(id);

-- Make intelligence_item_id nullable since we now have RSS items that don't have intelligence items yet
ALTER TABLE processing_queue 
ALTER COLUMN intelligence_item_id DROP NOT NULL;

-- Add a check constraint to ensure either intelligence_item_id OR rss_feed_item_id is provided
ALTER TABLE processing_queue 
ADD CONSTRAINT processing_queue_item_check 
CHECK (
  (intelligence_item_id IS NOT NULL AND rss_feed_item_id IS NULL) OR
  (intelligence_item_id IS NULL AND rss_feed_item_id IS NOT NULL)
);

-- Add index for performance
CREATE INDEX idx_processing_queue_rss_feed_item_id ON processing_queue(rss_feed_item_id);

-- Update the getProcessingQueue query to handle both types
-- This will be handled in the application code, but documenting the expected behavior:
-- - Items with intelligence_item_id: join to intelligence_items table
-- - Items with rss_feed_item_id: join to rss_feed_items table (and through to rss_feeds)

COMMENT ON COLUMN processing_queue.rss_feed_item_id IS 'Reference to RSS feed item for RSS-based processing workflow';
COMMENT ON CONSTRAINT processing_queue_item_check ON processing_queue IS 'Ensures exactly one of intelligence_item_id or rss_feed_item_id is set';
