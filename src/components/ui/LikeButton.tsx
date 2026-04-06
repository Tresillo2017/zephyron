import { useState, useEffect } from 'react'
import { FiHeart } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import { likeSong, unlikeSong, getSongLikeStatus } from '../../lib/api'
import { useSession } from '../../lib/auth-client'

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
      } else {
        await likeSong(songId)
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
      // Rollback optimistic update on error
      setLiked(wasLiked)
      setCount(prevCount)
      setError('Failed to update like')
      setTimeout(() => setError(null), 2000)
    }
  }

  if (!session?.user) return null

  return (
    <button
      onClick={handleToggle}
      disabled={isAnimating}
      className={`group relative flex items-center gap-1.5 ${className}`}
      style={{
        cursor: isAnimating ? 'default' : 'pointer',
      }}
      title={liked ? 'Unlike' : 'Like this track'}
    >
      {/* Heart icon container with animation */}
      <span
        className="relative flex items-center justify-center"
        style={{
          animation: isAnimating && liked
            ? 'likeHeartBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : undefined,
        }}
      >
        {/* Particles burst effect */}
        {showParticles && (
          <>
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'hsl(var(--h3))',
                  animation: `particleBurst 0.5s cubic-bezier(0, 0.5, 0.5, 1) forwards`,
                  animationDelay: `${i * 0.02}s`,
                  transform: `rotate(${i * 60}deg) translateY(0)`,
                  opacity: 0,
                }}
              />
            ))}
          </>
        )}

        {/* Heart icons */}
        {liked ? (
          <FaHeart
            size={size}
            style={{
              color: 'hsl(var(--h3))',
              filter: 'drop-shadow(0 0 6px hsl(var(--h3) / 0.6))',
              transition: 'filter 0.3s ease',
            }}
          />
        ) : (
          <FiHeart
            size={size}
            style={{
              color: 'hsl(var(--c3))',
              transition: 'color 0.2s ease, transform 0.2s ease',
              transform: 'scale(1)',
            }}
            className="group-hover:scale-110 group-hover:!text-[hsl(var(--h3)/0.7)]"
          />
        )}
      </span>

      {/* Like count with smooth transition */}
      {showCount && count > 0 && (
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{
            color: liked ? 'hsl(var(--h3))' : 'hsl(var(--c3))',
            transition: 'color 0.3s ease',
          }}
        >
          {count}
        </span>
      )}

      {/* Error tooltip */}
      {error && (
        <span
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none z-50"
          style={{
            background: 'hsl(var(--b5))',
            color: 'hsl(var(--c1))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'tooltipSlideIn 0.2s ease-out',
          }}
        >
          {error}
        </span>
      )}

      {/* Inline animations */}
      <style>{`
        @keyframes likeHeartBounce {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(0.9);
          }
          75% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes particleBurst {
          0% {
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) translateY(-${size * 1.5}px) scale(0);
            opacity: 0;
          }
        }

        @keyframes tooltipSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, 4px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </button>
  )
}
