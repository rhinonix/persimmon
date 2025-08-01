# Local Testing Guide

## Testing Authentication Locally

Since Netlify Identity requires a deployed site, you can't test the full authentication flow locally. However, you can test the styling and basic functionality:

### Option 1: Test Login Page Styling
```bash
# Navigate to your project directory
cd /Users/ryan/Projects/persimmon

# Start a simple local server
python -m http.server 8000
# OR
npx serve public
```

Then visit: `http://localhost:8000/auth/login.html`

**Note**: Authentication won't work locally, but you can verify:
- ✅ CSS loads correctly
- ✅ Form renders properly  
- ✅ Responsive design works
- ✅ Linear aesthetic matches your app

### Option 2: Test on Netlify Deploy Preview

1. **Push changes** to a branch on GitHub
2. **Create pull request** - Netlify will create a deploy preview
3. **Test authentication** on the preview URL
4. **Merge when working** correctly

### Quick CSS Debug

If CSS still isn't loading:

1. **Check browser Network tab** - Look for 404 errors
2. **Verify file structure**:
   ```
   public/
   ├── assets/css/main.css  ✅ Should exist
   ├── auth/login.html      ✅ Should exist
   └── _redirects           ✅ Should exist
   ```
3. **Test CSS directly**: Visit `http://localhost:8000/assets/css/main.css`

### Deploy and Test Cycle

```bash
# 1. Make changes locally
git add .
git commit -m "Fix CSS loading for auth pages"
git push origin main

# 2. Wait for Netlify deployment (~1-2 minutes)

# 3. Test on your live site
# Visit: https://your-site.netlify.app/auth/login.html
```

## Expected Behavior

### ✅ Working State
- Login page loads with proper Linear styling
- CSS variables (colors, fonts) applied correctly
- Form inputs styled consistently
- Responsive design on mobile

### ❌ Problem Indicators
- Plain HTML styling (no CSS loaded)
- Console errors about missing files
- Broken layout or fonts

## Quick Fixes

**CSS 404 Error**: Ensure paths use `/assets/css/main.css` (absolute paths)
**Styling Missing**: Check that `main.css` contains your CSS variables
**Layout Broken**: Verify responsive CSS rules are included
