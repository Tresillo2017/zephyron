#!/bin/bash
# Script to migrate avatars from flat structure to user folders in R2
#
# Old: userId-timestamp.webp
# New: userId/timestamp.webp
#
# Usage: ./scripts/migrate-avatars-r2.sh

set -e

BUCKET="zephyron-avatars"

echo "🔍 Fetching users with avatars from database..."

# Get all users with avatar_url from remote database
USERS=$(bunx wrangler d1 execute zephyron-db --remote --json \
  --command="SELECT id, avatar_url FROM user WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%avatars.zephyron.app/%'")

echo "📦 Listing objects in R2 bucket..."

# List all objects in the avatars bucket
OBJECTS=$(bunx wrangler r2 object list "$BUCKET" --json)

echo ""
echo "Migration Plan:"
echo "==============="

# Parse users and generate migration commands
echo "$USERS" | jq -r '.[] | .results[] | select(.avatar_url != null) | @json' | while read -r user; do
  USER_ID=$(echo "$user" | jq -r '.id')
  AVATAR_URL=$(echo "$user" | jq -r '.avatar_url')

  # Extract filename from URL
  FILENAME=$(echo "$AVATAR_URL" | sed 's|https://avatars.zephyron.app/||')

  # Skip if already in folder structure
  if [[ "$FILENAME" == */* ]]; then
    echo "✓ Skip $USER_ID (already in folder: $FILENAME)"
    continue
  fi

  # Parse old format: userId-timestamp.webp
  if [[ "$FILENAME" =~ ^([^-]+)-([0-9]+\.webp)$ ]]; then
    FILE_USER_ID="${BASH_REMATCH[1]}"
    TIMESTAMP_FILE="${BASH_REMATCH[2]}"

    NEW_KEY="$USER_ID/$TIMESTAMP_FILE"
    NEW_URL="https://avatars.zephyron.app/$NEW_KEY"

    echo ""
    echo "→ Migrate: $FILENAME"
    echo "  User: $USER_ID"
    echo "  Old key: $FILENAME"
    echo "  New key: $NEW_KEY"

    # Download from R2
    echo "  1. Downloading..."
    bunx wrangler r2 object get "$BUCKET/$FILENAME" --file="/tmp/avatar-$USER_ID.webp"

    # Upload to new location
    echo "  2. Uploading to new location..."
    bunx wrangler r2 object put "$BUCKET/$NEW_KEY" --file="/tmp/avatar-$USER_ID.webp" --content-type="image/webp"

    # Update database
    echo "  3. Updating database..."
    bunx wrangler d1 execute zephyron-db --remote \
      --command="UPDATE user SET avatar_url = '$NEW_URL' WHERE id = '$USER_ID'"

    # Delete old object
    echo "  4. Deleting old object..."
    bunx wrangler r2 object delete "$BUCKET/$FILENAME"

    # Cleanup temp file
    rm -f "/tmp/avatar-$USER_ID.webp"

    echo "  ✓ Migrated successfully"
  else
    echo "⚠ Skip $USER_ID (unexpected format: $FILENAME)"
  fi
done

echo ""
echo "✅ Migration complete!"
