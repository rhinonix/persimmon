-- RSS Schema Fix - Add missing columns to existing rss_feed_items table
-- Run this if your rss_feed_items table is missing columns

-- Add missing columns to rss_feed_items table (safe - only adds if missing)
DO $$ 
BEGIN
  -- Add processing_error column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'processing_error'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN processing_error TEXT;
    RAISE NOTICE 'Added processing_error column to rss_feed_items';
  END IF;

  -- Add intelligence_item_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'intelligence_item_id'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN intelligence_item_id UUID REFERENCES intelligence_items(id);
    RAISE NOTICE 'Added intelligence_item_id column to rss_feed_items';
  END IF;

  -- Add processed column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'processed'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN processed BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added processed column to rss_feed_items';
  END IF;

  -- Add guid column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'guid'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN guid TEXT;
    RAISE NOTICE 'Added guid column to rss_feed_items';
  END IF;

  -- Add content_hash column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN content_hash TEXT UNIQUE;
    RAISE NOTICE 'Added content_hash column to rss_feed_items';
  END IF;

  -- Add raw_data column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'raw_data'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN raw_data JSONB;
    RAISE NOTICE 'Added raw_data column to rss_feed_items';
  END IF;

  -- Add categories column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'categories'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN categories TEXT[];
    RAISE NOTICE 'Added categories column to rss_feed_items';
  END IF;

  -- Add rss_feed_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rss_feed_items' AND column_name = 'rss_feed_id'
  ) THEN
    ALTER TABLE rss_feed_items ADD COLUMN rss_feed_id UUID REFERENCES rss_feeds(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added rss_feed_id column to rss_feed_items';
  END IF;

END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_processed ON rss_feed_items(processed);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_content_hash ON rss_feed_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_guid ON rss_feed_items(guid);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed_id ON rss_feed_items(rss_feed_id);

-- Show final table structure
SELECT 'RSS Feed Items table structure after fix:' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rss_feed_items' 
ORDER BY ordinal_position;
