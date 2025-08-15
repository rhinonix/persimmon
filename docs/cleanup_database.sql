-- Clean Database Script
-- This will remove all test data and reset the system for fresh RSS testing

-- Clear all processing queue items
DELETE FROM processing_queue;

-- Clear all RSS feed items  
DELETE FROM rss_feed_items;

-- Clear all intelligence items
DELETE FROM intelligence_items;

-- Clear user activity logs (optional - keeps audit trail clean)
DELETE FROM user_activity;

-- Reset RSS feeds to inactive state (keeps feed configurations but resets status)
UPDATE rss_feeds SET 
  status = 'inactive',
  last_fetched = NULL,
  last_item_count = 0,
  last_error = NULL;

-- Show what's left after cleanup
SELECT 'RSS Feeds after cleanup:' as status;
SELECT id, name, url, active, status FROM rss_feeds;

SELECT 'Intelligence Items after cleanup:' as status;
SELECT COUNT(*) as count FROM intelligence_items;

SELECT 'RSS Feed Items after cleanup:' as status;
SELECT COUNT(*) as count FROM rss_feed_items;

SELECT 'Processing Queue after cleanup:' as status;
SELECT COUNT(*) as count FROM processing_queue;

SELECT 'Database is now clean and ready for fresh RSS testing!' as status;
