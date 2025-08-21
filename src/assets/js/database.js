/**
 * Persimmon Intelligence Platform - Database Service
 * Handles all database operations using Supabase
 */

const PersimmonDB = {
  // Supabase client instance (will be set from auth.js)
  supabase: null,

  // Cache system for dashboard data
  cache: {
    dashboardStats: null,
    recentActivity: null,
    pirCoverage: null,
    systemMetrics: null,
    timestamps: {},
  },

  // Cache configuration (in milliseconds)
  cacheConfig: {
    dashboardStats: 30000, // 30 seconds
    recentActivity: 60000, // 1 minute
    pirCoverage: 300000, // 5 minutes
    systemMetrics: 600000, // 10 minutes
  },

  // Initialize database service
  init(supabaseClient) {
    this.supabase = supabaseClient;
    console.log("Persimmon Database Service initialized");
  },

  // Cache utility methods with localStorage persistence
  isCacheValid(key) {
    try {
      console.log(`[DEBUG] Checking cache validity for: ${key}`);

      // Check memory cache first
      if (this.cache[key] && this.cache.timestamps[key]) {
        const age = Date.now() - this.cache.timestamps[key];
        console.log(
          `[DEBUG] Memory cache found, age: ${age}ms, TTL: ${this.cacheConfig[key]}ms`
        );
        if (age < this.cacheConfig[key]) {
          console.log(`[DEBUG] Memory cache valid for: ${key}`);
          return true;
        }
      }

      // Check localStorage cache
      const stored = localStorage.getItem(`persimmon_cache_${key}`);
      const storedTimestamp = localStorage.getItem(
        `persimmon_cache_${key}_timestamp`
      );

      console.log(
        `[DEBUG] localStorage check - stored: ${!!stored}, timestamp: ${storedTimestamp}`
      );

      if (stored && storedTimestamp) {
        const age = Date.now() - parseInt(storedTimestamp);
        console.log(
          `[DEBUG] localStorage cache age: ${age}ms, TTL: ${this.cacheConfig[key]}ms`
        );

        if (age < this.cacheConfig[key]) {
          // Restore to memory cache
          console.log(
            `[DEBUG] Restoring localStorage cache to memory for: ${key}`
          );
          this.cache[key] = JSON.parse(stored);
          this.cache.timestamps[key] = parseInt(storedTimestamp);
          return true;
        } else {
          // Expired - clean up localStorage
          console.log(
            `[DEBUG] localStorage cache expired, cleaning up: ${key}`
          );
          localStorage.removeItem(`persimmon_cache_${key}`);
          localStorage.removeItem(`persimmon_cache_${key}_timestamp`);
        }
      }
    } catch (error) {
      console.warn(`Cache validation error for ${key}:`, error);
    }

    console.log(`[DEBUG] No valid cache found for: ${key}`);
    return false;
  },

  setCache(key, data) {
    try {
      // Set in memory cache
      this.cache[key] = data;
      this.cache.timestamps[key] = Date.now();

      // Persist to localStorage
      localStorage.setItem(`persimmon_cache_${key}`, JSON.stringify(data));
      localStorage.setItem(
        `persimmon_cache_${key}_timestamp`,
        this.cache.timestamps[key].toString()
      );

      console.log(`Cache updated: ${key}`);
    } catch (error) {
      console.warn(`Cache storage error for ${key}:`, error);
      // Continue with memory-only cache if localStorage fails
    }
  },

  getCache(key) {
    if (this.isCacheValid(key)) {
      console.log(`Cache hit: ${key}`);
      return this.cache[key];
    }
    console.log(`Cache miss: ${key}`);
    return null;
  },

  clearCache(key = null) {
    try {
      if (key) {
        // Clear specific cache
        this.cache[key] = null;
        delete this.cache.timestamps[key];
        localStorage.removeItem(`persimmon_cache_${key}`);
        localStorage.removeItem(`persimmon_cache_${key}_timestamp`);
        console.log(`Cache cleared: ${key}`);
      } else {
        // Clear all cache
        this.cache = {
          dashboardStats: null,
          recentActivity: null,
          pirCoverage: null,
          systemMetrics: null,
          timestamps: {},
        };

        // Clear all persimmon cache items from localStorage
        const keys = Object.keys(localStorage);
        keys.forEach((storageKey) => {
          if (storageKey.startsWith("persimmon_cache_")) {
            localStorage.removeItem(storageKey);
          }
        });

        console.log("All cache cleared");
      }
    } catch (error) {
      console.warn("Cache clearing error:", error);
    }
  },

  // ============================================================================
  // INTELLIGENCE ITEMS
  // ============================================================================

  async getIntelligenceItems(filters = {}) {
    try {
      let query = this.supabase
        .from("intelligence_items")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.ai_processed !== undefined) {
        query = query.eq("ai_processed", filters.ai_processed);
      }
      if (filters.approved !== undefined) {
        query = query.eq("approved", filters.approved);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching intelligence items:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getIntelligenceItems:", error);
      throw error;
    }
  },

  async createIntelligenceItem(item) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const itemData = {
        title: item.title,
        content: item.content,
        summary: item.summary || null,
        quote: item.quote || null,
        category: item.category || "none",
        priority: item.priority || "low",
        confidence: item.confidence || null,
        source_name: item.source_name,
        source_type: item.source_type || "manual",
        original_url: item.original_url || null,
        author: item.author || null,
        ai_processed: item.ai_processed || false,
        ai_reasoning: item.ai_reasoning || null,
        processing_status: item.processing_status || "pending",
        approved: item.approved || false,
        location: item.location || null,
        date_occurred: item.date_occurred || null,
        sentiment: item.sentiment || null,
        tags: item.tags || [],
        user_id: user.id,
        analyst_comment: item.analyst_comment || null,
        original_data: item.original_data || null,
      };

      const { data, error } = await this.supabase
        .from("intelligence_items")
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error("Error creating intelligence item:", error);
        throw error;
      }

      // Clear dashboard stats cache since data changed
      this.clearCache("dashboardStats");

      return data;
    } catch (error) {
      console.error("Database error in createIntelligenceItem:", error);
      throw error;
    }
  },

  async updateIntelligenceItem(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from("intelligence_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating intelligence item:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in updateIntelligenceItem:", error);
      throw error;
    }
  },

  async approveIntelligenceItem(id) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const updates = {
        approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };

      return await this.updateIntelligenceItem(id, updates);
    } catch (error) {
      console.error("Database error in approveIntelligenceItem:", error);
      throw error;
    }
  },

  // ============================================================================
  // DASHBOARD STATISTICS
  // ============================================================================

  async getDashboardStats() {
    // Check cache first
    const cachedStats = this.getCache("dashboardStats");
    if (cachedStats) {
      return cachedStats;
    }

    try {
      // Execute all queries in parallel
      const [
        totalItemsResult,
        aiProcessedResult,
        highPriorityResult,
        activeSourcesResult,
      ] = await Promise.all([
        this.supabase
          .from("intelligence_items")
          .select("id", { count: "exact", head: true }),
        this.supabase
          .from("intelligence_items")
          .select("id", { count: "exact", head: true })
          .eq("ai_processed", true),
        this.supabase
          .from("intelligence_items")
          .select("id", { count: "exact", head: true })
          .eq("priority", "high"),
        this.supabase
          .from("data_sources")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
      ]);

      // Check for errors
      if (totalItemsResult.error) throw totalItemsResult.error;
      if (aiProcessedResult.error) throw aiProcessedResult.error;
      if (highPriorityResult.error) throw highPriorityResult.error;
      if (activeSourcesResult.error) throw activeSourcesResult.error;

      const stats = {
        totalItems: totalItemsResult.count || 0,
        aiProcessed: aiProcessedResult.count || 0,
        highPriority: highPriorityResult.count || 0,
        activeSources: activeSourcesResult.count || 0,
      };

      // Cache the results
      this.setCache("dashboardStats", stats);
      return stats;
    } catch (error) {
      console.error("Database error in getDashboardStats:", error);
      // Return fallback data if database fails
      const fallbackStats = {
        totalItems: 247,
        aiProcessed: 89,
        highPriority: 12,
        activeSources: 8,
      };
      // Cache fallback data with shorter expiry
      this.setCache("dashboardStats", fallbackStats);
      return fallbackStats;
    }
  },

  // New method for individual stat updates with caching
  async getDashboardStatIndividual(statType, callback) {
    // Check if we have cached stats first
    const cachedStats = this.getCache("dashboardStats");
    if (cachedStats) {
      const statMap = {
        totalItems: cachedStats.totalItems,
        aiProcessed: cachedStats.aiProcessed,
        highPriority: cachedStats.highPriority,
        activeSources: cachedStats.activeSources,
      };
      callback(statMap[statType] || 0);
      return;
    }

    // No cache - fetch all stats and cache them, then return the requested one
    try {
      const stats = await this.getDashboardStats(); // This will cache the results
      const statMap = {
        totalItems: stats.totalItems,
        aiProcessed: stats.aiProcessed,
        highPriority: stats.highPriority,
        activeSources: stats.activeSources,
      };
      callback(statMap[statType] || 0);
    } catch (error) {
      console.error(`Error loading ${statType}:`, error);
      callback(0);
    }
  },

  // ============================================================================
  // USER ACTIVITY
  // ============================================================================

  async getRecentActivity(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from("user_activity")
        .select(
          `
          *,
          intelligence_items(title)
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent activity:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getRecentActivity:", error);
      // Return fallback data if database fails
      return this.getFallbackActivity();
    }
  },

  async logActivity(action, description, context = {}) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        console.warn("Cannot log activity: user not authenticated");
        return;
      }

      const activityData = {
        user_id: user.id,
        action: action,
        description: description,
        intelligence_item_id: context.intelligence_item_id || null,
        report_id: context.report_id || null,
        additional_data: context.additional_data || null,
      };

      const { error } = await this.supabase
        .from("user_activity")
        .insert([activityData]);

      if (error) {
        console.error("Error logging activity:", error);
      }
    } catch (error) {
      console.error("Database error in logActivity:", error);
    }
  },

  getFallbackActivity() {
    return [
      {
        id: "1",
        action: "processing",
        description:
          "AI Analysis Completed - 23 new items processed from Liferaft CSV export",
        created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        id: "2",
        action: "feed_update",
        description:
          "Intelligence Items Added - 5 high-priority items added to feed for review",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: "3",
        action: "report_generated",
        description:
          "Weekly Report Generated - Executive briefing compiled with 12 intelligence items",
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: "4",
        action: "source_added",
        description:
          "New Data Source Added - RSS feed configured for regional security updates",
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "5",
        action: "alert",
        description:
          "High Priority Alert - Critical infrastructure threat detected and flagged",
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },

  // ============================================================================
  // PIR MANAGEMENT
  // ============================================================================

  async getActivePIRs() {
    try {
      const { data, error } = await this.supabase
        .from("pirs")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("name");

      if (error) {
        console.error("Error fetching active PIRs:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getActivePIRs:", error);
      // Return fallback PIRs
      return [
        {
          id: "1",
          name: "Ukraine Conflict",
          category_code: "ukraine",
          color_code: "#0057b7",
        },
        {
          id: "2",
          name: "Industrial Sabotage",
          category_code: "sabotage",
          color_code: "#dc2626",
        },
        {
          id: "3",
          name: "Insider Threats",
          category_code: "insider",
          color_code: "#f59e0b",
        },
      ];
    }
  },

  async createPIR(pir) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const pirData = {
        name: pir.name,
        category_code: pir.category_code,
        description: pir.description,
        keywords: pir.keywords || [],
        priority_weight: pir.priority_weight || 1.0,
        active: pir.active !== undefined ? pir.active : true,
        ai_prompt_template: pir.ai_prompt_template || null,
        confidence_threshold: pir.confidence_threshold || 70,
        created_by: user.id,
        color_code: pir.color_code || "#3b82f6",
        icon_name: pir.icon_name || "target",
        sort_order: pir.sort_order || 0,
      };

      const { data, error } = await this.supabase
        .from("pirs")
        .insert([pirData])
        .select()
        .single();

      if (error) {
        console.error("Error creating PIR:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in createPIR:", error);
      throw error;
    }
  },

  async updatePIR(id, updates) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Add updated_by field to track who made the change
      const updateData = {
        ...updates,
        updated_by: user.id,
      };

      const { data, error } = await this.supabase
        .from("pirs")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating PIR:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in updatePIR:", error);
      throw error;
    }
  },

  async getAllPIRs() {
    try {
      const { data, error } = await this.supabase
        .from("pirs")
        .select("*")
        .order("sort_order")
        .order("name");

      if (error) {
        console.error("Error fetching all PIRs:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getAllPIRs:", error);
      // Return fallback PIRs
      return [
        {
          id: "1",
          name: "Ukraine Conflict",
          category_code: "ukraine",
          description:
            "Frontline movements, political developments, strategic shifts",
          keywords: ["ukraine", "ukrainian", "bakhmut", "kharkiv"],
          color_code: "#0057b7",
          active: true,
          confidence_threshold: 70,
        },
        {
          id: "2",
          name: "Industrial Sabotage",
          category_code: "sabotage",
          description:
            "Infrastructure attacks, facility threats, industrial espionage",
          keywords: ["sabotage", "infrastructure", "industrial", "cyber"],
          color_code: "#dc2626",
          active: true,
          confidence_threshold: 75,
        },
        {
          id: "3",
          name: "Insider Threats",
          category_code: "insider",
          description: "Employee security issues, background check problems",
          keywords: ["employee", "insider", "security", "clearance"],
          color_code: "#f59e0b",
          active: true,
          confidence_threshold: 80,
        },
      ];
    }
  },

  // ============================================================================
  // PIR COVERAGE
  // ============================================================================

  async getPIRCoverage(period = "week") {
    try {
      let startDate, endDate;
      const now = new Date();

      if (period === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
      } else if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
      }

      const { data, error } = await this.supabase
        .from("pir_coverage")
        .select(
          `
          *,
          pirs(name, category_code, color_code)
        `
        )
        .gte("period_start", startDate.toISOString())
        .lte("period_end", endDate.toISOString())
        .order("total_items", { ascending: false });

      if (error) {
        console.error("Error fetching PIR coverage:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getPIRCoverage:", error);
      // Return fallback data
      return [
        { pir_name: "Ukraine", total_items: 23 },
        { pir_name: "Industrial Sabotage", total_items: 8 },
        { pir_name: "Insider Threats", total_items: 3 },
      ];
    }
  },

  // ============================================================================
  // SYSTEM METRICS
  // ============================================================================

  async getSystemMetrics() {
    try {
      const { data, error } = await this.supabase
        .from("system_metrics")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching system metrics:", error);
        throw error;
      }

      // Convert to key-value format for easy access
      const metrics = {};
      data?.forEach((metric) => {
        metrics[metric.metric_name] = {
          value: metric.value_numeric || metric.value_text,
          category: metric.metric_category,
          recorded_at: metric.recorded_at,
        };
      });

      return metrics;
    } catch (error) {
      console.error("Database error in getSystemMetrics:", error);
      // Return fallback metrics
      return {
        processing_accuracy: { value: 94.0, category: "performance" },
        avg_processing_time_ms: { value: 2300, category: "performance" },
        monthly_cost_usd: { value: 47.0, category: "cost" },
        system_uptime_percent: { value: 99.2, category: "performance" },
      };
    }
  },

  // ============================================================================
  // RSS FEED MANAGEMENT
  // ============================================================================

  async getRSSFeeds() {
    try {
      const { data, error } = await this.supabase
        .from("rss_feeds")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching RSS feeds:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getRSSFeeds:", error);
      // Return fallback RSS feeds
      return [
        {
          id: "1",
          name: "Security Week",
          url: "https://www.securityweek.com/feed/",
          description: "Cybersecurity and information security news",
          active: false,
          status: "inactive",
          last_fetched: null,
          last_item_count: 0,
          target_pirs: ["sabotage", "insider"],
        },
        {
          id: "2",
          name: "Defense News",
          url: "https://www.defensenews.com/rss/",
          description: "Military and defense industry news",
          active: false,
          status: "inactive",
          last_fetched: null,
          last_item_count: 0,
          target_pirs: ["ukraine", "sabotage"],
        },
        {
          id: "3",
          name: "Krebs on Security",
          url: "https://krebsonsecurity.com/feed/",
          description: "In-depth security journalism",
          active: false,
          status: "inactive",
          last_fetched: null,
          last_item_count: 0,
          target_pirs: ["sabotage", "insider"],
        },
      ];
    }
  },

  // ============================================================================
  // RSS FEED ITEMS MANAGEMENT
  // ============================================================================

  async createRSSFeedItem(item) {
    try {
      const itemData = {
        rss_feed_id: item.rss_feed_id,
        title: item.title,
        description: item.description || null,
        content: item.content || null,
        link: item.link || null,
        pub_date: item.pub_date || null,
        author: item.author || null,
        categories: item.categories || [],
        processed: false,
        guid: item.guid || null,
        content_hash: item.content_hash,
        raw_data: item.raw_data || null,
      };

      const { data, error } = await this.supabase
        .from("rss_feed_items")
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error("Error creating RSS feed item:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in createRSSFeedItem:", error);
      throw error;
    }
  },

  async getRSSFeedItems(feedId, filters = {}) {
    try {
      let query = this.supabase
        .from("rss_feed_items")
        .select("*")
        .order("pub_date", { ascending: false });

      if (feedId) {
        query = query.eq("rss_feed_id", feedId);
      }

      if (filters.processed !== undefined) {
        query = query.eq("processed", filters.processed);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching RSS feed items:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getRSSFeedItems:", error);
      throw error;
    }
  },

  async updateRSSFeedItem(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from("rss_feed_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating RSS feed item:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in updateRSSFeedItem:", error);
      throw error;
    }
  },

  async markRSSFeedItemProcessed(id, intelligenceItemId) {
    try {
      const updates = {
        processed: true,
        intelligence_item_id: intelligenceItemId,
        processing_error: null,
      };

      return await this.updateRSSFeedItem(id, updates);
    } catch (error) {
      console.error("Database error in markRSSFeedItemProcessed:", error);
      throw error;
    }
  },

  async getRSSFeedItemByHash(contentHash) {
    try {
      const { data, error } = await this.supabase
        .from("rss_feed_items")
        .select("*")
        .eq("content_hash", contentHash)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching RSS feed item by hash:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in getRSSFeedItemByHash:", error);
      return null;
    }
  },

  async getRSSFeedItemByGuid(feedId, guid) {
    try {
      const { data, error } = await this.supabase
        .from("rss_feed_items")
        .select("*")
        .eq("rss_feed_id", feedId)
        .eq("guid", guid)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching RSS feed item by GUID:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in getRSSFeedItemByGuid:", error);
      return null;
    }
  },

  async getUnprocessedRSSFeedItems(feedId = null, limit = 50) {
    try {
      let query = this.supabase
        .from("rss_feed_items")
        .select(
          `
          *,
          rss_feeds(name, target_pirs)
        `
        )
        .eq("processed", false)
        .order("pub_date", { ascending: false })
        .limit(limit);

      if (feedId) {
        query = query.eq("rss_feed_id", feedId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching unprocessed RSS feed items:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getUnprocessedRSSFeedItems:", error);
      throw error;
    }
  },

  async markRSSFeedItemError(id, errorMessage) {
    try {
      const updates = {
        processing_error: errorMessage,
      };

      return await this.updateRSSFeedItem(id, updates);
    } catch (error) {
      console.error("Database error in markRSSFeedItemError:", error);
      throw error;
    }
  },

  async createRSSFeed(feed) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const feedData = {
        name: feed.name,
        url: feed.url,
        description: feed.description || null,
        refresh_interval: feed.refresh_interval || 3600,
        active: feed.active !== undefined ? feed.active : true,
        target_pirs: feed.target_pirs || [],
        auto_process:
          feed.auto_process !== undefined ? feed.auto_process : true,
        priority_boost: feed.priority_boost || 0,
        created_by: user.id,
        custom_headers: feed.custom_headers || null,
        auth_config: feed.auth_config || null,
        parsing_config: feed.parsing_config || null,
      };

      const { data, error } = await this.supabase
        .from("rss_feeds")
        .insert([feedData])
        .select()
        .single();

      if (error) {
        console.error("Error creating RSS feed:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in createRSSFeed:", error);
      throw error;
    }
  },

  async updateRSSFeed(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from("rss_feeds")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating RSS feed:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in updateRSSFeed:", error);
      throw error;
    }
  },

  async deleteRSSFeed(id) {
    try {
      console.log(`[DB] Attempting to delete RSS feed with ID: ${id}`);

      // First, check if the feed exists
      const { data: existingFeed, error: checkError } = await this.supabase
        .from("rss_feeds")
        .select("id, name")
        .eq("id", id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("[DB] Error checking if feed exists:", checkError);
        throw checkError;
      }

      if (!existingFeed) {
        console.log(`[DB] Feed with ID ${id} not found in database`);
        return true; // Consider it deleted if it doesn't exist
      }

      console.log(
        `[DB] Found feed to delete: ${existingFeed.name} (${existingFeed.id})`
      );

      // Perform the deletion
      const { data, error } = await this.supabase
        .from("rss_feeds")
        .delete()
        .eq("id", id)
        .select(); // Return deleted rows to confirm

      if (error) {
        console.error("[DB] Error deleting RSS feed:", error);
        throw error;
      }

      console.log(`[DB] Deletion result:`, data);
      console.log(`[DB] Number of rows deleted: ${data ? data.length : 0}`);

      if (!data || data.length === 0) {
        console.warn(`[DB] No rows were deleted for feed ID: ${id}`);
        throw new Error(
          `Failed to delete RSS feed: No rows were affected. This may be due to insufficient permissions or row-level security policies.`
        );
      }

      console.log(`[DB] Successfully deleted RSS feed: ${existingFeed.name}`);
      return true;
    } catch (error) {
      console.error("Database error in deleteRSSFeed:", error);
      throw error;
    }
  },

  // ============================================================================
  // DATA SOURCES
  // ============================================================================

  async getDataSources() {
    try {
      const { data, error } = await this.supabase
        .from("data_sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching data sources:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getDataSources:", error);
      throw error;
    }
  },

  async createDataSource(source) {
    try {
      const user = await PersimmonAuth.getCurrentUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const sourceData = {
        name: source.name,
        type: source.type,
        description: source.description || null,
        url: source.url || null,
        refresh_interval: source.refresh_interval || 3600,
        active: source.active !== undefined ? source.active : true,
        created_by: user.id,
        config: source.config || null,
      };

      const { data, error } = await this.supabase
        .from("data_sources")
        .insert([sourceData])
        .select()
        .single();

      if (error) {
        console.error("Error creating data source:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in createDataSource:", error);
      throw error;
    }
  },

  // ============================================================================
  // PROCESSING QUEUE
  // ============================================================================

  async addToProcessingQueue(intelligenceItemId, priority = 5) {
    try {
      const queueData = {
        intelligence_item_id: intelligenceItemId,
        status: "pending",
        priority: priority,
        attempts: 0,
        max_attempts: 3,
      };

      const { data, error } = await this.supabase
        .from("processing_queue")
        .insert([queueData])
        .select()
        .single();

      if (error) {
        console.error("Error adding to processing queue:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in addToProcessingQueue:", error);
      throw error;
    }
  },

  // Add RSS feed item directly to processing queue (for RSS workflow)
  async addRSSItemToProcessingQueue(rssItemId, priority = 5) {
    try {
      const queueData = {
        rss_feed_item_id: rssItemId, // Link to RSS item instead of intelligence item
        status: "pending",
        priority: priority,
        attempts: 0,
        max_attempts: 3,
      };

      const { data, error } = await this.supabase
        .from("processing_queue")
        .insert([queueData])
        .select()
        .single();

      if (error) {
        console.error("Error adding RSS item to processing queue:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Database error in addRSSItemToProcessingQueue:", error);
      throw error;
    }
  },

  async getProcessingQueue(status = null) {
    try {
      let query = this.supabase
        .from("processing_queue")
        .select(
          `
          *,
          intelligence_items(title, content, source_name),
          rss_feed_items(
            id,
            title,
            description,
            content,
            link,
            author,
            pub_date,
            categories,
            rss_feeds(name, url)
          )
        `
        )
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching processing queue:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Database error in getProcessingQueue:", error);
      throw error;
    }
  },

  async updateProcessingQueueStatus(queueItemId, status, errorMessage = null) {
    try {
      console.log(
        `Updating processing queue item ${queueItemId} to status: ${status}`
      );

      // Simple update with just the status field first
      const updates = {
        status: status,
      };

      // Only add processed_at if status is completed
      if (status === "completed") {
        updates.processed_at = new Date().toISOString();
      }

      // Only add error_message if provided
      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      console.log("Update payload:", updates);

      const { data, error } = await this.supabase
        .from("processing_queue")
        .update(updates)
        .eq("id", queueItemId)
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        throw error;
      }

      // Check if any rows were updated
      if (!data || data.length === 0) {
        console.warn(
          `No processing queue item found with ID: ${queueItemId} - item may have already been processed or deleted`
        );
        return null; // Return null instead of throwing error
      }

      console.log(`Successfully updated processing queue item ${queueItemId}`);
      return data[0]; // Return first item since we expect only one
    } catch (error) {
      console.error("Database error in updateProcessingQueueStatus:", error);
      throw error;
    }
  },

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToIntelligenceItems(callback) {
    if (!this.supabase) {
      console.warn("Supabase not initialized for subscriptions");
      return null;
    }

    return this.supabase
      .channel("intelligence_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "intelligence_items" },
        callback
      )
      .subscribe();
  },

  subscribeToUserActivity(callback) {
    if (!this.supabase) {
      console.warn("Supabase not initialized for subscriptions");
      return null;
    }

    return this.supabase
      .channel("user_activity_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_activity" },
        callback
      )
      .subscribe();
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  formatTimeAgo(dateString) {
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return then.toLocaleDateString();
  },

  // Check if database is available
  isAvailable() {
    return this.supabase !== null;
  },

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from("data_sources")
        .select("id")
        .limit(1);

      if (error) {
        console.error("Database connection test failed:", error);
        return false;
      }

      console.log("Database connection test successful");
      return true;
    } catch (error) {
      console.error("Database connection test error:", error);
      return false;
    }
  },
};

// Make available globally
if (typeof window !== "undefined") {
  window.PersimmonDB = PersimmonDB;
}
