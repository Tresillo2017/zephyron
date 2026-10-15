import { AddFilled } from '@mingcute/react/core-filled'
import { Button, Section } from '../bleh'
import { DetectionGroup } from '../annotations/DetectionRow'
import { DETECTION_STATUS_LABELS } from '../../lib/constants'
import type { Detection, DjSet } from '../../lib/types'
import { groupDetections } from './setModel'

interface SetTracklistProps {
  setId: string
  detections: Detection[]
  detectionStatus: DjSet['detection_status']
  duration: number
  isCurrentlyPlaying: boolean
  currentTime: number
  onAddTrack: () => void
  onClickTrack: (detection: Detection) => void
}

/** Tracklist card: header with count and "Add Track", then one row per detection group. */
export function SetTracklist({
  setId,
  detections,
  detectionStatus,
  duration,
  isCurrentlyPlaying,
  currentTime,
  onAddTrack,
  onClickTrack,
}: SetTracklistProps) {
  const groups = groupDetections(detections)
  const subtitle =
    detections.length > 0
      ? `${detections.length} tracks`
      : DETECTION_STATUS_LABELS[detectionStatus] || detectionStatus

  return (
    <Section
      title="Tracklist"
      action={
        <Button
          appearance="ghost"
          size="sm"
          label="Add Track"
          onClick={onAddTrack}
          icon={<AddFilled className="dt-ico--sm" aria-hidden="true" />}
        />
      }
    >
      <p className="dt-sub">{subtitle}</p>

      {detections.length === 0 ? (
        <div className="dt-empty">
          <p>
            {detectionStatus === 'pending'
              ? 'Awaiting detection — run from admin panel.'
              : 'No tracks detected yet.'}
          </p>
          <Button appearance="default" size="sm" label="Add a track manually" onClick={onAddTrack} />
        </div>
      ) : (
        <div className="dt-tracklist">
          {groups.map((group, groupIdx) => {
            const endTime =
              group.primary.end_time_seconds ??
              (groupIdx + 1 < groups.length
                ? groups[groupIdx + 1].primary.start_time_seconds
                : duration)
            const isActive =
              isCurrentlyPlaying &&
              currentTime >= group.primary.start_time_seconds &&
              currentTime < endTime

            return (
              <div key={group.primary.id} className="dt-track" data-active={isActive ? '' : undefined}>
                <DetectionGroup
                  primary={group.primary}
                  withTracks={group.withTracks}
                  index={groupIdx}
                  setId={setId}
                  duration={duration}
                  onClickTrack={onClickTrack}
                  isActive={isActive}
                  isPlaying={isCurrentlyPlaying}
                />
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}
