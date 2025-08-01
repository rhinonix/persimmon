# Persimmon Intelligence - Deployment Checklist

## Pre-Deployment ✅

- [ ] **Repository ready**: All authentication files are committed to your GitHub repository
- [ ] **Netlify account**: You have a Netlify account set up
- [ ] **Domain ready**: (Optional) Custom domain configured if desired

## Deployment Steps

### 1. Deploy to Netlify

- [ ] **Connect repository**: Link your GitHub `persimmon` repo to Netlify
- [ ] **Configure build**:
  - Build command: (leave empty)
  - Publish directory: `public`
- [ ] **Deploy site**: Initial deployment completes successfully

### 2. Enable Authentication

- [ ] **Enable Netlify Identity**: Go to Site Settings → Identity → Enable Identity
- [ ] **Configure registration**: Set to "Invite only"
- [ ] **Configure emails**: Set up email templates (optional but recommended)

### 3. Test Authentication

- [ ] **Visit setup page**: Go to `https://your-site.netlify.app/auth/setup.html`
- [ ] **Check status**: Verify all systems show as active/available
- [ ] **Test login flow**: Use "Test Authentication" button

### 4. Invite Team Members

- [ ] **Add yourself**: Invite your own email address first
- [ ] **Add team member 1**: Send invitation to first team member
- [ ] **Add team member 2**: Send invitation to second team member
- [ ] **Verify access**: Each person can log in successfully

### 5. Security Verification

- [ ] **Test protection**: Try accessing main site without login (should redirect)
- [ ] **Test auth pages**: Verify login/reset pages work correctly
- [ ] **Test session**: Verify login persists across page refreshes
- [ ] **Test logout**: Verify logout redirects to login page

## Post-Deployment

### Immediate Tasks

- [ ] **Bookmark admin URLs**: Save Netlify dashboard and setup page links
- [ ] **Document credentials**: Save login instructions for team
- [ ] **Test from different browsers**: Verify compatibility

### Ongoing Maintenance

- [ ] **Monitor access logs**: Regular review of who's accessing the system
- [ ] **Update team access**: Add/remove users as needed
- [ ] **Review security**: Periodic security assessment

## Quick URLs

After deployment, bookmark these:

- **Main App**: `https://your-site.netlify.app/`
- **Login Page**: `https://your-site.netlify.app/auth/login.html`
- **Setup Helper**: `https://your-site.netlify.app/auth/setup.html`
- **Netlify Dashboard**: `https://app.netlify.com/sites/your-site/identity`

## Troubleshooting Quick Fixes

**"Site not found" error:**

- Check deployment status in Netlify dashboard
- Verify `public` folder is set as publish directory

**"Identity not available" error:**

- Ensure Netlify Identity is enabled in site settings
- Check that Edge Functions deployed correctly

**"Login not working" error:**

- Verify users have been invited and confirmed accounts
- Check browser console for JavaScript errors
- Clear browser cache and cookies

**"Redirects not working" error:**

- Verify `netlify.toml` is in repository root
- Check Edge Functions logs in Netlify dashboard

## Support Resources

- **Netlify Identity Docs**: https://docs.netlify.com/identity/
- **Edge Functions Docs**: https://docs.netlify.com/edge-functions/
- **Support**: Through Netlify dashboard → Support

---

**Total setup time**: ~15-30 minutes
**Cost**: $0/month for up to 1,000 users
**Security level**: Enterprise-grade with JWT tokens and encrypted sessions
