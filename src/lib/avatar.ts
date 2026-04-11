/**
 * Get avatar URL with appropriate size variant
 * @param avatarUrl - Full avatar URL (points to large size)
 * @param size - Desired size variant
 * @returns URL with correct size suffix
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  size: 'small' | 'large'
): string | null {
  if (!avatarUrl) return null

  // If URL already points to a specific size, replace it
  if (avatarUrl.includes('/avatar-small.webp') || avatarUrl.includes('/avatar-large.webp')) {
    return avatarUrl.replace(/avatar-(small|large)\.webp/, `avatar-${size}.webp`)
  }

  // Otherwise, assume it's the large size and replace accordingly
  return avatarUrl.replace(/\/([^/]+)\.webp$/, `/$1-${size}.webp`)
}

/**
 * Get avatar URL for large size (profile headers, settings)
 */
export function getAvatarLarge(avatarUrl: string | null | undefined): string | null {
  return getAvatarUrl(avatarUrl, 'large')
}

/**
 * Get avatar URL for small size (lists, comments, nav)
 */
export function getAvatarSmall(avatarUrl: string | null | undefined): string | null {
  return getAvatarUrl(avatarUrl, 'small')
}
