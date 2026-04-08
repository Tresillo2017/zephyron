/**
 * Toast notification examples for Zephyron
 *
 * Demonstrates context-aware timing and usage patterns across
 * user actions, admin operations, errors, and real-time events.
 *
 * @see docs/superpowers/specs/2026-04-08-toast-system-design.md
 */

import { sileo } from 'sileo'

// ═══ Quick Actions (3s) ═══

export function showLikeSuccess() {
  sileo.success({ title: 'Liked!', duration: 3000 })
}

export function showUnlikeSuccess() {
  sileo.success({ title: 'Removed from liked songs', duration: 3000 })
}

export function showCopySuccess() {
  sileo.success({ title: 'Link copied', duration: 3000 })
}

export function showAddToPlaylistSuccess(playlistName: string) {
  sileo.success({ title: `Added to ${playlistName}`, duration: 3000 })
}

// ═══ Admin Operations (4s) ═══

export function showUserBanned(username: string) {
  sileo.success({ title: `User ${username} banned`, duration: 4000 })
}

export function showSetUploaded() {
  sileo.success({ title: 'Set uploaded successfully', duration: 4000 })
}

export function showInviteCodeCreated(code: string) {
  sileo.success({
    title: `Invite code created: ${code}`,
    description: 'Click to copy',
    duration: 4000
  })
}

// ═══ Errors & Validation (7s) ═══

export function showSaveError() {
  sileo.error({ title: 'Failed to save changes', duration: 7000 })
}

export function showValidationError(message: string) {
  sileo.error({ title: message, duration: 7000 })
}

export function showNetworkError() {
  sileo.error({ title: 'Network error. Please try again.', duration: 7000 })
}

export function showUploadError(filename: string) {
  sileo.error({
    title: `Failed to upload ${filename}`,
    description: 'Check file format and try again',
    duration: 7000
  })
}

// ═══ Real-time Notifications (8s) ═══

export function showNewSetAvailable(artistName: string, setTitle: string) {
  sileo.info({
    title: `New set: ${setTitle}`,
    description: `by ${artistName}`,
    duration: 8000
  })
}

export function showAnnotationApproved() {
  sileo.success({ title: 'Your annotation was approved', duration: 8000 })
}

export function showNewComment(username: string) {
  sileo.info({
    title: 'New comment on your annotation',
    description: `${username} replied`,
    duration: 8000
  })
}

// ═══ Watch Party (Future, 8s) ═══

export function showUserJoinedWatchParty(username: string) {
  sileo.info({ title: `${username} joined the watch party`, duration: 8000 })
}

export function showPlaybackSynced() {
  sileo.success({ title: 'Playback synced', duration: 3000 })
}

export function showUserLeftWatchParty(username: string) {
  sileo.info({ title: `${username} left the watch party`, duration: 8000 })
}

// ═══ Critical Actions (Manual dismiss) ═══

export function showSessionExpired() {
  sileo.error({ title: 'Session expired. Please log in.', duration: Infinity })
}

export function showMaintenanceWarning(minutesUntil: number) {
  sileo.warning({
    title: `Maintenance in ${minutesUntil} minutes`,
    description: 'Save your work',
    duration: Infinity
  })
}

// ═══ Action Toasts (Interactive) ═══

export function showUndoDelete(itemName: string, onUndo: () => void) {
  sileo.action({
    title: `${itemName} deleted`,
    duration: 8000,
    button: {
      title: 'Undo',
      onClick: onUndo
    }
  })
}

export function showViewComment(_commentId: string, onView: () => void) {
  sileo.action({
    title: 'New comment on your annotation',
    description: 'Click to view',
    duration: 8000,
    button: {
      title: 'View',
      onClick: onView
    }
  })
}

// ═══ Promise-based Operations ═══

export async function showUploadProgress(uploadPromise: Promise<any>) {
  return sileo.promise(uploadPromise, {
    loading: { title: 'Uploading...' },
    success: { title: 'Upload complete' },
    error: { title: 'Upload failed' }
  })
}

export async function showSaveProgress(savePromise: Promise<any>, itemName: string) {
  return sileo.promise(savePromise, {
    loading: { title: `Saving ${itemName}...` },
    success: { title: `${itemName} saved` },
    error: { title: `Failed to save ${itemName}` }
  })
}
