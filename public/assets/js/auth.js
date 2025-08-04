/**
 * Persimmon Authentication Module - Auth0 Integration
 * Handles user authentication across the application using Auth0
 */

const PersimmonAuth = {
  // Current user state
  currentUser: null,
  isAuthenticated: false,
  auth0: null,

  // Initialize authentication
  async init() {
    await this.setupAuth0();
    await this.checkAuthState();
    this.setupEventListeners();
  },

  // Setup Auth0 client
  async setupAuth0() {
    try {
      // Auth0 configuration - these values are public and safe to expose
      // This is the single source of truth for the entire application.
      const domain = "dev-bqb1oc1bvin0hma7.eu.auth0.com";
      const clientId = "zXMv2QcGwi2Dyik2UvWfOMkQzXoto3im";
      const audience = "";

      // Check if we have valid configuration
      if (
        domain === "your-auth0-domain.auth0.com" ||
        clientId === "your-auth0-client-id"
      ) {
        console.warn(
          "Auth0 not configured. Please update the domain and clientId in auth.js"
        );
        // On the login page, we can show a more prominent error.
        if (document.getElementById("config-notice")) {
          document.getElementById("config-notice").style.display = "block";
          document.getElementById("login-button").disabled = true;
        }
        return;
      }

      if (typeof createAuth0Client !== "undefined") {
        this.auth0 = await createAuth0Client({
          domain: domain,
          clientId: clientId,
          authorizationParams: {
            redirect_uri: window.location.origin,
            audience: audience,
          },
        });

        console.log("Auth0 initialized successfully");
      } else {
        console.warn("Auth0 SDK not loaded");
      }
    } catch (error) {
      console.error("Failed to initialize Auth0:", error);
    }
  },

  // Check current authentication state
  async checkAuthState() {
    if (!this.auth0) return;

    try {
      // Handle Auth0 callback if present
      if (
        window.location.search.includes("code=") &&
        window.location.search.includes("state=")
      ) {
        await this.auth0.handleRedirectCallback();
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }

      // Check if user is authenticated
      const isAuthenticated = await this.auth0.isAuthenticated();
      if (isAuthenticated) {
        const user = await this.auth0.getUser();
        this.handleAuthChange(user);
      } else {
        this.handleAuthChange(null);
      }
    } catch (error) {
      console.error("Auth state check failed:", error);
      this.handleAuthChange(null);
    }
  },

  // Handle authentication state changes
  handleAuthChange(user) {
    this.currentUser = user;
    this.isAuthenticated = !!user;

    if (user) {
      this.onLogin(user);
    } else {
      this.onLogout();
    }
  },

  // Called when user logs in
  onLogin(user) {
    console.log("User logged in:", user);

    // Store user info for the session
    if (typeof Persimmon !== "undefined" && Persimmon.storage) {
      Persimmon.storage.set("currentUser", {
        id: user.sub,
        email: user.email,
        name: user.name || user.email,
        picture: user.picture,
        roles: user["https://persimmon.app/roles"] || ["user"], // Custom claim for roles
      });
    }

    // Update UI to show authenticated state
    this.updateAuthUI(true);

    // Redirect away from auth pages if currently on one
    if (window.location.pathname.includes("/auth/")) {
      window.location.href = "/";
    }
  },

  // Called when user logs out
  onLogout() {
    console.log("User logged out");

    // Clear user data
    if (typeof Persimmon !== "undefined" && Persimmon.storage) {
      Persimmon.storage.remove("currentUser");
    }

    // Update UI to show unauthenticated state
    this.updateAuthUI(false);

    // Redirect to login
    if (!window.location.pathname.includes("/auth/")) {
      window.location.href = "/auth/login.html";
    }
  },

  // Update UI based on authentication state
  updateAuthUI(isAuthenticated) {
    // Add user menu to header if authenticated
    if (isAuthenticated) {
      this.addUserMenu();
    } else {
      this.removeUserMenu();
    }
  },

  // Add user menu to header
  addUserMenu() {
    const headerActions = document.querySelector(".header-actions");
    if (headerActions && this.currentUser) {
      // Remove existing user menu if present
      const existingMenu = headerActions.querySelector(".user-menu");
      if (existingMenu) {
        existingMenu.remove();
      }

      // Create user menu
      const userMenu = document.createElement("div");
      userMenu.className = "user-menu";
      userMenu.innerHTML = `
                <div class="user-menu-trigger">
                    <div class="user-avatar">
                        ${this.getUserInitials()}
                    </div>
                    <span class="user-name">${this.getUserDisplayName()}</span>
                    <svg class="user-menu-arrow" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                    </svg>
                </div>
                <div class="user-menu-dropdown">
                    <div class="user-menu-item" onclick="PersimmonAuth.showUserProfile()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                        Profile
                    </div>
                    <div class="user-menu-item" onclick="PersimmonAuth.logout()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                        </svg>
                        Sign out
                    </div>
                </div>
            `;

      // Add styles for user menu
      this.addUserMenuStyles();

      // Add click handler for dropdown toggle
      const trigger = userMenu.querySelector(".user-menu-trigger");
      trigger.addEventListener("click", () => {
        userMenu.classList.toggle("active");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!userMenu.contains(e.target)) {
          userMenu.classList.remove("active");
        }
      });

      headerActions.appendChild(userMenu);
    }
  },

  // Add styles for user menu
  addUserMenuStyles() {
    if (document.getElementById("user-menu-styles")) return;

    const styles = document.createElement("style");
    styles.id = "user-menu-styles";
    styles.textContent = `
            .user-menu {
                position: relative;
            }
            
            .user-menu-trigger {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border: 1px solid var(--border-medium);
                border-radius: 6px;
                background: var(--bg-white);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .user-menu-trigger:hover {
                background: var(--bg-secondary);
            }
            
            .user-avatar {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: var(--persimmon-primary);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 600;
            }
            
            .user-name {
                font-size: 12px;
                font-weight: 500;
                color: var(--text-primary);
            }
            
            .user-menu-arrow {
                color: var(--text-secondary);
                transition: transform 0.2s ease;
            }
            
            .user-menu.active .user-menu-arrow {
                transform: rotate(180deg);
            }
            
            .user-menu-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 4px;
                background: var(--bg-white);
                border: 1px solid var(--border-medium);
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                min-width: 160px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-8px);
                transition: all 0.2s ease;
                z-index: 1000;
            }
            
            .user-menu.active .user-menu-dropdown {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .user-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.2s ease;
                font-size: 14px;
                color: var(--text-primary);
            }
            
            .user-menu-item:hover {
                background: var(--bg-secondary);
            }
            
            .user-menu-item:first-child {
                border-radius: 6px 6px 0 0;
            }
            
            .user-menu-item:last-child {
                border-radius: 0 0 6px 6px;
            }
            
            .user-menu-item svg {
                color: var(--text-secondary);
            }
        `;
    document.head.appendChild(styles);
  },

  // Remove user menu from header
  removeUserMenu() {
    const userMenu = document.querySelector(".user-menu");
    if (userMenu) {
      userMenu.remove();
    }
  },

  // Get user initials for avatar
  getUserInitials() {
    if (!this.currentUser) return "?";

    const name = this.currentUser.name || this.currentUser.email;
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  },

  // Get display name for user
  getUserDisplayName() {
    if (!this.currentUser) return "User";

    return this.currentUser.name || this.currentUser.email.split("@")[0];
  },

  // Show user profile modal
  showUserProfile() {
    const roles = this.currentUser["https://persimmon.app/roles"] || ["user"];
    alert(
      `User Profile:\n\nName: ${this.currentUser.name || "Not set"}\nEmail: ${
        this.currentUser.email
      }\nRoles: ${roles.join(", ")}\nUser ID: ${this.currentUser.sub}`
    );
  },

  // Setup additional event listeners
  setupEventListeners() {
    // Check for authentication status changes periodically
    setInterval(async () => {
      if (this.auth0) {
        try {
          const isAuthenticated = await this.auth0.isAuthenticated();
          if (isAuthenticated !== this.isAuthenticated) {
            if (isAuthenticated) {
              const user = await this.auth0.getUser();
              this.handleAuthChange(user);
            } else {
              this.handleAuthChange(null);
            }
          }
        } catch (error) {
          console.error("Auth status check failed:", error);
        }
      }
    }, 5000);
  },

  // Manual logout function
  async logout() {
    if (this.auth0) {
      try {
        await this.auth0.logout({
          logoutParams: {
            returnTo: window.location.origin + "/auth/login.html",
          },
        });
      } catch (error) {
        console.error("Logout failed:", error);
        // Fallback: clear local state and redirect
        this.handleAuthChange(null);
        window.location.href = "/auth/login.html";
      }
    }
  },

  // Check if user has specific role
  hasRole(role) {
    if (!this.currentUser) return false;
    const userRoles = this.currentUser["https://persimmon.app/roles"] || [];
    return userRoles.includes(role);
  },

  // Get current user data
  getCurrentUser() {
    return this.currentUser;
  },

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated;
  },
};

// Auto-initialize if in browser environment
if (typeof window !== "undefined") {
  // Wait for DOM and potential Auth0 script to load
  document.addEventListener("DOMContentLoaded", () => {
    // Add Auth0 script if not present
    if (!document.querySelector('script[src*="auth0-spa-js"]')) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js";
      script.onload = () => {
        PersimmonAuth.init();
      };
      document.head.appendChild(script);
    } else {
      PersimmonAuth.init();
    }
  });

  // Make available globally
  window.PersimmonAuth = PersimmonAuth;
}

// Export for ES6 modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PersimmonAuth;
}
