#!/bin/bash

# Netlify Build Script for Persimmon Intelligence
# This script handles environment variable injection for Auth0 configuration

echo "🔧 Starting Persimmon build process..."

# Check if Auth0 environment variables are set
if [ -z "$VITE_AUTH0_DOMAIN" ] || [ -z "$VITE_AUTH0_CLIENT_ID" ]; then
    echo "⚠️  Warning: Auth0 environment variables not set"
    echo "   Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in Netlify dashboard"
    echo "   Using placeholder values for now"
    export VITE_AUTH0_DOMAIN="your-auth0-domain.auth0.com"
    export VITE_AUTH0_CLIENT_ID="your-auth0-client-id"
    export VITE_AUTH0_AUDIENCE=""
else
    echo "✅ Auth0 environment variables found"
fi

# Create the auth configuration file with environment variables
echo "🔧 Injecting Auth0 configuration..."

# Replace placeholders in login.html with actual values
sed -i.bak "s|<!-- VITE_AUTH0_DOMAIN -->|$VITE_AUTH0_DOMAIN|g" public/auth/login.html
sed -i.bak "s|<!-- VITE_AUTH0_CLIENT_ID -->|$VITE_AUTH0_CLIENT_ID|g" public/auth/login.html
sed -i.bak "s|<!-- VITE_AUTH0_AUDIENCE -->|$VITE_AUTH0_AUDIENCE|g" public/auth/login.html

# Create a global auth config file
cat > public/assets/js/auth-config.js << EOF
// Auth0 configuration injected at build time
window.AUTH_CONFIG = {
    domain: '$VITE_AUTH0_DOMAIN',
    clientId: '$VITE_AUTH0_CLIENT_ID',
    audience: '$VITE_AUTH0_AUDIENCE' || undefined
};
EOF

echo "✅ Build process completed successfully"
echo "📄 Files processed:"
echo "   - public/auth/login.html (Auth0 config injected)"
echo "   - public/assets/js/auth-config.js (created)"
