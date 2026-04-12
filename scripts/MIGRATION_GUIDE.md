# Artist Image Migration to R2

This guide explains how to migrate existing artist profile images from external URLs to your R2 bucket.

## Current State

- **Frontend**: All pages now use `getArtistImageUrl(id)` which fetches from `/api/artists/:id/image`
- **Backend**: New endpoint serves images from R2 key `artists/{id}/image.jpg`
- **Database**: Artists still have `image_url` field with external URLs (for reference only)
- **Problem**: Most artists don't have images in R2 yet, so they show fallback initials

## Migration Options

### Option 1: Automated Script (Recommended)

Use the provided migration script to bulk upload images:

```bash
# Install dependencies (if not already installed)
bun add @aws-sdk/client-s3

# Set up environment variables
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_DATABASE_ID="your-d1-database-id"
export CLOUDFLARE_D1_TOKEN="your-d1-api-token"
export CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key"
export CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-key"
export CLOUDFLARE_R2_BUCKET_NAME="zephyron-audio"  # or your bucket name

# Dry run first to see what would be migrated
bun run scripts/migrate-artist-images.ts --dry-run

# Migrate all artists
bun run scripts/migrate-artist-images.ts

# Or migrate specific artist
bun run scripts/migrate-artist-images.ts --artist-id "artist-uuid"

# Or migrate first 10 artists
bun run scripts/migrate-artist-images.ts --limit 10
```

**Getting API credentials:**

1. **Account ID**: Found in Cloudflare dashboard URL
2. **Database ID**: Run `wrangler d1 list` to get your D1 database ID
3. **D1 Token**: Create at Cloudflare Dashboard → Profile → API Tokens → Create Token → Select "D1 Edit" template
4. **R2 Keys**: Dashboard → R2 → Manage R2 API Tokens → Create API Token

### Option 2: Manual Upload via Wrangler

For a few artists, you can manually upload images:

```bash
# Download the image locally first
curl -o artist-image.jpg "https://external-site.com/artist-image.jpg"

# Upload to R2 at the correct key
wrangler r2 object put zephyron-audio/artists/{artist-id}/image.jpg \
  --file artist-image.jpg \
  --content-type image/jpeg
```

### Option 3: Admin Upload Feature

Create an admin UI to upload images directly:

1. Add file upload input to admin artist edit modal
2. POST to new endpoint: `POST /api/admin/artists/:id/image`
3. Backend uploads directly to R2
4. Returns success/error

**Example implementation:**

```typescript
// worker/routes/admin-beta.ts
export async function uploadArtistImage(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const { id } = params
  
  // Verify admin auth
  const session = await getSessionFromRequest(request, env)
  if (!session?.user || session.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // Get uploaded file
  const formData = await request.formData()
  const file = formData.get('image') as File
  
  if (!file || !file.type.startsWith('image/')) {
    return json({ error: 'Invalid image file' }, { status: 400 })
  }
  
  // Upload to R2
  const key = `artists/${id}/image.jpg`
  await env.AUDIO_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
    },
  })
  
  return json({ success: true, key })
}
```

## Post-Migration

After migration:

1. **Verify**: Check a few artist pages to confirm images load from R2
2. **Monitor**: Watch for 404s in browser network tab
3. **Cleanup** (optional): You can keep `image_url` in database as backup reference, or clear it:
   ```sql
   UPDATE artists SET image_url = NULL WHERE id IN (
     SELECT id FROM ... -- artists with R2 images
   )
   ```

## Image Requirements

- **Format**: JPEG recommended (smaller file size)
- **R2 Key**: Must be `artists/{artist_id}/image.jpg`
- **Size**: No strict requirement, but 400-800px square is optimal
- **Content-Type**: Set to `image/jpeg` or `image/png` when uploading

## Troubleshooting

**Images not showing after upload:**
- Check R2 key format is exactly `artists/{id}/image.jpg`
- Verify AUDIO_BUCKET binding in wrangler.jsonc
- Check browser network tab for 404s on `/api/artists/:id/image`
- Try clearing CDN cache if using custom domain

**Script fails to download:**
- Some external URLs may block automated downloads
- Add User-Agent header in script's fetch call
- Or manually download and use wrangler upload

**R2 API errors:**
- Verify R2 API token has correct permissions (Object Read & Write)
- Check bucket name matches wrangler.jsonc binding
- Ensure account ID is correct
