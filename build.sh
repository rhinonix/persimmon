#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define source and destination directories
SRC_DIR="src"
DEST_DIR="public"

echo "Starting build process..."

# Clean and recreate the destination directory for a fresh build
echo "Cleaning public directory..."
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

# --- HTML Processing ---
echo "Copying HTML files..."
# Copy root pages
cp "$SRC_DIR"/pages/*.html "$DEST_DIR/" 2>/dev/null || echo "No root HTML files found."
# Copy auth pages
mkdir -p "$DEST_DIR/auth"
cp "$SRC_DIR"/pages/auth/*.html "$DEST_DIR/auth/" 2>/dev/null || echo "No auth HTML files found."

# --- Asset Processing ---
echo "Copying assets..."
# Copy the entire assets directory from src to public
cp -R "$SRC_DIR/assets" "$DEST_DIR/"

# --- JavaScript Processing ---
echo "Processing JavaScript files..."

# Ensure the destination directory for JS exists
mkdir -p "$DEST_DIR/assets/js"

# Process auth.js with environment variable injection
AUTH_SRC="$SRC_DIR/scripts/auth.js"
AUTH_DEST="$DEST_DIR/assets/js/auth.js"

if [ -f "$AUTH_SRC" ]; then
    echo "Processing auth.js with environment variables..."
    
    # Check if environment variables are set
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        echo "Warning: SUPABASE_URL and SUPABASE_ANON_KEY environment variables not set."
        echo "Using placeholder values. Set these in Netlify environment variables."
        SUPABASE_URL_VALUE="https://your-project.supabase.co"
        SUPABASE_ANON_KEY_VALUE="your-anon-key-here"
    else
        SUPABASE_URL_VALUE="$SUPABASE_URL"
        SUPABASE_ANON_KEY_VALUE="$SUPABASE_ANON_KEY"
    fi
    
    # Check Claude API key
    if [ -z "$CLAUDE_API_KEY" ]; then
        echo "Warning: CLAUDE_API_KEY environment variable not set."
        echo "Using placeholder value. Set this in Netlify environment variables for real AI processing."
        CLAUDE_API_KEY_VALUE="your-claude-api-key-here"
    else
        CLAUDE_API_KEY_VALUE="$CLAUDE_API_KEY"
    fi
    
    # Use a temporary file to avoid issues with sed on different systems
    TMP_FILE=$(mktemp)
    sed -e "s|__SUPABASE_URL__|$SUPABASE_URL_VALUE|g" \
        -e "s|__SUPABASE_ANON_KEY__|$SUPABASE_ANON_KEY_VALUE|g" \
        -e "s|__CLAUDE_API_KEY__|$CLAUDE_API_KEY_VALUE|g" \
        "$AUTH_SRC" > "$TMP_FILE" && mv "$TMP_FILE" "$AUTH_DEST"
    
    echo "Auth.js processed successfully"
else
    echo "Warning: auth.js not found at $AUTH_SRC"
fi

# Copy other JavaScript files from src/scripts to public/assets/js
echo "Copying other JavaScript files..."
find "$SRC_DIR/scripts" -type f -name "*.js" -not -name "auth.js" -exec cp {} "$DEST_DIR/assets/js/" \; 2>/dev/null || echo "No other JavaScript files found."

echo "Build process completed successfully."
