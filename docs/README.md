# Persimmon Intelligence Platform - Documentation

## Overview

The Persimmon Intelligence Platform is a comprehensive intelligence analysis and reporting system designed for corporate security teams. It provides automated processing of intelligence data, AI-powered analysis, dynamic PIR management, RSS feed integration, and streamlined reporting capabilities with enterprise-grade performance and caching.

## 🚀 Key Features

### Core Intelligence Processing

- **Automated Data Processing**: Upload CSV files from various intelligence sources
- **AI-Powered Analysis**: Claude AI integration for intelligent categorization and analysis
- **Real-time Intelligence Feed**: Browse and manage processed intelligence items
- **Automated Reporting**: Generate weekly intelligence reports

### Dynamic PIR Management (NEW)

- **Custom PIRs**: Create unlimited Priority Intelligence Requirements beyond default categories
- **PIR Configuration**: Custom keywords, confidence thresholds, colors, and AI prompts
- **Dynamic Categorization**: Intelligence items automatically categorized against active PIRs
- **PIR Coverage Tracking**: Real-time metrics and coverage analysis

### RSS Feed Integration (NEW)

- **Automated Feed Processing**: Configure RSS feeds for continuous intelligence gathering
- **PIR Targeting**: RSS feeds can target multiple PIRs for intelligent categorization
- **Feed Management**: Active/inactive status, refresh intervals, error handling
- **Real-time Processing**: New RSS items automatically processed and categorized

### Professional Dashboard (ENHANCED)

- **Real-time Stats**: Live database-driven statistics with 30-second cache
- **Performance Optimized**: Parallel database queries with progressive loading
- **Client-side Caching**: Instant navigation with smart cache invalidation
- **Professional Loading States**: Linear design aesthetic with skeleton animations

### Admin Interface (NEW)

- **PIR Management**: Create, edit, and manage Priority Intelligence Requirements
- **RSS Feed Configuration**: Add and configure RSS feeds with PIR targeting
- **System Monitoring**: Database status, system information, and performance metrics
- **Professional UI**: Consistent design with proper navigation highlighting

### Enterprise Features

- **User Authentication**: Secure access with Supabase authentication and RLS
- **Database Persistence**: Full Supabase integration with 10-table schema
- **Real-time Updates**: Live dashboard updates and activity tracking
- **Responsive Design**: Works on desktop and mobile devices
- **Performance Monitoring**: System metrics and cost tracking

## 🏗️ System Architecture

### Frontend (Enhanced)

- **Modern Web Stack**: HTML/CSS/JavaScript with professional Linear design aesthetic
- **Performance Optimized**: Client-side caching, parallel loading, progressive updates
- **Supabase Integration**: Real-time database with intelligent caching layer
- **Professional UI**: Consistent navigation, loading states, and animations

### Database Layer (NEW)

- **10-Table Schema**: Comprehensive data model for intelligence operations
- **Dynamic PIRs**: Unlimited custom Priority Intelligence Requirements
- **RSS Integration**: Automated feed processing and item management
- **Enterprise Security**: Row-level security with complete audit trails
- **Performance Optimized**: Indexed queries and parallel execution

### Backend Services

- **Supabase**: PostgreSQL database with real-time subscriptions
- **Authentication**: Row-level security and user management
- **File Processing**: CSV parsing and data validation
- **AI Processing**: Automated analysis and categorization
- **RSS Processing**: Automated feed fetching and item processing

## 📊 Performance Improvements

### Dashboard Loading

- **Before**: 779ms load time with sequential queries
- **After**: ~250ms with parallel queries and caching
- **Navigation**: Instant return visits with client-side cache

### Database Optimization

- **Parallel Queries**: All dashboard stats load simultaneously
- **Smart Caching**: 30-second cache for stats, 1-minute for activity
- **Progressive Loading**: Individual stats update as available
- **Fallback Handling**: Graceful degradation if database unavailable

### User Experience

- **Professional Loading**: Linear design skeleton animations
- **Instant Navigation**: Cached data appears immediately on return visits
- **Smooth Animations**: Staggered fade-ins and transitions
- **Consistent Design**: Professional UI across all pages

## 🗄️ Database Schema

### Core Tables (7)

- `intelligence_items` - All processed intelligence data
- `data_sources` - Data source management and tracking
- `processing_queue` - AI processing queue management
- `user_activity` - Complete audit trail and activity logging
- `reports` - Generated intelligence reports
- `pir_coverage` - PIR coverage metrics and analysis
- `system_metrics` - Performance and cost tracking

### PIR & RSS Tables (3)

- `pirs` - Dynamic Priority Intelligence Requirements
- `rss_feeds` - RSS feed configuration and management
- `rss_feed_items` - Individual RSS items before processing

## 🎯 Getting Started

### 1. Database Setup

```bash
# Execute main schema
psql -f docs/supabase_schema_setup.sql

# Execute PIR/RSS enhancements
psql -f docs/schema_enhancements_for_dynamic_pirs.sql
```

### 2. Application Setup

```bash
# Build application with environment variables
./build.sh

# Deploy to Netlify or serve locally
```

### 3. Admin Configuration

1. Navigate to Admin interface
2. Create custom PIRs (beyond Ukraine/Sabotage/Insider)
3. Configure RSS feeds with PIR targeting
4. Monitor system status and performance

### 4. Daily Operations

1. Use Data Processor for CSV uploads
2. Review Intelligence Feed for processed items
3. Generate reports from Reports page
4. Monitor dashboard for real-time metrics

## 📚 Documentation Files

### Setup & Configuration

- **[supabase_setup.md](supabase_setup.md)** - Database and authentication setup
- **[database_schema.md](database_schema.md)** - Complete 10-table schema documentation
- **[phase1_implementation_guide.md](phase1_implementation_guide.md)** - Implementation roadmap
- **[local_testing_guide.md](local_testing_guide.md)** - Local development and testing

### Legacy Setup

- **[setup_guide.md](setup_guide.md)** - Original API integration guide

## 🔧 Technical Specifications

### Performance Metrics

- **Dashboard Load**: ~250ms (75% improvement)
- **Cache Hit Rate**: ~80% reduction in database queries
- **Navigation Speed**: Instant on return visits
- **Database Queries**: Parallel execution with progressive updates

### Caching Strategy

- **Dashboard Stats**: 30 seconds (frequently changing)
- **Recent Activity**: 1 minute (moderate changes)
- **PIR Coverage**: 5 minutes (slow changes)
- **System Metrics**: 10 minutes (rarely changes)

### Security Features

- **Row Level Security**: All tables protected with RLS policies
- **User Isolation**: Data isolated by authenticated user
- **Audit Trail**: Complete activity logging
- **Data Integrity**: Foreign key constraints and validation

## 🎨 Design System

### Linear Design Aesthetic

- **Professional Loading**: Skeleton animations with shimmer effects
- **Consistent Navigation**: Proper highlighting and state management
- **Smooth Animations**: Fade-ins and staggered transitions
- **Color System**: Consistent color palette and status indicators

### User Experience

- **Instant Feedback**: Immediate visual responses to user actions
- **Progressive Loading**: Content appears as it becomes available
- **Graceful Degradation**: Fallback states for offline/error conditions
- **Responsive Design**: Works across all device sizes

## 🚀 Deployment

### Build Process

```bash
# Always run before committing
./build.sh

# This processes:
# - Environment variable injection
# - File organization (src/ → public/)
# - Supabase credential configuration
```

### Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Netlify Deployment

- Deploys from `public/` directory
- Automatic builds on Git push
- Environment variables configured in Netlify dashboard

## 📈 System Monitoring

### Dashboard Metrics

- **Total Intelligence Items**: Real-time count from database
- **AI Processed Items**: Items analyzed by Claude AI
- **High Priority Items**: Critical intelligence requiring attention
- **Active Data Sources**: Currently configured and active sources

### Performance Tracking

- **Processing Accuracy**: AI analysis accuracy percentage
- **Average Processing Time**: Time per intelligence item
- **Monthly Cost**: API and infrastructure costs
- **System Uptime**: Platform availability percentage

## 🔄 Workflow

### Intelligence Processing

1. **Data Input**: CSV upload or RSS feed processing
2. **AI Analysis**: Claude AI categorizes against active PIRs
3. **Review**: Analysts review and approve items
4. **Reporting**: Generate reports from approved items

### PIR Management

1. **Admin Creates PIRs**: Define custom intelligence requirements
2. **Configure Keywords**: Set keywords and confidence thresholds
3. **RSS Targeting**: Configure feeds to target specific PIRs
4. **Monitor Coverage**: Track PIR coverage and metrics

### System Administration

1. **Monitor Dashboard**: Real-time system health and metrics
2. **Manage PIRs**: Create and configure intelligence requirements
3. **Configure RSS**: Set up automated feed processing
4. **Review Performance**: Monitor costs and processing efficiency

## 🆘 Support

### Documentation Priority

1. **[supabase_setup.md](supabase_setup.md)** - Start here for new installations
2. **[database_schema.md](database_schema.md)** - Complete schema reference
3. **[phase1_implementation_guide.md](phase1_implementation_guide.md)** - Implementation details
4. **[local_testing_guide.md](local_testing_guide.md)** - Development and testing

### Common Issues

- **Slow Dashboard**: Check cache configuration and database connection
- **Missing Data**: Verify Supabase credentials and RLS policies
- **RSS Feeds Not Working**: Check feed URLs and PIR targeting configuration
- **Build Issues**: Ensure environment variables are set before running `./build.sh`

---

**The Persimmon Intelligence Platform now provides enterprise-grade intelligence processing with dynamic PIR management, RSS feed integration, and professional performance optimization.**
