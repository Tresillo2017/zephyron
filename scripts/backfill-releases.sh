#!/usr/bin/env bash
set -e

# Backfill GitHub releases for versions in CHANGELOG.md
# Usage: ./scripts/backfill-releases.sh [--dry-run]

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No tags or releases will be created"
  echo ""
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed"
  echo "Install: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated with GitHub CLI"
  echo "Run: gh auth login"
  exit 1
fi

# Get all versions from CHANGELOG.md (skip v0.2.2 and earlier as they already exist)
VERSIONS=$(grep -E "^## \[" CHANGELOG.md | sed 's/## \[\(.*\)\] - .*/\1/' | grep -E "^0\.(2\.[3-9]|3\.)" || true)

if [[ -z "$VERSIONS" ]]; then
  echo "✅ No versions to backfill"
  exit 0
fi

echo "📦 Versions to backfill:"
echo "$VERSIONS" | sed 's/^/  - /'
echo ""

# Function to extract changelog for a version
extract_changelog() {
  local version=$1
  awk -v version="$version" '
    /^## \[/ {
      if (found) exit
      if ($0 ~ "\\[" version "\\]") {
        found=1
        next
      }
    }
    found { print }
  ' CHANGELOG.md
}

# Process each version
echo "$VERSIONS" | while read -r VERSION; do
  TAG="v$VERSION"

  # Check if tag already exists
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "⏭️  Tag $TAG already exists, checking release..."

    # Check if GitHub release exists
    if gh release view "$TAG" >/dev/null 2>&1; then
      echo "   ✅ Release already exists, skipping"
    else
      echo "   📝 Creating release for existing tag..."
      CHANGELOG=$(extract_changelog "$VERSION")

      if [[ "$DRY_RUN" == false ]]; then
        # Determine if pre-release
        PRERELEASE_FLAG=""
        if [[ "$VERSION" == *"alpha"* ]] || [[ "$VERSION" == *"beta"* ]] || [[ "$VERSION" == *"rc"* ]]; then
          PRERELEASE_FLAG="--prerelease"
        fi

        echo "$CHANGELOG" | gh release create "$TAG" \
          --title "$TAG" \
          --notes-file - \
          $PRERELEASE_FLAG \
          --verify-tag
        echo "   ✅ Release created"
      else
        echo "   [DRY RUN] Would create release"
      fi
    fi
    echo ""
    continue
  fi

  # Find commit with this version in message
  COMMIT=$(git log --all --oneline --grep="(v$VERSION)" --grep="v$VERSION" -i | head -1 | awk '{print $1}')

  if [[ -z "$COMMIT" ]]; then
    echo "⚠️  Could not find commit for $VERSION, skipping"
    echo ""
    continue
  fi

  COMMIT_MSG=$(git log --format=%s -n 1 "$COMMIT")
  echo "📌 $TAG -> $COMMIT"
  echo "   $COMMIT_MSG"

  # Extract changelog
  CHANGELOG=$(extract_changelog "$VERSION")

  if [[ -z "$CHANGELOG" ]]; then
    echo "   ⚠️  No changelog entry found, using commit message"
    CHANGELOG="Release $VERSION"
  fi

  if [[ "$DRY_RUN" == false ]]; then
    # Create tag
    git tag -a "$TAG" "$COMMIT" -m "Release $TAG"
    echo "   ✅ Tag created"

    # Push tag
    git push origin "$TAG"
    echo "   ✅ Tag pushed"

    # Determine if pre-release
    PRERELEASE_FLAG=""
    if [[ "$VERSION" == *"alpha"* ]] || [[ "$VERSION" == *"beta"* ]] || [[ "$VERSION" == *"rc"* ]]; then
      PRERELEASE_FLAG="--prerelease"
    fi

    # Create GitHub release
    echo "$CHANGELOG" | gh release create "$TAG" \
      --title "$TAG" \
      --notes-file - \
      $PRERELEASE_FLAG \
      --verify-tag
    echo "   ✅ Release created"
  else
    echo "   [DRY RUN] Would create tag and release"
    echo ""
    echo "   Changelog preview:"
    echo "$CHANGELOG" | head -5 | sed 's/^/     /'
    if [[ $(echo "$CHANGELOG" | wc -l) -gt 5 ]]; then
      echo "     ..."
    fi
  fi

  echo ""
done

echo "✨ Done!"
