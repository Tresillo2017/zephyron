# Avatar Migration to User Folders

This directory contains scripts to migrate existing avatars from flat structure to user-organized folders.

## Structure Change

**Old (flat):**
```
zephyron-avatars/
  userId1-1234567890.webp
  userId2-1234567891.webp
  userId1-1234567892.webp
```

**New (organized):**
```
zephyron-avatars/
  userId1/
    1234567890.webp
    1234567892.webp
  userId2/
    1234567891.webp
```

## Migration Options

### Option 1: Worker Script (Recommended)

Deploy a one-off Worker that has access to R2 and D1:

```bash
# 1. Deploy the migration worker
bunx wrangler deploy scripts/migrate-avatars-worker.ts \
  --name avatar-migrator \
  --compatibility-date=2024-01-01 \
  --d1=zephyron-db \
  --r2=AVATARS=zephyron-avatars

# 2. Run the migration
curl https://avatar-migrator.<your-subdomain>.workers.dev

# 3. Delete the worker after migration
bunx wrangler delete avatar-migrator
```

### Option 2: Shell Script

Use wrangler commands to download, re-upload, and update:

```bash
# Make executable
chmod +x scripts/migrate-avatars-r2.sh

# Run migration
./scripts/migrate-avatars-r2.sh
```

**Note:** This downloads each avatar to `/tmp`, re-uploads it, updates the database, then deletes the old object. Slower but doesn't require deploying a Worker.

### Option 3: Manual Migration

For a small number of users, you can manually:

1. List users with avatars:
   ```bash
   bunx wrangler d1 execute zephyron-db --remote \
     --command="SELECT id, avatar_url FROM user WHERE avatar_url IS NOT NULL"
   ```

2. For each user:
   ```bash
   # Download
   bunx wrangler r2 object get zephyron-avatars/userId-timestamp.webp --file=avatar.webp
   
   # Upload to new location
   bunx wrangler r2 object put zephyron-avatars/userId/timestamp.webp --file=avatar.webp
   
   # Update database
   bunx wrangler d1 execute zephyron-db --remote \
     --command="UPDATE user SET avatar_url = 'https://avatars.zephyron.app/userId/timestamp.webp' WHERE id = 'userId'"
   
   # Delete old
   bunx wrangler r2 object delete zephyron-avatars/userId-timestamp.webp
   ```

## Testing

After migration, verify:

1. All users' avatars still display correctly
2. New uploads use the folder structure
3. Old objects at root level have been deleted

```bash
# Check for remaining root-level avatars
bunx wrangler r2 object list zephyron-avatars | grep -v '/'
```

## Rollback

If needed, the migration can be reversed by:
1. Copying objects back to root level
2. Updating database URLs
3. Deleting folder objects

The Worker script provides a JSON report of all changes made.
