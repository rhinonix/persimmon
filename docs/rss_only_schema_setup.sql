-- Persimmon Intelligence Platform - RSS-Only Schema Setup
-- This script ONLY adds RSS functionality without modifying existing tables
-- Safe to run on existing databases with data

-- ============================================================================
-- RSS-SPECIFIC TABLES ONLY
-- ============================================================================

-- 1. PIRs Table - Define Priority Intelligence Requirements dynamically
CREATE TABLE IF NOT EXISTS pirs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- PIR identification
  name TEXT NOT NULL,
  category_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,

  -- PIR configuration
  keywords TEXT[],
  priority_weight DECIMAL(3,2) DEFAULT 1.0,
  active BOOLEAN DEFAULT TRUE,

  -- AI prompt configuration
  ai_prompt_template TEXT,
  confidence_threshold INTEGER DEFAULT 70,

  -- User management
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Metadata
  color_code TEXT DEFAULT '#3b82f6',
  icon_name TEXT DEFAULT 'target',
  sort_order INTEGER DEFAULT 0
);

-- 2. RSS Feeds Table - Manage RSS feeds dynamically
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Feed identification
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Configuration
  refresh_interval INTEGER DEFAULT 3600,
  active BOOLEAN DEFAULT TRUE,
  
  -- PIR targeting
  target_pirs UUID[],
  
  -- Processing configuration
  auto_process BOOLEAN DEFAULT TRUE,
  priority_boost INTEGER DEFAULT 0,
  
  -- Status tracking
  last_fetched TIMESTAMP WITH TIME ZONE,
  last_successful_fetch TIMESTAMP WITH TIME ZONE,
  last_item_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive', 'error', 'rate_limited')) DEFAULT 'active',
  error_message TEXT,
  consecutive_failures INTEGER DEFAULT 0,

  -- User management
  created_by UUID REFERENCES auth.users(id),

  -- Feed metadata
  feed_title TEXT,
  feed_description TEXT,
  last_build_date TIMESTAMP WITH TIME ZONE,
  etag TEXT,
  last_modified TEXT,
  
  -- Configuration
  custom_headers JSONB,
  auth_config JSONB,
  parsing_config JSONB
);

-- 3. RSS Feed Items Table - Store individual RSS items before processing
CREATE TABLE IF NOT EXISTS rss_feed_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  rss_feed_id UUID REFERENCES rss_feeds(id) ON DELETE CASCADE,
  
  -- RSS item data
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  link TEXT,
  pub_date TIMESTAMP WITH TIME ZONE,
  author TEXT,
  categories TEXT[],
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  intelligence_item_id UUID REFERENCES intelligence_items(id),
  processing_error TEXT,
  
  -- Deduplication
  guid TEXT,
  content_hash TEXT UNIQUE,
  
  -- Original data
  raw_data JSONB
);

-- ============================================================================
-- ADD NEW COLUMNS TO EXISTING TABLES (SAFE)
-- ============================================================================

-- Add PIR reference to intelligence_items (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'intelligence_items' AND column_name = 'pir_id'
  ) THEN
    ALTER TABLE intelligence_items ADD COLUMN pir_id UUID;
  END IF;
END $$;

-- Add RSS feed item reference to intelligence_items (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'intelligence_items' AND column_name = 'rss_feed_item_id'
  ) THEN
    ALTER TABLE intelligence_items ADD COLUMN rss_feed_item_id UUID;
  END IF;
END $$;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS (SAFE)
-- ============================================================================

-- Add PIR reference constraint (if doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'intelligence_items_pir_id_fkey'
  ) THEN
    ALTER TABLE intelligence_items ADD CONSTRAINT intelligence_items_pir_id_fkey 
    FOREIGN KEY (pir_id) REFERENCES pirs(id);
  END IF;
END $$;

-- Add RSS feed item reference constraint (if doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'intelligence_items_rss_feed_item_id_fkey'
  ) THEN
    ALTER TABLE intelligence_items ADD CONSTRAINT intelligence_items_rss_feed_item_id_fkey 
    FOREIGN KEY (rss_feed_item_id) REFERENCES rss_feed_items(id);
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR RSS TABLES
-- ============================================================================

-- PIRs indexes
CREATE INDEX IF NOT EXISTS idx_pirs_active ON pirs(active);
CREATE INDEX IF NOT EXISTS idx_pirs_category_code ON pirs(category_code);
CREATE INDEX IF NOT EXISTS idx_pirs_sort_order ON pirs(sort_order);

-- RSS Feeds indexes
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(active);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_last_fetched ON rss_feeds(last_fetched);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_status ON rss_feeds(status);

-- RSS Feed Items indexes
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed_id ON rss_feed_items(rss_feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_processed ON rss_feed_items(processed);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_pub_date ON rss_feed_items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_guid ON rss_feed_items(guid);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_content_hash ON rss_feed_items(content_hash);

-- New indexes for intelligence_items
CREATE INDEX IF NOT EXISTS idx_intelligence_items_pir_id ON intelligence_items(pir_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_rss_feed_item_id ON intelligence_items(rss_feed_item_id);

-- ============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE pirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;

-- PIRs policies
DROP POLICY IF EXISTS "Users can view all PIRs" ON pirs;
CREATE POLICY "Users can view all PIRs" ON pirs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert PIRs" ON pirs;
CREATE POLICY "Users can insert PIRs" ON pirs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update PIRs they created" ON pirs;
CREATE POLICY "Users can update PIRs they created" ON pirs
  FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = updated_by);

-- RSS Feeds policies
DROP POLICY IF EXISTS "Users can view all RSS feeds" ON rss_feeds;
CREATE POLICY "Users can view all RSS feeds" ON rss_feeds
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert RSS feeds" ON rss_feeds;
CREATE POLICY "Users can insert RSS feeds" ON rss_feeds
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update RSS feeds they created" ON rss_feeds;
CREATE POLICY "Users can update RSS feeds they created" ON rss_feeds
  FOR UPDATE USING (auth.uid() = created_by);

-- RSS Feed Items policies
DROP POLICY IF EXISTS "Users can view RSS feed items" ON rss_feed_items;
CREATE POLICY "Users can view RSS feed items" ON rss_feed_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can manage RSS feed items" ON rss_feed_items;
CREATE POLICY "System can manage RSS feed items" ON rss_feed_items
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGERS FOR NEW TABLES
-- ============================================================================

-- Update timestamp trigger function (create if doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_pirs_updated_at ON pirs;
CREATE TRIGGER update_pirs_updated_at 
  BEFORE UPDATE ON pirs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rss_feeds_updated_at ON rss_feeds;
CREATE TRIGGER update_rss_feeds_updated_at 
  BEFORE UPDATE ON rss_feeds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA FOR RSS FUNCTIONALITY
-- ============================================================================

-- Insert default PIRs (only if they don't exist)
INSERT INTO pirs (name, category_code, description, keywords, active, color_code, icon_name, sort_order) VALUES
(
  'Ukraine Conflict', 
  'ukraine', 
  'Frontline movements, political developments, strategic shifts related to Ukraine conflict',
  ARRAY['ukraine', 'ukrainian', 'bakhmut', 'kharkiv', 'frontline', 'military', 'zelensky', 'kiev', 'kyiv', 'donetsk', 'luhansk', 'crimea', 'donbas'],
  true,
  '#0057b7',
  'flag',
  1
),
(
  'Industrial Sabotage', 
  'sabotage', 
  'Infrastructure attacks, facility threats, industrial espionage (focus Eurasia)',
  ARRAY['sabotage', 'infrastructure', 'industrial', 'cyber', 'attack', 'facility', 'power', 'grid', 'scada', 'pipeline', 'energy', 'manufacturing'],
  true,
  '#dc2626',
  'alert-triangle',
  2
),
(
  'Insider Threats', 
  'insider', 
  'Employee security issues, background check problems, internal threats',
  ARRAY['employee', 'insider', 'security', 'clearance', 'background', 'breach', 'access', 'leak', 'staff', 'personnel', 'whistleblower', 'espionage'],
  true,
  '#f59e0b',
  'user-x',
  3
)
ON CONFLICT (category_code) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active PIRs for UI
CREATE OR REPLACE FUNCTION get_active_pirs()
RETURNS TABLE (
  id UUID,
  name TEXT,
  category_code TEXT,
  description TEXT,
  color_code TEXT,
  icon_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.category_code, p.description, p.color_code, p.icon_name
  FROM pirs p
  WHERE p.active = true
  ORDER BY p.sort_order, p.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get RSS feeds for management UI
CREATE OR REPLACE FUNCTION get_rss_feeds_status()
RETURNS TABLE (
  id UUID,
  name TEXT,
  url TEXT,
  active BOOLEAN,
  status TEXT,
  last_fetched TIMESTAMP WITH TIME ZONE,
  last_item_count INTEGER,
  target_pir_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rf.id, 
    rf.name, 
    rf.url, 
    rf.active, 
    rf.status, 
    rf.last_fetched, 
    rf.last_item_count,
    ARRAY(
      SELECT p.name 
      FROM pirs p 
      WHERE p.id = ANY(rf.target_pirs)
    ) as target_pir_names
  FROM rss_feeds rf
  ORDER BY rf.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'RSS-only schema setup completed successfully!' as status,
       'New tables created: 3 (pirs, rss_feeds, rss_feed_items)' as new_tables,
       'Existing tables: UNTOUCHED' as existing_data,
       'New columns added: 2 (pir_id, rss_feed_item_id to intelligence_items)' as new_columns,
       'RSS functionality: ENABLED' as rss_status;
