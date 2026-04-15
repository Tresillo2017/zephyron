import { useState, useEffect, useRef } from 'react'
import { sileo } from 'sileo'
import { uploadAvatar } from '../../lib/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface ProfilePictureUploadProps {
  currentAvatarUrl: string | null
  onUploadSuccess: (url: string) => void
  onClose: () => void
  /** Override the upload function — defaults to uploadAvatar */
  uploadFn?: (file: File) => Promise<{ success: true; avatar_url?: string; banner_url?: string }>
  title?: string
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  onUploadSuccess,
  onClose,
  uploadFn,
  title = 'Upload Profile Picture',
}: ProfilePictureUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'File must be an image'
    }
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB'
    }
    return null
  }

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    setError(null)
    setSelectedFile(file)

    // Generate preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
      // Simulate input event
      const input = document.getElementById('avatar-input') as HTMLInputElement
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear drag state if leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setProgress(0)
    setError(null)

    // Simulate progress (since FormData upload doesn't support progress)
    const intervalId = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90))
    }, 100)
    progressIntervalRef.current = intervalId

    try {
      const fn = uploadFn ?? uploadAvatar
      const result = await fn(selectedFile)
      setProgress(100)
      sileo.success({ description: 'Image updated successfully' })
      onUploadSuccess((result as any).avatar_url ?? (result as any).banner_url ?? '')
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar'
      setError(errorMessage)
      sileo.error({ description: errorMessage })
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setUploading(false)
    }
  }

  const handleDropZoneClick = () => {
    const input = document.getElementById('avatar-input') as HTMLInputElement
    input?.click()
  }

  return (
    <Modal
      isOpen
      onClose={uploading ? () => {} : onClose}
      title={title}
    >
      <div className="space-y-4">
        {/* Current Avatar */}
        {currentAvatarUrl && !previewUrl && (
          <div className="flex items-center gap-3">
            <img
              src={currentAvatarUrl}
              alt="Current avatar"
              className="w-12 h-12 rounded-full object-cover"
            />
            <p className="text-sm" style={{ color: 'hsl(var(--c3))' }}>Current picture</p>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-[var(--card-radius)] p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[hsl(var(--h3))] bg-[hsl(var(--h3)/0.1)]'
              : 'border-[hsl(var(--b3))] hover:border-[hsl(var(--b4))] hover:bg-[hsl(var(--b4)/0.3)]'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleDropZoneClick}
          tabIndex={0}
          role="button"
          aria-label="Upload profile picture by clicking or dragging"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              document.getElementById('avatar-input')?.click()
            }
          }}
        >
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="flex flex-col items-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-24 h-24 rounded-full object-cover mb-3"
              />
              <p className="text-sm" style={{ color: 'hsl(var(--c2))' }}>{selectedFile?.name}</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--c3))' }}>
                {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <>
              <svg
                className="w-10 h-10 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: 'hsl(var(--c3))' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-[var(--font-weight-medium)] mb-1" style={{ color: 'hsl(var(--c1))' }}>
                Drop an image here or click to browse
              </p>
              <p className="text-xs" style={{ color: 'hsl(var(--c3))' }}>PNG, JPG, GIF up to 10MB</p>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-[var(--button-radius)] bg-danger/10 border border-danger/20">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div>
            <div className="flex justify-between text-xs mb-1" style={{ color: 'hsl(var(--c2))' }}>
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--b3))' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'hsl(var(--h3))' }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? 'Uploading...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
