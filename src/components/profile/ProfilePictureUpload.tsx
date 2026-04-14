import { useState, useEffect, useRef } from 'react'
import { sileo } from 'sileo'
import { uploadAvatar } from '../../lib/api'
import { Button } from '../ui/Button'

interface ProfilePictureUploadProps {
  currentAvatarUrl: string | null
  onUploadSuccess: (avatarUrl: string) => void
  onClose: () => void
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  onUploadSuccess,
  onClose,
}: ProfilePictureUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Escape key handling
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, uploading])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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
      const result = await uploadAvatar(selectedFile)
      setProgress(100)
      sileo.success({ description: 'Profile picture updated successfully' })
      onUploadSuccess(result.avatar_url)
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="card max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
      >
        <h2
          id="upload-dialog-title"
          className="text-lg font-[var(--font-weight-bold)] text-[hsl(var(--c1))] mb-4"
        >
          Upload Profile Picture
        </h2>

        {/* Current Avatar */}
        {currentAvatarUrl && !previewUrl && (
          <div className="mb-4">
            <p className="text-sm text-[hsl(var(--c2))] mb-2">Current:</p>
            <img
              src={currentAvatarUrl}
              alt="Current avatar"
              className="w-32 h-32 rounded-full object-cover"
            />
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-[var(--card-radius)] p-8 mb-4 text-center cursor-pointer transition-colors ${
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
                className="w-32 h-32 rounded-full object-cover mb-3"
              />
              <p className="text-sm text-[hsl(var(--c2))]">
                {selectedFile?.name}
              </p>
              <p className="text-xs text-[hsl(var(--c3))] mt-1">
                {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <>
              <svg
                className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--c3))]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm font-[var(--font-weight-medium)] text-[hsl(var(--c1))] mb-1">
                Drop an image here or click to browse
              </p>
              <p className="text-xs text-[hsl(var(--c3))]">
                PNG, JPG, GIF up to 10MB
              </p>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-[var(--button-radius)] bg-danger/10 border border-danger/20">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[hsl(var(--c2))] mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-[hsl(var(--b3))] rounded-full overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--h3))] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
