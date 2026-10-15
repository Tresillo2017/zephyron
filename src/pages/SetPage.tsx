import { useState } from "react";
import { useParams } from "react-router";
import { useSession } from "../lib/auth-client";
import { useSet } from "../hooks/useSets";
import { useListeners } from "../hooks/useListeners";
import { useWaveform } from "../hooks/useWaveform";
import { usePlayerStore } from "../stores/playerStore";
import { SetBannerSkeleton } from "../components/ui/Skeleton";
import { Waveform } from "../components/player/Waveform";
import { AnnotationEditor } from "../components/annotations/AnnotationEditor";
import { AddToPlaylist } from "../components/playlists/AddToPlaylist";
import { ContentCard } from "../components/bleh";
import { PageFrame } from "../components/shell";
import { SetHero } from "../components/detail/SetHero";
import { SetActions } from "../components/detail/SetActions";
import { SetTracklist } from "../components/detail/SetTracklist";
import { SetSidebar } from "../components/detail/SetSidebar";
import { SourceRequestPopover } from "../components/detail/SourceRequestPopover";
import { parseArtistTags, type SetWithSource } from "../components/detail/setModel";
import type { Detection } from "../lib/types";
import "../components/detail/detail.css";

// ─── SetPage ─────────────────────────────────────────────────────────────────

export function SetPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const isLoggedIn = !!session?.user;

  const { set, isLoading, error } = useSet(id);
  const play = usePlayerStore((s) => s.play);
  const currentSet = usePlayerStore((s) => s.currentSet);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const seekToDetection = usePlayerStore((s) => s.seekToDetection);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [showSourceRequest, setShowSourceRequest] = useState(false);

  const isCurrentlyPlaying = currentSet?.id === id && isPlaying;
  const isThisSetLoaded = currentSet?.id === id;
  const currentTime = usePlayerStore((s) => s.currentTime);
  const listenerCount = useListeners(id, isCurrentlyPlaying);
  const { peaks: waveformPeaks } = useWaveform(id, set?.stream_type);

  // Determine if this set is playable via our player
  const streamType = set?.stream_type ?? null;
  const isStreamable = streamType === "invidious" || streamType === "r2";
  const isExternalSource =
    streamType === "soundcloud" || streamType === "hearthis";
  const hasNoSource = !streamType;

  const handlePlay = () => {
    if (!set || !isStreamable) return;
    if (isCurrentlyPlaying) {
      usePlayerStore.getState().pause();
    } else {
      play(set, set.detections);
    }
  };

  const handleDetectionClick = (detection: Detection) => {
    if (!set || !isStreamable) return;
    if (currentSet?.id !== set.id) {
      play(set, set.detections);
      setTimeout(() => seekToDetection(detection), 100);
    } else {
      seekToDetection(detection);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-danger text-sm">{error}</p>
      </div>
    );
  }

  if (isLoading || !set) {
    return <SetBannerSkeleton />;
  }

  const setWithSource = set as SetWithSource;
  const artistInfo = set.artist_info ?? null;
  const setArtists = set.set_artists ?? [];
  const artistTags = parseArtistTags(artistInfo?.tags);

  // External source URL for SoundCloud / HearThis
  const externalSourceUrl = isExternalSource ? (setWithSource.source_url ?? null) : null;
  const externalSourceLabel =
    streamType === "soundcloud"
      ? "SoundCloud"
      : streamType === "hearthis"
      ? "HearThis.at"
      : null;
  const externalLink =
    externalSourceUrl && externalSourceLabel
      ? { url: externalSourceUrl, label: externalSourceLabel }
      : null;

  // Badge next to "DJ Set" in the hero
  const sourceBadge = hasNoSource ? "No source" : isExternalSource ? externalSourceLabel : null;

  return (
    <>
      <SetHero
        set={set}
        artistInfo={artistInfo}
        setArtists={setArtists}
        sourceBadge={sourceBadge}
        isAdmin={isAdmin}
      />

      <PageFrame>
        <ContentCard
          main={
            <div className="dt-main">
              {/* Source request popover (shown when triggered for no-source sets) */}
              {showSourceRequest && isLoggedIn && (
                <SourceRequestPopover
                  setId={set.id}
                  onDismiss={() => setShowSourceRequest(false)}
                />
              )}

              <SetActions
                isStreamable={isStreamable}
                isCurrentlyPlaying={isCurrentlyPlaying}
                externalLink={externalLink}
                isLoggedIn={isLoggedIn}
                showSourceRequest={showSourceRequest}
                duration={set.duration_seconds}
                playCount={set.play_count}
                listenerCount={listenerCount}
                onPlay={handlePlay}
                onToggleSourceRequest={() => setShowSourceRequest(!showSourceRequest)}
                onOpenPlaylist={() => setShowPlaylistModal(true)}
              />

              <div className="dt-wave">
                <Waveform
                  peaks={waveformPeaks}
                  duration={set.duration_seconds}
                  detections={set.detections}
                  height={56}
                />
              </div>

              <SetTracklist
                setId={set.id}
                detections={set.detections}
                detectionStatus={set.detection_status}
                duration={set.duration_seconds}
                isCurrentlyPlaying={isCurrentlyPlaying}
                currentTime={currentTime}
                onAddTrack={() => setShowAddTrack(true)}
                onClickTrack={handleDetectionClick}
              />
            </div>
          }
          side={<SetSidebar set={set} artistInfo={artistInfo} artistTags={artistTags} />}
        />
      </PageFrame>

      {/* Modals */}
      <AnnotationEditor
        setId={set.id}
        duration={set.duration_seconds}
        initialTime={isThisSetLoaded ? currentTime : 0}
        isOpen={showAddTrack}
        onClose={() => setShowAddTrack(false)}
      />
      {id && (
        <AddToPlaylist
          setId={id}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </>
  );
}
