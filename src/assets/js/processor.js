/**
 * Persimmon Data Processor - Enhanced with PIR Selector
 * Handles data processing, queue management, and PIR filtering
 */
const PersimmonProcessor = {
  // Processor state
  uploadedFiles: [],
  processingQueue: [],
  reviewItems: [],
  approvedItems: [],
  rejectedItems: [],
  selectedPIRs: [], // Track selected PIRs
  pirSelector: null, // PIR selector instance

  // Initialize processor
  async init() {
    this.setupHeader();
    this.setupFileUpload();
    await this.initializePIRSelector();
    await this.loadReviewItemsFromDatabase(); // Load persisted review items
    this.renderProcessingQueue();
    this.renderReviewItems();
    this.updateReviewStats();
  },

  // Load review items from database on page load (session persistence)
  async loadReviewItemsFromDatabase() {
    try {
      console.log("Loading review items from database...");
      const reviewItems = await PersimmonDB.getReviewItems();

      // Convert database items to review item format
      this.reviewItems = reviewItems.map((queueItem) => {
        let reviewItem;

        if (queueItem.rss_feed_items) {
          // RSS feed item
          const rssItem = queueItem.rss_feed_items;
          const feedName = rssItem.rss_feeds?.name || "RSS Feed";

          const cleanDescription = Persimmon.utils.stripHtml(
            rssItem.description || ""
          );
          const cleanContent = Persimmon.utils.stripHtml(rssItem.content || "");

          reviewItem = {
            id: queueItem.id,
            title: Persimmon.utils.fixTextEncoding(
              rssItem.title || "Untitled RSS Item"
            ),
            summary: Persimmon.utils.fixTextEncoding(
              cleanDescription ||
                cleanContent?.substring(0, 200) + "..." ||
                "No summary available"
            ),
            content: Persimmon.utils.fixTextEncoding(
              cleanContent || cleanDescription || "Content not available"
            ),
            category: queueItem.review_data?.category || "ukraine",
            priority: queueItem.review_data?.priority || "medium",
            source: Persimmon.utils.fixTextEncoding(feedName),
            confidence: queueItem.review_data?.confidence || 85,
            reasoning:
              queueItem.review_data?.reasoning ||
              `Processed from RSS feed: ${feedName}`,
            quote: Persimmon.utils.fixTextEncoding(
              cleanDescription?.substring(0, 150) + "..." || ""
            ),
            originalData: {
              queue_item_id: queueItem.id,
              rss_feed_item_id: rssItem.id,
              rss_feed_name: feedName,
              original_url: rssItem.link,
            },
            reviewed: false,
            approved: !!queueItem.approved_at,
            timestamp: queueItem.created_at,
          };
        } else if (queueItem.intelligence_items) {
          // Traditional intelligence item
          const intelligenceItem = queueItem.intelligence_items;

          reviewItem = {
            id: queueItem.id,
            title: Persimmon.utils.fixTextEncoding(
              intelligenceItem.title || "Intelligence Item"
            ),
            summary: Persimmon.utils.fixTextEncoding(
              intelligenceItem.summary ||
                intelligenceItem.content?.substring(0, 200) + "..." ||
                "No summary available"
            ),
            content: Persimmon.utils.fixTextEncoding(
              intelligenceItem.content || "Content not available"
            ),
            category: intelligenceItem.category || "none",
            priority: intelligenceItem.priority || "medium",
            source: Persimmon.utils.fixTextEncoding(
              intelligenceItem.source_name || "Unknown Source"
            ),
            confidence: intelligenceItem.confidence || 85,
            reasoning:
              intelligenceItem.ai_reasoning || "Processed intelligence item",
            quote: Persimmon.utils.fixTextEncoding(
              intelligenceItem.quote ||
                intelligenceItem.content?.substring(0, 150) + "..." ||
                ""
            ),
            originalData: {
              intelligence_item_id: intelligenceItem.id,
              queue_item_id: queueItem.id,
            },
            reviewed: false,
            approved: !!queueItem.approved_at,
            timestamp: queueItem.created_at,
          };
        } else {
          // Fallback
          reviewItem = {
            id: queueItem.id,
            title: "Unknown Item",
            summary: "Item loaded from database without complete data",
            content: "Content not available",
            category: "none",
            priority: "medium",
            source: "Unknown Source",
            confidence: 50,
            reasoning: "Loaded from database with incomplete data",
            quote: "",
            originalData: {
              queue_item_id: queueItem.id,
            },
            reviewed: false,
            approved: !!queueItem.approved_at,
            timestamp: queueItem.created_at,
          };
        }

        return reviewItem;
      });

      // Separate approved items
      this.approvedItems = this.reviewItems.filter((item) => item.approved);
      this.reviewItems = this.reviewItems.filter((item) => !item.approved);

      console.log(
        `Loaded ${this.reviewItems.length} review items and ${this.approvedItems.length} approved items from database`
      );
    } catch (error) {
      console.error("Error loading review items from database:", error);
      // Continue with empty arrays if database fails
      this.reviewItems = [];
      this.approvedItems = [];
    }
  },

  // Initialize PIR selector component
  async initializePIRSelector() {
    try {
      const container = document.getElementById("pir-selector-container");
      if (!container) {
        console.warn("PIR selector container not found");
        return;
      }

      // Initialize PIR selector with options
      this.pirSelector = PIRSelector.create("pir-selector-container", {
        placeholder: "Select PIRs for processing...",
        allowMultiple: true,
        showSearch: true,
        onSelectionChange: (selectedPIRs) => {
          this.selectedPIRs = selectedPIRs;
          this.onPIRSelectionChange(selectedPIRs);
        },
      });

      // Set default PIRs if none selected
      if (this.selectedPIRs.length === 0) {
        // Get default PIRs from the selector
        const defaultPIRs = await this.getDefaultPIRs();
        if (defaultPIRs.length > 0) {
          this.selectedPIRs = defaultPIRs;
          this.pirSelector.setSelectedPIRs(defaultPIRs);
        }
      }
    } catch (error) {
      console.error("Error initializing PIR selector:", error);
      // Fallback to default PIRs
      this.selectedPIRs = [
        { id: "ukraine", name: "Ukraine Conflict", color: "#3b82f6" },
        { id: "sabotage", name: "Industrial Sabotage", color: "#ef4444" },
        { id: "insider", name: "Insider Threats", color: "#f59e0b" },
      ];
    }
  },

  // Get default PIRs for fallback
  async getDefaultPIRs() {
    try {
      if (typeof PersimmonDB !== "undefined" && PersimmonDB.getActivePIRs) {
        const activePIRs = await PersimmonDB.getActivePIRs();
        return activePIRs.slice(0, 3); // Limit to first 3 for default
      }
    } catch (error) {
      console.warn("Could not load active PIRs, using fallback:", error);
    }

    // Fallback PIRs
    return [
      { id: "ukraine", name: "Ukraine Conflict", color: "#3b82f6" },
      { id: "sabotage", name: "Industrial Sabotage", color: "#ef4444" },
      { id: "insider", name: "Insider Threats", color: "#f59e0b" },
    ];
  },

  // Handle PIR selection changes
  onPIRSelectionChange(selectedPIRs) {
    console.log("PIR selection changed:", selectedPIRs);

    // Update processing queue display with PIR context
    this.updateProcessingContext();

    // Filter review items if needed
    this.filterReviewItemsByPIRs();

    // Show notification about PIR change
    if (selectedPIRs.length > 0) {
      const pirNames = selectedPIRs.map((pir) => pir.name).join(", ");
      Persimmon.notifications.info(`Processing focus updated: ${pirNames}`);
    } else {
      Persimmon.notifications.warning(
        "No PIRs selected - processing will use default criteria"
      );
    }
  },

  // Update processing context display
  updateProcessingContext() {
    const contextElement = document.querySelector(".processing-context");
    if (contextElement && this.selectedPIRs.length > 0) {
      const pirNames = this.selectedPIRs.map((pir) => pir.name).join(", ");
      contextElement.textContent = `AI is analyzing raw data against selected PIRs: ${pirNames}`;
    }
  },

  // Filter review items based on selected PIRs
  filterReviewItemsByPIRs() {
    if (this.selectedPIRs.length === 0) {
      // Show all items if no PIRs selected
      this.renderReviewItems();
      return;
    }

    // Get PIR IDs for filtering
    const selectedPIRIds = this.selectedPIRs.map((pir) => pir.id);

    // Filter review items to match selected PIRs
    const filteredItems = this.reviewItems.filter((item) => {
      if (!item.category) return false;
      return selectedPIRIds.includes(item.category);
    });

    // Update display with filtered items
    this.renderFilteredReviewItems(filteredItems);
  },

  // Render filtered review items
  renderFilteredReviewItems(filteredItems) {
    const container = document.getElementById("review-items");

    if (filteredItems.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No items match selected PIRs</div>';
      return;
    }

    container.innerHTML = filteredItems
      .map((item) => {
        // Apply encoding fixes to all text content before rendering
        const title = Persimmon.utils.fixTextEncoding(item.title || "");
        const summary = Persimmon.utils.fixTextEncoding(item.summary || "");
        const quote = Persimmon.utils.fixTextEncoding(item.quote || "");
        const source = Persimmon.utils.fixTextEncoding(item.source || "");

        return `
                <div class="review-item ${item.decision || ""}" id="review-${
          item.id
        }">
                    <div class="review-header">
                        <div class="review-title">${Persimmon.utils.sanitizeHtml(
                          title
                        )}</div>
                        <div class="ai-confidence">${
                          item.confidence
                        }% confidence</div>
                    </div>
                    <div class="review-summary">${Persimmon.utils.sanitizeHtml(
                      summary
                    )}</div>
                    ${
                      quote
                        ? `<div class="item-quote">"${Persimmon.utils.sanitizeHtml(
                            quote
                          )}"</div>`
                        : ""
                    }
                    <div class="review-meta">
                        <span>${Persimmon.utils.sanitizeHtml(source)}</span>
                        <span>${item.category.toUpperCase()}</span>
                        <span>${item.priority.toUpperCase()} PRIORITY</span>
                    </div>
                    <div class="review-actions">
                        <button class="action-btn approve" onclick="PersimmonProcessor.reviewItem('${
                          item.id
                        }', 'approve')">Approve</button>
                        <button class="action-btn reject" onclick="PersimmonProcessor.reviewItem('${
                          item.id
                        }', 'reject')">Reject</button>
                        <button class="action-btn" onclick="PersimmonProcessor.editReviewItem('${
                          item.id
                        }')">Edit</button>
                    </div>
                </div>
            `;
      })
      .join("");
  },

  // Enhanced AI processing with PIR context
  async processWithPIRContext(content, source) {
    try {
      // Get selected PIR names for context
      const pirNames = this.selectedPIRs.map((pir) => pir.name).join(", ");
      const pirContext =
        pirNames || "Ukraine Conflict, Industrial Sabotage, Insider Threats";

      // Use AI service with PIR context
      if (
        typeof Persimmon !== "undefined" &&
        Persimmon.api &&
        Persimmon.api.processWithClaude
      ) {
        return await Persimmon.api.processWithClaude(content, source, {
          pirContext: pirContext,
          selectedPIRs: this.selectedPIRs,
        });
      } else {
        // Fallback processing without AI
        return this.fallbackProcessing(content, source);
      }
    } catch (error) {
      console.error("Error in PIR-context processing:", error);
      return this.fallbackProcessing(content, source);
    }
  },

  // Fallback processing when AI is not available
  fallbackProcessing(content, source) {
    // Simple keyword-based categorization
    const contentLower = content.toLowerCase();
    let category = "none";
    let priority = "medium";
    let relevant = false;

    // Check for PIR-related keywords
    if (
      this.selectedPIRs.some((pir) => pir.id === "ukraine") &&
      (contentLower.includes("ukraine") ||
        contentLower.includes("russia") ||
        contentLower.includes("bakhmut"))
    ) {
      category = "ukraine";
      relevant = true;
      priority = "high";
    } else if (
      this.selectedPIRs.some((pir) => pir.id === "sabotage") &&
      (contentLower.includes("sabotage") ||
        contentLower.includes("infrastructure") ||
        contentLower.includes("scada"))
    ) {
      category = "sabotage";
      relevant = true;
      priority = "medium";
    } else if (
      this.selectedPIRs.some((pir) => pir.id === "insider") &&
      (contentLower.includes("insider") ||
        contentLower.includes("employee") ||
        contentLower.includes("clearance"))
    ) {
      category = "insider";
      relevant = true;
      priority = "medium";
    }

    return {
      relevant: relevant,
      category: category,
      priority: priority,
      confidence: relevant ? 75 : 25,
      title: content.substring(0, 100) + "...",
      summary: content.substring(0, 200) + "...",
      quote: content.substring(0, 150) + "...",
      reasoning: relevant
        ? `Matches ${category} PIR criteria`
        : "No PIR match found",
    };
  },

  setupHeader() {
    const headerContainer = document.getElementById("header-container");
    headerContainer.innerHTML = Persimmon.ui.createHeader(
      "Data Processor",
      "processor"
    );
  },

  // Page navigation
  showPage(pageId, buttonElement) {
    // Hide all pages
    document
      .querySelectorAll(".page")
      .forEach((page) => page.classList.remove("active"));
    document
      .querySelectorAll(".nav-link")
      .forEach((link) => link.classList.remove("active"));

    // Show selected page
    document.getElementById(pageId + "-page").classList.add("active");

    // If buttonElement is provided, make it active
    if (buttonElement) {
      buttonElement.classList.add("active");
    } else {
      // Fallback: find the button by onclick attribute
      const activeButton = document.querySelector(
        `[onclick*="showPage('${pageId}')"]`
      );
      if (activeButton) {
        activeButton.classList.add("active");
      }
    }
  },

  // File Upload Handling
  setupFileUpload() {
    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("file-input");

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener("click", () => fileInput.click());
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });
  },

  handleFiles(files) {
    Array.from(files).forEach((file) => {
      const fileObj = {
        id: Persimmon.utils.generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      };
      this.uploadedFiles.push(fileObj);
    });

    this.renderFileList();
  },

  renderFileList() {
    const fileList = document.getElementById("file-list");
    const container = document.getElementById("files-container");

    if (!fileList || !container) return;

    if (this.uploadedFiles.length === 0) {
      fileList.style.display = "none";
      return;
    }

    fileList.style.display = "block";
    container.innerHTML = this.uploadedFiles
      .map(
        (file) => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${Persimmon.utils.formatFileSize(
                      file.size
                    )} • ${Persimmon.csv.detectFileType(file.name)}</div>
                </div>
                <button class="btn" onclick="PersimmonProcessor.removeFile('${
                  file.id
                }')">Remove</button>
            </div>
        `
      )
      .join("");
  },

  removeFile(fileId) {
    this.uploadedFiles = this.uploadedFiles.filter((f) => f.id !== fileId);
    this.renderFileList();
  },

  clearFiles() {
    this.uploadedFiles = [];
    this.renderFileList();
  },

  // Enhanced processing with PIR context
  async processFiles() {
    if (this.uploadedFiles.length === 0) {
      Persimmon.notifications.warning("Please upload files first");
      return;
    }

    const btn = document.getElementById("process-btn");
    Persimmon.ui.setButtonLoading(btn, true, "Processing...");

    try {
      // Process each file with PIR context
      for (let i = 0; i < this.uploadedFiles.length; i++) {
        const file = this.uploadedFiles[i];
        await this.processFile(file, i);
      }

      // Switch to processing queue view
      setTimeout(() => {
        this.showPage("processing");
        document
          .querySelector('[onclick*="processing"]')
          .classList.add("active");
      }, 500);
    } catch (error) {
      console.error("Processing error:", error);
      Persimmon.notifications.error(`Processing failed: ${error.message}`);
    } finally {
      Persimmon.ui.setButtonLoading(btn, false);
    }
  },

  async processFile(file, index) {
    try {
      const fileContent = await this.readFileContent(file.file);
      const items = Persimmon.csv.parse(fileContent, file.name);

      Persimmon.notifications.info(
        `Processing ${items.length} items from ${file.name}`
      );

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const queueItem = {
          id: Persimmon.utils.generateId(),
          title: Persimmon.utils.truncate(item.content, 80),
          source: file.name,
          status: "pending",
          rawContent: item.content,
          originalData: item,
          timestamp: new Date().toISOString(),
        };

        this.processingQueue.push(queueItem);

        // Start processing with PIR context and delay
        setTimeout(async () => {
          await this.processQueueItem(queueItem);
        }, index * 1000 + i * 200); // Stagger processing
      }

      this.renderProcessingQueue();
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      Persimmon.notifications.error(
        `Failed to process ${file.name}: ${error.message}`
      );
    }
  },

  async processQueueItem(queueItem) {
    queueItem.status = "processing";
    this.renderProcessingQueue();

    try {
      // Use PIR-context processing
      const analysis = await this.processWithPIRContext(
        queueItem.rawContent,
        queueItem.source
      );

      if (analysis.relevant) {
        queueItem.status = "completed";
        queueItem.confidence = analysis.confidence;
        queueItem.category = analysis.category;
        queueItem.priority = analysis.priority;
        queueItem.title = analysis.title;
        queueItem.summary = analysis.summary;
        queueItem.quote = analysis.quote;
        queueItem.reasoning = analysis.reasoning;

        this.reviewItems.push(queueItem);
      } else {
        queueItem.status = "filtered";
        queueItem.reasoning =
          analysis.reasoning || "Not relevant to selected PIRs";
      }
    } catch (error) {
      console.error("Processing error:", error);
      queueItem.status = "error";
      queueItem.error = error.message;
    }

    this.renderProcessingQueue();
    this.renderReviewItems();
    this.updateReviewStats();
  },

  async readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  },

  // Rendering Functions
  async renderProcessingQueue() {
    const container = document.getElementById("processing-queue");

    if (!container) return;

    try {
      // Load only pending processing queue items from database
      const queueItems = await PersimmonDB.getProcessingQueue("pending");

      if (queueItems.length === 0) {
        container.innerHTML =
          '<div class="empty-state">No items in processing queue</div>';
        return;
      }

      container.innerHTML = queueItems
        .map((item) => {
          // Handle both intelligence items and RSS feed items
          let title, source, content;

          if (item.intelligence_items) {
            // Traditional intelligence item
            title =
              item.intelligence_items.title || "Untitled Intelligence Item";
            source = item.intelligence_items.source_name || "Unknown Source";
            content = item.intelligence_items.content || "";
          } else if (item.rss_feed_items) {
            // RSS feed item
            title = item.rss_feed_items.title || "Untitled RSS Item";
            source = item.rss_feed_items.rss_feeds?.name || "RSS Feed";
            content =
              item.rss_feed_items.description ||
              item.rss_feed_items.content ||
              "";
          } else {
            // Fallback
            title = "Unknown Item";
            source = "Unknown Source";
            content = "";
          }

          // Apply encoding fixes to all text content
          title = Persimmon.utils.fixTextEncoding(title);
          source = Persimmon.utils.fixTextEncoding(source);

          return `
                    <div class="queue-item ${item.status}" data-queue-id="${
            item.id
          }">
                        <div class="item-content">
                            <div class="item-title">${Persimmon.utils.sanitizeHtml(
                              title
                            )}</div>
                            <div class="item-meta">
                                ${Persimmon.utils.sanitizeHtml(source)} • 
                                Priority: ${item.priority} • 
                                Status: ${item.status.toUpperCase()} • 
                                Attempts: ${item.attempts}/${item.max_attempts}
                                ${
                                  item.error_message
                                    ? ` • Error: ${Persimmon.utils.sanitizeHtml(
                                        item.error_message
                                      )}`
                                    : ""
                                }
                            </div>
                        </div>
                        <div class="item-status status-${item.status}">
                            <div class="status-dot"></div>
                            <span>${item.status.toUpperCase()}</span>
                        </div>
                    </div>
                `;
        })
        .join("");
    } catch (error) {
      console.error("Error loading processing queue:", error);
      container.innerHTML =
        '<div class="empty-state">Error loading processing queue</div>';
    }
  },

  filterReviewItems() {
    this.renderReviewItems();
  },

  renderReviewItems() {
    const container = document.getElementById("review-items");
    const sourceFilter =
      document.getElementById("review-source-filter")?.value || "all";

    if (!container) return;

    let pendingItems = this.reviewItems.filter((item) => !item.reviewed);

    if (sourceFilter !== "all") {
      pendingItems = pendingItems.filter((item) => {
        if (sourceFilter === "rss") {
          return (
            item.originalData?.rss_feed_id ||
            item.source?.toLowerCase().includes("rss")
          );
        }
        if (sourceFilter === "upload") {
          return (
            item.source?.toLowerCase().includes(".csv") ||
            item.source?.toLowerCase().includes(".json")
          );
        }
        if (sourceFilter === "manual") {
          return item.source === "Manual Entry";
        }
        return true;
      });
    }

    if (pendingItems.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No items pending review</div>';
      return;
    }

    container.innerHTML = pendingItems
      .map((item) => {
        // Apply encoding fixes to all text content before rendering
        const title = Persimmon.utils.fixTextEncoding(item.title || "");
        const summary = Persimmon.utils.fixTextEncoding(item.summary || "");
        const quote = Persimmon.utils.fixTextEncoding(item.quote || "");
        const source = Persimmon.utils.fixTextEncoding(item.source || "");

        return `
                <div class="review-item ${item.decision || ""}" id="review-${
          item.id
        }">
                    <div class="review-header">
                        <div class="review-title">${Persimmon.utils.sanitizeHtml(
                          title
                        )}</div>
                        <div class="ai-confidence">${
                          item.confidence
                        }% confidence</div>
                    </div>
                    <div class="review-summary">${Persimmon.utils.sanitizeHtml(
                      summary
                    )}</div>
                    ${
                      quote
                        ? `<div class="item-quote">"${Persimmon.utils.sanitizeHtml(
                            quote
                          )}"</div>`
                        : ""
                    }
                    <div class="review-meta">
                        <span>${Persimmon.utils.sanitizeHtml(source)}</span>
                        <span>${item.category.toUpperCase()}</span>
                        <span>${item.priority.toUpperCase()} PRIORITY</span>
                    </div>
                    <div class="review-actions">
                        <button class="action-btn approve" onclick="PersimmonProcessor.reviewItem('${
                          item.id
                        }', 'approve')">Approve</button>
                        <button class="action-btn reject" onclick="PersimmonProcessor.reviewItem('${
                          item.id
                        }', 'reject')">Reject</button>
                        <button class="action-btn" onclick="PersimmonProcessor.editReviewItem('${
                          item.id
                        }')">Edit</button>
                    </div>
                </div>
            `;
      })
      .join("");
  },

  // Review Functions
  async reviewItem(itemId, decision) {
    console.log("reviewItem called:", itemId, decision);

    const item = this.reviewItems.find((i) => i.id === itemId);
    console.log("Found item:", item);

    if (item) {
      try {
        // Update database first
        if (decision === "approve") {
          await PersimmonDB.approveReviewItem(
            item.originalData?.queue_item_id || itemId,
            `Approved by analyst`
          );
        } else {
          await PersimmonDB.rejectReviewItem(
            item.originalData?.queue_item_id || itemId,
            `Rejected by analyst`
          );
        }

        // Update local state
        item.reviewed = true;
        item.decision = decision;
        item.approved = decision === "approve";

        if (decision === "approve") {
          this.approvedItems.push(item);
          if (Persimmon && Persimmon.notifications) {
            Persimmon.notifications.success(
              "Item approved and saved to database"
            );
          } else {
            alert("Item approved");
          }
        } else {
          this.rejectedItems.push(item);
          if (Persimmon && Persimmon.notifications) {
            Persimmon.notifications.info("Item rejected and saved to database");
          } else {
            alert("Item rejected");
          }
        }

        const element = document.getElementById(`review-${itemId}`);
        if (element) {
          element.classList.add(
            decision === "approve" ? "approved" : "rejected"
          );

          setTimeout(() => {
            this.renderReviewItems();
            this.updateReviewStats();
          }, 1000);
        }
      } catch (error) {
        console.error("Error updating item in database:", error);
        if (Persimmon && Persimmon.notifications) {
          Persimmon.notifications.error(
            `Failed to ${decision} item: ${error.message}`
          );
        } else {
          alert(`Error: Failed to ${decision} item`);
        }
      }
    } else {
      console.error("Item not found:", itemId);
      alert("Error: Item not found");
    }
  },

  approveAll() {
    const pendingItems = this.reviewItems.filter((item) => !item.reviewed);
    if (pendingItems.length === 0) {
      Persimmon.notifications.warning("No items to approve");
      return;
    }

    pendingItems.forEach((item) => {
      this.reviewItem(item.id, "approve");
    });

    Persimmon.notifications.success(`Approved ${pendingItems.length} items`);
  },

  rejectAll() {
    const pendingItems = this.reviewItems.filter((item) => !item.reviewed);
    if (pendingItems.length === 0) {
      Persimmon.notifications.warning("No items to reject");
      return;
    }

    pendingItems.forEach((item) => {
      this.reviewItem(item.id, "reject");
    });

    Persimmon.notifications.info(`Rejected ${pendingItems.length} items`);
  },

  editReviewItem(itemId) {
    const item = this.reviewItems.find((i) => i.id === itemId);
    if (!item) {
      alert("Item not found");
      return;
    }

    this.showEditModal(item);
  },

  showEditModal(item) {
    // Create modal HTML with encoding fixes
    const modalHtml = `
            <div class="edit-modal-overlay" id="edit-modal-overlay">
                <div class="edit-modal">
                    <div class="edit-modal-header">
                        <h3>Edit Intelligence Item</h3>
                        <button class="close-btn" onclick="PersimmonProcessor.closeEditModal()">&times;</button>
                    </div>
                    <div class="edit-modal-body">
                        <div class="form-group">
                            <label for="edit-title">Title:</label>
                            <input type="text" id="edit-title" class="form-input" value="${Persimmon.utils.sanitizeHtml(
                              item.title
                            )}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-summary">Summary:</label>
                            <textarea id="edit-summary" class="form-textarea" rows="4">${Persimmon.utils.sanitizeHtml(
                              item.summary
                            )}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-category">Category:</label>
                                <select id="edit-category" class="form-select">
                                    <option value="ukraine" ${
                                      item.category === "ukraine"
                                        ? "selected"
                                        : ""
                                    }>Ukraine</option>
                                    <option value="sabotage" ${
                                      item.category === "sabotage"
                                        ? "selected"
                                        : ""
                                    }>Industrial Sabotage</option>
                                    <option value="insider" ${
                                      item.category === "insider"
                                        ? "selected"
                                        : ""
                                    }>Insider Threats</option>
                                    <option value="none" ${
                                      item.category === "none" ? "selected" : ""
                                    }>None</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-priority">Priority:</label>
                                <select id="edit-priority" class="form-select">
                                    <option value="high" ${
                                      item.priority === "high" ? "selected" : ""
                                    }>High</option>
                                    <option value="medium" ${
                                      item.priority === "medium"
                                        ? "selected"
                                        : ""
                                    }>Medium</option>
                                    <option value="low" ${
                                      item.priority === "low" ? "selected" : ""
                                    }>Low</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-quote">Key Quote (optional):</label>
                            <textarea id="edit-quote" class="form-textarea" rows="2">${Persimmon.utils.sanitizeHtml(
                              item.quote || ""
                            )}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-confidence">AI Confidence:</label>
                            <input type="range" id="edit-confidence" min="0" max="100" value="${
                              item.confidence
                            }" class="form-range">
                            <span id="confidence-value">${
                              item.confidence
                            }%</span>
                        </div>
                    </div>
                    <div class="edit-modal-footer">
                        <button class="btn btn-primary" onclick="PersimmonProcessor.saveEditedItem('${
                          item.id
                        }')">Save Changes</button>
                        <button class="btn" onclick="PersimmonProcessor.closeEditModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `;

    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Add confidence slider listener
    const confidenceSlider = document.getElementById("edit-confidence");
    const confidenceValue = document.getElementById("confidence-value");
    confidenceSlider.addEventListener("input", (e) => {
      confidenceValue.textContent = e.target.value + "%";
    });

    // Focus on title field
    document.getElementById("edit-title").focus();
  },

  saveEditedItem(itemId) {
    const item = this.reviewItems.find((i) => i.id === itemId);
    if (!item) {
      alert("Item not found");
      return;
    }

    // Get values from form
    const title = document.getElementById("edit-title").value.trim();
    const summary = document.getElementById("edit-summary").value.trim();
    const category = document.getElementById("edit-category").value;
    const priority = document.getElementById("edit-priority").value;
    const quote = document.getElementById("edit-quote").value.trim();
    const confidence = parseInt(
      document.getElementById("edit-confidence").value
    );

    // Validate required fields
    if (!title) {
      alert("Title is required");
      return;
    }

    if (!summary) {
      alert("Summary is required");
      return;
    }

    // Update item
    item.title = title;
    item.summary = summary;
    item.category = category;
    item.priority = priority;
    item.quote = quote;
    item.confidence = confidence;

    // Close modal and refresh display
    this.closeEditModal();
    this.renderReviewItems();

    if (Persimmon && Persimmon.notifications) {
      Persimmon.notifications.success("Item updated successfully");
    } else {
      alert("Item updated successfully");
    }
  },

  closeEditModal() {
    const modal = document.getElementById("edit-modal-overlay");
    if (modal) {
      modal.remove();
    }
  },

  updateReviewStats() {
    const pending = this.reviewItems.filter((item) => !item.reviewed).length;
    const approved = this.approvedItems.length;
    const rejected = this.rejectedItems.length;

    Persimmon.ui.updateText("pending-count", pending.toString());
    Persimmon.ui.updateText("approved-count", approved.toString());
    Persimmon.ui.updateText("rejected-count", rejected.toString());
  },

  // Export Functions
  async publishToFeed() {
    if (this.approvedItems.length === 0) {
      Persimmon.notifications.warning("No approved items to publish");
      return;
    }

    const button = event.target;
    Persimmon.ui.setButtonLoading(button, true, "Publishing...");

    try {
      let publishedCount = 0;
      let errorCount = 0;
      const successfullyPublishedItems = []; // Track which items were successfully published

      // Process each approved item using the new database workflow
      for (const item of this.approvedItems) {
        try {
          // Use the new publishReviewItem function which handles both RSS and intelligence items
          if (item.originalData?.queue_item_id) {
            await PersimmonDB.publishReviewItem(
              item.originalData.queue_item_id
            );
            publishedCount++;
            successfullyPublishedItems.push(item); // Track successful publication
          } else {
            // Fallback: Create new intelligence item if no queue item ID
            const newItem = {
              title: item.title,
              content: item.content || item.summary,
              summary: item.summary,
              quote: item.quote || "",
              category: item.category,
              priority: item.priority,
              source_name: item.source,
              source_type: "rss",
              original_url: item.originalData?.original_url || "",
              ai_processed: true,
              ai_reasoning: item.reasoning,
              confidence: item.confidence,
              processing_status: "completed",
              analyst_comment: `AI-processed with ${item.confidence}% confidence. ${item.reasoning}`,
              approved: true,
            };

            await PersimmonDB.createIntelligenceItem(newItem);
            publishedCount++;
            successfullyPublishedItems.push(item); // Track successful publication
          }
        } catch (error) {
          console.error("Error publishing item:", item.title, error);
          errorCount++;
          // Don't add to successfullyPublishedItems - keep in approved list for retry
        }
      }

      // SELECTIVE REMOVAL: Only remove successfully published items from approved list
      this.approvedItems = this.approvedItems.filter(
        (item) => !successfullyPublishedItems.includes(item)
      );

      this.updateReviewStats();

      if (publishedCount > 0) {
        Persimmon.notifications.success(
          `Successfully published ${publishedCount} items to intelligence feed!`
        );

        if (
          confirm(
            "Items published successfully! Open Intelligence Feed to view the new items?"
          )
        ) {
          window.open("./feed.html", "_blank");
        }
      }

      if (errorCount > 0) {
        Persimmon.notifications.warning(
          `${errorCount} items failed to publish and remain in approved list for retry`
        );
      }
    } catch (error) {
      console.error("Error publishing to feed:", error);
      Persimmon.notifications.error(`Publishing failed: ${error.message}`);
    } finally {
      Persimmon.ui.setButtonLoading(button, false);
    }
  },

  exportReview() {
    const reviewData = {
      processed: new Date().toISOString(),
      approved: this.approvedItems,
      rejected: this.rejectedItems,
      pending: this.reviewItems.filter((item) => !item.reviewed),
    };

    const dataStr = JSON.stringify(reviewData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `persimmon-review-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    Persimmon.notifications.success("Review data exported successfully");
  },

  // Quick Data Sources
  fetchGDELT() {
    Persimmon.notifications.info(
      "GDELT integration would fetch recent events matching PIRs"
    );
    // In production, this would integrate with GDELT API
  },

  async fetchRSS() {
    try {
      if (PersimmonRSS && typeof PersimmonRSS.refreshAllFeeds === "function") {
        Persimmon.notifications.info("Refreshing all active RSS feeds...");

        const results = await PersimmonRSS.refreshAllFeeds();
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        if (successCount > 0) {
          Persimmon.notifications.success(
            `Successfully refreshed ${successCount} RSS feeds`
          );

          // Switch to processing queue to show new items
          setTimeout(() => {
            this.showPage("processing");
            document
              .querySelector('[onclick*="processing"]')
              .classList.add("active");
          }, 1000);
        }

        if (failCount > 0) {
          Persimmon.notifications.warning(
            `${failCount} feeds failed to refresh`
          );
        }

        if (successCount === 0 && failCount === 0) {
          Persimmon.notifications.info(
            "No active RSS feeds found. Configure feeds in Admin panel."
          );
        }
      } else {
        Persimmon.notifications.warning(
          "RSS service not available. Please check Admin panel for RSS feed configuration."
        );
      }
    } catch (error) {
      console.error("RSS fetch error:", error);
      Persimmon.notifications.error(`RSS fetch failed: ${error.message}`);
    }
  },

  mockLiferaft() {
    // Create a mock Liferaft CSV file with enhanced geographic and category data
    const csvContent = `"Date","Source","Content","Location","Coordinates","Category","Priority","Sentiment","Relevance","Author","URL"
"2025-07-30","Twitter","Ukrainian forces report breakthrough near Bakhmut sector, 3rd Assault Brigade secured key positions overlooking main supply corridor","Bakhmut, Ukraine","48.5958,38.1292","ukraine","high","neutral","High","@UkrMilitary","https://twitter.com/example1"
"2025-07-30","Telegram","Infrastructure vulnerability discussion targeting SCADA systems in regional industrial facilities, sophisticated malware designed for operational technology","Bucharest, Romania","44.4268,26.1025","sabotage","medium","negative","High","InfraWatch","https://t.me/example2"
"2025-07-30","LinkedIn","Employee expressing concerns about security protocols at major tech facility, potential insider access issues and clearance problems","Berlin, Germany","52.5200,13.4050","insider","high","negative","High","TechWorker_DE","https://linkedin.com/example3"
"2025-07-30","Facebook","Industrial facility power outage reported, possible sabotage indicators at energy infrastructure, coordinated attack patterns","Sopot, Poland","54.4518,18.5681","sabotage","medium","neutral","High","EnergyAlert","https://facebook.com/example4"
"2025-07-29","Twitter","Ukrainian military sources confirm territorial gains along strategic supply routes, Russian forces conducting organized withdrawal","Kramatorsk, Ukraine","48.7233,37.5609","ukraine","high","positive","High","@DefenseUpdate","https://twitter.com/example5"
"2025-07-29","Reddit","Discussion of vulnerabilities in critical infrastructure monitoring systems, APT groups targeting industrial control systems","Prague, Czech Republic","50.0755,14.4378","sabotage","low","negative","Medium","CyberSecPro","https://reddit.com/example6"
"2025-07-29","Telegram","Insider reports unusual activity patterns at industrial facilities, enhanced monitoring of critical facility perimeters recommended","Warsaw, Poland","52.2297,21.0122","insider","medium","negative","Medium","SecurityInsider","https://t.me/example7"
"2025-07-28","Twitter","Reports of coordinated cyber attacks on energy sector SCADA systems, attack methodology matches previous campaigns","Vienna, Austria","48.2082,16.3738","sabotage","high","negative","High","@CyberThreatIntel","https://twitter.com/example8"
"2025-07-28","LinkedIn","Regional security assessment indicates elevated threat indicators for Q4 monitoring period","Budapest, Hungary","47.4979,19.0402","ukraine","medium","neutral","Medium","SecurityAnalyst_EU","https://linkedin.com/example9"
"2025-07-27","Facebook","Industrial reconnaissance activities detected targeting control systems, preliminary indicators suggest coordinated effort","Krakow, Poland","50.0647,19.9450","sabotage","medium","negative","High","IndustrialSec","https://facebook.com/example10"`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], "mock_liferaft_export.csv", {
      type: "text/csv",
    });

    this.handleFiles([file]);
    Persimmon.notifications.success(
      "Mock Liferaft CSV generated and uploaded!"
    );
  },

  manualEntry() {
    const title = prompt("Enter intelligence item title:");
    if (!title) return;

    const summary = prompt("Enter summary:");
    if (!summary) return;

    const category =
      prompt("Enter category (ukraine/sabotage/insider):") || "ukraine";
    const priority = prompt("Enter priority (high/medium/low):") || "medium";

    const manualItem = {
      id: Persimmon.utils.generateId(),
      title: title,
      category: category,
      priority: priority,
      source: "Manual Entry",
      summary: summary,
      quote: "",
      reasoning: "Manually entered by analyst",
      confidence: 100,
      reviewed: false,
    };

    // Add directly to review items
    this.reviewItems.push(manualItem);
    this.renderReviewItems();
    this.updateReviewStats();

    Persimmon.notifications.success("Manual item added to review queue");
  },

  // Process all items in the queue
  async processAllQueueItems() {
    const btn = event.target;
    Persimmon.ui.setButtonLoading(btn, true, "Processing...");

    try {
      // Get all pending queue items
      const queueItems = await PersimmonDB.getProcessingQueue("pending");

      if (queueItems.length === 0) {
        Persimmon.notifications.info("No pending items to process");
        return;
      }

      Persimmon.notifications.info(
        `Processing ${queueItems.length} queue items...`
      );

      let processedCount = 0;
      let errorCount = 0;

      // Keep track of processed items to hide them from queue display
      this.processedQueueItems = this.processedQueueItems || new Set();

      // Process each item
      for (const queueItem of queueItems) {
        try {
          await this.processQueueItemFromDB(queueItem);
          // Mark item as processed locally
          this.processedQueueItems.add(queueItem.id);
          processedCount++;
        } catch (error) {
          console.error(`Error processing queue item ${queueItem.id}:`, error);
          errorCount++;
        }

        // Update UI periodically
        if (processedCount % 5 === 0) {
          await this.renderProcessingQueue();
        }
      }

      // Final UI update
      await this.renderProcessingQueue();
      await this.renderReviewItems();
      this.updateReviewStats();

      if (processedCount > 0) {
        Persimmon.notifications.success(
          `Successfully processed ${processedCount} items! Check Review & Approve tab.`
        );

        // Auto-switch to review tab if items were processed
        setTimeout(() => {
          this.showPage("review");
          document.querySelector('[onclick*="review"]').classList.add("active");
        }, 2000);
      }

      if (errorCount > 0) {
        Persimmon.notifications.warning(
          `${errorCount} items failed to process`
        );
      }
    } catch (error) {
      console.error("Error processing queue items:", error);
      Persimmon.notifications.error(`Processing failed: ${error.message}`);
    } finally {
      Persimmon.ui.setButtonLoading(btn, false);
    }
  },

  // Process a single queue item from database
  async processQueueItemFromDB(queueItem) {
    let reviewItem;

    try {
      // Update status to processing
      await PersimmonDB.updateProcessingQueueStatus(queueItem.id, "processing");
      console.log(`Processing queue item ${queueItem.id}`);
    } catch (error) {
      console.warn(
        `Could not update queue item ${queueItem.id} to processing status:`,
        error
      );
      // Continue processing even if status update fails
    }

    // Check if this is an RSS feed item or intelligence item
    if (queueItem.rss_feed_items) {
      // RSS feed item - use RSS data
      const rssItem = queueItem.rss_feed_items;
      const feedName = rssItem.rss_feeds?.name || "RSS Feed";

      // Clean HTML content from RSS items and apply encoding fixes
      const cleanDescription = Persimmon.utils.stripHtml(
        rssItem.description || ""
      );
      const cleanContent = Persimmon.utils.stripHtml(rssItem.content || "");

      reviewItem = {
        id: queueItem.id, // Use queue item ID
        title: Persimmon.utils.fixTextEncoding(
          rssItem.title || "Untitled RSS Item"
        ),
        summary: Persimmon.utils.fixTextEncoding(
          cleanDescription ||
            cleanContent?.substring(0, 200) + "..." ||
            "No summary available"
        ),
        content: Persimmon.utils.fixTextEncoding(
          cleanContent || cleanDescription || "Content not available"
        ),
        category: "ukraine", // Default category - could be improved with AI categorization
        priority: "medium",
        source: Persimmon.utils.fixTextEncoding(feedName),
        confidence: 85,
        reasoning: `Processed from RSS feed: ${feedName}`,
        quote: Persimmon.utils.fixTextEncoding(
          cleanDescription?.substring(0, 150) + "..." || ""
        ),
        originalData: {
          queue_item_id: queueItem.id,
          rss_feed_item_id: rssItem.id,
          rss_feed_name: feedName,
          original_url: rssItem.link,
        },
        reviewed: false,
        timestamp: new Date().toISOString(),
      };
    } else if (queueItem.intelligence_items) {
      // Traditional intelligence item
      const intelligenceItem = queueItem.intelligence_items;

      reviewItem = {
        id: intelligenceItem.id || queueItem.id,
        title: Persimmon.utils.fixTextEncoding(
          intelligenceItem.title || "Intelligence Item"
        ),
        summary: Persimmon.utils.fixTextEncoding(
          intelligenceItem.summary ||
            intelligenceItem.content?.substring(0, 200) + "..." ||
            "No summary available"
        ),
        content: Persimmon.utils.fixTextEncoding(
          intelligenceItem.content || "Content not available"
        ),
        category: intelligenceItem.category || "none",
        priority: intelligenceItem.priority || "medium",
        source: Persimmon.utils.fixTextEncoding(
          intelligenceItem.source_name || "Unknown Source"
        ),
        confidence: 85,
        reasoning: "Processed intelligence item",
        quote: Persimmon.utils.fixTextEncoding(
          intelligenceItem.content?.substring(0, 150) + "..." || ""
        ),
        originalData: {
          intelligence_item_id: intelligenceItem.id,
          queue_item_id: queueItem.id,
        },
        reviewed: false,
        timestamp: new Date().toISOString(),
      };
    } else {
      // Fallback for items without proper data
      reviewItem = {
        id: queueItem.id,
        title: "Unknown Item",
        summary: "Item processed from queue without complete data",
        content: "Content not available",
        category: "none",
        priority: "medium",
        source: "Unknown Source",
        confidence: 50,
        reasoning: "Processed from queue with incomplete data",
        quote: "",
        originalData: {
          queue_item_id: queueItem.id,
        },
        reviewed: false,
        timestamp: new Date().toISOString(),
      };
    }

    // Add to review items
    this.reviewItems.push(reviewItem);

    try {
      // Move to review status instead of completed
      await PersimmonDB.moveToReview(queueItem.id, {
        category: reviewItem.category,
        priority: reviewItem.priority,
        confidence: reviewItem.confidence,
        reasoning: reviewItem.reasoning,
      });
      console.log(
        `Successfully processed queue item ${queueItem.id} and moved to review status`
      );
    } catch (error) {
      console.warn(
        `Could not update queue item ${queueItem.id} to review status:`,
        error
      );
      // Continue even if status update fails - the item was still processed
    }

    return reviewItem;
  },

  // Refresh the processing queue display
  async refreshQueue() {
    const btn = event.target;
    Persimmon.ui.setButtonLoading(btn, true, "Refreshing...");

    try {
      await this.renderProcessingQueue();
      Persimmon.notifications.success("Processing queue refreshed");
    } catch (error) {
      console.error("Error refreshing queue:", error);
      Persimmon.notifications.error(
        `Failed to refresh queue: ${error.message}`
      );
    } finally {
      Persimmon.ui.setButtonLoading(btn, false);
    }
  },

  // Clear completed items from the processing queue
  async clearCompleted() {
    const btn = event.target;
    Persimmon.ui.setButtonLoading(btn, true, "Clearing...");

    try {
      // Get completed queue items
      const completedItems = await PersimmonDB.getProcessingQueue("completed");

      if (completedItems.length === 0) {
        Persimmon.notifications.info("No completed items to clear");
        return;
      }

      // Confirm with user
      if (
        !confirm(
          `Clear ${completedItems.length} completed items from the queue?`
        )
      ) {
        return;
      }

      let clearedCount = 0;
      let errorCount = 0;

      // Delete each completed item
      for (const item of completedItems) {
        try {
          await PersimmonDB.deleteProcessingQueueItem(item.id);
          clearedCount++;
        } catch (error) {
          console.error(`Error deleting queue item ${item.id}:`, error);
          errorCount++;
        }
      }

      // Refresh the queue display
      await this.renderProcessingQueue();

      if (clearedCount > 0) {
        Persimmon.notifications.success(
          `Cleared ${clearedCount} completed items from queue`
        );
      }

      if (errorCount > 0) {
        Persimmon.notifications.warning(`${errorCount} items failed to clear`);
      }
    } catch (error) {
      console.error("Error clearing completed items:", error);
      Persimmon.notifications.error(
        `Failed to clear completed items: ${error.message}`
      );
    } finally {
      Persimmon.ui.setButtonLoading(btn, false);
    }
  },
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  PersimmonProcessor.init();
});

// Make functions available globally for onclick handlers
window.PersimmonProcessor = PersimmonProcessor;
