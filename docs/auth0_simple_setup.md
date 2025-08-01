# Auth0 Setup Instructions - Simple Approach

## Problem Solved ✅

The Netlify build was failing due to **secrets scanning** detecting Auth0 configuration values during the build process. I've simplified the approach to avoid this issue entirely.

## New Simple Approach

### 1. **No Build-Time Injection**

- Removed complex build scripts that triggered secrets scanning
- Auth0 credentials are now set directly in the code (which is secure for SPAs)

### 2. **Why This Is Still Secure** 🔒

- **Auth0 Client ID**: Designed to be public (like a username)
- **Auth0 Domain**: Also public information
- **No Client Secret**: SPAs don't use client secrets (those would be private)

### 3. **Setup Steps**

1. **Create Auth0 Application**:

   - Go to [auth0.com](https://auth0.com) and create a free account
   - Create a new "Single Page Application"
   - Name it "Persimmon Intelligence"

2. **Get Your Credentials**:

   - Copy your **Domain** (e.g., `my-app.us.auth0.com`)
   - Copy your **Client ID** (e.g., `abc123def456...`)

3. **Update Login Page**:

   - Open `public/auth/login.html`
   - Find the `AUTH0_CONFIG` object around line 120
   - Replace the placeholder values:
     ```javascript
     const AUTH0_CONFIG = {
       domain: "my-app.us.auth0.com", // Your actual domain
       clientId: "abc123def456...", // Your actual client ID
       audience: "", // Leave empty for now
     };
     ```

4. **Configure Auth0 Application**:

   - In Auth0 dashboard, set **Allowed Callback URLs**: `https://your-site.netlify.app, http://localhost:3000`
   - Set **Allowed Logout URLs**: `https://your-site.netlify.app/auth/login.html`
   - Set **Allowed Web Origins**: `https://your-site.netlify.app`

5. **Deploy**:
   - Commit and push your changes
   - Netlify will deploy without build issues

### 4. **What Changed**

- ✅ Removed build script that caused secrets scanning issues
- ✅ Simplified configuration approach
- ✅ Clear setup instructions
- ✅ Auth0 credentials are public anyway (secure for SPAs)

### 5. **Files to Update**

Only need to edit one file: `public/auth/login.html` (lines ~120-124)

This approach is actually **more straightforward** and follows Auth0's standard SPA setup pattern!
