# Local Testing Guide - Supabase Authentication

## Testing Your Persimmon Platform Locally

### Quick Local Testing

```bash
# Navigate to your project directory
cd /path/to/persimmon

# Build the project
./build.sh

# Start a simple local server
python -m http.server 8000
# OR
npx serve public
```

Then visit: `http://localhost:8000`

### What You Can Test Locally

**✅ Styling and Layout:**

- CSS loads correctly
- Authentication pages render properly
- Responsive design works
- Linear aesthetic matches your app

**✅ Basic Functionality:**

- Form validation
- JavaScript loading
- Page navigation
- Error message display

**❌ Authentication Won't Work Locally:**

- Supabase requires HTTPS for authentication
- Environment variables aren't injected locally
- You'll see "Configuration Error" messages (this is expected)

### Testing Authentication Flow

**Option 1: Deploy Preview Testing**

1. Push changes to GitHub
2. Netlify automatically deploys
3. Test on your live site with real Supabase credentials

**Option 2: Local Testing with Temporary Credentials**

```bash
# Set environment variables temporarily for local testing
SUPABASE_URL=your-url SUPABASE_ANON_KEY=your-key ./build.sh

# Then serve the built files
python -m http.server 8000
```

### Expected Behavior

**✅ Working State (Local):**

- Login page loads with proper Linear styling
- CSS variables (colors, fonts) applied correctly
- Form inputs styled consistently
- "Configuration Error" notice shows (expected locally)

**✅ Working State (Deployed):**

- All of the above, plus:
- Authentication forms work
- Redirects function properly
- User sessions persist

**❌ Problem Indicators:**

- Plain HTML styling (CSS not loading)
- Console errors about missing files
- Broken layout or fonts
- JavaScript errors in browser console

### Quick Debugging

**CSS Not Loading:**

1. Check browser Network tab for 404 errors
2. Verify file structure:
   ```
   public/
   ├── assets/css/main.css  ✅ Should exist
   ├── assets/js/auth.js    ✅ Should exist
   ├── auth/login.html      ✅ Should exist
   └── index.html           ✅ Should exist
   ```
3. Test CSS directly: `http://localhost:8000/assets/css/main.css`

**JavaScript Errors:**

1. Open browser console (F12)
2. Look for errors related to Supabase (expected locally)
3. Check for other JavaScript errors

**Build Issues:**

```bash
# Clean build
rm -rf public
./build.sh

# Check for build errors in terminal output
```

### Deploy and Test Cycle

```bash
# 1. Make changes locally
./build.sh  # Test build works
git add .
git commit -m "Update authentication styling"
git push origin main

# 2. Wait for Netlify deployment (~1-2 minutes)

# 3. Test on your live site
# Visit: https://your-site.netlify.app
```

### File Structure Check

Your built `public/` directory should contain:

```
public/
├── index.html              # Dashboard
├── feed.html              # Intelligence feed
├── processor.html         # Data processor
├── reports.html           # Reports
├── assets/
│   ├── css/main.css       # Your styles
│   └── js/
│       ├── auth.js        # Authentication (with injected credentials)
│       ├── shared.js      # Shared utilities
│       ├── feed.js        # Feed functionality
│       └── processor.js   # Processor functionality
└── auth/
    ├── login.html         # Login page
    ├── signup.html        # Signup page
    ├── forgot-password.html
    └── update-password.html
```

### Common Issues and Fixes

**"Configuration Error" Locally:**

- ✅ Expected behavior - Supabase credentials not set locally
- ✅ Will work once deployed with environment variables

**CSS Variables Not Working:**

- Check that `main.css` defines your CSS custom properties
- Verify paths use absolute references (`/assets/css/main.css`)

**Build Script Fails:**

- Check file permissions: `chmod +x build.sh`
- Verify source files exist in `src/` directory
- Check terminal output for specific error messages

**Authentication Works Locally But Not Deployed:**

- Verify Netlify environment variables are set correctly
- Check Supabase dashboard settings (Site URL, redirect URLs)
- Review browser console for errors on deployed site
