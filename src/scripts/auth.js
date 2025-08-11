/**
 * Persimmon Authentication Module - Supabase Integration
 * Handles user authentication, session management, and password resets.
 */

const PersimmonAuth = {
  // Supabase client instance
  supabase: null,

  // --- Configuration ---
  // These values will be replaced by the build script.
  SUPABASE_URL: "__SUPABASE_URL__",
  SUPABASE_ANON_KEY: "__SUPABASE_ANON_KEY__",

  // --- Initialization ---
  init() {
    // Check if Supabase credentials are set
    if (
      this.SUPABASE_URL.startsWith("__") ||
      this.SUPABASE_ANON_KEY.startsWith("__")
    ) {
      console.error(
        "Supabase credentials are not configured. This is a build issue."
      );
      this.showConfigWarning("Build error: Supabase credentials not found.");
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
      console.log("Supabase client initialized.");
    } else {
      console.error(
        "Supabase SDK not loaded. Make sure to include it in your HTML."
      );
      this.showConfigWarning("Supabase SDK not found.");
      return;
    }

    this.handleAuthStateChange();
    this.redirectIfNotLoggedIn();
  },

  // --- Core Authentication Methods ---

  /**
   * Sign in a user with email and password.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<{user: object, error: object}>}
   */
  async signIn(email, password) {
    if (!this.supabase)
      return { user: null, error: { message: "Supabase not initialized." } };
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Sign-in error:", error.message);
      return { user: null, error };
    }
    console.log("User signed in:", data.user);
    // Redirect to home page after successful sign-in
    window.location.pathname = "/";
    return { user: data.user, error: null };
  },

  /**
   * Sign up a new user.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<{user: object, error: object}>}
   */
  async signUp(email, password) {
    if (!this.supabase)
      return { user: null, error: { message: "Supabase not initialized." } };
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      console.error("Sign-up error:", error.message);
      return { user: null, error };
    }
    // Supabase sends a confirmation email by default.
    console.log(
      "Sign-up successful. Please check your email for confirmation.",
      data.user
    );
    return { user: data.user, error: null };
  },

  /**
   * Sign out the current user.
   */
  async signOut() {
    if (!this.supabase) return;
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error("Sign-out error:", error.message);
    } else {
      console.log("User signed out.");
      // Redirect to login page after sign-out
      window.location.pathname = "/auth/login.html";
    }
  },

  /**
   * Send a password reset email.
   * @param {string} email - The user's email.
   * @returns {Promise<{error: object}>}
   */
  async sendPasswordResetEmail(email) {
    if (!this.supabase)
      return { error: { message: "Supabase not initialized." } };
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password.html`,
    });
    if (error) {
      console.error("Password reset error:", error.message);
    } else {
      console.log("Password reset email sent.");
    }
    return { error };
  },

  /**
   * Update the user's password. This is typically done after a password reset.
   * @param {string} newPassword - The new password.
   * @returns {Promise<{error: object}>}
   */
  async updateUserPassword(newPassword) {
    if (!this.supabase)
      return { error: { message: "Supabase not initialized." } };
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      console.error("Password update error:", error.message);
    } else {
      console.log("Password updated successfully.");
    }
    return { error };
  },

  // --- Session & State Management ---

  /**
   * Listen for changes in authentication state (sign-in, sign-out).
   */
  handleAuthStateChange() {
    if (!this.supabase) return;
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);

      // This function is now primarily for logging and potential future UI updates.
      // The redirect logic is handled by redirectIfNotLoggedIn() and the edge function.
      if (
        event === "SIGNED_IN" &&
        window.location.pathname.includes("/auth/")
      ) {
        window.location.pathname = "/";
      } else if (event === "SIGNED_OUT") {
        window.location.pathname = "/auth/login.html";
      }
    });
  },

  /**
   * Checks if a user is logged in and redirects to the login page if not.
   * This is useful for pages that require authentication.
   */
  async redirectIfNotLoggedIn() {
    // Don't run this logic on the auth pages themselves
    if (window.location.pathname.includes("/auth/")) {
      return;
    }

    const session = await this.getSession();
    if (!session) {
      console.log("No active session found, redirecting to login.");
      window.location.pathname = "/auth/login.html";
    }
  },

  /**
   * Get the current user session.
   * @returns {Promise<object|null>}
   */
  async getSession() {
    if (!this.supabase) {
      console.error("getSession called before Supabase was initialized.");
      return null;
    }
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error.message);
      return null;
    }
    return data.session;
  },

  /**
   * Get the current user's data.
   * @returns {Promise<object|null>}
   */
  async getUser() {
    const session = await this.getSession();
    return session?.user ?? null;
  },

  // --- UI Helper Functions ---

  /**
   * Display a warning on the page if Supabase is not configured.
   */
  showConfigWarning(message = "Supabase is not configured.") {
    document.addEventListener("DOMContentLoaded", () => {
      const notice = document.getElementById("config-notice");
      const loginButton = document.getElementById("login-button");

      if (notice) {
        notice.innerHTML = `<strong>Configuration Error:</strong> ${message} Please update <code>/assets/js/auth.js</code>.`;
        notice.style.display = "block";
      }
      if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Setup Required";
      }
    });
  },
};

// Initialize the auth module when the script loads
PersimmonAuth.init();
