import { json, errorResponse } from '../lib/router'
import { requireAuth, createAuth } from '../lib/auth'
import type {
  UploadAvatarResponse,
  UploadAvatarError,
  UpdateProfileSettingsRequest,
  UpdateProfileSettingsResponse,
  UpdateProfileSettingsError,
  User
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

    // 7. Generate filename and upload to R2
    // Note: Phase 1 uploads original file without server-side resizing
    // Client handles preview/crop. Phase 2 can add sharp or Image Resizing.
    const timestamp = Date.now()
    const filename = `${userId}-${timestamp}.webp`

    try {
      await env.AVATARS.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: 'image/webp',
        },
      })

      // 8. Save avatar_url to database
      const avatarUrl = `https://avatars.zephyron.dev/${filename}`

      await env.DB.prepare(
        'UPDATE user SET avatar_url = ? WHERE id = ?'
      ).bind(avatarUrl, userId).run()

      // 9. Return success
      return json<UploadAvatarResponse>({
        success: true,
        avatar_url: avatarUrl
      })

    } catch (imageError) {
      console.error('Image processing error:', imageError)
      return json<UploadAvatarError>({
        error: 'CORRUPT_IMAGE',
        message: 'Unable to process image'
      }, 400)
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
    let { name, bio, is_profile_public } = body

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

      // Strip HTML tags for security
      const sanitizedBio = bio.replace(/<[^>]*>/g, '')
      sqlUpdates.bio = sanitizedBio
    }

    if (is_profile_public !== undefined) {
      sqlUpdates.is_profile_public = is_profile_public ? 1 : 0
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
