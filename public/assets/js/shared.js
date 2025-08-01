/**
 * Persimmon Intelligence Platform - Shared Utilities
 * Reusable functions across all pages
 */

const Persimmon = {
  // Utility functions
  utils: {
    generateId: () => Date.now() + Math.random(),

    sanitizeHtml: (str) => {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    },

    formatDate: (date) => new Date(date).toLocaleDateString(),

    formatTime: (date) => {
      const now = new Date();
      const then = new Date(date);
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

    formatFileSize: (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    truncate: (str, length = 100) => {
      return str.length > length ? str.substring(0, length) + "..." : str;
    },

    capitalize: (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
  },

  // Storage management
  storage: {
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error("Storage error:", error);
        return false;
      }
    },

    get: (key) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error("Storage error:", error);
        return null;
      }
    },

    remove: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error("Storage error:", error);
        return false;
      }
    },

    clear: () => {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error("Storage error:", error);
        return false;
      }
    },
  },

  // API management
  api: {
    claudeApiKey: "your-claude-api-key-here", // Replace with your actual API key

    async processWithClaude(content, source = "") {
      if (
        !this.claudeApiKey ||
        this.claudeApiKey === "your-claude-api-key-here"
      ) {
        console.warn("Claude API key not configured, using mock analysis");
        return this.mockAnalysis(content);
      }

      const prompt = `You are an intelligence analyst for corporate security. Analyze the following content against these Priority Intelligence Requirements (PIRs):

1. UKRAINE - Frontline movements, political developments, strategic shifts
2. INDUSTRIAL SABOTAGE - Infrastructure attacks, facility threats (focus Eurasia)  
3. INSIDER THREATS - Employee security, background check issues

Content to analyze:
"${content}"

Source: ${source}

Respond with a JSON object containing:
{
    "relevant": true/false,
    "category": "ukraine" | "sabotage" | "insider" | "none",
    "priority": "high" | "medium" | "low",
    "confidence": 0-100,
    "title": "Clear, concise title for intelligence feed",
    "summary": "2-3 sentence summary for analysts",
    "quote": "Most relevant quote from original content (if applicable)",
    "reasoning": "Brief explanation of categorization"
}

Only mark as relevant if it directly relates to one of our PIRs. Be conservative - it's better to reject marginally relevant items.`;

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.claudeApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-sonnet-20240229",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Claude API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const analysisText = data.content[0].text;

        // Extract JSON from response (Claude sometimes adds explanation)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse Claude response as JSON");
        }
      } catch (error) {
        console.error("Claude API error:", error);
        Persimmon.notifications.error(`Claude API error: ${error.message}`);
        // Fallback to mock analysis if API fails
        return this.mockAnalysis(content);
      }
    },

    mockAnalysis(content) {
      // Fallback keyword-based analysis for testing without API key
      const keywords = {
        ukraine: [
          "ukraine",
          "ukrainian",
          "bakhmut",
          "kharkiv",
          "frontline",
          "military",
          "zelensky",
          "kiev",
          "kyiv",
          "donetsk",
          "luhansk",
        ],
        sabotage: [
          "sabotage",
          "infrastructure",
          "industrial",
          "cyber",
          "attack",
          "facility",
          "power",
          "grid",
          "scada",
          "pipeline",
        ],
        insider: [
          "employee",
          "insider",
          "security",
          "clearance",
          "background",
          "breach",
          "access",
          "leak",
          "staff",
          "personnel",
        ],
      };

      const lowerContent = content.toLowerCase();
      let bestCategory = "none";
      let maxScore = 0;

      for (const [category, words] of Object.entries(keywords)) {
        const score = words.filter((word) =>
          lowerContent.includes(word)
        ).length;
        if (score > maxScore) {
          maxScore = score;
          bestCategory = category;
        }
      }

      const relevant = maxScore > 0;
      const priority = maxScore > 2 ? "high" : maxScore > 1 ? "medium" : "low";
      const confidence = Math.min(60 + maxScore * 15, 95);

      return {
        relevant: relevant,
        category: bestCategory,
        priority: priority,
        confidence: confidence,
        title: Persimmon.utils.truncate(content, 80),
        summary: `Mock analysis found ${maxScore} PIR keywords. ${
          relevant ? "Flagged for review." : "No significant matches."
        }`,
        quote: "",
        reasoning: `Matched ${maxScore} keywords for ${bestCategory} category`,
      };
    },
  },

  // CSV parsing utilities
  csv: {
    parse(csvContent, filename = "unknown") {
      try {
        const lines = csvContent.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          throw new Error(
            "CSV must have at least a header row and one data row"
          );
        }

        const headers = this.parseCSVLine(lines[0]);
        const items = [];

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = this.parseCSVLine(lines[i]);
            const item = {};

            headers.forEach((header, index) => {
              item[header.toLowerCase().trim()] = values[index] || "";
            });

            // Map to standard format for Persimmon
            const standardItem = {
              content:
                item.content ||
                item.text ||
                item.message ||
                item.post ||
                item.body ||
                "",
              source: item.source || item.platform || filename,
              date:
                item.date ||
                item.created ||
                item.timestamp ||
                new Date().toISOString(),
              location:
                item.location || item.country || item.region || "Unknown",
              author: item.author || item.user || item.username || "",
              url: item.url || item.link || "",
              sentiment: item.sentiment || "",
              originalData: item,
            };

            if (standardItem.content.trim()) {
              items.push(standardItem);
            }
          } catch (rowError) {
            console.warn(`Error parsing CSV row ${i}:`, rowError);
            continue;
          }
        }

        return items;
      } catch (error) {
        console.error("CSV parsing error:", error);
        throw new Error(`Failed to parse CSV: ${error.message}`);
      }
    },

    parseCSVLine(line) {
      const result = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Handle escaped quotes ("")
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    },

    detectFileType(filename) {
      const ext = filename.split(".").pop().toLowerCase();
      const types = {
        csv: "Liferaft CSV",
        json: "GDELT JSON",
        xml: "RSS Feed",
        txt: "Text File",
      };
      return types[ext] || "Unknown Format";
    },
  },

  // Notification system
  notifications: {
    show(message, type = "info", duration = 4000) {
      // Remove any existing notifications
      const existing = document.querySelector(".persimmon-notification");
      if (existing) {
        existing.remove();
      }

      const notification = document.createElement("div");
      notification.className = "persimmon-notification";
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${this.getTypeColor(type)};
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                z-index: 10000;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
                line-height: 1.4;
                animation: slideIn 0.3s ease-out;
            `;

      // Add slide-in animation
      const style = document.createElement("style");
      style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
      document.head.appendChild(style);

      notification.textContent = message;
      document.body.appendChild(notification);

      // Auto-remove after duration
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = "slideIn 0.3s ease-out reverse";
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);

      return notification;
    },

    getTypeColor(type) {
      const colors = {
        success: "#10b981",
        error: "#ef4444",
        warning: "#f59e0b",
        info: "#3b82f6",
      };
      return colors[type] || colors.info;
    },

    success: (message, duration) =>
      Persimmon.notifications.show(message, "success", duration),
    error: (message, duration) =>
      Persimmon.notifications.show(message, "error", duration),
    warning: (message, duration) =>
      Persimmon.notifications.show(message, "warning", duration),
    info: (message, duration) =>
      Persimmon.notifications.show(message, "info", duration),
  },

  // UI helper functions
  ui: {
    // Create Persimmon header component with standardized navigation
    createHeader(pageTitle, currentPage = "") {
      // Standardized navigation - always the same 3 buttons (in workflow order)
      const standardNavigation = [
        { href: "./processor.html", text: "Data Processor", page: "processor" },
        { href: "./feed.html", text: "Intelligence Feed", page: "feed" },
        { href: "./reports.html", text: "Reports", page: "reports" },
      ];

      // Auto-detect current page if not provided
      if (!currentPage) {
        const path = window.location.pathname;
        if (path.includes("feed.html")) currentPage = "feed";
        else if (path.includes("processor.html")) currentPage = "processor";
        else if (path.includes("reports.html")) currentPage = "reports";
      }

      return `
                <header class="persimmon-header">
                    <div class="persimmon-header__content">
                        <a href="./index.html" class="persimmon-logo">
                            <div class="persimmon-logo__icon">
                                <svg width="40" height="40" viewBox="0 0 50 50">
                                    <circle cx="25" cy="25" r="22" fill="none" stroke="#EC5800" stroke-width="2"/>
                                    <circle cx="25" cy="25" r="8" fill="#EC5800"/>
                                    <circle cx="25" cy="25" r="3" fill="white"/>
                                    <circle cx="35" cy="15" r="4" fill="#4F7942"/>
                                    <circle cx="35" cy="15" r="2" fill="#6B8E58"/>
                                </svg>
                            </div>
                            <div class="persimmon-logo__text">
                                <div class="persimmon-logo__primary">persimmon</div>
                                <div class="persimmon-logo__secondary">INTELLIGENCE</div>
                            </div>
                        </a>
                        
                        <nav class="header-actions">
                            ${standardNavigation
                              .map(
                                (link) =>
                                  `<a href="${link.href}" class="btn ${
                                    link.page === currentPage
                                      ? "btn-primary"
                                      : ""
                                  }">${link.text}</a>`
                              )
                              .join("")}
                        </nav>
                    </div>
                </header>
            `;
    },

    // Create loading spinner
    createSpinner(size = "20px", inline = false) {
      return `<div class="persimmon-spinner" style="width: ${size}; height: ${size}; ${
        inline ? "display: inline-block; margin-right: 8px;" : ""
      }"></div>`;
    },

    // Create priority badge
    createPriorityBadge(priority) {
      return `
                <div class="item-priority priority-${priority}">
                    <div class="priority-dot"></div>
                    <span>${priority.toUpperCase()}</span>
                </div>
            `;
    },

    // Create status indicator
    createStatusIndicator(status, text) {
      return `
                <div class="status-indicator status-${status}">
                    <div class="status-dot"></div>
                    <span>${text}</span>
                </div>
            `;
    },

    // Create AI processing indicator
    createAIIndicator(confidence) {
      return `
                <span class="ai-indicator">
                    AI${
                      confidence
                        ? `<span class="confidence-score">${confidence}%</span>`
                        : ""
                    }
                </span>
            `;
    },

    // Show loading state on button
    setButtonLoading(button, isLoading, loadingText = "Loading...") {
      if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.innerHTML = `${this.createSpinner("12px", true)}${loadingText}`;
        button.disabled = true;
      } else {
        button.textContent = button.dataset.originalText || "Complete";
        button.disabled = false;
      }
    },

    // Toggle element visibility
    toggle(elementId, show) {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = show ? "block" : "none";
      }
    },

    // Update element text content safely
    updateText(elementId, text) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = text;
      }
    },

    // Update element HTML content safely
    updateHTML(elementId, html) {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = html;
      }
    },
  },

  // Filter management for feeds
  filters: {
    applyFilters(items, filters) {
      return items.filter((item) => {
        // Category filter
        if (
          filters.category &&
          filters.category !== "all" &&
          item.category !== filters.category
        ) {
          return false;
        }

        // Priority filter
        if (filters.priority && item.priority !== filters.priority) {
          return false;
        }

        // Source filter
        if (filters.source) {
          if (filters.source === "ai" && !item.aiProcessed) {
            return false;
          }
        }

        // Time filter
        if (filters.time === "24h") {
          const itemTime = item.time || "";
          if (!itemTime.includes("hour") && !itemTime.includes("minute")) {
            return false;
          }
        }

        // Search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const searchableText = [
            item.title,
            item.summary,
            item.analystComment,
            item.quote,
          ]
            .join(" ")
            .toLowerCase();

          if (!searchableText.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      });
    },

    setupFilterButtons(containerSelector, onFilterChange) {
      const container = document.querySelector(containerSelector);
      if (!container) return;

      const buttons = container.querySelectorAll(".filter-button");

      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          const filterType =
            button.dataset.filter ||
            button.dataset.priority ||
            button.dataset.time ||
            button.dataset.source;
          const filterCategory = button.dataset.filter
            ? "category"
            : button.dataset.priority
            ? "priority"
            : button.dataset.time
            ? "time"
            : "source";

          // Handle toggle behavior for non-category filters
          if (filterCategory !== "category") {
            if (button.classList.contains("active")) {
              button.classList.remove("active");
              onFilterChange(filterCategory, null);
              return;
            } else {
              // Remove active from other buttons in same category
              const siblingButtons = container.querySelectorAll(
                `[data-${filterCategory}]`
              );
              siblingButtons.forEach((btn) => btn.classList.remove("active"));
            }
          } else {
            // Category filters are mutually exclusive
            const categoryButtons = container.querySelectorAll("[data-filter]");
            categoryButtons.forEach((btn) => btn.classList.remove("active"));
          }

          button.classList.add("active");
          onFilterChange(filterCategory, filterType);
        });
      });
    },
  },
};

// Initialize Persimmon when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Persimmon Intelligence Platform - Shared utilities loaded");

  // Set up global error handling
  window.addEventListener("error", (event) => {
    console.error("Global error:", event.error);
    if (event.error && event.error.message) {
      Persimmon.notifications.error(
        `Application error: ${event.error.message}`
      );
    }
  });

  // Set up global unhandled promise rejection handling
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    Persimmon.notifications.error(
      `Network or processing error: ${event.reason}`
    );
    event.preventDefault(); // Prevent default browser behavior
  });
});

// Export for use in other modules (if using ES6 modules in the future)
if (typeof window !== "undefined") {
  window.Persimmon = Persimmon;
}
