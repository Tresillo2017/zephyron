import { json, errorResponse } from '../lib/router'
import { requireAuth, createAuth } from '../lib/auth'
import type {
  Env,
  UploadAvatarResponse,
  UploadAvatarError,
  UpdateProfileSettingsRequest,
  UpdateProfileSettingsResponse,
  User,
  PublicUser,
  GetPublicProfileResponse,
  GetPublicProfileError
} from '../types'

/**
 * POST /api/profile/avatar/upload
 * Uploads a profile picture to R2 AVATARS bucket and updates user avatar_url.
 */
export async function uploadAvatar(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // 1. Check authentication
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult
  const userId = user.id

  try {
    // 2. Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    // 3. Validate file exists
    if (!file) {
      return json<UploadAvatarError>({
        error: 'NO_FILE',
        message: 'No file provided'
      }, 400)
    }

    // 4. Validate mime type
    if (!file.type.startsWith('image/')) {
      return json<UploadAvatarError>({
        error: 'INVALID_FORMAT',
        message: 'Only JPG, PNG, WebP, GIF allowed'
      }, 400)
    }

    // 5. Validate file size (10MB = 10 * 1024 * 1024)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return json<UploadAvatarError>({
        error: 'FILE_TOO_LARGE',
        message: 'Maximum file size is 10MB'
      }, 400)
    }

    // 6. Read file as array buffer
    const arrayBuffer = await file.arrayBuffer()

    try {
      // 7. Delete old avatars
      const listResult = await env.AVATARS.list({ prefix: `${userId}/avatar-` })
      for (const object of listResult.objects) {
        await env.AVATARS.delete(object.key)
      }

      // 8. Upload original to temporary location
      const tempKey = `temp/${userId}-${Date.now()}.webp`
      await env.AVATARS.put(tempKey, arrayBuffer, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })

      const tempUrl = `https://avatars.zephyron.app/${tempKey}`

      // 9. Generate small size (128x128) using Workers Image Resizing
      const smallResponse = await fetch(tempUrl, {
        cf: {
          image: {
            width: 128,
            height: 128,
            fit: 'cover',
            format: 'webp',
            quality: 85
          }
        }
      })

      if (!smallResponse.ok) {
        throw new Error('Failed to resize small image')
      }

      const smallBuffer = await smallResponse.arrayBuffer()
      await env.AVATARS.put(`${userId}/avatar-small.webp`, smallBuffer, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })

      // 10. Generate large size (512x512)
      const largeResponse = await fetch(tempUrl, {
        cf: {
          image: {
            width: 512,
            height: 512,
            fit: 'cover',
            format: 'webp',
            quality: 85
          }
        }
      })

      if (!largeResponse.ok) {
        throw new Error('Failed to resize large image')
      }

      const largeBuffer = await largeResponse.arrayBuffer()
      await env.AVATARS.put(`${userId}/avatar-large.webp`, largeBuffer, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })

      // 11. Delete temp file
      await env.AVATARS.delete(tempKey)

      // 12. Save avatar_url to database (pointing to large size)
      const avatarUrl = `https://avatars.zephyron.app/${userId}/avatar-large.webp`

      await env.DB.prepare(
        'UPDATE user SET avatar_url = ? WHERE id = ?'
      ).bind(avatarUrl, userId).run()

      // 13. Return success
      return json<UploadAvatarResponse>({
        success: true,
        avatar_url: avatarUrl
      })

    } catch (imageError) {
      console.error('Image processing error:', imageError)
      return json<UploadAvatarError>({
        error: 'RESIZE_FAILED',
        message: 'Failed to process image sizes'
      }, 500)
    }

  } catch (error) {
    console.error('Avatar upload error:', error)
    return json<UploadAvatarError>({
      error: 'UPLOAD_FAILED',
      message: 'Failed to upload to storage'
    }, 500)
  }
}

/**
 * POST /api/profile/banner/upload
 * Uploads a profile banner to R2 AVATARS bucket and updates user banner_url.
 */
export async function uploadBanner(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult
  const userId = user.id

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return json({ error: 'NO_FILE', message: 'No file provided' }, 400)
    if (!file.type.startsWith('image/')) return json({ error: 'INVALID_FORMAT', message: 'Only image files allowed' }, 400)

    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) return json({ error: 'FILE_TOO_LARGE', message: 'Maximum file size is 10MB' }, 400)

    const arrayBuffer = await file.arrayBuffer()

    try {
      // Delete old banner
      await env.AVATARS.delete(`${userId}/banner.webp`)

      // Upload temp
      const tempKey = `temp/${userId}-banner-${Date.now()}.webp`
      await env.AVATARS.put(tempKey, arrayBuffer, { httpMetadata: { contentType: 'image/webp' } })

      const tempUrl = `https://avatars.zephyron.app/${tempKey}`

      // Resize to 1500×500 banner dimensions
      const bannerResponse = await fetch(tempUrl, {
        cf: { image: { width: 1500, height: 500, fit: 'cover', format: 'webp', quality: 85 } }
      })

      if (!bannerResponse.ok) throw new Error('Failed to resize banner')

      const bannerBuffer = await bannerResponse.arrayBuffer()
      await env.AVATARS.put(`${userId}/banner.webp`, bannerBuffer, { httpMetadata: { contentType: 'image/webp' } })
      await env.AVATARS.delete(tempKey)

      const bannerUrl = `https://avatars.zephyron.app/${userId}/banner.webp`

      await env.DB.prepare('UPDATE user SET banner_url = ? WHERE id = ?').bind(bannerUrl, userId).run()

      return json({ success: true, banner_url: bannerUrl })

    } catch (imageError) {
      console.error('Banner processing error:', imageError)
      return json({ error: 'RESIZE_FAILED', message: 'Failed to process banner image' }, 500)
    }

  } catch (error) {
    console.error('Banner upload error:', error)
    return json({ error: 'UPLOAD_FAILED', message: 'Failed to upload banner' }, 500)
  }
}

/**
 * DELETE /api/profile/banner
 * Removes the user's banner image.
 */
export async function deleteBanner(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult

  const { user } = authResult

  await env.AVATARS.delete(`${user.id}/banner.webp`)
  await env.DB.prepare('UPDATE user SET banner_url = NULL WHERE id = ?').bind(user.id).run()

  return json({ success: true })
}

/**
 * PATCH /api/profile/settings
 * Updates user profile settings: name, bio, is_profile_public.
 */
export async function updateProfileSettings(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  // 1. Check authentication
  const authResult = await requireAuth(request, env)
  if (authResult instanceof Response) return authResult
  const { user } = authResult
  const userId = user.id

  try {
    // 2. Parse request body
    const body = await request.json() as UpdateProfileSettingsRequest
    let { name } = body as any
    const { bio, is_profile_public, show_activity, show_liked_songs } = body as any

    // 3. Validate and sanitize inputs
    const sqlUpdates: Record<string, any> = {}
    let shouldUpdateName = false

    if (name !== undefined) {
      // Trim whitespace
      const trimmedName = name.trim()

      // Validate length
      if (trimmedName.length < 3) {
        return errorResponse('Display name must be at least 3 characters', 400)
      }
      if (trimmedName.length > 50) {
        return errorResponse('Display name must be less than 50 characters', 400)
      }

      // Validate pattern (alphanumeric + spaces + basic punctuation)
      if (!/^[\w\s\-'.]+$/.test(trimmedName)) {
        return errorResponse('Display name contains invalid characters', 400)
      }

      // Check uniqueness (case-insensitive)
      const existing = await env.DB.prepare(
        'SELECT id FROM user WHERE LOWER(name) = LOWER(?) AND id != ?'
      ).bind(trimmedName, userId).first()

      if (existing) {
        return errorResponse('That display name is already taken', 409)
      }

      name = trimmedName
      shouldUpdateName = true
    }

    if (bio !== undefined) {
      // Validate length
      if (bio.length > 160) {
        return errorResponse('Bio must be less than 160 characters', 400)
      }

      // Strip HTML delimiters for security (prevents tag/script reconstruction)
      const sanitizedBio = bio.replace(/[<>]/g, '')
      sqlUpdates.bio = sanitizedBio
    }

    if (is_profile_public !== undefined) {
      sqlUpdates.is_profile_public = is_profile_public ? 1 : 0
    }
    if (show_activity !== undefined) {
      sqlUpdates.show_activity = show_activity ? 1 : 0
    }
    if (show_liked_songs !== undefined) {
      sqlUpdates.show_liked_songs = show_liked_songs ? 1 : 0
    }

    // 4. Execute updates
    if (!shouldUpdateName && Object.keys(sqlUpdates).length === 0) {
      return errorResponse('No fields to update', 400)
    }

    // Update name via Better Auth API (so session reflects the change)
    if (shouldUpdateName) {
      const auth = createAuth(env)
      await auth.api.updateUser({
        headers: request.headers,
        body: { name },
      })
    }

    // Update bio and privacy via raw SQL (Better Auth doesn't have these fields)
    if (Object.keys(sqlUpdates).length > 0) {
      const setClause = Object.keys(sqlUpdates).map(key => `${key} = ?`).join(', ')
      const values = Object.values(sqlUpdates)

      await env.DB.prepare(
        `UPDATE user SET ${setClause} WHERE id = ?`
      ).bind(...values, userId).run()
    }

    // 5. Fetch updated user
    const updatedUser = await env.DB.prepare(
      'SELECT * FROM user WHERE id = ?'
    ).bind(userId).first() as User

    // Convert INTEGER to boolean for is_profile_public
    updatedUser.is_profile_public = Boolean(updatedUser.is_profile_public)

    // 6. Return updated user
    return json({
      success: true,
      user: updatedUser
    } as UpdateProfileSettingsResponse)

  } catch (error) {
    console.error('Profile settings update error:', error)
    return errorResponse('Failed to update settings', 500)
  }
}

/**
 * GET /api/profile/:userId
 * Returns public profile data for users who have set their profile to public.
 * Phase 1 stub - full stats/activity features come in Phase 3.
 */
export async function getPublicProfile(
  _request: Request,
  env: Env,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const userId = params.userId

  if (!userId) {
    return errorResponse('User ID is required', 400)
  }

  // Validate user ID format (alphanumeric with _ or -, 8-64 chars)
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(userId)) {
    return errorResponse('Invalid user ID format', 400)
  }

  try {
    // Query uses idx_user_public_profiles for efficient public profile lookups
    const user = await env.DB.prepare(
      'SELECT id, name, avatar_url, banner_url, bio, role, is_profile_public, created_at FROM user WHERE id = ?'
    ).bind(userId).first() as {
      id: string
      name: string
      avatar_url: string | null
      banner_url: string | null
      bio: string | null
      role: string
      is_profile_public: number
      created_at: string
    } | null

    // Check if user exists
    if (!user) {
      return json<GetPublicProfileError>({
        error: 'USER_NOT_FOUND'
      }, 404)
    }

    // Check if profile is public
    if (user.is_profile_public !== 1) {
      return json<GetPublicProfileError>({
        error: 'PROFILE_PRIVATE'
      }, 403)
    }

    // Return public user data (exclude email and is_profile_public)
    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      banner_url: user.banner_url,
      bio: user.bio,
      role: user.role,
      created_at: user.created_at
    }

    return json<GetPublicProfileResponse>({
      user: publicUser
    })

  } catch (error) {
    console.error('Public profile fetch error:', error)
    return errorResponse('Failed to fetch profile', 500)
  }
}
