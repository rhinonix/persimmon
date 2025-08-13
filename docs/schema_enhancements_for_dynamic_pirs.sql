-- Persimmon Intelligence Platform - Schema Enhancements for Dynamic PIRs and RSS Feeds
-- Execute this AFTER the main schema setup to add support for dynamic PIRs and RSS management

-- ============================================================================
-- NEW TABLES FOR DYNAMIC PIR MANAGEMENT
-- ============================================================================

-- 1. PIRs Table - Define Priority Intelligence Requirements dynamically
CREATE TABLE pirs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- PIR identification
  name TEXT NOT NULL, -- e.g., "Ukraine Conflict", "Industrial Sabotage", "Insider Threats"
  category_code TEXT NOT NULL UNIQUE, -- e.g., "ukraine", "sabotage", "insider", "cyber_threats"
  description TEXT NOT NULL,

  -- PIR configuration
  keywords TEXT[], -- Array of keywords for AI analysis
  priority_weight DECIMAL(3,2) DEFAULT 1.0, -- Multiplier for priority scoring
  active BOOLEAN DEFAULT TRUE,

  -- AI prompt configuration
  ai_prompt_template TEXT, -- Custom prompt template for this PIR
  confidence_threshold INTEGER DEFAULT 70, -- Minimum confidence to flag as relevant

  -- User management
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Metadata
  color_code TEXT DEFAULT '#3b82f6', -- For UI display
  icon_name TEXT DEFAULT 'target', -- For UI display
  sort_order INTEGER DEFAULT 0
);

-- 2. RSS Feeds Table - Manage RSS feeds dynamically
CREATE TABLE rss_feeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Feed identification
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Configuration
  refresh_interval INTEGER DEFAULT 3600, -- Seconds between updates
  active BOOLEAN DEFAULT TRUE,
  
  -- PIR targeting
  target_pirs UUID[], -- Array of PIR IDs this feed should target
  
  -- Processing configuration
  auto_process BOOLEAN DEFAULT TRUE, -- Automatically process new items
  priority_boost INTEGER DEFAULT 0, -- -5 to +5 priority adjustment
  
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
  feed_title TEXT, -- From RSS feed itself
  feed_description TEXT, -- From RSS feed itself
  last_build_date TIMESTAMP WITH TIME ZONE,
  etag TEXT, -- For efficient fetching
  last_modified TEXT, -- For efficient fetching
  
  -- Configuration
  custom_headers JSONB, -- Custom HTTP headers for fetching
  auth_config JSONB, -- Authentication configuration if needed
  parsing_config JSONB -- Custom parsing rules
);

-- 3. RSS Feed Items Table - Store individual RSS items before processing
CREATE TABLE rss_feed_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  rss_feed_id UUID REFERENCES rss_feeds(id) ON DELETE CASCADE,
  
  -- RSS item data
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Full content if available
  link TEXT,
  pub_date TIMESTAMP WITH TIME ZONE,
  author TEXT,
  categories TEXT[], -- RSS categories
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  intelligence_item_id UUID REFERENCES intelligence_items(id),
  
  -- Deduplication
  guid TEXT, -- RSS GUID for deduplication
  content_hash TEXT, -- Hash of content for deduplication
  
  -- Original data
  raw_data JSONB -- Store original RSS item data
);

-- ============================================================================
-- SCHEMA MODIFICATIONS TO EXISTING TABLES
-- ============================================================================

-- Remove hardcoded category constraints from intelligence_items
ALTER TABLE intelligence_items DROP CONSTRAINT IF EXISTS intelligence_items_category_check;

-- Add PIR reference to intelligence_items
ALTER TABLE intelligence_items ADD COLUMN pir_id UUID REFERENCES pirs(id);

-- Update pir_coverage to reference PIRs table
ALTER TABLE pir_coverage DROP CONSTRAINT IF EXISTS pir_coverage_pir_category_check;
ALTER TABLE pir_coverage ADD COLUMN pir_id UUID REFERENCES pirs(id);

-- Add RSS feed reference to intelligence_items
ALTER TABLE intelligence_items ADD COLUMN rss_feed_item_id UUID REFERENCES rss_feed_items(id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- PIRs indexes
CREATE INDEX idx_pirs_active ON pirs(active);
CREATE INDEX idx_pirs_category_code ON pirs(category_code);
CREATE INDEX idx_pirs_sort_order ON pirs(sort_order);

-- RSS Feeds indexes
CREATE INDEX idx_rss_feeds_active ON rss_feeds(active);
CREATE INDEX idx_rss_feeds_last_fetched ON rss_feeds(last_fetched);
CREATE INDEX idx_rss_feeds_status ON rss_feeds(status);

-- RSS Feed Items indexes
CREATE INDEX idx_rss_feed_items_feed_id ON rss_feed_items(rss_feed_id);
CREATE INDEX idx_rss_feed_items_processed ON rss_feed_items(processed);
CREATE INDEX idx_rss_feed_items_pub_date ON rss_feed_items(pub_date DESC);
CREATE INDEX idx_rss_feed_items_guid ON rss_feed_items(guid);
CREATE INDEX idx_rss_feed_items_content_hash ON rss_feed_items(content_hash);

-- Updated indexes for modified tables
CREATE INDEX idx_intelligence_items_pir_id ON intelligence_items(pir_id);
CREATE INDEX idx_pir_coverage_pir_id ON pir_coverage(pir_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE pirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;

-- PIRs policies
CREATE POLICY "Users can view all PIRs" ON pirs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert PIRs" ON pirs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update PIRs they created" ON pirs
  FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = updated_by);

-- RSS Feeds policies
CREATE POLICY "Users can view all RSS feeds" ON rss_feeds
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert RSS feeds" ON rss_feeds
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update RSS feeds they created" ON rss_feeds
  FOR UPDATE USING (auth.uid() = created_by);

-- RSS Feed Items policies (system-managed, users can view)
CREATE POLICY "Users can view RSS feed items" ON rss_feed_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp triggers for new tables
CREATE TRIGGER update_pirs_updated_at 
  BEFORE UPDATE ON pirs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rss_feeds_updated_at 
  BEFORE UPDATE ON rss_feeds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PIR activity logging
CREATE OR REPLACE FUNCTION log_pir_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity (user_id, action, description)
        VALUES (NEW.created_by, 'create_pir', 'Created new PIR: ' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.active != NEW.active THEN
            INSERT INTO user_activity (user_id, action, description)
            VALUES (NEW.updated_by, 
                   CASE WHEN NEW.active THEN 'activate_pir' ELSE 'deactivate_pir' END,
                   'PIR status changed: ' || NEW.name);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER pir_activity_trigger
    AFTER INSERT OR UPDATE ON pirs
    FOR EACH ROW EXECUTE FUNCTION log_pir_activity();

-- RSS Feed activity logging
CREATE OR REPLACE FUNCTION log_rss_feed_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity (user_id, action, description)
        VALUES (NEW.created_by, 'create_rss_feed', 'Added RSS feed: ' || NEW.name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.active != NEW.active THEN
            INSERT INTO user_activity (user_id, action, description)
            VALUES (NEW.created_by, 
                   CASE WHEN NEW.active THEN 'activate_rss_feed' ELSE 'deactivate_rss_feed' END,
                   'RSS feed status changed: ' || NEW.name);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER rss_feed_activity_trigger
    AFTER INSERT OR UPDATE ON rss_feeds
    FOR EACH ROW EXECUTE FUNCTION log_rss_feed_activity();

-- ============================================================================
-- MIGRATION DATA - Convert hardcoded PIRs to dynamic PIRs
-- ============================================================================

-- Insert the current hardcoded PIRs as dynamic PIRs
INSERT INTO pirs (name, category_code, description, keywords, active, color_code, icon_name, sort_order) VALUES
(
  'Ukraine Conflict', 
  'ukraine', 
  'Frontline movements, political developments, strategic shifts related to Ukraine conflict',
  ARRAY['ukraine', 'ukrainian', 'bakhmut', 'kharkiv', 'frontline', 'military', 'zelensky', 'kiev', 'kyiv', 'donetsk', 'luhansk', 'crimea', 'donbas'],
  true,
  '#0057b7', -- Ukraine blue
  'flag',
  1
),
(
  'Industrial Sabotage', 
  'sabotage', 
  'Infrastructure attacks, facility threats, industrial espionage (focus Eurasia)',
  ARRAY['sabotage', 'infrastructure', 'industrial', 'cyber', 'attack', 'facility', 'power', 'grid', 'scada', 'pipeline', 'energy', 'manufacturing'],
  true,
  '#dc2626', -- Red
  'alert-triangle',
  2
),
(
  'Insider Threats', 
  'insider', 
  'Employee security issues, background check problems, internal threats',
  ARRAY['employee', 'insider', 'security', 'clearance', 'background', 'breach', 'access', 'leak', 'staff', 'personnel', 'whistleblower', 'espionage'],
  true,
  '#f59e0b', -- Amber
  'user-x',
  3
);

-- Update existing intelligence_items to reference PIRs
UPDATE intelligence_items 
SET pir_id = (SELECT id FROM pirs WHERE category_code = intelligence_items.category)
WHERE category IN ('ukraine', 'sabotage', 'insider');

-- Update existing pir_coverage to reference PIRs
UPDATE pir_coverage 
SET pir_id = (SELECT id FROM pirs WHERE category_code = pir_coverage.pir_category)
WHERE pir_category IN ('ukraine', 'sabotage', 'insider');

-- ============================================================================
-- HELPER FUNCTIONS FOR APPLICATION USE
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
-- SAMPLE RSS FEEDS DATA
-- ============================================================================

-- Get PIR IDs for sample data
DO $$
DECLARE
  ukraine_pir_id UUID;
  sabotage_pir_id UUID;
  insider_pir_id UUID;
BEGIN
  SELECT id INTO ukraine_pir_id FROM pirs WHERE category_code = 'ukraine';
  SELECT id INTO sabotage_pir_id FROM pirs WHERE category_code = 'sabotage';
  SELECT id INTO insider_pir_id FROM pirs WHERE category_code = 'insider';

  -- Insert sample RSS feeds
  INSERT INTO rss_feeds (name, url, description, target_pirs, active, created_by) VALUES
  (
    'Security Week', 
    'https://www.securityweek.com/feed/',
    'Cybersecurity and information security news',
    ARRAY[sabotage_pir_id, insider_pir_id],
    false, -- Start inactive for manual activation
    (SELECT id FROM auth.users LIMIT 1) -- Use first user, or NULL if no users yet
  ),
  (
    'Defense News', 
    'https://www.defensenews.com/rss/',
    'Military and defense industry news',
    ARRAY[ukraine_pir_id, sabotage_pir_id],
    false,
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Krebs on Security', 
    'https://krebsonsecurity.com/feed/',
    'In-depth security journalism',
    ARRAY[sabotage_pir_id, insider_pir_id],
    false,
    (SELECT id FROM auth.users LIMIT 1)
  );
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Dynamic PIRs and RSS Feeds schema enhancement completed!' as status,
       'New tables created: 3 (pirs, rss_feeds, rss_feed_items)' as new_tables,
       'Schema modifications: intelligence_items, pir_coverage updated' as modifications,
       'Sample PIRs inserted: 3 (Ukraine, Sabotage, Insider)' as sample_data,
       'Sample RSS feeds inserted: 3 (SecurityWeek, DefenseNews, KrebsOnSecurity)' as sample_feeds;
