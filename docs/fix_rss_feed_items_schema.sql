-- Fix rss_feed_items table schema to match the application code expectations

-- First, let's see what columns exist and what the code expects
-- The code is trying to insert these fields:
-- rss_feed_id, title, description, content, link, pub_date, author, categories, processed, guid, content_hash, raw_data

-- Check if table exists and recreate with correct schema
DROP TABLE IF EXISTS rss_feed_items CASCADE;

CREATE TABLE rss_feed_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rss_feed_id UUID NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    link TEXT,
    pub_date TIMESTAMPTZ,
    author TEXT,
    categories TEXT[] DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    guid TEXT,
    content_hash TEXT UNIQUE,
    raw_data JSONB,
    processing_error TEXT,
    intelligence_item_id UUID REFERENCES intelligence_items(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_rss_feed_items_rss_feed_id ON rss_feed_items(rss_feed_id);
CREATE INDEX idx_rss_feed_items_processed ON rss_feed_items(processed);
CREATE INDEX idx_rss_feed_items_content_hash ON rss_feed_items(content_hash);
CREATE INDEX idx_rss_feed_items_guid ON rss_feed_items(rss_feed_id, guid);
CREATE INDEX idx_rss_feed_items_pub_date ON rss_feed_items(pub_date DESC);

-- Add RLS policies if needed
ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and write
CREATE POLICY "Allow authenticated users to manage RSS feed items" ON rss_feed_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rss_feed_items_updated_at 
    BEFORE UPDATE ON rss_feed_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE rss_feed_items IS 'Stores individual items fetched from RSS feeds';
COMMENT ON COLUMN rss_feed_items.content_hash IS 'SHA-256 hash of content for deduplication';
COMMENT ON COLUMN rss_feed_items.raw_data IS 'Original RSS item data as JSON';
COMMENT ON COLUMN rss_feed_items.processed IS 'Whether this item has been processed into intelligence_items';
