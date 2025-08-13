/**
 * Persimmon Intelligence Platform - AI Service
 * Handles all AI API interactions for intelligence processing
 */

const PersimmonAI = {
  // Configuration
  config: {
    apiKey: null,
    apiUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-sonnet-20240229",
    maxTokens: 1000,
    temperature: 0.1,
    version: "2023-06-01",
  },

  // Rate limiting
  rateLimiter: {
    requests: [],
    maxRequestsPerMinute: 50,
    requestDelay: 1200, // 1.2 seconds between requests
  },

  // Processing queue
  processingQueue: [],
  isProcessing: false,

  // Initialize AI service
  init(apiKey) {
    if (!apiKey || apiKey === "your-ai-api-key-here") {
      console.warn("AI API key not provided - using mock analysis mode");
      this.config.apiKey = null;
      this.config.useEdgeFunction = false;
      return false;
    }

    // Check if we have Supabase client available for Edge Functions
    if (typeof PersimmonDB !== "undefined" && PersimmonDB.supabase) {
      console.log("✅ Supabase Edge Function mode enabled");
      console.log("🚀 Real AI processing via server-side Edge Function");
      this.config.apiKey = apiKey;
      this.config.useEdgeFunction = true;
      this.config.edgeFunctionUrl = `${PersimmonDB.supabase.supabaseUrl}/functions/v1/analyze-intelligence`;
      console.log("AI Service initialized (Edge Function mode)");
      return true;
    } else {
      console.warn(
        "⚠️  Supabase client not available - using mock analysis mode"
      );
      console.warn("🔧 For real AI: Ensure Supabase is properly initialized");
      this.config.apiKey = null;
      this.config.useEdgeFunction = false;
      console.log("AI Service initialized (mock mode - no Supabase client)");
      return false;
    }
  },

  // Check if AI API is available
  isAvailable() {
    return this.config.apiKey !== null;
  },

  // Rate limiting check
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old requests
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    return (
      this.rateLimiter.requests.length < this.rateLimiter.maxRequestsPerMinute
    );
  },

  // Add request to rate limiter
  recordRequest() {
    this.rateLimiter.requests.push(Date.now());
  },

  // Wait for rate limit
  async waitForRateLimit() {
    if (!this.canMakeRequest()) {
      const oldestRequest = Math.min(...this.rateLimiter.requests);
      const waitTime = 60000 - (Date.now() - oldestRequest) + 100; // Add 100ms buffer

      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Add delay between requests
    await new Promise((resolve) =>
      setTimeout(resolve, this.rateLimiter.requestDelay)
    );
  },

  // Get active PIRs for analysis context
  async getActivePIRsContext() {
    try {
      const pirs = await PersimmonDB.getActivePIRs();
      return pirs.map((pir) => ({
        name: pir.name,
        category: pir.category_code,
        description: pir.description || "",
        keywords: pir.keywords || [],
        confidenceThreshold: pir.confidence_threshold || 70,
      }));
    } catch (error) {
      console.warn("Could not fetch PIRs, using defaults:", error);
      return [
        {
          name: "Ukraine Conflict",
          category: "ukraine",
          description:
            "Frontline movements, political developments, strategic shifts",
          keywords: [
            "ukraine",
            "ukrainian",
            "bakhmut",
            "kharkiv",
            "frontline",
            "military",
            "zelensky",
          ],
          confidenceThreshold: 70,
        },
        {
          name: "Industrial Sabotage",
          category: "sabotage",
          description:
            "Infrastructure attacks, facility threats (focus Eurasia)",
          keywords: [
            "sabotage",
            "infrastructure",
            "industrial",
            "cyber",
            "attack",
            "facility",
            "scada",
          ],
          confidenceThreshold: 70,
        },
        {
          name: "Insider Threats",
          category: "insider",
          description: "Employee security, background check issues",
          keywords: [
            "employee",
            "insider",
            "security",
            "clearance",
            "background",
            "breach",
            "access",
          ],
          confidenceThreshold: 70,
        },
      ];
    }
  },

  // Build analysis prompt
  async buildAnalysisPrompt(content, source = "", metadata = {}) {
    const pirs = await this.getActivePIRsContext();

    const pirDescriptions = pirs
      .map(
        (pir) =>
          `${pir.name.toUpperCase()} (${pir.category}): ${pir.description}${
            pir.keywords.length > 0
              ? ` Keywords: ${pir.keywords.join(", ")}`
              : ""
          }`
      )
      .join("\n");

    return `You are an intelligence analyst for corporate security. Analyze the following content against these Priority Intelligence Requirements (PIRs):

${pirDescriptions}

Content to analyze:
"${content}"

Source: ${source}
${metadata.location ? `Location: ${metadata.location}` : ""}
${metadata.author ? `Author: ${metadata.author}` : ""}
${metadata.date ? `Date: ${metadata.date}` : ""}

Instructions:
1. Determine if this content is relevant to any PIR
2. Be conservative - only flag items with clear relevance
3. Consider context, not just keywords
4. Assess confidence based on content quality and relevance

Respond with a JSON object containing:
{
    "relevant": true/false,
    "category": "ukraine" | "sabotage" | "insider" | "none",
    "priority": "high" | "medium" | "low",
    "confidence": 0-100,
    "title": "Clear, concise title for intelligence feed (max 80 chars)",
    "summary": "2-3 sentence summary for analysts (max 200 chars)",
    "quote": "Most relevant quote from original content (if applicable, max 150 chars)",
    "reasoning": "Brief explanation of categorization and confidence score",
    "tags": ["tag1", "tag2"] // Relevant tags for categorization
}

Only mark as relevant if it directly relates to one of our PIRs. Be conservative - it's better to reject marginally relevant items.`;
  },

  // Make AI API request via Supabase Edge Function
  async makeAPIRequest(content, source = "", metadata = {}) {
    if (!this.isAvailable()) {
      throw new Error("AI API not available - API key not configured");
    }

    await this.waitForRateLimit();

    try {
      // Get PIRs for the Edge Function
      const pirs = await this.getActivePIRsContext();

      // Call Supabase Edge Function
      const response = await fetch(this.config.edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PersimmonDB.supabase.supabaseKey}`,
        },
        body: JSON.stringify({
          content: content,
          source: source,
          metadata: metadata,
          pirs: pirs,
        }),
      });

      this.recordRequest();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Edge Function error: ${response.status} ${response.statusText} - ${
            errorData.error || errorData.details || "Unknown error"
          }`
        );
      }

      const analysis = await response.json();

      // Edge Function returns the analysis directly, no need to parse
      return analysis;
    } catch (error) {
      console.error("Edge Function request failed:", error);
      throw error;
    }
  },

  // Parse AI response
  parseAPIResponse(responseText) {
    try {
      // Extract JSON from response (AI sometimes adds explanation)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const requiredFields = [
        "relevant",
        "category",
        "priority",
        "confidence",
        "title",
        "summary",
        "reasoning",
      ];
      for (const field of requiredFields) {
        if (analysis[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate field types and values
      if (typeof analysis.relevant !== "boolean") {
        throw new Error('Field "relevant" must be boolean');
      }

      if (
        !["ukraine", "sabotage", "insider", "none"].includes(analysis.category)
      ) {
        throw new Error("Invalid category value");
      }

      if (!["high", "medium", "low"].includes(analysis.priority)) {
        throw new Error("Invalid priority value");
      }

      if (
        typeof analysis.confidence !== "number" ||
        analysis.confidence < 0 ||
        analysis.confidence > 100
      ) {
        throw new Error("Confidence must be a number between 0-100");
      }

      // Sanitize and truncate fields
      analysis.title = analysis.title.substring(0, 80);
      analysis.summary = analysis.summary.substring(0, 200);
      analysis.quote = (analysis.quote || "").substring(0, 150);
      analysis.reasoning = analysis.reasoning.substring(0, 300);
      analysis.tags = Array.isArray(analysis.tags)
        ? analysis.tags.slice(0, 5)
        : [];

      return analysis;
    } catch (error) {
      console.error("Error parsing AI response:", error);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  },

  // Main analysis function
  async analyzeContent(content, source = "", metadata = {}) {
    try {
      // Input validation
      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0
      ) {
        throw new Error("Content is required and must be a non-empty string");
      }

      if (content.length > 10000) {
        content = content.substring(0, 10000) + "...";
        console.warn("Content truncated to 10000 characters for analysis");
      }

      console.log(`Analyzing content from ${source} with AI...`);

      // Make API request via Edge Function
      const analysis = await this.makeAPIRequest(content, source, metadata);

      console.log(
        `Analysis complete: ${
          analysis.relevant ? "RELEVANT" : "NOT RELEVANT"
        } - ${analysis.category} (${analysis.confidence}% confidence)`
      );

      return analysis;
    } catch (error) {
      console.error("AI analysis failed:", error);

      // Log the error for monitoring
      if (PersimmonDB.isAvailable()) {
        try {
          await PersimmonDB.logActivity(
            "ai_error",
            `AI analysis failed: ${error.message}`,
            {
              additional_data: { source, contentLength: content?.length || 0 },
            }
          );
        } catch (logError) {
          console.warn("Failed to log AI error:", logError);
        }
      }

      throw error;
    }
  },

  // Batch processing with queue management
  async addToProcessingQueue(items) {
    const queueItems = items.map((item) => ({
      id: item.id || Persimmon.utils.generateId(),
      content: item.content,
      source: item.source || "unknown",
      metadata: item.metadata || {},
      callback: item.callback || null,
      retries: 0,
      maxRetries: 3,
    }));

    this.processingQueue.push(...queueItems);
    console.log(`Added ${queueItems.length} items to AI processing queue`);

    if (!this.isProcessing) {
      this.processQueue();
    }

    return queueItems.map((item) => item.id);
  },

  // Process queue
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(
      `Starting AI processing queue: ${this.processingQueue.length} items`
    );

    while (this.processingQueue.length > 0) {
      const item = this.processingQueue.shift();

      try {
        const analysis = await this.analyzeContent(
          item.content,
          item.source,
          item.metadata
        );

        if (item.callback) {
          item.callback(null, analysis, item);
        }

        // Log successful processing
        if (PersimmonDB.isAvailable()) {
          await PersimmonDB.logActivity(
            "ai_analysis",
            `Content analyzed: ${
              analysis.relevant ? "relevant" : "not relevant"
            }`,
            {
              additional_data: {
                category: analysis.category,
                confidence: analysis.confidence,
                source: item.source,
              },
            }
          );
        }
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);

        item.retries++;
        if (item.retries < item.maxRetries) {
          console.log(
            `Retrying item ${item.id} (attempt ${item.retries + 1}/${
              item.maxRetries
            })`
          );
          this.processingQueue.push(item);
        } else {
          console.error(`Max retries exceeded for item ${item.id}`);
          if (item.callback) {
            item.callback(error, null, item);
          }
        }
      }

      // Small delay between items to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
    console.log("AI processing queue completed");
  },

  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      requestsThisMinute: this.rateLimiter.requests.length,
      maxRequestsPerMinute: this.rateLimiter.maxRequestsPerMinute,
    };
  },

  // Clear queue
  clearQueue() {
    this.processingQueue = [];
    this.isProcessing = false;
    console.log("AI processing queue cleared");
  },

  // Fallback to mock analysis if AI is not available
  async mockAnalysis(content, source = "", metadata = {}) {
    console.log("Using mock analysis (AI API not available)");

    // Use the existing mock analysis from shared.js
    const mockResult = Persimmon.api.mockAnalysis(content);

    // Enhance with additional fields expected by the new system
    return {
      ...mockResult,
      tags: this.extractMockTags(content, mockResult.category),
      source: source,
      metadata: metadata,
    };
  },

  // Extract mock tags based on content and category
  extractMockTags(content, category) {
    const lowerContent = content.toLowerCase();
    const tagMap = {
      ukraine: ["conflict", "military", "eastern-europe", "geopolitical"],
      sabotage: ["cybersecurity", "infrastructure", "industrial", "threat"],
      insider: [
        "personnel",
        "security-clearance",
        "internal-threat",
        "employee",
      ],
    };

    const baseTags = tagMap[category] || ["general"];
    const additionalTags = [];

    // Add location-based tags
    if (lowerContent.includes("europe")) additionalTags.push("europe");
    if (lowerContent.includes("cyber")) additionalTags.push("cyber");
    if (lowerContent.includes("critical")) additionalTags.push("critical");

    return [...baseTags.slice(0, 2), ...additionalTags.slice(0, 2)];
  },
};

// Make available globally
if (typeof window !== "undefined") {
  window.PersimmonAI = PersimmonAI;
}
