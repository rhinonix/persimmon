# Persimmon Intelligence - Authentication Setup Guide

This guide will help you set up simple user authentication for your Persimmon Intelligence platform using Netlify Identity.

## Overview

The authentication system provides:

- **Invitation-only access** (perfect for you + 2 team members)
- **Clean Linear aesthetic** matching your existing design
- **Netlify Identity integration** (no external services needed)
- **Edge Functions** for enhanced security
- **Automatic redirects** for unauthorized users

## Setup Steps

### 1. Deploy to Netlify

1. **Connect your GitHub repository** to Netlify:

   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Select your `persimmon` repository
   - Use these build settings:
     - **Build command:** (leave empty)
     - **Publish directory:** `public`

2. **Deploy the site** - Netlify will automatically deploy with the new `netlify.toml` configuration.

### 2. Enable Netlify Identity

1. **Go to your site dashboard** on Netlify
2. **Navigate to Identity tab**
3. **Click "Enable Identity"**
4. **Configure registration settings:**
   - Set **Registration** to "Invite only"
   - Set **External providers** as needed (optional)
   - Enable **Git Gateway** (if you want users to manage content)

### 3. Configure Identity Settings

In your Netlify Identity settings:

1. **Registration preferences:**

   - ✅ Invite only
   - ✅ Email confirmation required
   - ✅ Enable password recovery

2. **Site URL settings:**
   - Ensure your site URL is correctly set
   - This is used for email links

### 4. Invite Your Team Members

1. **Go to Identity tab** in your Netlify dashboard
2. **Click "Invite users"**
3. **Enter email addresses** for yourself and your 2 team members
4. **Send invitations** - they'll receive setup emails

### 5. Customize Authentication (Optional)

The authentication pages use your existing Linear design aesthetic, but you can customize further:

#### Login Page Customization

Edit `/public/auth/login.html` to modify:

- Welcome message
- Branding elements
- Form styling

#### Email Templates

In Netlify Identity settings, you can customize:

- Welcome email
- Password recovery email
- Email confirmation

## How It Works

### Authentication Flow

1. **Unauthenticated users** → Redirected to `/auth/login.html`
2. **Users log in** → Redirected to main application
3. **Sessions persist** across browser refreshes
4. **Logout** → Returns to login page

### Security Features

- **Edge Functions** check authentication on every request
- **JWT tokens** manage user sessions securely
- **Invite-only** prevents unauthorized registration
- **Email verification** required for account activation

### User Experience

- **Linear aesthetic** matches your existing design
- **Responsive design** works on all devices
- **Loading states** provide clear feedback
- **Error handling** with user-friendly messages

## File Structure

```
persimmon/
├── netlify.toml                    # Netlify configuration
├── netlify/
│   └── edge-functions/
│       └── auth-check.js          # Authentication middleware
├── public/
│   ├── auth/
│   │   ├── login.html            # Login page
│   │   └── forgot-password.html  # Password reset
│   └── assets/
│       └── js/
│           └── auth.js           # Authentication client logic
```

## User Management

### Adding New Users

1. Go to Netlify Dashboard → Identity
2. Click "Invite users"
3. Enter email address
4. User receives invitation email

### Removing Users

1. Go to Netlify Dashboard → Identity
2. Find user in the list
3. Click "..." → Delete user

### User Roles (Optional)

You can assign roles for different access levels:

- `admin` - Full access
- `user` - Standard access
- `viewer` - Read-only access

## Troubleshooting

### CSS Not Loading (404 Error)

1. **Check file paths** - Ensure `/assets/css/main.css` exists in your repository
2. **Verify deployment** - Check that all files uploaded to Netlify correctly
3. **Clear browser cache** - Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
4. **Check \_redirects file** - Ensure `/assets/*` paths are allowed

### Users Can't Access the Site

1. **Check Netlify Identity** is enabled
2. **Verify user has been invited** and confirmed their account
3. **Check browser cookies** aren't being blocked
4. **Ensure HTTPS** is being used (required for Netlify Identity)

### Authentication Not Working

1. **Check Edge Functions** are deployed correctly
2. **Verify netlify.toml** configuration is valid
3. **Clear browser cache** and try again
4. **Check browser console** for JavaScript errors

### Email Issues

1. **Verify site URL** in Identity settings
2. **Check spam folders** for invitation emails
3. **Ensure email templates** are properly configured

## Security Best Practices

1. **Regular access reviews** - Remove users who no longer need access
2. **Strong password policy** - Netlify Identity enforces reasonable defaults
3. **Monitor access logs** - Available in Netlify Analytics
4. **Keep dependencies updated** - Netlify Identity is automatically maintained

## Cost Considerations

- **Netlify Identity** is free for up to 1,000 users
- **Edge Functions** have generous free tier
- **Total cost** for 3 users = $0/month

## Support

If you encounter issues:

1. **Check Netlify docs:** [docs.netlify.com/identity](https://docs.netlify.com/identity)
2. **Review Edge Functions:** [docs.netlify.com/edge-functions](https://docs.netlify.com/edge-functions)
3. **Contact support:** Through Netlify dashboard

---

**Your authentication system is now ready!** 🔐

The system provides enterprise-grade security with minimal setup, perfectly suited for your small team while maintaining the clean Linear aesthetic of your Persimmon Intelligence platform.
