import { useState, useEffect, type CSSProperties } from 'react'
import { HeartFilled } from '@mingcute/react/core-filled'
import { HeartRegular } from '@mingcute/react/core-regular'
import { likeSong, unlikeSong, getSongLikeStatus } from '../../lib/api'
import { useSession } from '../../lib/auth-client'
import { sileo } from 'sileo'
import './LikeButton.css'

interface LikeButtonProps {
  songId: string
  size?: number
  className?: string
  showCount?: boolean
  initialCount?: number
}

export function LikeButton({ songId, size = 16, className = '', showCount = false, initialCount = 0 }: LikeButtonProps) {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [isAnimating, setIsAnimating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    if (!session?.user || !songId) return

    // Fetch like status
    getSongLikeStatus(songId)
      .then(res => setLiked(res.liked))
      .catch(() => setLiked(false))
  }, [session, songId])

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent track click

    if (!session?.user) {
      setError('Please sign in to like songs')
      setTimeout(() => setError(null), 2000)
      return
    }

    if (isAnimating) return

    // Optimistic update
    const wasLiked = liked
    const prevCount = count

    setLiked(!wasLiked)
    setCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1)
    setIsAnimating(true)

    // Show particles only on like (not unlike)
    if (!wasLiked) {
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 600)
    }

    // Animation duration
    setTimeout(() => setIsAnimating(false), 400)

    // API call in background
    try {
      if (wasLiked) {
        await unlikeSong(songId)
        sileo.success({ title: 'Removed from liked songs', duration: 3000 })
      } else {
        await likeSong(songId)
        sileo.success({ title: 'Liked!', duration: 3000 })
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
      // Rollback optimistic update on error
      setLiked(wasLiked)
      setCount(prevCount)
      setError('Failed to update like')
      sileo.error({ title: 'Failed to update like status', duration: 7000 })
      setTimeout(() => setError(null), 2000)
    }
  }

  if (!session?.user) return null

  return (
    <button
      onClick={handleToggle}
      disabled={isAnimating}
      className={`lk-button group relative flex items-center gap-1.5 ${className}`}
      data-animating={isAnimating ? '' : undefined}
      title={liked ? 'Unlike' : 'Like this track'}
    >
      {/* Heart icon container with animation */}
      <span
        className="lk-icon relative flex items-center justify-center"
        data-bounce={isAnimating && liked ? '' : undefined}
      >
        {/* Particles burst effect */}
        {showParticles && (
          <>
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className="lk-particle"
                style={{
                  '--rot': `${i * 60}deg`,
                  '--dist': `${size * 1.5}px`,
                  animationDelay: `${i * 0.02}s`,
                } as CSSProperties}
              />
            ))}
          </>
        )}

        {/* Heart icons */}
        {liked ? (
          <HeartFilled
            size={size}
            className="lk-heart lk-heart-on"
          />
        ) : (
          <HeartRegular
            size={size}
            className="lk-heart"
          />
        )}
      </span>

      {/* Like count with smooth transition */}
      {showCount && count > 0 && (
        <span
          className="lk-count"
          data-liked={liked ? '' : undefined}
        >
          {count}
        </span>
      )}

      {/* Error tooltip */}
      {error && (
        <span
          className="lk-error"
        >
          {error}
        </span>
      )}

    </button>
  )
}
