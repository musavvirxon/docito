#!/bin/bash

# Fix JSON files with embedded line numbers
# Usage: bash scripts/fix-json-line-numbers.sh

echo "🔧 Fixing JSON files with embedded line numbers..."

# Find all JSON files and remove line number prefixes
find public/locales -name "*.json" -type f | while read file; do
    echo "Processing: $file"
    # Remove patterns like "1: ", "123: " at the start of lines
    sed -i.bak 's/^[[:space:]]*[0-9]\+:[[:space:]]*//' "$file"
    # Remove backup file if sed was successful
    if [ $? -eq 0 ]; then
        rm "${file}.bak"
        echo "  ✅ Fixed"
    else
        echo "  ❌ Error processing $file"
        # Restore backup if there was an error
        mv "${file}.bak" "$file"
    fi
done

echo ""
echo "✅ Done! All JSON files have been cleaned."
echo "🔄 Hard refresh your browser (Ctrl+Shift+R) to see changes."
