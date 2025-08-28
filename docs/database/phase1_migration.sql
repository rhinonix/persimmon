-- Phase 1 Database Migration Script
-- Critical Fixes & Foundation
-- Date: 2025-08-28

-- ============================================================================
-- BACKUP INSTRUCTIONS
-- ============================================================================
-- Before running this migration, create a backup:
-- pg_dump your_database > backup_before_phase1_$(date +%Y%m%d_%H%M%S).sql

-- ============================================================================
-- 1. ADD STATUS COLUMN TO INTELLIGENCE_ITEMS
-- ============================================================================
-- This column tracks the workflow state of intelligence items
-- Values: 'pending', 'processing', 'reviewed', 'approved', 'rejected'

DO $$ 
BEGIN
    -- Check if status column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'intelligence_items' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE intelligence_items 
        ADD COLUMN status TEXT 
        CHECK (status IN ('pending', 'processing', 'reviewed', 'approved', 'rejected')) 
        DEFAULT 'pending';
        
        RAISE NOTICE 'Added status column to intelligence_items table';
    ELSE
        RAISE NOTICE 'Status column already exists in intelligence_items table';
    END IF;
END $$;

-- ============================================================================
-- 2. ADD CONCURRENCY CONTROL COLUMNS TO PROCESSING_QUEUE
-- ============================================================================
-- These columns enable multi-user processing without conflicts

DO $$ 
BEGIN
    -- Add processing_user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processing_queue' 
        AND column_name = 'processing_user_id'
    ) THEN
        ALTER TABLE processing_queue 
        ADD COLUMN processing_user_id UUID REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added processing_user_id column to processing_queue table';
    END IF;
    
    -- Add claimed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processing_queue' 
        AND column_name = 'claimed_at'
    ) THEN
        ALTER TABLE processing_queue 
        ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added claimed_at column to processing_queue table';
    END IF;
    
    -- Add processing_timeout column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'processing_queue' 
        AND column_name = 'processing_timeout'
    ) THEN
        ALTER TABLE processing_queue 
        ADD COLUMN processing_timeout TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added processing_timeout column to processing_queue table';
    END IF;
END $$;

-- ============================================================================
-- 3. UPDATE EXISTING DATA
-- ============================================================================
-- Set appropriate status for existing intelligence items

DO $$
BEGIN
    -- Set status based on current approved field
    UPDATE intelligence_items 
    SET status = CASE 
        WHEN approved = true THEN 'approved'
        WHEN ai_processed = true THEN 'reviewed'
        ELSE 'pending'
    END
    WHERE status IS NULL OR status = 'pending';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated status for % existing intelligence items', updated_count;
END $$;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Add indexes for the new columns to ensure good query performance

-- Index on intelligence_items.status for filtering
CREATE INDEX IF NOT EXISTS idx_intelligence_items_status 
ON intelligence_items(status);

-- Index on processing_queue.processing_user_id for concurrency queries
CREATE INDEX IF NOT EXISTS idx_processing_queue_user 
ON processing_queue(processing_user_id);

-- Index on processing_queue.claimed_at for timeout queries
CREATE INDEX IF NOT EXISTS idx_processing_queue_claimed_at 
ON processing_queue(claimed_at);

-- Composite index for processing queue status queries
CREATE INDEX IF NOT EXISTS idx_processing_queue_status_priority 
ON processing_queue(status, priority DESC, created_at ASC);

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful

-- Verify intelligence_items status column
SELECT 
    'intelligence_items.status' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'intelligence_items' AND column_name = 'status'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as result;

-- Verify processing_queue concurrency columns
SELECT 
    'processing_queue concurrency columns' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'processing_queue' AND column_name = 'processing_user_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'processing_queue' AND column_name = 'claimed_at'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'processing_queue' AND column_name = 'processing_timeout'
        ) THEN 'PASS' 
        ELSE 'FAIL' 
    END as result;

-- Check status distribution
SELECT 
    status,
    COUNT(*) as count
FROM intelligence_items 
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- Uncomment and run these commands if you need to rollback the migration

/*
-- Remove added columns (WARNING: This will lose data)
ALTER TABLE intelligence_items DROP COLUMN IF EXISTS status;
ALTER TABLE processing_queue DROP COLUMN IF EXISTS processing_user_id;
ALTER TABLE processing_queue DROP COLUMN IF EXISTS claimed_at;
ALTER TABLE processing_queue DROP COLUMN IF EXISTS processing_timeout;

-- Drop added indexes
DROP INDEX IF EXISTS idx_intelligence_items_status;
DROP INDEX IF EXISTS idx_processing_queue_user;
DROP INDEX IF EXISTS idx_processing_queue_claimed_at;
DROP INDEX IF EXISTS idx_processing_queue_status_priority;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
SELECT 'Phase 1 database migration completed successfully!' as status;
