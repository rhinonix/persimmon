/**
 * Persimmon PIR Selector Component
 * Multi-select dropdown with search functionality for PIR selection
 */

const PIRSelector = {
  // Component instances
  instances: new Map(),
  globalListenerAttached: false,

  initGlobalListener() {
    if (this.globalListenerAttached) return;
    document.addEventListener("click", (e) => {
      PIRSelector.instances.forEach((instance) => {
        // Check if the instance is still valid and the click is outside
        if (
          instance.container &&
          document.body.contains(instance.container) &&
          !instance.container.contains(e.target)
        ) {
          PIRSelector.closeDropdown(instance);
        }
      });
    });
    this.globalListenerAttached = true;
  },

  // Create a new PIR selector instance
  create(containerId, options = {}) {
    this.initGlobalListener();
    const instance = {
      containerId,
      container: null,
      selectedPIRs: new Set(options.initialSelection || []),
      availablePIRs: [],
      filteredPIRs: [],
      isOpen: false,
      searchTerm: "",
      onSelectionChange: options.onSelectionChange || (() => {}),
      placeholder: options.placeholder || "Search and select PIRs...",
      maxHeight: options.maxHeight || "200px",
    };

    this.instances.set(containerId, instance);
    return this.init(instance);
  },

  // Initialize PIR selector instance
  async init(instance) {
    instance.container = document.getElementById(instance.containerId);
    if (!instance.container) {
      console.error(
        `PIR Selector: Container ${instance.containerId} not found`
      );
      return null;
    }

    await this.loadAvailablePIRs(instance);
    this.render(instance);
    this.setupEventListeners(instance);
    return instance;
  },

  // Load available PIRs from database
  async loadAvailablePIRs(instance) {
    try {
      if (PersimmonDB && PersimmonDB.isAvailable()) {
        instance.availablePIRs = await PersimmonDB.getActivePIRs();
      } else {
        // Fallback PIRs
        instance.availablePIRs = [
          {
            id: "1",
            name: "Ukraine Conflict",
            category_code: "ukraine",
            description: "Frontline movements, political developments",
            color_code: "#0057b7",
            active: true,
          },
          {
            id: "2",
            name: "Industrial Sabotage",
            category_code: "sabotage",
            description: "Infrastructure attacks, facility threats",
            color_code: "#dc2626",
            active: true,
          },
          {
            id: "3",
            name: "Insider Threats",
            category_code: "insider",
            description: "Employee security issues, clearance problems",
            color_code: "#f59e0b",
            active: true,
          },
        ];
      }

      instance.filteredPIRs = [...instance.availablePIRs];
    } catch (error) {
      console.error("Error loading PIRs:", error);
      instance.availablePIRs = [];
      instance.filteredPIRs = [];
    }
  },

  // Render the PIR selector
  render(instance) {
    const selectedPIRsArray = Array.from(instance.selectedPIRs);
    const selectedPIRObjects = selectedPIRsArray
      .map((id) => instance.availablePIRs.find((pir) => pir.id === id))
      .filter(Boolean);

    instance.container.innerHTML = `
      <div class="pir-selector">
        <div class="pir-search-container">
          <input 
            type="text" 
            class="pir-search-input" 
            placeholder="${instance.placeholder}"
            value="${instance.searchTerm}"
            autocomplete="off"
          >
          <div class="pir-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
        </div>
        
        <div class="selected-pirs">
          ${selectedPIRObjects
            .map(
              (pir) => `
            <div class="pir-tag" data-pir-id="${pir.id}" style="background-color: ${pir.color_code}15; border-color: ${pir.color_code}; color: ${pir.color_code}">
              <span class="pir-tag-name">${pir.name}</span>
              <button type="button" class="pir-tag-remove" data-pir-id="${pir.id}">×</button>
            </div>
          `
            )
            .join("")}
        </div>
        
        <div class="pir-dropdown ${
          instance.isOpen ? "open" : ""
        }" style="max-height: ${instance.maxHeight}">
          ${this.renderDropdownItems(instance)}
        </div>
      </div>
    `;

    this.updateStyles();
  },

  // Render dropdown items
  renderDropdownItems(instance) {
    if (instance.filteredPIRs.length === 0) {
      return '<div class="pir-dropdown-empty">No PIRs found</div>';
    }

    return instance.filteredPIRs
      .map((pir) => {
        const isSelected = instance.selectedPIRs.has(pir.id);
        return `
        <div class="pir-dropdown-item ${
          isSelected ? "selected" : ""
        }" data-pir-id="${pir.id}">
          <div class="pir-item-content">
            <div class="pir-item-header">
              <div class="pir-item-name" style="color: ${pir.color_code}">${
          pir.name
        }</div>
              <div class="pir-item-code">${pir.category_code}</div>
            </div>
            <div class="pir-item-description">${pir.description || ""}</div>
          </div>
          <div class="pir-item-indicator" style="background-color: ${
            pir.color_code
          }"></div>
        </div>
      `;
      })
      .join("");
  },

  // Setup event listeners
  setupEventListeners(instance) {
    const container = instance.container;

    // Search input events
    const searchInput = container.querySelector(".pir-search-input");
    searchInput.addEventListener("input", (e) => {
      instance.searchTerm = e.target.value;
      this.filterPIRs(instance);
      this.openDropdown(instance);
    });

    searchInput.addEventListener("focus", () => {
      this.openDropdown(instance);
    });

    // Tag removal events
    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("pir-tag-remove")) {
        const pirId = e.target.dataset.pirId;
        this.removePIR(instance, pirId);
      }
    });

    // Dropdown item selection
    container.addEventListener("click", (e) => {
      const dropdownItem = e.target.closest(".pir-dropdown-item");
      if (dropdownItem) {
        const pirId = dropdownItem.dataset.pirId;
        if (instance.selectedPIRs.has(pirId)) {
          this.removePIR(instance, pirId);
        } else {
          this.addPIR(instance, pirId);
        }
      }
    });

    // Keyboard navigation
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeDropdown(instance);
        searchInput.blur();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const firstItem = container.querySelector(
          ".pir-dropdown-item:not(.selected)"
        );
        if (firstItem) {
          const pirId = firstItem.dataset.pirId;
          this.addPIR(instance, pirId);
        }
      }
    });
  },

  // Filter PIRs based on search term
  filterPIRs(instance) {
    const searchTerm = instance.searchTerm.toLowerCase();

    if (!searchTerm) {
      instance.filteredPIRs = [...instance.availablePIRs];
    } else {
      instance.filteredPIRs = instance.availablePIRs.filter((pir) => {
        return (
          pir.name.toLowerCase().includes(searchTerm) ||
          pir.category_code.toLowerCase().includes(searchTerm) ||
          (pir.description &&
            pir.description.toLowerCase().includes(searchTerm))
        );
      });
    }

    this.updateDropdown(instance);
  },

  // Add PIR to selection
  addPIR(instance, pirId) {
    if (!instance.selectedPIRs.has(pirId)) {
      instance.selectedPIRs.add(pirId);
      this.updateDisplay(instance);
      this.notifySelectionChange(instance);
    }
  },

  // Remove PIR from selection
  removePIR(instance, pirId) {
    if (instance.selectedPIRs.has(pirId)) {
      instance.selectedPIRs.delete(pirId);
      this.updateDisplay(instance);
      this.notifySelectionChange(instance);
    }
  },

  // Open dropdown
  openDropdown(instance) {
    if (instance.isOpen) return;
    instance.isOpen = true;
    const dropdown = instance.container.querySelector(".pir-dropdown");
    if (dropdown) {
      dropdown.classList.add("open");
    }
  },

  // Close dropdown
  closeDropdown(instance) {
    if (!instance.isOpen) return;
    instance.isOpen = false;
    const dropdown = instance.container.querySelector(".pir-dropdown");
    if (dropdown) {
      dropdown.classList.remove("open");
    }
  },

  // Update dropdown content
  updateDropdown(instance) {
    const dropdown = instance.container.querySelector(".pir-dropdown");
    dropdown.innerHTML = this.renderDropdownItems(instance);
  },

  // Update display after selection change
  updateDisplay(instance) {
    const selectedPIRsArray = Array.from(instance.selectedPIRs);
    const selectedPIRObjects = selectedPIRsArray
      .map((id) => instance.availablePIRs.find((pir) => pir.id === id))
      .filter(Boolean);

    // Update selected tags
    const selectedContainer =
      instance.container.querySelector(".selected-pirs");
    selectedContainer.innerHTML = selectedPIRObjects
      .map(
        (pir) => `
        <div class="pir-tag" data-pir-id="${pir.id}" style="background-color: ${pir.color_code}15; border-color: ${pir.color_code}; color: ${pir.color_code}">
          <span class="pir-tag-name">${pir.name}</span>
          <button type="button" class="pir-tag-remove" data-pir-id="${pir.id}">×</button>
        </div>
      `
      )
      .join("");

    // Update dropdown items
    this.updateDropdown(instance);
  },

  // Notify selection change
  notifySelectionChange(instance) {
    const selectedPIRs = Array.from(instance.selectedPIRs);
    const selectedPIRObjects = selectedPIRs
      .map((id) => instance.availablePIRs.find((pir) => pir.id === id))
      .filter(Boolean);

    instance.onSelectionChange(selectedPIRs, selectedPIRObjects);
  },

  // Get selected PIRs for an instance
  getSelectedPIRs(containerId) {
    const instance = this.instances.get(containerId);
    if (!instance) return [];

    return Array.from(instance.selectedPIRs);
  },

  // Set selected PIRs for an instance
  setSelectedPIRs(containerId, pirIds) {
    const instance = this.instances.get(containerId);
    if (!instance) return;

    instance.selectedPIRs = new Set(pirIds);
    this.updateDisplay(instance);
    this.notifySelectionChange(instance);
  },

  // Clear selection for an instance
  clearSelection(containerId) {
    this.setSelectedPIRs(containerId, []);
  },

  // Refresh PIRs for an instance
  async refreshPIRs(containerId) {
    const instance = this.instances.get(containerId);
    if (!instance) return;

    await this.loadAvailablePIRs(instance);
    this.updateDisplay(instance);
  },

  // Update styles
  updateStyles() {
    // Only add styles once
    if (document.getElementById("pir-selector-styles")) return;

    const styles = document.createElement("style");
    styles.id = "pir-selector-styles";
    styles.textContent = `
      .pir-selector {
        position: relative;
        width: 100%;
      }

      .pir-search-container {
        position: relative;
        margin-bottom: 8px;
      }

      .pir-search-input {
        width: 100%;
        padding: 8px 32px 8px 12px;
        border: 1px solid var(--border-medium);
        border-radius: 4px;
        font-size: 13px;
        background: var(--bg-white);
        transition: border-color 0.2s ease;
      }

      .pir-search-input:focus {
        outline: none;
        border-color: var(--accent-blue);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }

      .pir-search-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-tertiary);
        pointer-events: none;
      }

      .selected-pirs {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
        min-height: 24px;
      }

      .pir-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        background: var(--bg-white);
        transition: all 0.2s ease;
      }

      .pir-tag:hover {
        opacity: 0.8;
      }

      .pir-tag-name {
        line-height: 1;
      }

      .pir-tag-remove {
        background: none;
        border: none;
        color: inherit;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        padding: 0;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
      }

      .pir-tag-remove:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }

      .pir-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-white);
        border: 1px solid var(--border-medium);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: none;
        overflow-y: auto;
      }

      .pir-dropdown.open {
        display: block;
      }

      .pir-dropdown-empty {
        padding: 12px;
        text-align: center;
        color: var(--text-secondary);
        font-size: 12px;
      }

      .pir-dropdown-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-light);
        transition: background-color 0.2s ease;
      }

      .pir-dropdown-item:last-child {
        border-bottom: none;
      }

      .pir-dropdown-item:hover {
        background-color: var(--bg-secondary);
      }

      .pir-dropdown-item.selected {
        background-color: #f0f9ff;
        color: var(--accent-blue);
      }

      .pir-item-content {
        flex: 1;
      }

      .pir-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 2px;
      }

      .pir-item-name {
        font-weight: 500;
        font-size: 13px;
      }

      .pir-item-code {
        font-size: 10px;
        color: var(--text-tertiary);
        background: var(--bg-secondary);
        padding: 1px 4px;
        border-radius: 2px;
        font-family: monospace;
      }

      .pir-item-description {
        font-size: 11px;
        color: var(--text-secondary);
        line-height: 1.3;
      }

      .pir-item-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 8px;
      }
    `;

    document.head.appendChild(styles);
  },

  // Destroy instance
  destroy(containerId) {
    const instance = this.instances.get(containerId);
    if (instance && instance.container) {
      instance.container.innerHTML = "";
    }
    this.instances.delete(containerId);
  },
};

// Make available globally
if (typeof window !== "undefined") {
  window.PIRSelector = PIRSelector;
}
