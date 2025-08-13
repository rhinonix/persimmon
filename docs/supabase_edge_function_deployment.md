# Supabase Edge Function Deployment Guide

## Overview

This guide explains how to deploy the `analyze-intelligence` Edge Function to enable real AI processing via Claude API while avoiding CORS restrictions.

## Prerequisites

1. **Supabase CLI installed**:

   ```bash
   npm install -g supabase
   ```

2. **Supabase project set up** with your database already configured

3. **Claude API key** from Anthropic Console

## Deployment Steps

### 1. Initialize Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your existing project
# YOUR_PROJECT_REF is found in your Supabase project URL
# Example: https://abcdefghijklmnop.supabase.co → project ref is "abcdefghijklmnop"
supabase link --project-ref YOUR_PROJECT_REF
```

**Finding Your Project Reference:**

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your Persimmon project
3. Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
4. Or check your project settings → General → Reference ID
5. It's also in your `SUPABASE_URL`: `https://YOUR_PROJECT_REF.supabase.co`

### 2. Deploy the Edge Function

```bash
# Deploy the analyze-intelligence function
supabase functions deploy analyze-intelligence

# Verify deployment
supabase functions list
```

### 3. Set Environment Variables

```bash
# Set Claude API key in Supabase
supabase secrets set CLAUDE_API_KEY=sk-ant-api03-your-claude-api-key-here

# Verify secrets
supabase secrets list
```

### 4. Test the Edge Function

```bash
# Test with sample data
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-intelligence' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Ukrainian forces report breakthrough near Bakhmut sector",
    "source": "test",
    "metadata": {
      "location": "Ukraine",
      "date": "2025-01-13"
    }
  }'
```

## Configuration in Persimmon

### Environment Variables Required

Add these to your Netlify environment variables:

```bash
# Existing Supabase configuration
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Claude API key (also set in Supabase secrets)
CLAUDE_API_KEY=sk-ant-api03-your-claude-api-key-here
```

### How It Works

1. **Browser** → Calls `PersimmonAI.analyzeContent()`
2. **AI Service** → Detects Supabase client available
3. **Edge Function** → Makes server-side call to Claude API
4. **Claude API** → Returns analysis results
5. **Browser** → Receives processed analysis

## Edge Function Features

### Input Format

```json
{
  "content": "Text to analyze",
  "source": "Source identifier",
  "metadata": {
    "location": "Geographic location",
    "author": "Content author",
    "date": "Content date"
  },
  "pirs": [
    {
      "name": "PIR Name",
      "category": "ukraine|sabotage|insider",
      "description": "PIR description",
      "keywords": ["keyword1", "keyword2"],
      "confidenceThreshold": 70
    }
  ]
}
```

### Output Format

```json
{
  "relevant": true,
  "category": "ukraine",
  "priority": "high",
  "confidence": 87,
  "title": "Ukraine: Forces Report Breakthrough Near Bakhmut",
  "summary": "Ukrainian military units secured strategic positions...",
  "quote": "breakthrough near Bakhmut sector",
  "reasoning": "High confidence due to specific military details",
  "tags": ["conflict", "military", "ukraine"]
}
```

## Security Features

- **CORS Headers**: Properly configured for browser access
- **Authentication**: Requires Supabase anon key
- **Input Validation**: Content length limits and sanitization
- **Error Handling**: Comprehensive error responses
- **Rate Limiting**: Handled by client-side service

## Monitoring & Debugging

### View Function Logs

```bash
# Real-time logs
supabase functions logs analyze-intelligence --follow

# Recent logs
supabase functions logs analyze-intelligence
```

### Common Issues

1. **"Claude API key not configured"**

   - Ensure `CLAUDE_API_KEY` is set in Supabase secrets
   - Verify secret name matches exactly

2. **"Authorization failed"**

   - Check `SUPABASE_ANON_KEY` in Netlify environment variables
   - Ensure anon key has proper permissions

3. **"Function not found"**
   - Verify function deployed: `supabase functions list`
   - Check function name matches: `analyze-intelligence`

## Cost Considerations

- **Claude API**: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- **Supabase Edge Functions**: 500K invocations free, then $2 per 1M
- **Typical Analysis**: ~500 input tokens, ~200 output tokens = ~$0.005 per analysis

## Performance

- **Cold Start**: ~2-3 seconds for first request
- **Warm Requests**: ~500ms-1s typical response time
- **Concurrent Requests**: Automatically scaled by Supabase
- **Rate Limiting**: Handled client-side (50 requests/minute)

## Updating the Function

```bash
# Make changes to supabase/functions/analyze-intelligence/index.ts
# Then redeploy
supabase functions deploy analyze-intelligence

# Update secrets if needed
supabase secrets set CLAUDE_API_KEY=new-key-here
```

## Rollback Plan

If issues occur, you can quickly disable real AI processing:

1. **Remove Claude API key** from Supabase secrets:

   ```bash
   supabase secrets unset CLAUDE_API_KEY
   ```

2. **System automatically falls back** to enhanced mock analysis mode

3. **No code changes required** - graceful degradation built-in

## Success Verification

After deployment, you should see in browser console:

```
✅ Supabase Edge Function mode enabled
🚀 Real AI processing via server-side Edge Function
AI Service initialized (Edge Function mode)
```

When processing intelligence:

```
Analyzing content from mock_liferaft_export.csv with AI...
Analysis complete: RELEVANT - ukraine (87% confidence)
```

The system is now using real Claude AI analysis via Supabase Edge Functions, bypassing all CORS restrictions while maintaining security and performance.
