import { useState, useCallback } from 'react'
import { voteDetection as voteDetectionApi } from '../../lib/api'
import type { Detection } from '../../lib/types'

interface VoteButtonsProps {
  detection: Detection
  onVoteChange?: (detectionId: string, upvotes: number, downvotes: number) => void
}

export function VoteButtons({ detection, onVoteChange }: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(detection.upvotes)
  const [downvotes, setDownvotes] = useState(detection.downvotes)
  const [userVote, setUserVote] = useState<1 | -1 | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = useCallback(
    async (vote: 1 | -1) => {
      if (isVoting) return
      setIsVoting(true)

      try {
        const result = await voteDetectionApi(detection.id, vote)

        if (result.action === 'created') {
          if (vote === 1) setUpvotes((v) => v + 1)
          else setDownvotes((v) => v + 1)
          setUserVote(vote)
        } else if (result.action === 'removed') {
          if (vote === 1) setUpvotes((v) => Math.max(0, v - 1))
          else setDownvotes((v) => Math.max(0, v - 1))
          setUserVote(null)
        } else if (result.action === 'changed') {
          if (vote === 1) {
            setUpvotes((v) => v + 1)
            setDownvotes((v) => Math.max(0, v - 1))
          } else {
            setDownvotes((v) => v + 1)
            setUpvotes((v) => Math.max(0, v - 1))
          }
          setUserVote(vote)
        }

        onVoteChange?.(detection.id, upvotes, downvotes)
      } catch {
        // Silently fail — vote didn't go through
      } finally {
        setIsVoting(false)
      }
    },
    [detection.id, isVoting, upvotes, downvotes, onVoteChange]
  )

  return (
    <div className="flex items-center gap-1">
      {/* Upvote */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleVote(1)
        }}
        disabled={isVoting}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
          userVote === 1
            ? 'bg-accent/15 text-accent'
            : 'text-text-muted hover:text-accent hover:bg-accent/10'
        } disabled:opacity-50`}
        title="This detection is correct"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 14l5-5 5 5z" />
        </svg>
        <span>{upvotes}</span>
      </button>

      {/* Downvote */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleVote(-1)
        }}
        disabled={isVoting}
        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
          userVote === -1
            ? 'bg-danger/15 text-danger'
            : 'text-text-muted hover:text-danger hover:bg-danger/10'
        } disabled:opacity-50`}
        title="This detection is wrong"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5z" />
        </svg>
        <span>{downvotes}</span>
      </button>
    </div>
  )
}
