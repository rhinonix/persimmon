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

# Check if Supabase environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set."
  exit 1
fi

# Define source and destination for the auth script
AUTH_SRC="$SRC_DIR/scripts/auth.js"
AUTH_DEST="$DEST_DIR/assets/js/auth.js"

# Ensure the destination directory for JS exists
mkdir -p "$DEST_DIR/assets/js"

echo "Injecting Supabase credentials into $AUTH_DEST"
# Use a temporary file to avoid issues with sed -i on different systems
TMP_FILE=$(mktemp)
sed -e "s|__SUPABASE_URL__|$SUPABASE_URL|g" \
    -e "s|__SUPABASE_ANON_KEY__|$SUPABASE_ANON_KEY|g" \
    "$AUTH_SRC" > "$TMP_FILE" && mv "$TMP_FILE" "$AUTH_DEST"

# Copy other JavaScript files from src/scripts to public/assets/js
echo "Copying other JavaScript files..."
# Use find to copy files, excluding the auth.js source to avoid overwriting
find "$SRC_DIR/scripts" -type f -not -name "auth.js" -exec cp {} "$DEST_DIR/assets/js/" \;


echo "Build process completed successfully."
