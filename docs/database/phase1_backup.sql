-- Phase 1 Database Backup Script
-- Created: 2025-08-28
-- Purpose: Complete backup before Phase 1 migration
-- Project: Persimmon Intelligence Platform

-- =====================================================
-- BACKUP INSTRUCTIONS
-- =====================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Save the output to a file for rollback purposes
-- 3. This creates a complete snapshot of current state

-- =====================================================
-- TABLE STRUCTURE BACKUP
-- =====================================================

-- Backup intelligence_items table structure and data
CREATE TABLE IF NOT EXISTS intelligence_items_backup_20250828 AS 
SELECT * FROM intelligence_items;

-- Backup processing_queue table structure and data  
CREATE TABLE IF NOT EXISTS processing_queue_backup_20250828 AS 
SELECT * FROM processing_queue;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify backup table creation
SELECT 
    'intelligence_items_backup_20250828' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM intelligence_items_backup_20250828

UNION ALL

SELECT 
    'processing_queue_backup_20250828' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM processing_queue_backup_20250828;

-- =====================================================
-- CURRENT SCHEMA DOCUMENTATION
-- =====================================================

-- Document current intelligence_items columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'intelligence_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Document current processing_queue columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'processing_queue' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- CONSTRAINTS AND INDEXES BACKUP
-- =====================================================

-- Document current constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('intelligence_items', 'processing_queue')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Document current indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('intelligence_items', 'processing_queue')
    AND schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- DATA STATISTICS
-- =====================================================

-- Current data statistics
SELECT 
    'intelligence_items' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN approved = true THEN 1 END) as approved_count,
    COUNT(CASE WHEN ai_processed = true THEN 1 END) as ai_processed_count,
    COUNT(DISTINCT category) as unique_categories,
    COUNT(DISTINCT priority) as unique_priorities
FROM intelligence_items

UNION ALL

SELECT 
    'processing_queue' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
FROM processing_queue;

-- =====================================================
-- BACKUP COMPLETION CONFIRMATION
-- =====================================================

SELECT 
    'BACKUP COMPLETED' as status,
    NOW() as backup_timestamp,
    'Phase 1 backup tables created successfully' as message;
