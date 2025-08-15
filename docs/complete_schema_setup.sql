-- Persimmon Intelligence Platform - Complete Database Schema Setup
-- Execute this script in your Supabase SQL Editor to create all tables with RSS support
-- This consolidates the base schema and RSS enhancements into one complete setup

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Intelligence Items Table
CREATE TABLE IF NOT EXISTS intelligence_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Content fields
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  quote TEXT,

  -- Classification fields (now supports dynamic PIRs)
  category TEXT DEFAULT 'none', -- Legacy field for backward compatibility
  pir_id UUID, -- Will reference pirs(id) after PIRs table is created
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'low',
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),

  -- Source information
  source_name TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('csv', 'rss', 'manual', 'api')) DEFAULT 'manual',
  original_url TEXT,
  author TEXT,
  rss_feed_item_id UUID, -- Will reference rss_feed_items(id) after RSS tables are created

  -- Processing information
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_reasoning TEXT,
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',

  -- Metadata
  location TEXT,
  date_occurred TIMESTAMP WITH TIME ZONE,
  sentiment TEXT,
  tags TEXT[], -- Array of tags

  -- User interaction
  user_id UUID REFERENCES auth.users(id),
  analyst_comment TEXT,
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Original data preservation
  original_data JSONB -- Store original CSV/API data
);

-- 2. Data Sources Table
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('csv', 'rss', 'api', 'manual')) NOT NULL,
  description TEXT,

  -- Configuration
  url TEXT, -- For RSS feeds or API endpoints
  refresh_interval INTEGER DEFAULT 3600, -- Seconds between updates
  active BOOLEAN DEFAULT TRUE,

  -- Status tracking
  last_updated TIMESTAMP WITH TIME ZONE,
  last_item_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'active',
  error_message TEXT,

  -- User management
  created_by UUID REFERENCES auth.users(id),

  -- Configuration data
  config JSONB -- Store source-specific configuration
);

-- 3. Processing Queue Table
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  intelligence_item_id UUID REFERENCES intelligence_items(id) ON DELETE CASCADE,

  -- Queue management
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')) DEFAULT 'pending',
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Processing details
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER,

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Results
  ai_analysis JSONB -- Store the full AI analysis result
);

-- 4. User Activity Table
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  user_id UUID REFERENCES auth.users(id),

  -- Activity details
  action TEXT NOT NULL, -- 'upload', 'approve', 'generate_report', 'login', etc.
  description TEXT NOT NULL,

  -- Context
  intelligence_item_id UUID REFERENCES intelligence_items(id),
  report_id UUID, -- Will reference reports table

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  additional_data JSONB
);

-- 5. Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('weekly', 'monthly', 'ad_hoc', 'pir_summary')) DEFAULT 'weekly',

  -- Content
  content TEXT NOT NULL, -- Markdown or HTML content
  summary TEXT,

  -- Time period covered
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,

  -- Classification
  classification TEXT DEFAULT 'Internal Use Only',

  -- Generation details
  generated_by UUID REFERENCES auth.users(id),
  generation_method TEXT CHECK (generation_method IN ('manual', 'automated')) DEFAULT 'manual',

  -- Items included in report
  intelligence_items UUID[], -- Array of intelligence_item IDs
  item_count INTEGER DEFAULT 0,

  -- Status
  status TEXT CHECK (status IN ('draft', 'final', 'archived')) DEFAULT 'draft',

  -- Metadata
  tags TEXT[],
  additional_data JSONB
);

-- 6. System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metric identification
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL, -- 'performance', 'usage', 'cost', 'accuracy'

  -- Values
  value_numeric DECIMAL(10,4),
  value_text TEXT,
  value_json JSONB,

  -- Context
  time_period TEXT, -- 'hourly', 'daily', 'weekly', 'monthly'
  additional_context JSONB
);

-- ============================================================================
-- DYNAMIC PIR AND RSS TABLES
-- ============================================================================

-- 7. PIRs Table - Define Priority Intelligence Requirements dynamically
CREATE TABLE IF NOT EXISTS pirs (
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

-- 8. RSS Feeds Table - Manage RSS feeds dynamically
CREATE TABLE IF NOT EXISTS rss_feeds (
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

-- 9. RSS Feed Items Table - Store individual RSS items before processing
CREATE TABLE IF NOT EXISTS rss_feed_items (
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
  processing_error TEXT, -- Store any processing errors
  
  -- Deduplication
  guid TEXT, -- RSS GUID for deduplication
  content_hash TEXT UNIQUE, -- Hash of content for deduplication
  
  -- Original data
  raw_data JSONB -- Store original RSS item data
);

-- 10. PIR Coverage Table (updated to reference PIRs table)
CREATE TABLE IF NOT EXISTS pir_coverage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- PIR reference (now dynamic)
  pir_id UUID REFERENCES pirs(id) ON DELETE CASCADE,
  pir_name TEXT NOT NULL, -- Cached for performance
  pir_category TEXT NOT NULL, -- Cached category_code

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Metrics
  total_items INTEGER DEFAULT 0,
  high_priority_items INTEGER DEFAULT 0,
  medium_priority_items INTEGER DEFAULT 0,
  low_priority_items INTEGER DEFAULT 0,

  -- Coverage quality
  avg_confidence DECIMAL(5,2),
  ai_processed_count INTEGER DEFAULT 0,
  manual_count INTEGER DEFAULT 0,

  -- RSS feed contribution
  rss_items_count INTEGER DEFAULT 0,
  csv_items_count INTEGER DEFAULT 0,
  manual_items_count INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS (after all tables are created)
-- ============================================================================

-- Add PIR reference to intelligence_items
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

-- Add RSS feed item reference to intelligence_items
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
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Intelligence Items Indexes
CREATE INDEX IF NOT EXISTS idx_intelligence_items_category ON intelligence_items(category);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_priority ON intelligence_items(priority);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_created_at ON intelligence_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_ai_processed ON intelligence_items(ai_processed);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_user_id ON intelligence_items(user_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_processing_status ON intelligence_items(processing_status);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_pir_id ON intelligence_items(pir_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_items_rss_feed_item_id ON intelligence_items(rss_feed_item_id);

-- Data Sources Indexes
CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(active);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);

-- Processing Queue Indexes
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_processing_queue_intelligence_item ON processing_queue(intelligence_item_id);

-- User Activity Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);

-- Reports Indexes
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

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

-- PIR Coverage Indexes
CREATE INDEX IF NOT EXISTS idx_pir_coverage_pir_id ON pir_coverage(pir_id);
CREATE INDEX IF NOT EXISTS idx_pir_coverage_category ON pir_coverage(pir_category);
CREATE INDEX IF NOT EXISTS idx_pir_coverage_period ON pir_coverage(period_start, period_end);

-- System Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_category ON system_metrics(metric_category);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE intelligence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pir_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE rss_feed_items ENABLE ROW LEVEL SECURITY;

-- Intelligence Items Policies
DROP POLICY IF EXISTS "Users can view all intelligence items" ON intelligence_items;
CREATE POLICY "Users can view all intelligence items" ON intelligence_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert intelligence items" ON intelligence_items;
CREATE POLICY "Users can insert intelligence items" ON intelligence_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own intelligence items" ON intelligence_items;
CREATE POLICY "Users can update their own intelligence items" ON intelligence_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Data Sources Policies
DROP POLICY IF EXISTS "Users can view all data sources" ON data_sources;
CREATE POLICY "Users can view all data sources" ON data_sources
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert data sources" ON data_sources;
CREATE POLICY "Users can insert data sources" ON data_sources
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own data sources" ON data_sources;
CREATE POLICY "Users can update their own data sources" ON data_sources
  FOR UPDATE USING (auth.uid() = created_by);

-- Processing Queue Policies
DROP POLICY IF EXISTS "Users can view processing queue" ON processing_queue;
CREATE POLICY "Users can view processing queue" ON processing_queue
  FOR SELECT USING (auth.role() = 'authenticated');

-- User Activity Policies
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity" ON user_activity;
CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports Policies
DROP POLICY IF EXISTS "Users can view all reports" ON reports;
CREATE POLICY "Users can view all reports" ON reports
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert reports" ON reports;
CREATE POLICY "Users can insert reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = generated_by);

DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
CREATE POLICY "Users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = generated_by);

-- PIR Coverage Policies (read-only for all authenticated users)
DROP POLICY IF EXISTS "Users can view PIR coverage" ON pir_coverage;
CREATE POLICY "Users can view PIR coverage" ON pir_coverage
  FOR SELECT USING (auth.role() = 'authenticated');

-- System Metrics Policies (read-only for all authenticated users)
DROP POLICY IF EXISTS "Users can view system metrics" ON system_metrics;
CREATE POLICY "Users can view system metrics" ON system_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

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

-- RSS Feed Items policies (system-managed, users can view)
DROP POLICY IF EXISTS "Users can view RSS feed items" ON rss_feed_items;
CREATE POLICY "Users can view RSS feed items" ON rss_feed_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "System can manage RSS feed items" ON rss_feed_items;
CREATE POLICY "System can manage RSS feed items" ON rss_feed_items
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp triggers to relevant tables
DROP TRIGGER IF EXISTS update_intelligence_items_updated_at ON intelligence_items;
CREATE TRIGGER update_intelligence_items_updated_at 
  BEFORE UPDATE ON intelligence_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
CREATE TRIGGER update_data_sources_updated_at 
  BEFORE UPDATE ON data_sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_processing_queue_updated_at ON processing_queue;
CREATE TRIGGER update_processing_queue_updated_at 
  BEFORE UPDATE ON processing_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at 
  BEFORE UPDATE ON reports 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pir_coverage_updated_at ON pir_coverage;
CREATE TRIGGER update_pir_coverage_updated_at 
  BEFORE UPDATE ON pir_coverage 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pirs_updated_at ON pirs;
CREATE TRIGGER update_pirs_updated_at 
  BEFORE UPDATE ON pirs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rss_feeds_updated_at ON rss_feeds;
CREATE TRIGGER update_rss_feeds_updated_at 
  BEFORE UPDATE ON rss_feeds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity logging trigger function
CREATE OR REPLACE FUNCTION log_intelligence_item_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO user_activity (user_id, action, description, intelligence_item_id)
        VALUES (NEW.user_id, 'create_item', 'Created new intelligence item: ' || NEW.title, NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.approved != NEW.approved AND NEW.approved = TRUE THEN
            INSERT INTO user_activity (user_id, action, description, intelligence_item_id)
            VALUES (NEW.approved_by, 'approve_item', 'Approved intelligence item: ' || NEW.title, NEW.id);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS intelligence_item_activity_trigger ON intelligence_items;
CREATE TRIGGER intelligence_item_activity_trigger
    AFTER INSERT OR UPDATE ON intelligence_items
    FOR EACH ROW EXECUTE FUNCTION log_intelligence_item_activity();

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default data sources
INSERT INTO data_sources (name, type, description, active) VALUES
('Manual Entry', 'manual', 'Manually entered intelligence items', true),
('Liferaft CSV', 'csv', 'CSV exports from Liferaft platform', true),
('GDELT API', 'api', 'Global Database of Events, Language, and Tone', false),
('RSS Security Feeds', 'rss', 'Aggregated security news RSS feeds', false)
ON CONFLICT (name) DO NOTHING;

-- Insert initial system metrics
INSERT INTO system_metrics (metric_name, metric_category, value_numeric, time_period) VALUES
('processing_accuracy', 'performance', 94.0, 'daily'),
('avg_processing_time_ms', 'performance', 2300, 'daily'),
('monthly_cost_usd', 'cost', 47.0, 'monthly'),
('system_uptime_percent', 'performance', 99.2, 'daily')
ON CONFLICT DO NOTHING;

-- Insert default PIRs
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
)
ON CONFLICT (category_code) DO NOTHING;

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
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Persimmon Intelligence Platform complete database schema setup finished!' as status,
       'Tables created/updated: 10' as tables_created,
       'Indexes created: 25+' as indexes_created,
       'RLS policies created: 15+' as policies_created,
       'Triggers created: 8' as triggers_created,
       'Helper functions created: 2' as functions_created,
       'Initial data rows inserted: 10+' as initial_data,
       'RSS feed functionality: ENABLED' as rss_status;
