import { json, errorResponse } from '../lib/router'
import { requireAuth } from '../lib/auth'
import type { UploadAvatarResponse, UploadAvatarError } from '../types'

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
