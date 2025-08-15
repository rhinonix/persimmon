/**
 * Persimmon RSS Service - RSS Feed Processing and Management
 * Handles RSS/Atom feed fetching, parsing, and integration with intelligence pipeline
 */

const PersimmonRSS = {
  // Service state
  activeFeeds: new Map(),
  scheduledUpdates: new Map(),
  isSchedulerRunning: false,

  // CORS proxy options for RSS fetching
  corsProxies: [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?",
    "https://gkckzdqnplvsucqkauvl.supabase.co/functions/v1/cors-proxy",
  ],
  currentProxyIndex: 0,

  // Initialize RSS service
  init() {
    console.log("Persimmon RSS Service initialized");
    this.loadActiveFeeds();
    this.startScheduler();
  },

  // ============================================================================
  // FEED MANAGEMENT
  // ============================================================================

  async loadActiveFeeds() {
    try {
      const feeds = await PersimmonDB.getRSSFeeds();
      this.activeFeeds.clear();

      feeds.forEach((feed) => {
        if (feed.active) {
          this.activeFeeds.set(feed.id, feed);
          this.scheduleNextUpdate(feed.id, feed.refresh_interval || 3600);
        }
      });

      console.log(`Loaded ${this.activeFeeds.size} active RSS feeds`);
    } catch (error) {
      console.error("Error loading active feeds:", error);
    }
  },

  async activateFeed(feedId) {
    try {
      // Update database
      await PersimmonDB.updateRSSFeed(feedId, {
        active: true,
        status: "active",
        error_message: null,
      });

      // Reload feeds and start scheduling
      await this.loadActiveFeeds();

      // Immediate fetch for newly activated feed
      const feed = this.activeFeeds.get(feedId);
      if (feed) {
        setTimeout(() => this.fetchFeed(feedId), 1000);
      }

      return true;
    } catch (error) {
      console.error(`Error activating feed ${feedId}:`, error);
      return false;
    }
  },

  async deactivateFeed(feedId) {
    try {
      // Update database
      await PersimmonDB.updateRSSFeed(feedId, {
        active: false,
        status: "inactive",
      });

      // Remove from active feeds and cancel scheduled updates
      this.activeFeeds.delete(feedId);
      if (this.scheduledUpdates.has(feedId)) {
        clearTimeout(this.scheduledUpdates.get(feedId));
        this.scheduledUpdates.delete(feedId);
      }

      return true;
    } catch (error) {
      console.error(`Error deactivating feed ${feedId}:`, error);
      return false;
    }
  },

  async testFeedURL(url) {
    try {
      const response = await this.fetchWithCORS(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const parsed = await this.parseFeedXML(content);

      return {
        success: true,
        title: parsed.title || "Unknown Feed",
        description: parsed.description || "",
        itemCount: parsed.items ? parsed.items.length : 0,
        lastBuildDate: parsed.lastBuildDate || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // ============================================================================
  // FEED FETCHING AND PARSING
  // ============================================================================

  async fetchFeed(feedId) {
    const feed = this.activeFeeds.get(feedId);
    if (!feed) {
      console.warn(`Feed ${feedId} not found in active feeds`);
      return;
    }

    console.log(`Fetching RSS feed: ${feed.name} (${feed.url})`);

    try {
      // Update status to indicate fetching
      await this.updateFeedStatus(feedId, "active", {
        error_message: null,
        consecutive_failures: 0,
      });

      // Fetch feed content
      const response = await this.fetchWithCORS(feed.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const parsedFeed = await this.parseFeedXML(xmlContent);

      // Process feed items
      const newItems = await this.processRSSItems(
        feedId,
        parsedFeed.items,
        feed.target_pirs || []
      );

      // Update feed metadata
      await this.updateFeedStatus(feedId, "active", {
        last_fetched: new Date().toISOString(),
        last_successful_fetch: new Date().toISOString(),
        last_item_count: newItems.length,
        feed_title: parsedFeed.title,
        feed_description: parsedFeed.description,
        last_build_date: parsedFeed.lastBuildDate,
        error_message: null,
        consecutive_failures: 0,
      });

      console.log(
        `Successfully processed ${newItems.length} items from ${feed.name}`
      );

      // Schedule next update
      this.scheduleNextUpdate(feedId, feed.refresh_interval || 3600);

      return newItems;
    } catch (error) {
      console.error(`Error fetching feed ${feedId}:`, error);

      // Update error status
      const consecutiveFailures = (feed.consecutive_failures || 0) + 1;
      await this.updateFeedStatus(
        feedId,
        consecutiveFailures >= 3 ? "error" : "active",
        {
          error_message: error.message,
          consecutive_failures: consecutiveFailures,
          last_fetched: new Date().toISOString(),
        }
      );

      // Schedule retry with exponential backoff
      const retryDelay = Math.min(300 * Math.pow(2, consecutiveFailures), 3600); // Max 1 hour
      this.scheduleNextUpdate(feedId, retryDelay);

      throw error;
    }
  },

  async fetchWithCORS(url) {
    console.log(`Attempting to fetch RSS feed: ${url}`);

    // Try different CORS proxies
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
      const proxy = this.corsProxies[proxyIndex];

      console.log(
        `Trying CORS proxy ${proxyIndex + 1}/${
          this.corsProxies.length
        }: ${proxy}`
      );

      try {
        let response;
        if (proxy.includes("supabase.co")) {
          // Our self-hosted proxy
          console.log("Using Supabase edge function proxy");
          response = await fetch(proxy, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${window.supabase?.supabaseKey || ""}`, // Add auth if available
            },
            body: JSON.stringify({ url }),
          });

          console.log(`Supabase proxy response status: ${response.status}`);

          // If Supabase proxy fails with auth error, skip to next proxy
          if (response.status === 401 || response.status === 403) {
            console.warn(
              "Supabase proxy authentication failed, trying next proxy"
            );
            continue;
          }
        } else {
          // Public proxies
          const proxyUrl = proxy + encodeURIComponent(url);
          console.log(`Using public proxy: ${proxyUrl}`);
          response = await fetch(proxyUrl, {
            method: "GET",
            headers: {
              Accept:
                "application/rss+xml, application/xml, text/xml, application/atom+xml",
            },
          });
        }

        console.log(`Proxy response status: ${response.status}`);

        if (response.ok) {
          this.currentProxyIndex = proxyIndex; // Remember working proxy
          console.log(`Successfully fetched via proxy: ${proxy}`);

          // Handle allorigins.win response format
          if (proxy.includes("allorigins.win")) {
            const data = await response.json();
            console.log("Parsed allorigins.win response");

            let content = data.contents;

            // Check if content is base64 encoded (data URL format)
            if (content && content.startsWith("data:")) {
              try {
                // Extract base64 part and decode it
                const base64Data = content.split(",")[1];
                content = atob(base64Data);
                console.log("Decoded base64 content from allorigins.win");
              } catch (error) {
                console.warn("Failed to decode base64 content:", error);
                // Fall back to original content
              }
            }

            return {
              ok: true,
              status: 200,
              text: async () => content,
            };
          }

          return response;
        } else {
          console.warn(`Proxy ${proxy} returned status ${response.status}`);
          // Try to get error details
          try {
            const errorText = await response.text();
            console.warn(`Error response: ${errorText.substring(0, 200)}`);
          } catch (e) {
            console.warn("Could not read error response");
          }
        }
      } catch (error) {
        console.warn(`CORS proxy ${proxy} failed:`, error.message);
        continue;
      }
    }

    throw new Error("All CORS proxies failed");
  },

  async parseFeedXML(xmlContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, "text/xml");

      // Check for parsing errors
      const parserError = doc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML format");
      }

      // Detect feed type (RSS or Atom)
      const isAtom = doc.querySelector('feed[xmlns*="atom"]') !== null;
      const isRSS =
        doc.querySelector("rss") !== null ||
        doc.querySelector("channel") !== null;

      if (!isAtom && !isRSS) {
        throw new Error("Not a valid RSS or Atom feed");
      }

      if (isAtom) {
        return this.parseAtomFeed(doc);
      } else {
        return this.parseRSSFeed(doc);
      }
    } catch (error) {
      console.error("Feed parsing error:", error);
      throw new Error(`Feed parsing failed: ${error.message}`);
    }
  },

  parseRSSFeed(doc) {
    const channel = doc.querySelector("channel");
    if (!channel) {
      throw new Error("Invalid RSS feed: no channel element");
    }

    const feed = {
      title: this.getTextContent(channel, "title"),
      description: this.getTextContent(channel, "description"),
      link: this.getTextContent(channel, "link"),
      lastBuildDate: this.getTextContent(channel, "lastBuildDate"),
      items: [],
    };

    const items = channel.querySelectorAll("item");
    items.forEach((item) => {
      // Handle content:encoded with proper namespace-aware selection
      let content = this.getTextContent(item, "description");
      const contentEncoded =
        item.querySelector("content\\:encoded") ||
        item.querySelector("[*|encoded]") ||
        item.getElementsByTagName("content:encoded")[0];
      if (contentEncoded) {
        content = contentEncoded.textContent.trim() || content;
      }

      const feedItem = {
        title: this.getTextContent(item, "title"),
        description: this.getTextContent(item, "description"),
        content: content,
        link: this.getTextContent(item, "link"),
        pubDate: this.getTextContent(item, "pubDate"),
        author:
          this.getTextContent(item, "author") ||
          this.getTextContent(item, "dc\\:creator") ||
          this.getElementByTagName(item, "dc:creator"),
        guid: this.getTextContent(item, "guid"),
        categories: Array.from(item.querySelectorAll("category")).map((cat) =>
          cat.textContent.trim()
        ),
      };

      if (feedItem.title || feedItem.description) {
        feed.items.push(feedItem);
      }
    });

    return feed;
  },

  parseAtomFeed(doc) {
    const feedElement = doc.querySelector("feed");
    if (!feedElement) {
      throw new Error("Invalid Atom feed: no feed element");
    }

    const feed = {
      title: this.getTextContent(feedElement, "title"),
      description: this.getTextContent(feedElement, "subtitle"),
      link:
        feedElement
          .querySelector('link[rel="alternate"]')
          ?.getAttribute("href") ||
        feedElement.querySelector("link")?.getAttribute("href"),
      lastBuildDate: this.getTextContent(feedElement, "updated"),
      items: [],
    };

    const entries = feedElement.querySelectorAll("entry");
    entries.forEach((entry) => {
      const feedItem = {
        title: this.getTextContent(entry, "title"),
        description: this.getTextContent(entry, "summary"),
        content: this.getTextContent(entry, "content"),
        link:
          entry.querySelector('link[rel="alternate"]')?.getAttribute("href") ||
          entry.querySelector("link")?.getAttribute("href"),
        pubDate:
          this.getTextContent(entry, "updated") ||
          this.getTextContent(entry, "published"),
        author: this.getTextContent(entry, "author name"),
        guid: this.getTextContent(entry, "id"),
        categories: Array.from(entry.querySelectorAll("category")).map(
          (cat) => cat.getAttribute("term") || cat.textContent.trim()
        ),
      };

      if (feedItem.title || feedItem.description) {
        feed.items.push(feedItem);
      }
    });

    return feed;
  },

  getTextContent(parent, selector) {
    const element = parent.querySelector(selector);
    return element ? element.textContent.trim() : "";
  },

  getElementByTagName(parent, tagName) {
    const elements = parent.getElementsByTagName(tagName);
    return elements.length > 0 ? elements[0].textContent.trim() : "";
  },

  // ============================================================================
  // ITEM PROCESSING
  // ============================================================================

  async processRSSItems(feedId, items, targetPIRs) {
    if (!items || items.length === 0) {
      return [];
    }

    console.log(`Processing ${items.length} RSS items for feed ${feedId}`);

    const processedItems = [];
    const feed = this.activeFeeds.get(feedId);

    // Stage 1: Store raw RSS items in rss_feed_items table
    const storedItems = [];
    for (const item of items) {
      try {
        // Create content hash for deduplication
        const contentHash = await this.generateContentHash(item);

        // Check if item already exists in rss_feed_items
        const existingItem = await PersimmonDB.getRSSFeedItemByHash(
          contentHash
        );
        if (existingItem) {
          console.log(`Skipping duplicate RSS item: ${item.title}`);
          continue; // Skip duplicate
        }

        // Also check by GUID if available
        if (item.guid) {
          const existingByGuid = await PersimmonDB.getRSSFeedItemByGuid(
            feedId,
            item.guid
          );
          if (existingByGuid) {
            console.log(`Skipping duplicate RSS item by GUID: ${item.title}`);
            continue;
          }
        }

        // Create RSS feed item record
        const rssItemData = {
          rss_feed_id: feedId,
          title: item.title || "Untitled RSS Item",
          description: item.description || null,
          content: item.content || item.description || null,
          link: item.link || null,
          pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          author: item.author || null,
          categories: item.categories || [],
          guid: item.guid || null,
          content_hash: contentHash,
          raw_data: item, // Store original RSS item data
        };

        const storedItem = await PersimmonDB.createRSSFeedItem(rssItemData);
        storedItems.push(storedItem);
        console.log(`Stored RSS item: ${storedItem.title}`);
      } catch (error) {
        console.error("Error storing RSS item:", error, item);
        continue; // Skip problematic items
      }
    }

    console.log(`Stored ${storedItems.length} new RSS items`);

    // Stage 2: Process stored items into intelligence items
    for (const storedItem of storedItems) {
      try {
        // Convert RSS item to intelligence item format
        const intelligenceItem = await this.convertRSSItemToIntelligenceItem(
          storedItem,
          feed,
          targetPIRs
        );

        // Store in intelligence_items table
        const createdItem = await PersimmonDB.createIntelligenceItem(
          intelligenceItem
        );

        // Mark RSS feed item as processed and link to intelligence item
        await PersimmonDB.markRSSFeedItemProcessed(
          storedItem.id,
          createdItem.id
        );

        // Add to processing queue for AI analysis
        await PersimmonDB.addToProcessingQueue(createdItem.id, 5); // Medium priority

        processedItems.push(createdItem);
        console.log(`Created intelligence item: ${createdItem.title}`);
      } catch (error) {
        console.error("Error converting RSS item to intelligence item:", error);
        // Mark the RSS item with error but don't stop processing
        await PersimmonDB.markRSSFeedItemError(storedItem.id, error.message);
        continue;
      }
    }

    console.log(
      `Successfully processed ${processedItems.length} RSS items into intelligence items`
    );
    return processedItems;
  },

  async convertToIntelligenceItem(rssItem, feed, targetPIRs) {
    // Determine primary category based on target PIRs
    const primaryCategory = targetPIRs.length > 0 ? targetPIRs[0] : "none";

    // Create content from available fields
    const content =
      rssItem.content || rssItem.description || rssItem.title || "";

    // Extract date
    let dateOccurred = null;
    if (rssItem.pubDate) {
      try {
        dateOccurred = new Date(rssItem.pubDate).toISOString();
      } catch (error) {
        console.warn("Invalid date format:", rssItem.pubDate);
      }
    }

    return {
      title: rssItem.title || "RSS Item",
      content: content,
      summary: rssItem.description
        ? Persimmon.utils.truncate(rssItem.description, 200)
        : null,
      category: primaryCategory,
      priority: "medium", // Default priority for RSS items
      source_name: feed.name,
      source_type: "rss",
      original_url: rssItem.link || null,
      author: rssItem.author || null,
      ai_processed: false,
      processing_status: "pending",
      date_occurred: dateOccurred,
      tags: ["rss", ...rssItem.categories.slice(0, 3)], // Limit categories
      original_data: {
        rss_feed_id: feed.id,
        guid: rssItem.guid,
        categories: rssItem.categories,
        target_pirs: targetPIRs,
      },
    };
  },

  async convertRSSItemToIntelligenceItem(storedRSSItem, feed, targetPIRs) {
    // Determine primary category based on target PIRs
    const primaryCategory = targetPIRs.length > 0 ? targetPIRs[0] : "none";

    // Create content from available fields
    const content =
      storedRSSItem.content ||
      storedRSSItem.description ||
      storedRSSItem.title ||
      "";

    // Extract date
    let dateOccurred = null;
    if (storedRSSItem.pub_date) {
      try {
        dateOccurred = new Date(storedRSSItem.pub_date).toISOString();
      } catch (error) {
        console.warn("Invalid date format:", storedRSSItem.pub_date);
      }
    }

    // Create summary with safe truncation
    let summary = null;
    if (storedRSSItem.description) {
      summary =
        storedRSSItem.description.length > 200
          ? storedRSSItem.description.substring(0, 200) + "..."
          : storedRSSItem.description;
    }

    return {
      title: storedRSSItem.title || "RSS Item",
      content: content,
      summary: summary,
      category: primaryCategory,
      priority: "medium", // Default priority for RSS items
      source_name: feed.name,
      source_type: "rss",
      original_url: storedRSSItem.link || null,
      author: storedRSSItem.author || null,
      ai_processed: false,
      processing_status: "pending",
      date_occurred: dateOccurred,
      tags: ["rss", ...(storedRSSItem.categories || []).slice(0, 3)], // Limit categories
      rss_feed_item_id: storedRSSItem.id, // Link to the RSS feed item
      original_data: {
        rss_feed_id: feed.id,
        rss_feed_item_id: storedRSSItem.id,
        guid: storedRSSItem.guid,
        categories: storedRSSItem.categories || [],
        target_pirs: targetPIRs,
        content_hash: storedRSSItem.content_hash,
      },
    };
  },

  async generateContentHash(item) {
    const content =
      (item.title || "") + (item.description || "") + (item.link || "");
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  async checkItemExists(contentHash) {
    // This would check the database for existing items with the same hash
    // For now, we'll implement a simple check
    try {
      const items = await PersimmonDB.getIntelligenceItems({ limit: 100 });
      return items.some(
        (item) =>
          item.original_data && item.original_data.content_hash === contentHash
      );
    } catch (error) {
      console.warn("Error checking for duplicate items:", error);
      return false;
    }
  },

  // ============================================================================
  // SCHEDULING AND AUTOMATION
  // ============================================================================

  startScheduler() {
    if (this.isSchedulerRunning) {
      return;
    }

    this.isSchedulerRunning = true;
    console.log("RSS feed scheduler started");

    // Initial load of active feeds
    this.loadActiveFeeds();
  },

  stopScheduler() {
    this.isSchedulerRunning = false;

    // Clear all scheduled updates
    this.scheduledUpdates.forEach((timeoutId) => clearTimeout(timeoutId));
    this.scheduledUpdates.clear();

    console.log("RSS feed scheduler stopped");
  },

  scheduleNextUpdate(feedId, intervalSeconds) {
    // Clear existing scheduled update
    if (this.scheduledUpdates.has(feedId)) {
      clearTimeout(this.scheduledUpdates.get(feedId));
    }

    // Schedule next update
    const timeoutId = setTimeout(async () => {
      try {
        await this.fetchFeed(feedId);
      } catch (error) {
        console.error(`Scheduled feed update failed for ${feedId}:`, error);
      }
    }, intervalSeconds * 1000);

    this.scheduledUpdates.set(feedId, timeoutId);

    const nextUpdate = new Date(Date.now() + intervalSeconds * 1000);
    console.log(
      `Next update for feed ${feedId} scheduled for ${nextUpdate.toLocaleString()}`
    );
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  async updateFeedStatus(feedId, status, metadata = {}) {
    try {
      const updates = {
        status: status,
        ...metadata,
      };

      await PersimmonDB.updateRSSFeed(feedId, updates);

      // Update local cache
      const feed = this.activeFeeds.get(feedId);
      if (feed) {
        Object.assign(feed, updates);
      }
    } catch (error) {
      console.error(`Error updating feed status for ${feedId}:`, error);
    }
  },

  // Get status of all feeds for dashboard
  getFeedStatus() {
    const status = {
      totalFeeds: this.activeFeeds.size,
      activeFeeds: 0,
      errorFeeds: 0,
      lastUpdate: null,
    };

    this.activeFeeds.forEach((feed) => {
      if (feed.status === "active") {
        status.activeFeeds++;
      } else if (feed.status === "error") {
        status.errorFeeds++;
      }

      if (feed.last_successful_fetch) {
        const feedDate = new Date(feed.last_successful_fetch);
        if (!status.lastUpdate || feedDate > status.lastUpdate) {
          status.lastUpdate = feedDate;
        }
      }
    });

    return status;
  },

  // Manual feed refresh
  async refreshFeed(feedId) {
    try {
      await this.fetchFeed(feedId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Refresh all active feeds
  async refreshAllFeeds() {
    const results = [];

    for (const feedId of this.activeFeeds.keys()) {
      try {
        await this.fetchFeed(feedId);
        results.push({ feedId, success: true });
      } catch (error) {
        results.push({ feedId, success: false, error: error.message });
      }
    }

    return results;
  },

  // Debug function to test RSS feed URLs directly
  async debugFeedURL(url) {
    console.log(`🔍 DEBUG: Testing RSS feed URL: ${url}`);

    try {
      // Test each proxy individually
      for (let i = 0; i < this.corsProxies.length; i++) {
        const proxy = this.corsProxies[i];
        console.log(`\n📡 Testing proxy ${i + 1}: ${proxy}`);

        try {
          let response;
          if (proxy.includes("supabase.co")) {
            response = await fetch(proxy, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${window.supabase?.supabaseKey || ""}`,
              },
              body: JSON.stringify({ url }),
            });
          } else {
            const proxyUrl = proxy + encodeURIComponent(url);
            response = await fetch(proxyUrl, {
              method: "GET",
              headers: {
                Accept:
                  "application/rss+xml, application/xml, text/xml, application/atom+xml",
              },
            });
          }

          console.log(`   Status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            let content;
            if (proxy.includes("allorigins.win")) {
              const data = await response.json();
              content = data.contents;
            } else {
              content = await response.text();
            }

            console.log(`   Content length: ${content.length} characters`);
            console.log(`   Content preview: ${content.substring(0, 200)}...`);

            // Try to parse the XML
            try {
              const parsed = await this.parseFeedXML(content);
              console.log(
                `   ✅ Successfully parsed! Title: "${parsed.title}", Items: ${parsed.items.length}`
              );
              return {
                success: true,
                proxy: proxy,
                title: parsed.title,
                itemCount: parsed.items.length,
                content: content,
              };
            } catch (parseError) {
              console.log(`   ❌ Parse error: ${parseError.message}`);
            }
          } else {
            const errorText = await response.text();
            console.log(`   ❌ Error response: ${errorText.substring(0, 200)}`);
          }
        } catch (error) {
          console.log(`   ❌ Proxy failed: ${error.message}`);
        }
      }

      return { success: false, error: "All proxies failed" };
    } catch (error) {
      console.error(`🚨 DEBUG ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

// Initialize RSS service when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait for other services to initialize first
  setTimeout(() => {
    if (typeof PersimmonDB !== "undefined" && PersimmonDB.isAvailable()) {
      PersimmonRSS.init();
    } else {
      console.warn(
        "RSS Service: Database not available, RSS functionality limited"
      );
    }
  }, 1000);
});

// Make available globally
if (typeof window !== "undefined") {
  window.PersimmonRSS = PersimmonRSS;
}
