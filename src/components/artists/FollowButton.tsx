import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { followArtist, unfollowArtist, getFollowStatus } from '../../lib/api'
import { Button } from '../ui/Button'

interface Props {
  artistId: string
}

export function FollowButton({ artistId }: Props) {
  const { data: session, isPending } = useSession()
  // null = unknown (loading), false = not following, true = following
  const [following, setFollowing] = useState<boolean | null>(null)
  const [inFlight, setInFlight] = useState(false)

  useEffect(() => {
    if (!session) return
    setFollowing(null) // reset to loading state when session or artistId changes
    getFollowStatus(artistId)
      .then((res) => setFollowing(res.data.following))
      .catch(() => setFollowing(false))
  }, [artistId, session])

  // Hide while session is loading or follow status is unknown
  if (isPending || !session || following === null) return null

  const handleToggle = async () => {
    if (inFlight) return
    const prev = following
    setFollowing(!prev)
    setInFlight(true)
    try {
      if (prev) {
        await unfollowArtist(artistId)
      } else {
        await followArtist(artistId)
      }
    } catch {
      setFollowing(prev)
    } finally {
      setInFlight(false)
    }
  }

  return (
    <Button
      variant={following === true ? 'primary' : 'secondary'}
      size="sm"
      onClick={handleToggle}
      disabled={inFlight}
    >
      {following === true ? (
        <>
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Following
        </>
      ) : (
        'Follow'
      )}
    </Button>
  )
}
