# Auth0 Setup Guide - Step by Step

## Important Update

Netlify Identity has been deprecated. We're now using **Auth0** which provides more robust authentication and is the recommended approach.

## Steps to Enable Auth0 Authentication

### 1. Deploy Your Site First

1. **Commit and push** your changes to GitHub
2. **Go to Netlify Dashboard**: [app.netlify.com](https://app.netlify.com)
3. **Deploy your site** if not already done:
   - Click "New site from Git"
   - Connect your GitHub account
   - Select the `persimmon` repository
   - Use these settings:
     - **Build command**: (leave empty)
     - **Publish directory**: `public`
   - Click "Deploy site"

### 2. Install Auth0 Extension

1. **Go to your site dashboard** on Netlify
2. **Navigate to "Extensions"** in the sidebar
3. **Find "Auth0 by Okta"** extension
4. **Click "Install"**
5. **Click "Add a tenant"** and follow the prompts to connect your Auth0 account

### 3. Create Auth0 Account (if needed)

1. **If you don't have an Auth0 account**:
   - Go to [auth0.com](https://auth0.com)
   - Click "Sign up for free"
   - Create your account
2. **Create a new application**:
   - Choose "Single Page Application"
   - Name it "Persimmon Intelligence"

### 4. Configure Auth0 Application

1. **In your Auth0 dashboard**:
   - Go to Applications → Your App
   - Note down your **Domain** and **Client ID**
   - Set **Allowed Callback URLs**: `https://your-site.netlify.app`
   - Set **Allowed Logout URLs**: `https://your-site.netlify.app/auth/login.html`
   - Set **Allowed Web Origins**: `https://your-site.netlify.app`

### 5. Configure Netlify Extension

1. **Back in Netlify dashboard** → Extensions → Auth0
2. **Select your Auth0 tenant**
3. **Choose your application**
4. **Save configuration**
5. **Environment variables** will be automatically set:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_AUDIENCE`

### 6. Set Up User Management

1. **In Auth0 dashboard** → User Management → Users
2. **Create your first user**:
   - Click "Create User"
   - Enter your email and password
   - Set email as verified
3. **Invite team members**:
   - Create users for your 2 team members
   - Send them their credentials securely

### 7. Test the Setup

1. **Visit your login page**: `https://your-site.netlify.app/auth/login.html`
2. **Click "Sign in with Auth0"**
3. **You should see Auth0's Universal Login**
4. **Enter your credentials**
5. **You should be redirected** to your main dashboard

## What You'll See After Setup

### ✅ Working State

- "Sign in with Auth0" button works
- Clicking it opens Auth0's Universal Login
- Successful login redirects to main app
- User menu appears in header with logout option
- Sessions persist across browser refreshes

### 🔧 If You Still Have Issues

1. **Check environment variables** in Netlify dashboard → Site settings → Environment variables
2. **Verify Auth0 URLs** match your deployed site URL exactly
3. **Clear browser cache** completely
4. **Check browser console** for JavaScript errors
5. **Try incognito/private browsing** to test fresh session

## Your Site URLs

After deployment, bookmark these:

- **Main App**: `https://[your-site-name].netlify.app/`
- **Login**: `https://[your-site-name].netlify.app/auth/login.html`
- **Auth0 Dashboard**: `https://manage.auth0.com/`
- **Netlify Dashboard**: `https://app.netlify.com/sites/[your-site-name]/extensions`

## Next Steps After Auth0 Works

1. **Customize Auth0 branding** to match your Linear aesthetic
2. **Set up user roles** for different access levels
3. **Configure social login** (Google, GitHub, etc.) if desired
4. **Set up email templates** for password reset, etc.

## Advantages of Auth0 over Netlify Identity

- ✅ **More reliable** - Enterprise-grade authentication
- ✅ **Better UX** - Universal Login experience
- ✅ **More features** - Social login, MFA, advanced user management
- ✅ **Future-proof** - Actively maintained and updated
- ✅ **Better security** - Industry-leading security practices

The key is installing the Auth0 extension in your Netlify dashboard - it will automatically configure the environment variables needed! 🚀
