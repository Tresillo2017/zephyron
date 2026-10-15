import { useState, useEffect } from 'react'
import { CheckFilled } from '@mingcute/react/core-filled'
import { useSession } from '../../lib/auth-client'
import { followArtist, unfollowArtist, getFollowStatus } from '../../lib/api'
import { Button } from '../bleh'

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
      size="sm"
      appearance={following ? 'primary' : 'default'}
      label={following ? 'Following' : 'Follow'}
      icon={following ? <CheckFilled /> : undefined}
      aria-pressed={following}
      onClick={handleToggle}
      disabled={inFlight}
    />
  )
}
