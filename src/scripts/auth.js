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

    // Display a message on the page
    const formMessage = document.getElementById("form-message");
    if (formMessage) {
      formMessage.textContent =
        "Success! Please check your email for a confirmation link.";
      formMessage.className = "notice success";
      formMessage.style.display = "block";
    }
    // Disable the form to prevent re-submission
    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
      Array.from(signupForm.elements).forEach((el) => (el.disabled = true));
    }

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
   * Handles all authentication state changes, including initial load.
   * This is the single source of truth for redirect logic.
   */
  handleAuthStateChange() {
    if (!this.supabase) return;

    this.supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      const isAuthPage = window.location.pathname.includes("/auth/");

      console.log(`Auth event: ${event}`, session);

      // Case 1: User is logged in
      if (user) {
        // If they are on an auth page (login, signup), redirect to the app's root
        if (isAuthPage) {
          console.log("User is logged in, redirecting from auth page to /");
          window.location.pathname = "/";
        }
        // Otherwise, they are on a protected page and can stay there.
      }
      // Case 2: User is not logged in
      else {
        // If they are on a protected page, redirect to the login page
        if (!isAuthPage) {
          console.log("User is not logged in, redirecting to /auth/login.html");
          window.location.pathname = "/auth/login.html";
        }
        // Otherwise, they are already on an auth page and can stay there.
      }
    });
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
