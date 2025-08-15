# RSS Feed Troubleshooting Guide

## Overview

This guide helps diagnose and fix issues with the RSS feed functionality in the Persimmon Intelligence Platform.

## Common Issues and Solutions

### 1. RSS Items Not Appearing in `rss_feed_items` Table

**Symptoms:**

- RSS feeds are being fetched but no items appear in the `rss_feed_items` table
- Console shows "Processing X RSS items" but "Stored 0 new RSS items"

**Causes & Solutions:**

#### A. Database Schema Not Applied

**Check:** Verify the RSS tables exist in your Supabase database

```sql
-- Run this in Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rss_feeds', 'rss_feed_items', 'pirs');
```

**Solution:** Apply the complete schema setup

1. Go to Supabase SQL Editor
2. Run the script in `docs/complete_schema_setup.sql`

#### B. Database Connection Issues

**Check:** Look for database errors in browser console

```javascript
// Test database connection in browser console
await PersimmonDB.testConnection();
```

**Solution:** Verify Supabase configuration in auth.js

#### C. Duplicate Content Hash Issues

**Check:** Look for "Skipping duplicate RSS item" messages in console

**Solution:** This is normal behavior - items are being deduplicated correctly

### 2. RSS Items Stored But Not Converted to Intelligence Items

**Symptoms:**

- Items appear in `rss_feed_items` with `processed = false`
- No corresponding `intelligence_items` created

**Causes & Solutions:**

#### A. Conversion Function Errors

**Check:** Look for "Error converting RSS item to intelligence item" in console

**Solution:** Check the `convertRSSItemToIntelligenceItem` function for errors

#### B. User Authentication Issues

**Check:** Verify user is authenticated

```javascript
// Check in browser console
const user = await PersimmonAuth.getCurrentUser();
console.log("Current user:", user);
```

**Solution:** Ensure user is logged in before RSS processing

### 3. RSS Feeds Not Being Fetched

**Symptoms:**

- No RSS fetch attempts in console logs
- Feed status remains "inactive"

**Causes & Solutions:**

#### A. Feed Not Activated

**Check:** Verify feed is marked as active in database

```sql
SELECT id, name, active, status FROM rss_feeds;
```

**Solution:** Activate the feed

```javascript
await PersimmonRSS.activateFeed("feed-id-here");
```

#### B. CORS Proxy Issues

**Check:** Look for "All CORS proxies failed" errors

**Solution:**

1. Verify Supabase edge function is deployed
2. Test with different RSS feed URLs
3. Check network connectivity

### 4. Database Foreign Key Constraint Errors

**Symptoms:**

- Errors about foreign key constraints when creating intelligence items
- "violates foreign key constraint" messages

**Causes & Solutions:**

#### A. Missing PIR References

**Check:** Verify PIRs exist in database

```sql
SELECT id, name, category_code FROM pirs WHERE active = true;
```

**Solution:** Ensure PIRs are created before processing RSS items

#### B. Invalid RSS Feed References

**Check:** Verify RSS feed exists

```sql
SELECT id, name FROM rss_feeds WHERE id = 'your-feed-id';
```

**Solution:** Ensure feed exists before processing items

## Debugging Steps

### Step 1: Verify Database Schema

```sql
-- Check if all required tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN ('intelligence_items', 'rss_feeds', 'rss_feed_items', 'pirs')
    THEN '✓ Required'
    ELSE '- Optional'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Step 2: Check RSS Feed Configuration

```sql
-- Verify RSS feeds are properly configured
SELECT
  id,
  name,
  url,
  active,
  status,
  last_fetched,
  error_message,
  target_pirs
FROM rss_feeds;
```

### Step 3: Monitor RSS Processing

Open browser console and watch for these log messages:

- `"Persimmon RSS Service initialized"`
- `"Loaded X active RSS feeds"`
- `"Fetching RSS feed: [name]"`
- `"Processing X RSS items for feed [id]"`
- `"Stored X new RSS items"`
- `"Successfully processed X RSS items into intelligence items"`

### Step 4: Check Database Records

```sql
-- Check RSS feed items
SELECT
  rfi.id,
  rfi.title,
  rfi.processed,
  rfi.intelligence_item_id,
  rfi.processing_error,
  rf.name as feed_name
FROM rss_feed_items rfi
JOIN rss_feeds rf ON rfi.rss_feed_id = rf.id
ORDER BY rfi.created_at DESC
LIMIT 10;

-- Check intelligence items from RSS
SELECT
  ii.id,
  ii.title,
  ii.source_type,
  ii.source_name,
  ii.rss_feed_item_id,
  ii.created_at
FROM intelligence_items ii
WHERE ii.source_type = 'rss'
ORDER BY ii.created_at DESC
LIMIT 10;
```

### Step 5: Test Manual RSS Processing

```javascript
// Test RSS processing manually in browser console
const testFeedId = "your-feed-id-here";
try {
  const result = await PersimmonRSS.fetchFeed(testFeedId);
  console.log("Manual fetch result:", result);
} catch (error) {
  console.error("Manual fetch error:", error);
}
```

## Performance Monitoring

### Check RSS Processing Performance

```sql
-- Monitor RSS feed item processing rates
SELECT
  rf.name,
  COUNT(rfi.id) as total_items,
  COUNT(CASE WHEN rfi.processed THEN 1 END) as processed_items,
  COUNT(CASE WHEN rfi.processing_error IS NOT NULL THEN 1 END) as error_items,
  MAX(rfi.created_at) as last_item_date
FROM rss_feeds rf
LEFT JOIN rss_feed_items rfi ON rf.id = rfi.rss_feed_id
GROUP BY rf.id, rf.name
ORDER BY total_items DESC;
```

### Monitor Feed Health

```sql
-- Check feed status and error rates
SELECT
  name,
  status,
  last_fetched,
  last_successful_fetch,
  consecutive_failures,
  error_message,
  last_item_count
FROM rss_feeds
ORDER BY last_fetched DESC;
```

## Common Error Messages

### "User not authenticated"

- **Cause:** RSS processing attempted without valid user session
- **Solution:** Ensure user is logged in before activating RSS feeds

### "All CORS proxies failed"

- **Cause:** Network issues or RSS feed URL problems
- **Solution:** Check RSS feed URL validity and network connectivity

### "Invalid XML format"

- **Cause:** RSS feed returned malformed XML
- **Solution:** Test RSS feed URL in browser, may be temporary issue

### "violates foreign key constraint"

- **Cause:** Referenced PIR or RSS feed doesn't exist
- **Solution:** Ensure all referenced records exist before processing

### "duplicate key value violates unique constraint"

- **Cause:** Attempting to insert duplicate content hash
- **Solution:** This is normal - deduplication is working correctly

## Best Practices

1. **Always apply the complete schema** before testing RSS functionality
2. **Monitor console logs** during RSS processing for early error detection
3. **Test with simple RSS feeds first** before using complex feeds
4. **Verify user authentication** before activating RSS feeds
5. **Check database constraints** if foreign key errors occur
6. **Use the troubleshooting queries** to monitor system health

## Getting Help

If issues persist after following this guide:

1. **Collect Debug Information:**

   - Browser console logs
   - Database query results from Step 4
   - RSS feed URLs being used
   - Supabase project configuration

2. **Check Recent Changes:**

   - Recent code modifications
   - Database schema changes
   - Configuration updates

3. **Test in Isolation:**
   - Try with a single, simple RSS feed
   - Test database operations manually
   - Verify each component individually

## Recovery Procedures

### Reset RSS Processing State

```sql
-- Reset all RSS feed items to unprocessed (use with caution)
UPDATE rss_feed_items
SET processed = false,
    intelligence_item_id = NULL,
    processing_error = NULL
WHERE processing_error IS NOT NULL;
```

### Clean Up Orphaned Records

```sql
-- Find RSS feed items without corresponding intelligence items
SELECT rfi.id, rfi.title
FROM rss_feed_items rfi
LEFT JOIN intelligence_items ii ON rfi.intelligence_item_id = ii.id
WHERE rfi.processed = true AND ii.id IS NULL;
```

### Restart RSS Service

```javascript
// Restart RSS service in browser console
PersimmonRSS.stopScheduler();
setTimeout(() => {
  PersimmonRSS.init();
}, 1000);
```
