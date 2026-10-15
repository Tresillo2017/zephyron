import { Link } from 'react-router'
import { AddFilled, ExternalLinkFilled, Link2Filled, PauseFilled, PlayFilled } from '@mingcute/react/core-filled'
import { Button, IconButton } from '../bleh'
import { formatDuration, formatPlayCount } from '../../lib/formatTime'

interface SetActionsProps {
  isStreamable: boolean
  isCurrentlyPlaying: boolean
  /** Set when the set is hosted on an external platform with a known URL. */
  externalLink: { url: string; label: string } | null
  isLoggedIn: boolean
  showSourceRequest: boolean
  duration: number
  playCount: number
  listenerCount: number
  onPlay: () => void
  onToggleSourceRequest: () => void
  onOpenPlaylist: () => void
}

/** Play / listen-out / suggest-source actions and the duration, plays and live counters. */
export function SetActions({
  isStreamable,
  isCurrentlyPlaying,
  externalLink,
  isLoggedIn,
  showSourceRequest,
  duration,
  playCount,
  listenerCount,
  onPlay,
  onToggleSourceRequest,
  onOpenPlaylist,
}: SetActionsProps) {
  return (
    <div className="dt-actions">
      {isStreamable ? (
        <Button
          appearance="primary"
          label={isCurrentlyPlaying ? 'Pause' : 'Play Set'}
          icon={isCurrentlyPlaying ? <PauseFilled className="dt-ico" aria-hidden="true" /> : <PlayFilled className="dt-ico" aria-hidden="true" />}
          onClick={onPlay}
        />
      ) : externalLink ? (
        <Button
          appearance="primary"
          label={`Listen on ${externalLink.label}`}
          href={externalLink.url}
          icon={<ExternalLinkFilled className="dt-ico" aria-hidden="true" />}
        />
      ) : (
        <>
          <Button
            appearance="default"
            label="Not Available"
            disabled
            className="dt-unavailable"
            icon={<PlayFilled className="dt-ico" aria-hidden="true" />}
          />
          {isLoggedIn ? (
            <Button
              appearance="ghost"
              size="sm"
              label="Suggest Source"
              title="Suggest a source for this set"
              aria-expanded={showSourceRequest}
              onClick={onToggleSourceRequest}
              icon={<Link2Filled className="dt-ico--sm" aria-hidden="true" />}
            />
          ) : (
            <p className="dt-source-note">
              <Link to="/app/login">Sign in</Link> to suggest a source
            </p>
          )}
        </>
      )}

      {isStreamable && (
        <IconButton label="Add to playlist" size="md" onClick={onOpenPlaylist} title="Add to playlist">
          <AddFilled className="dt-ico" aria-hidden="true" />
        </IconButton>
      )}

      <div className="dt-stats-inline">
        <span>{formatDuration(duration)}</span>
        {playCount > 0 && <span>{formatPlayCount(playCount)} plays</span>}
        {listenerCount > 0 && (
          <span className="dt-live">
            <span className="dt-live-dot" aria-hidden="true" />
            {listenerCount} live
          </span>
        )}
      </div>
    </div>
  )
}
