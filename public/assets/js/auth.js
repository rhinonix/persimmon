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
      const clientId = "qbW7YQYKScHKSjqUy7UmnyH78rUlm6C0";
      const audience = "";

      // Check if we have valid configuration
      if (typeof createAuth0Client !== "undefined") {
        this.auth0 = await createAuth0Client({
          domain: domain,
          client_id: clientId,
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
    // Always update the UI after attempting to set up Auth0
    this.updateUI();
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

  // Update UI based on authentication state
  updateUI() {
    const loginButton = document.getElementById("login-button");
    const configNotice = document.getElementById("config-notice");
    const errorMessage = document.getElementById("error-message");

    // Hide all messages by default
    if (configNotice) configNotice.style.display = "none";
    if (errorMessage) errorMessage.style.display = "none";

    if (!this.auth0) {
      if (loginButton) {
        loginButton.textContent = "Setup Required";
        loginButton.disabled = true;
      }
      if (configNotice) {
        configNotice.style.display = "block";
      }
      return;
    }

    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "Continue with Auth0";
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
    this.updateUI();
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
      });
    }

    // Redirect to the main app page if on the login page
    if (window.location.pathname.includes("login.html")) {
      window.location.pathname = "/";
    }
  },

  // Called when user logs out
  onLogout() {
    console.log("User logged out");
    // Redirect to login page if not already there
    if (!window.location.pathname.includes("login.html")) {
      window.location.pathname = "/auth/login.html";
    }
  },

  // Login with redirect
  async login() {
    if (!this.auth0) {
      console.error("Auth0 client not initialized.");
      const errorMessage = document.getElementById("error-message");
      if (errorMessage) {
        errorMessage.textContent =
          "Authentication service is not available. Please try again later.";
        errorMessage.style.display = "block";
      }
      return;
    }
    await this.auth0.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin,
      },
    });
  },

  // Logout
  async logout() {
    if (!this.auth0) return;
    await this.auth0.logout({
      logoutParams: {
        returnTo: window.origin + "/auth/login.html",
      },
    });
  },

  // Get user profile
  async getProfile() {
    if (!this.auth0 || !this.isAuthenticated) return null;
    return await this.auth0.getUser();
  },

  // Setup event listeners
  setupEventListeners() {
    // This event listener ensures the UI is updated only after the DOM is fully loaded.
    document.addEventListener("DOMContentLoaded", () => {
      this.updateUI();
    });
  },
};

// Initialize authentication when the script loads
PersimmonAuth.init();

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
