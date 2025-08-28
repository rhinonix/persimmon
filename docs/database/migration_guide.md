# Phase 1 Database Migration Guide

## Overview

This guide walks you through safely backing up and migrating your Persimmon database to support the Phase 1 fixes and enhancements.

## ⚠️ IMPORTANT SAFETY NOTES

- **Always backup before migrating**
- **Test in a development environment first if possible**
- **Have rollback procedures ready**
- **Verify each step before proceeding**

## Step-by-Step Migration Process

### Step 1: Pre-Migration Backup

1. **Open Supabase Dashboard**

   - Go to your Supabase project: https://supabase.com/dashboard/project/gkckzdqnplvsucqkauvl
   - Navigate to SQL Editor

2. **Run Backup Script**

   - Copy the entire contents of `docs/database/phase1_backup.sql`
   - Paste into Supabase SQL Editor
   - Click "Run" to execute
   - **Save the output** - you'll need this for rollback if needed

3. **Verify Backup Success**
   - Check that backup tables were created:
     - `intelligence_items_backup_20250828`
     - `processing_queue_backup_20250828`
   - Note the record counts for verification

### Step 2: Pre-Migration Verification

Run these queries to document current state:

```sql
-- Check current intelligence_items structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'intelligence_items'
ORDER BY ordinal_position;

-- Check current processing_queue structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'processing_queue'
ORDER BY ordinal_position;

-- Check for existing status column (should not exist yet)
SELECT COUNT(*) as status_column_exists
FROM information_schema.columns
WHERE table_name = 'intelligence_items'
  AND column_name = 'status';
```

### Step 3: Execute Migration

1. **Copy Migration Script**

   - Open `docs/database/phase1_migration.sql`
   - Copy the entire contents

2. **Run Migration in Supabase**

   - Paste into SQL Editor
   - **Read through the script first** to understand what it does
   - Click "Run" to execute

3. **Monitor Execution**
   - Watch for any error messages
   - Note the success confirmations
   - Save the output for your records

### Step 4: Post-Migration Verification

Run these verification queries:

```sql
-- Verify new status column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'intelligence_items'
  AND column_name = 'status';

-- Verify concurrency columns were added to processing_queue
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'processing_queue'
  AND column_name IN ('processing_user_id', 'claimed_at', 'processing_timeout');

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('intelligence_items', 'processing_queue')
  AND indexname LIKE '%phase1%';

-- Test status column functionality
SELECT
    status,
    COUNT(*) as count
FROM intelligence_items
GROUP BY status;

-- Verify data integrity
SELECT
    COUNT(*) as total_records,
    COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as records_with_status
FROM intelligence_items;
```

### Step 5: Test Application Integration

1. **Test the Fixed Approval Workflow**

   - Navigate to processor.html
   - Go to Review & Approve tab
   - Try to approve an intelligence item
   - **The original error should be gone**

2. **Verify Database Updates**
   ```sql
   -- Check that approvals update the status column
   SELECT id, title, status, approved, approved_at
   FROM intelligence_items
   WHERE approved = true
   ORDER BY approved_at DESC
   LIMIT 5;
   ```

## Rollback Procedures (If Needed)

If something goes wrong, you can rollback using these steps:

### Emergency Rollback

```sql
-- Drop the new columns if they cause issues
ALTER TABLE intelligence_items DROP COLUMN IF EXISTS status;
ALTER TABLE processing_queue DROP COLUMN IF EXISTS processing_user_id;
ALTER TABLE processing_queue DROP COLUMN IF EXISTS claimed_at;
ALTER TABLE processing_queue DROP COLUMN IF EXISTS processing_timeout;

-- Drop indexes if needed
DROP INDEX IF EXISTS idx_intelligence_items_status_phase1;
DROP INDEX IF EXISTS idx_processing_queue_concurrency_phase1;
DROP INDEX IF EXISTS idx_processing_queue_timeout_phase1;
```

### Full Data Restore (Nuclear Option)

```sql
-- Only use if data corruption occurs
-- This will lose any data created after backup

-- Restore intelligence_items
DROP TABLE intelligence_items;
ALTER TABLE intelligence_items_backup_20250828 RENAME TO intelligence_items;

-- Restore processing_queue
DROP TABLE processing_queue;
ALTER TABLE processing_queue_backup_20250828 RENAME TO processing_queue;

-- Note: You'll need to recreate foreign key constraints after this
```

## Success Criteria

✅ **Migration is successful when:**

- All backup tables created without errors
- Migration script runs without errors
- New columns exist with correct data types
- Indexes are created successfully
- Application approval workflow works without the original error
- Data integrity is maintained (record counts match)

## Troubleshooting

### Common Issues

**Issue: "Column already exists" error**

- Solution: The column was already added. Check if migration was run before.

**Issue: "Permission denied" error**

- Solution: Ensure you're running as database owner/admin in Supabase.

**Issue: "Foreign key constraint" error**

- Solution: Check that referenced tables/columns exist.

### Getting Help

If you encounter issues:

1. **Don't panic** - your data is backed up
2. **Save the error message** - copy the exact error text
3. **Check the rollback procedures** above
4. **Document what happened** for troubleshooting

## Next Steps After Migration

Once migration is complete:

1. Test the approval workflow thoroughly
2. Run the validation procedures in `docs/testing/phase1_validation.md`
3. Update the Phase 1 implementation log
4. Prepare for Phase 2 feature development

---

**Remember: Take your time, verify each step, and don't hesitate to rollback if something doesn't look right.**
