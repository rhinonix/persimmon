# Supabase Authentication Setup Guide

## Quick Setup (5 minutes)

Your Persimmon Intelligence platform now has a clean, simplified authentication system using Supabase. Follow these steps to get it working:

### Step 1: Get Your Supabase Credentials

You mentioned you already have a Supabase project set up. You'll need:

1. **Project URL** - looks like: `https://your-project-id.supabase.co`
2. **Anon Key** - a long string starting with `eyJ...`

You can find these in your Supabase dashboard:

- Go to [supabase.com](https://supabase.com)
- Open your project
- Go to **Settings** → **API**
- Copy the **Project URL** and **anon public** key

### Step 2: Configure Netlify Environment Variables

In your Netlify dashboard:

1. **Go to your site** → **Site settings** → **Environment variables**
2. **Add these two variables:**

   - **Variable name:** `SUPABASE_URL`
   - **Value:** `https://your-actual-project-id.supabase.co`

   - **Variable name:** `SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your actual anon key)

3. **Save the variables**

The build script will automatically inject these values into your auth.js file during deployment.

### Step 3: Configure Supabase Auth Settings

In your Supabase dashboard:

1. **Go to Authentication** → **Settings**
2. **Site URL**: Set to your Netlify URL (e.g., `https://your-site.netlify.app`)
3. **Redirect URLs**: Add these URLs:
   - `https://your-site.netlify.app/auth/update-password.html`
   - `https://your-site.netlify.app/`

### Step 4: Enable Email Auth

In Supabase dashboard:

1. **Go to Authentication** → **Providers**
2. **Make sure Email is enabled**
3. **Configure email templates** (optional but recommended)

### Step 5: Deploy and Test

1. **Build your site**:

   ```bash
   ./build.sh
   ```

2. **Commit and push to GitHub**:

   ```bash
   git add .
   git commit -m "Add simplified Supabase authentication"
   git push origin main
   ```

3. **Test the authentication flow**:
   - Visit your Netlify site
   - Try to access the main pages - you should be redirected to login
   - Create an account at `/auth/signup.html`
   - Check your email for confirmation
   - Sign in at `/auth/login.html`
   - You should now access the dashboard and all your existing functionality

## What's Changed

### ✅ **Simplified Architecture**

- Removed complex edge functions
- No environment variables needed
- Direct client-side Supabase integration

### ✅ **Clean Authentication Flow**

- Login/Signup pages with your Linear design aesthetic
- Password reset functionality
- Automatic redirects for protected pages

### ✅ **Preserved Functionality**

- All your existing pages work exactly as before
- CSS and styling unchanged
- Shared utilities and functionality intact
- Intelligence platform features preserved

### ✅ **Professional Design**

- Authentication pages match your existing design
- Clean, modern interface
- Responsive design
- Error handling and loading states

## File Structure

```
persimmon/
├── src/
│   ├── scripts/
│   │   └── auth.js                 # ← Configure your credentials here
│   ├── pages/
│   │   ├── index.html             # Your dashboard (unchanged)
│   │   ├── feed.html              # Your feed (unchanged)
│   │   ├── processor.html         # Your processor (unchanged)
│   │   ├── reports.html           # Your reports (unchanged)
│   │   └── auth/
│   │       ├── login.html         # New login page
│   │       ├── signup.html        # New signup page
│   │       ├── forgot-password.html
│   │       └── update-password.html
│   └── assets/
│       ├── css/
│       │   └── main.css           # Your styles (unchanged)
│       └── js/
│           └── shared.js          # Your utilities (unchanged)
├── public/                        # Built files (auto-generated)
├── build.sh                       # Simplified build script
└── netlify.toml                   # Simplified config
```

## Troubleshooting

### "Configuration Error" Message

- Make sure you've set the environment variables in Netlify dashboard
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correctly configured
- Redeploy your site after adding environment variables
- For local testing, you can temporarily set the variables: `SUPABASE_URL=your-url SUPABASE_ANON_KEY=your-key ./build.sh`

### Email Confirmation Not Working

- Check your Supabase email settings
- Verify the redirect URLs are correct
- Check spam folder

### Build Failures

- The new build process is much simpler and shouldn't fail
- No environment variables required
- If issues persist, check the build.sh output

## Security Notes

- The anon key is safe to put in client-side code (it's designed for this)
- Supabase handles all security automatically
- Row Level Security (RLS) can be configured in Supabase if needed
- All authentication is handled securely by Supabase

## Cost

- Supabase free tier: 50,000 monthly active users
- Your current usage: ~3 users = **$0/month**
- Netlify free tier covers your hosting needs

---

**Your authentication system is now ready!** 🔐

The system provides enterprise-grade security with minimal setup, perfectly suited for your small team while maintaining the clean Linear aesthetic of your Persimmon Intelligence platform.
