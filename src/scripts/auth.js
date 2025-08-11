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
        this.SUPABASE_ANON_KEY,
        {
          auth: {
            storage: cookieStorageAdapter,
          },
        }
      );
      console.log("Supabase client initialized with cookie storage.");
    } else {
      console.error(
        "Supabase SDK not loaded. Make sure to include it in your HTML."
      );
      this.showConfigWarning("Supabase SDK not found.");
      return;
    }

    // No longer doing redirects here. The Edge Function handles route protection.
    // this.handleAuthStateChange();
  },

  // --- Core Authentication Methods ---

  /**
   * Sign in a user with email and password.
   * After sign-in, Supabase sets a cookie that the Edge Function will recognize.
   * Then, we redirect to the root page.
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
   * This removes the Supabase cookie. The Edge Function will then deny access.
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
  // This section is no longer needed. The Edge Function is the source of truth.
  // The UI can be updated based on the presence of the user on a protected page.

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

// Custom storage adapter to use cookies
const cookieStorageAdapter = {
  getItem: (key) => {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.startsWith(key + "=")) {
        // Decode the cookie value
        return decodeURIComponent(cookie.substring(key.length + 1));
      }
    }
    return null;
  },
  setItem: (key, value) => {
    // Encode the cookie value and set it
    document.cookie = `${key}=${encodeURIComponent(
      value
    )}; path=/; max-age=31536000; secure; samesite=lax`;
  },
  removeItem: (key) => {
    // To remove a cookie, set its expiration date to the past.
    document.cookie = `${key}=; path=/; max-age=0; secure; samesite=lax`;
  },
};

// Initialize the auth module when the script loads
PersimmonAuth.init();
