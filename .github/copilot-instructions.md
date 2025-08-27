# Persimmon Intelligence Platform - AI Coding Agent Instructions

## Project Overview
Persimmon is an enterprise intelligence analysis platform that processes corporate security intelligence through AI-powered categorization, RSS feed integration, and dynamic PIR (Priority Intelligence Requirements) management. Built with vanilla JavaScript, Supabase backend, and deployed on Netlify.

## Architecture & Core Components

### Build System
- **Critical**: Always run `./build.sh` before committing - it injects environment variables into `auth.js`
- Source files in `src/` are built to `public/` directory
- Environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLAUDE_API_KEY`) are replaced at build time
- Netlify deploys from `public/` directory, not `src/`

### Authentication Flow
- Client-side auth handled by `src/scripts/auth.js` (becomes `public/assets/js/auth.js`)
- Auto-redirects: unauthenticated users → `/auth/login.html`, authenticated users on auth pages → `/`
- Supabase RLS (Row Level Security) enforces data isolation by `user_id`
- No server-side auth middleware - pure client-side with Supabase

### Database Architecture (Supabase)
- **10-table schema**: `intelligence_items`, `data_sources`, `processing_queue`, `user_activity`, `reports`, `pir_coverage`, `system_metrics`, `pirs`, `rss_feeds`, `rss_feed_items`
- All operations via `src/assets/js/database.js` (`PersimmonDB` global)
- **Caching system**: 30s-10min TTL with localStorage persistence for performance
- **Real-time subscriptions**: Dashboard auto-updates via Supabase channels

### AI Processing Pipeline
1. Content → `processing_queue` table → Supabase Edge Function (`supabase/functions/analyze-intelligence/`)
2. Edge Function calls Claude API with dynamic PIR context
3. Results stored in `intelligence_items` with AI analysis metadata
4. Review workflow: `pending` → `review` → `approved` → `published`

## Development Patterns

### Service Layer Pattern
Each major feature has a dedicated service:
- `PersimmonAuth` - Authentication & session management
- `PersimmonDB` - Database operations with caching
- `PersimmonAI` - AI analysis orchestration
- `Persimmon.rss` - RSS feed processing

### Caching Strategy
```javascript
// Check cache first, fallback to database
const cachedData = PersimmonDB.getCache('dashboardStats');
if (cachedData) return cachedData;
// ... fetch from database, then cache results
PersimmonDB.setCache('dashboardStats', data);
```

### Error Handling Convention
Always provide fallback data for UI resilience:
```javascript
try {
  const data = await PersimmonDB.getStats();
  return data;
} catch (error) {
  console.error('Database error:', error);
  return { totalItems: 247, aiProcessed: 89 }; // Fallback data
}
```

## Key Workflows

### Processing Intelligence Items
1. Upload CSV via processor page OR RSS feed auto-processing
2. Items added to `processing_queue` with `status: 'pending'`
3. AI analysis via Edge Function updates status to `review`
4. Manual review → `approved` → `published` (creates `intelligence_items` record)

### PIR Management
- Default PIRs: "Ukraine Conflict", "Industrial Sabotage", "Insider Threats"
- Dynamic PIRs created via admin interface with custom keywords, confidence thresholds
- AI analysis uses active PIRs to categorize content

### RSS Feed Integration
- Feeds configured with target PIRs in admin interface
- Background processing creates `rss_feed_items` → `processing_queue` → `intelligence_items`
- Duplicate detection via content hash and GUID

## Critical Integration Points

### Supabase Edge Functions
- Located in `supabase/functions/` directory
- `analyze-intelligence`: Core AI processing with Claude API
- Called from client-side AI service, not directly from UI

### Environment Variables (Build-time Injection)
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export CLAUDE_API_KEY="your-claude-key"
./build.sh  # Injects into auth.js
```

### Netlify Configuration
- `netlify.toml`: SPA redirects, no edge functions currently
- Build command: `./build.sh`
- Publishes from `public/` directory

## Common Debugging Approaches

### Dashboard Loading Issues
1. Check browser console for cache status: `[DEBUG] Cache hit/miss: dashboardStats`
2. Verify database connection: Look for "PersimmonDB is available" vs "localStorage fallback"
3. Clear cache: `PersimmonDB.clearCache()` in browser console

### AI Processing Problems
1. Check processing queue status: `SELECT * FROM processing_queue WHERE status = 'failed'`
2. Verify Edge Function logs in Supabase dashboard
3. Test with mock analysis: Set `CLAUDE_API_KEY` to placeholder value

### Build Issues
- Always run `./build.sh` after environment changes
- Check that placeholder values (`__SUPABASE_URL__`) are replaced in `public/assets/js/auth.js`
- Verify all source files copied to `public/` directory structure

## File Organization
```
src/
  scripts/auth.js          # Authentication (injected with env vars)
  assets/js/database.js    # Core database service
  assets/js/ai-service.js  # AI processing orchestration
  pages/                   # HTML pages
public/                    # Built output (deployment target)
supabase/functions/        # Edge functions
netlify.toml               # Deployment configuration
build.sh                   # Build script with env injection
```

## Performance Considerations
- Dashboard queries run in parallel with 30s caching
- Client-side cache persists to localStorage for instant return visits
- Database operations designed for graceful fallback when offline
- Real-time subscriptions only for critical updates (new activity, intelligence items)

When working on this codebase, always consider the enterprise context: reliability over features, fallback data over failures, and clear audit trails for intelligence operations.
