# Persimmon Intelligence Platform - Database Schema Design

## Overview

This document outlines the comprehensive database schema for the Persimmon Intelligence Platform, designed to replace the current localStorage-based mock data with persistent Supabase database storage.

## Core Tables

### 1. intelligence_items

Primary table for storing all intelligence items processed through the platform.

```sql
CREATE TABLE intelligence_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Content fields
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  quote TEXT,

  -- Classification fields
  category TEXT CHECK (category IN ('ukraine', 'sabotage', 'insider', 'none')) DEFAULT 'none',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'low',
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),

  -- Source information
  source_name TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('csv', 'rss', 'manual', 'api')) DEFAULT 'manual',
  original_url TEXT,
  author TEXT,

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

-- Indexes for performance
CREATE INDEX idx_intelligence_items_category ON intelligence_items(category);
CREATE INDEX idx_intelligence_items_priority ON intelligence_items(priority);
CREATE INDEX idx_intelligence_items_created_at ON intelligence_items(created_at DESC);
CREATE INDEX idx_intelligence_items_ai_processed ON intelligence_items(ai_processed);
CREATE INDEX idx_intelligence_items_user_id ON intelligence_items(user_id);
CREATE INDEX idx_intelligence_items_processing_status ON intelligence_items(processing_status);
```

### 2. data_sources

Track and manage different data sources feeding into the platform.

```sql
CREATE TABLE data_sources (
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

-- Indexes
CREATE INDEX idx_data_sources_active ON data_sources(active);
CREATE INDEX idx_data_sources_type ON data_sources(type);
```

### 3. processing_queue

Manage the AI processing queue for intelligence items.

```sql
CREATE TABLE processing_queue (
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

-- Indexes
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_priority ON processing_queue(priority DESC, created_at ASC);
CREATE INDEX idx_processing_queue_intelligence_item ON processing_queue(intelligence_item_id);
```

### 4. user_activity

Track user actions and system events for audit and dashboard purposes.

```sql
CREATE TABLE user_activity (
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

-- Indexes
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX idx_user_activity_action ON user_activity(action);
```

### 5. reports

Store generated intelligence reports.

```sql
CREATE TABLE reports (
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

-- Indexes
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);
CREATE INDEX idx_reports_status ON reports(status);
```

### 6. pir_coverage

Track Priority Intelligence Requirements coverage and metrics.

```sql
CREATE TABLE pir_coverage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- PIR details
  pir_name TEXT NOT NULL, -- 'Ukraine', 'Industrial Sabotage', 'Insider Threats'
  pir_category TEXT CHECK (pir_category IN ('ukraine', 'sabotage', 'insider')) NOT NULL,

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

  -- Metadata
  notes TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pir_coverage_category ON pir_coverage(pir_category);
CREATE INDEX idx_pir_coverage_period ON pir_coverage(period_start, period_end);
```

### 7. system_metrics

Store system performance and usage metrics for dashboard display.

```sql
CREATE TABLE system_metrics (
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

-- Indexes
CREATE INDEX idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_system_metrics_category ON system_metrics(metric_category);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables

```sql
ALTER TABLE intelligence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pir_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
```

### Basic policies (authenticated users can access their own data)

```sql
-- Intelligence items: users can see all items, but only modify their own
CREATE POLICY "Users can view all intelligence items" ON intelligence_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert intelligence items" ON intelligence_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own intelligence items" ON intelligence_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Data sources: users can see all, but only modify their own
CREATE POLICY "Users can view all data sources" ON data_sources
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert data sources" ON data_sources
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own data sources" ON data_sources
  FOR UPDATE USING (auth.uid() = created_by);

-- Processing queue: system-managed, users can view
CREATE POLICY "Users can view processing queue" ON processing_queue
  FOR SELECT USING (auth.role() = 'authenticated');

-- User activity: users can see their own activity
CREATE POLICY "Users can view their own activity" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports: users can see all, modify their own
CREATE POLICY "Users can view all reports" ON reports
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own reports" ON reports
  FOR UPDATE USING (auth.uid() = generated_by);

-- PIR coverage and system metrics: read-only for all authenticated users
CREATE POLICY "Users can view PIR coverage" ON pir_coverage
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view system metrics" ON system_metrics
  FOR SELECT USING (auth.role() = 'authenticated');
```

## Functions and Triggers

### Update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_intelligence_items_updated_at BEFORE UPDATE ON intelligence_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processing_queue_updated_at BEFORE UPDATE ON processing_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pir_coverage_updated_at BEFORE UPDATE ON pir_coverage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Activity logging trigger

```sql
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

CREATE TRIGGER intelligence_item_activity_trigger
    AFTER INSERT OR UPDATE ON intelligence_items
    FOR EACH ROW EXECUTE FUNCTION log_intelligence_item_activity();
```

## Initial Data Setup

### Default data sources

```sql
INSERT INTO data_sources (name, type, description, active) VALUES
('Manual Entry', 'manual', 'Manually entered intelligence items', true),
('Liferaft CSV', 'csv', 'CSV exports from Liferaft platform', true),
('GDELT API', 'api', 'Global Database of Events, Language, and Tone', false),
('RSS Security Feeds', 'rss', 'Aggregated security news RSS feeds', false);
```

### System metrics initialization

```sql
INSERT INTO system_metrics (metric_name, metric_category, value_numeric, time_period) VALUES
('processing_accuracy', 'performance', 94.0, 'daily'),
('avg_processing_time_ms', 'performance', 2300, 'daily'),
('monthly_cost_usd', 'cost', 47.0, 'monthly'),
('system_uptime_percent', 'performance', 99.2, 'daily');
```

## Migration Strategy

1. **Phase 1**: Create all tables and basic policies
2. **Phase 2**: Migrate existing localStorage data to database
3. **Phase 3**: Update application code to use database queries
4. **Phase 4**: Implement real-time subscriptions
5. **Phase 5**: Add advanced features (automated PIR coverage calculation, etc.)

## Performance Considerations

- All tables include appropriate indexes for common query patterns
- JSONB fields used for flexible metadata storage
- Row Level Security ensures data isolation
- Triggers handle automatic timestamp updates and activity logging
- UUID primary keys for distributed system compatibility

## Security Notes

- All tables use Row Level Security (RLS)
- User data is isolated by auth.uid()
- Sensitive operations require authentication
- Activity logging provides audit trail
- Original data preserved in JSONB fields for forensics
