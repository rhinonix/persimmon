/**
 * Persimmon Authentication Module - Simplified Supabase Integration
 * Handles user authentication, session management, and route protection.
 */

const PersimmonAuth = {
  // Supabase client instance
  supabase: null,

  // --- Configuration ---
  // These values will be replaced by the build script with Netlify environment variables
  SUPABASE_URL: "__SUPABASE_URL__",
  SUPABASE_ANON_KEY: "__SUPABASE_ANON_KEY__",

  // --- Initialization ---
  init() {
    // Check if Supabase credentials are configured
    if (
      this.SUPABASE_URL.includes("your-project") ||
      this.SUPABASE_ANON_KEY.includes("your-anon-key")
    ) {
      console.error("Supabase credentials not configured");
      this.showConfigWarning();
      return;
    }

    // Initialize Supabase client if the SDK is available
    if (
      typeof supabase !== "undefined" &&
      typeof supabase.createClient === "function"
    ) {
      this.supabase = supabase.createClient(
        this.SUPABASE_URL,
        this.SUPABASE_ANON_KEY
      );
      console.log("Supabase client initialized");

      // Initialize database service with Supabase client
      if (typeof PersimmonDB !== "undefined") {
        PersimmonDB.init(this.supabase);
      }

      // Check authentication state on page load
      this.checkAuthState();
    } else {
      console.error(
        "Supabase SDK not loaded. Make sure to include it in your HTML."
      );
      this.showConfigWarning("Supabase SDK not found.");
      return;
    }
  },

  // --- Authentication State Management ---
  async checkAuthState() {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (user) {
        console.log("User is authenticated:", user.email);
        this.handleAuthenticatedUser(user);
      } else {
        console.log("User is not authenticated");
        this.handleUnauthenticatedUser();
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      this.handleUnauthenticatedUser();
    }
  },

  handleAuthenticatedUser(user) {
    // If we're on a login page, redirect to dashboard
    if (window.location.pathname.includes("/auth/")) {
      window.location.href = "/";
      return;
    }

    // Update UI to show authenticated state
    this.updateUIForAuthenticatedUser(user);
  },

  handleUnauthenticatedUser() {
    // If we're on a protected page, redirect to login
    const protectedPages = [
      "/",
      "/index.html",
      "/feed.html",
      "/processor.html",
      "/reports.html",
    ];
    const currentPath = window.location.pathname;

    if (protectedPages.includes(currentPath) || currentPath === "") {
      window.location.href = "/auth/login.html";
      return;
    }
  },

  updateUIForAuthenticatedUser(user) {
    // Update any user info displays
    const userEmailElements = document.querySelectorAll(".user-email");
    userEmailElements.forEach((el) => {
      el.textContent = user.email;
    });

    // Show authenticated content
    const authContent = document.querySelectorAll(".auth-required");
    authContent.forEach((el) => {
      el.style.display = "block";
    });

    // Hide unauthenticated content
    const unauthContent = document.querySelectorAll(".unauth-only");
    unauthContent.forEach((el) => {
      el.style.display = "none";
    });
  },

  // --- Core Authentication Methods ---

  /**
   * Sign in a user with email and password
   */
  async signIn(email, password) {
    if (!this.supabase) {
      return { user: null, error: { message: "Supabase not initialized." } };
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign-in error:", error.message);
        return { user: null, error };
      }

      console.log("User signed in:", data.user.email);
      return { user: data.user, error: null };
    } catch (error) {
      console.error("Sign-in error:", error);
      return { user: null, error: { message: error.message } };
    }
  },

  /**
   * Sign up a new user
   */
  async signUp(email, password) {
    if (!this.supabase) {
      return { user: null, error: { message: "Supabase not initialized." } };
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("Sign-up error:", error.message);
        return { user: null, error };
      }

      console.log("User signed up:", data.user?.email);
      return { user: data.user, error: null };
    } catch (error) {
      console.error("Sign-up error:", error);
      return { user: null, error: { message: error.message } };
    }
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error("Sign-out error:", error.message);
      } else {
        console.log("User signed out");
        // Redirect to login page
        window.location.href = "/auth/login.html";
      }
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  },

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(email) {
    if (!this.supabase) {
      return { error: { message: "Supabase not initialized." } };
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password.html`,
      });

      if (error) {
        console.error("Password reset error:", error.message);
      } else {
        console.log("Password reset email sent");
      }

      return { error };
    } catch (error) {
      console.error("Password reset error:", error);
      return { error: { message: error.message } };
    }
  },

  /**
   * Update the user's password
   */
  async updateUserPassword(newPassword) {
    if (!this.supabase) {
      return { error: { message: "Supabase not initialized." } };
    }

    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error:", error.message);
      } else {
        console.log("Password updated successfully");
      }

      return { error };
    } catch (error) {
      console.error("Password update error:", error);
      return { error: { message: error.message } };
    }
  },

  // --- UI Helper Functions ---

  /**
   * Display a warning on the page if Supabase is not configured
   */
  showConfigWarning(message = "Supabase is not configured.") {
    document.addEventListener("DOMContentLoaded", () => {
      const notice = document.getElementById("config-notice");
      const loginButton = document.getElementById("login-button");

      if (notice) {
        notice.innerHTML = `<strong>Configuration Error:</strong> ${message} Please update your Supabase credentials in auth.js.`;
        notice.style.display = "block";
      }

      if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Setup Required";
      }
    });
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    if (!this.supabase) return null;

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },
};

// Initialize the auth module when the script loads
PersimmonAuth.init();

// Make it available globally
window.PersimmonAuth = PersimmonAuth;
