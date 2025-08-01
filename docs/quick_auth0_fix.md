# Quick Auth0 Configuration Fix

## Current Issue

You're seeing "Authentication service is not configured" because the Auth0 credentials need to be set up.

## Quick Fix (5 minutes)

### Step 1: Create Free Auth0 Account

1. Go to [auth0.com](https://auth0.com)
2. Click "Sign up" (it's free)
3. Complete account setup

### Step 2: Create Application

1. In Auth0 dashboard, go to **Applications**
2. Click **"Create Application"**
3. Name: `Persimmon Intelligence`
4. Type: **Single Page Application**
5. Click **Create**

### Step 3: Get Your Credentials

From your Auth0 application settings, copy:

- **Domain** (looks like: `dev-xyz123.us.auth0.com`)
- **Client ID** (looks like: `ABC123xyz456...`)

### Step 4: Configure Your Site URLs

In the Auth0 application settings, set:

- **Allowed Callback URLs**: `https://your-site.netlify.app`
- **Allowed Logout URLs**: `https://your-site.netlify.app/auth/login.html`
- **Allowed Web Origins**: `https://your-site.netlify.app`

### Step 5: Update Your Code

Edit these two files with your Auth0 credentials:

#### File 1: `/public/auth/login.html` (around line 265)

```javascript
// Replace these lines:
const domain = "your-auth0-domain.auth0.com";
const clientId = "your-auth0-client-id";

// With your actual values:
const domain = "dev-xyz123.us.auth0.com"; // Your actual domain
const clientId = "ABC123xyz456..."; // Your actual client ID
```

#### File 2: `/public/assets/js/auth.js` (around line 30)

```javascript
// Replace these lines:
const domain = "your-auth0-domain.auth0.com";
const clientId = "your-auth0-client-id";

// With your actual values:
const domain = "dev-xyz123.us.auth0.com"; // Your actual domain
const clientId = "ABC123xyz456..."; // Your actual client ID
```

### Step 6: Create Your First User

1. In Auth0 dashboard → **User Management** → **Users**
2. Click **"Create User"**
3. Enter your email and password
4. Save

### Step 7: Deploy and Test

```bash
git add .
git commit -m "Configure Auth0 credentials"
git push origin main
```

Wait for deployment, then test at: `https://your-site.netlify.app/auth/login.html`

## Expected Result

- ✅ "Sign in with Auth0" button works
- ✅ Opens Auth0's professional login screen
- ✅ After login, redirects to your dashboard
- ✅ User menu appears with logout option

## If You Get Stuck

- **Domain not working?** Make sure it includes `.auth0.com`
- **Client ID issues?** Copy-paste carefully, it's usually very long
- **Still getting errors?** Check browser console for more details

## Security Note

This approach puts credentials in your code, which is fine for:

- ✅ Small teams (you + 2 people)
- ✅ Private repositories
- ✅ Single Page Applications (Auth0 expects this)

The client ID is not a secret - it's meant to be public for SPAs.

---

**Total setup time: ~5 minutes**  
**Result: Professional enterprise-grade authentication** 🔐
