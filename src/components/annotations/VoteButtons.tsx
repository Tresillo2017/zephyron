import { useState, useCallback } from 'react'
import { voteDetection as voteDetectionApi } from '../../lib/api'
import type { Detection } from '../../lib/types'
import { Button } from '../bleh/Button'
import { ArrowUpFilled, ArrowDownFilled } from '@mingcute/react/core-filled'

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
    <div className="flex items-center gap-1" role="group" aria-label="Vote on this detection">
      <Button
        label={String(upvotes)}
        aria-label={`This detection is correct, ${upvotes} upvotes`}
        aria-pressed={userVote === 1}
        size="sm"
        appearance={userVote === 1 ? 'primary' : 'ghost'}
        icon={<ArrowUpFilled size={14} />}
        disabled={isVoting}
        onClick={(e) => {
          e.stopPropagation()
          handleVote(1)
        }}
      />
      <Button
        label={String(downvotes)}
        aria-label={`This detection is wrong, ${downvotes} downvotes`}
        aria-pressed={userVote === -1}
        size="sm"
        appearance={userVote === -1 ? 'danger' : 'ghost'}
        icon={<ArrowDownFilled size={14} />}
        disabled={isVoting}
        onClick={(e) => {
          e.stopPropagation()
          handleVote(-1)
        }}
      />
    </div>
  )
}
