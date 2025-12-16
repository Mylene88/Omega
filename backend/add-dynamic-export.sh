#!/bin/bash

# Script to add dynamic export to all API route files
# This prevents Next.js from trying to pre-render API routes during build

echo "Adding 'export const dynamic = force-dynamic' to all API route files..."

# Find all route.js files in app/api directory
find app/api -name "route.js" -type f | while read -r file; do
    echo "Processing: $file"

    # Check if the file already has the dynamic export
    if grep -q "export const dynamic" "$file"; then
        echo "  ✓ Already has dynamic export, skipping"
    else
        # Create a temporary file with the new content
        {
            echo "// Force dynamic rendering (no static generation at build time)"
            echo "export const dynamic = 'force-dynamic';"
            echo ""
            cat "$file"
        } > "${file}.tmp"

        # Replace the original file
        mv "${file}.tmp" "$file"
        echo "  ✓ Added dynamic export"
    fi
done

echo ""
echo "Done! All API routes are now configured for dynamic rendering."
