import { useState } from "react";
import { useParams, Link } from "react-router";
import { useSession } from "../lib/auth-client";
import { useSet } from "../hooks/useSets";
import { useListeners } from "../hooks/useListeners";
import { useWaveform } from "../hooks/useWaveform";
import { usePlayerStore } from "../stores/playerStore";
import { getPlaceholder } from "../lib/placeholders";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { SetBannerSkeleton } from "../components/ui/Skeleton";
import { Waveform } from "../components/player/Waveform";
import { DetectionGroup } from "../components/annotations/DetectionRow";
import { AnnotationEditor } from "../components/annotations/AnnotationEditor";
import { AddToPlaylist } from "../components/playlists/AddToPlaylist";
import { formatDuration, formatPlayCount } from "../lib/formatTime";
import {
  getCoverUrl,
  getVideoPreviewUrl,
  getEventCoverUrl,
  getEventLogoUrl,
  getArtistImageUrl,
  submitSourceRequest,
} from "../lib/api";
import { DETECTION_STATUS_LABELS } from "../lib/constants";
import type { Detection } from "../lib/types";

// ─── Source Request Popover ───────────────────────────────────────────────────

function SourceRequestPopover({
  setId,
  onDismiss,
}: {
  setId: string;
  onDismiss: () => void;
}) {
  const [sourceType, setSourceType] = useState<
    "youtube" | "soundcloud" | "hearthis"
  >("youtube");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sourceUrl.trim()) {
      setError("Please provide a URL");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await submitSourceRequest(setId, {
        source_type: sourceType,
        source_url: sourceUrl,
        notes: notes || undefined,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card p-5 mb-5">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-accent shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              Source suggestion submitted
            </p>
            <p className="text-xs text-text-muted mt-1">
              Thanks! An admin will review your suggestion.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-text-primary">
            Suggest a source
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Know where to find this set? Help the community.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-text-muted hover:text-text-primary transition-colors ml-3 shrink-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      <div className="flex gap-2 mb-3">
        {(["youtube", "soundcloud", "hearthis"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSourceType(type)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background:
                sourceType === type ? "hsl(var(--h3))" : "hsl(var(--b4) / 0.5)",
              color: sourceType === type ? "white" : "hsl(var(--c2))",
              fontWeight:
                sourceType === type ? "var(--font-weight-medium)" : undefined,
            }}
          >
            {type === "youtube"
              ? "YouTube"
              : type === "soundcloud"
              ? "SoundCloud"
              : "HearThis"}
          </button>
        ))}
      </div>

      <input
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder={
          sourceType === "youtube"
            ? "https://youtube.com/watch?v=..."
            : sourceType === "soundcloud"
            ? "https://soundcloud.com/..."
            : "https://hearthis.at/..."
        }
        className="w-full px-3 py-2 text-sm rounded-lg mb-2 outline-none focus:ring-2 focus:ring-accent/30"
        style={{
          background: "hsl(var(--b4) / 0.4)",
          color: "hsl(var(--c1))",
          border: "1px solid hsl(var(--b4) / 0.3)",
        }}
      />

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note..."
        className="w-full px-3 py-2 text-sm rounded-lg mb-3 outline-none focus:ring-2 focus:ring-accent/30"
        style={{
          background: "hsl(var(--b4) / 0.4)",
          color: "hsl(var(--c1))",
          border: "1px solid hsl(var(--b4) / 0.3)",
        }}
      />

      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        disabled={isSubmitting || !sourceUrl.trim()}
        className="w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit Suggestion"}
      </Button>
    </div>
  );
}

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

  const artistInfo = (set as any).artist_info as {
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    bio_summary: string | null;
    tags: string | null;
    lastfm_url: string | null;
    listeners: number;
  } | null;

  const setArtists = ((set as any).set_artists ?? []) as Array<{
    id: string;
    name: string;
    slug: string | null;
    image_url: string | null;
    position: number;
  }>;

  // Build artist display: prefer set_artists if populated, fall back to artist string + artist_info
  const hasMultipleArtists = setArtists.length > 1;

  const artistTags = (() => {
    try {
      return JSON.parse(artistInfo?.tags || "[]");
    } catch {
      return [];
    }
  })() as string[];

  // External source URL for SoundCloud / HearThis
  const externalSourceUrl = isExternalSource
    ? ((set as any).source_url as string | null)
    : null;
  const externalSourceLabel =
    streamType === "soundcloud"
      ? "SoundCloud"
      : streamType === "hearthis"
      ? "HearThis.at"
      : null;

  return (
    <div>
      {/* ═══ BANNER — bleh style, video if available ═══ */}
      <div className="relative h-[280px] overflow-hidden">
        {(set as any).video_preview_r2_key ? (
          <video
            src={getVideoPreviewUrl(set.id)}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover object-center"
            poster={
              (set as any).cover_image_r2_key ? getCoverUrl(set.id) : undefined
            }
          />
        ) : (set as any).cover_image_r2_key ? (
          <img
            src={getCoverUrl(set.id)}
            alt=""
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <img
            src={getPlaceholder('square')}
            alt=""
            className="w-full h-full object-cover object-center opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
      </div>

      {/* ═══ HEADER — overlapping banner ═══ */}
      <div className="relative -mt-[100px] z-10">
        <div className="px-6 lg:px-10">
          <div className="flex items-end gap-5 mb-6">
            {/* Cover art */}
            <div
              className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] rounded-[var(--card-radius)] overflow-hidden flex-shrink-0 bg-surface-overlay"
              style={{ boxShadow: "var(--subtle-shadow)" }}
            >
              {(set as any).cover_image_r2_key ? (
                <img
                  src={getCoverUrl(set.id)}
                  alt={set.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                />
              ) : (
                <img
                  src={getPlaceholder('square')}
                  alt=""
                  className="w-full h-full object-cover opacity-60"
                />
              )}
            </div>

            {/* Title + artists on banner */}
            <div className="pb-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-text-secondary banner-text">
                  DJ Set
                </p>
                {/* Stream type badge */}
                {hasNoSource && (
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md banner-text"
                    style={{
                      background: "hsl(var(--b4) / 0.5)",
                      color: "hsl(var(--c3))",
                    }}
                  >
                    No source
                  </span>
                )}
                {isExternalSource && externalSourceLabel && (
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md banner-text"
                    style={{
                      background: "hsl(var(--b4) / 0.5)",
                      color: "hsl(var(--c3))",
                    }}
                  >
                    {externalSourceLabel}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight banner-text mb-1">
                {set.title}
              </h1>

              {/* Artist(s) line */}
              {hasMultipleArtists ? (
                <div className="flex flex-wrap gap-1 items-center banner-text">
                  {setArtists.map((a, i) => (
                    <span key={a.id} className="flex items-center gap-1">
                      <Link
                        to={`/app/artists/${a.slug || a.id}`}
                        className="text-base text-text-secondary hover:text-accent transition-colors no-underline inline-flex items-center gap-1 group"
                      >
                        {a.name}
                        <svg
                          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      {i < setArtists.length - 1 && (
                        <span className="text-text-muted text-sm">&</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : artistInfo ? (
                <Link
                  to={`/app/artists/${artistInfo.slug || artistInfo.id}`}
                  className="text-base text-text-secondary hover:text-accent transition-colors no-underline banner-text inline-flex items-center gap-1 group"
                >
                  {set.artist}
                  <svg
                    className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ) : (
                <p className="text-base text-text-secondary banner-text">
                  {set.artist}
                </p>
              )}
            </div>

            {/* Admin edit button */}
            {isAdmin && (
              <div className="pb-2 flex items-end">
                <Link
                  to={`/app/admin?tab=sets&edit=${set.id}`}
                  className="no-underline"
                >
                  <Button variant="secondary" size="sm">
                    <svg
                      className="w-3.5 h-3.5 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="px-6 lg:px-10 py-4">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* MAIN — tracklist */}
          <div className="flex-1 min-w-0">
            {/* Source request popover (shown when triggered for no-source sets) */}
            {showSourceRequest && isLoggedIn && (
              <SourceRequestPopover
                setId={set.id}
                onDismiss={() => setShowSourceRequest(false)}
              />
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-3 mb-5">
              {isStreamable ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlay}
                  className="shadow-lg shadow-accent/20"
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play Set
                    </>
                  )}
                </Button>
              ) : isExternalSource && externalSourceUrl ? (
                // External source — link out
                <a
                  href={externalSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  <Button
                    variant="primary"
                    size="lg"
                    className="shadow-lg shadow-accent/20"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Listen on {externalSourceLabel}
                  </Button>
                </a>
              ) : (
                // No source — disabled play button + suggest source
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled
                    className="opacity-40 cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Not Available
                  </Button>
                  {isLoggedIn ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSourceRequest(!showSourceRequest)}
                      title="Suggest a source for this set"
                    >
                      <svg
                        className="w-3.5 h-3.5 mr-1.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      Suggest Source
                    </Button>
                  ) : (
                    <p className="text-xs text-text-muted">
                      <Link
                        to="/app/login"
                        className="text-accent no-underline hover:underline"
                      >
                        Sign in
                      </Link>{" "}
                      to suggest a source
                    </p>
                  )}
                </div>
              )}

              {isStreamable && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setShowPlaylistModal(true)}
                  title="Add to playlist"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </Button>
              )}

              <div className="ml-auto flex items-center gap-4 text-xs font-mono text-text-muted tabular-nums">
                <span>{formatDuration(set.duration_seconds)}</span>
                {set.play_count > 0 && (
                  <span>{formatPlayCount(set.play_count)} plays</span>
                )}
                {listenerCount > 0 && (
                  <span className="text-accent flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    {listenerCount} live
                  </span>
                )}
              </div>
            </div>

            {/* Waveform */}
            <div className="card p-4 mb-5">
              <Waveform
                peaks={waveformPeaks}
                duration={set.duration_seconds}
                detections={set.detections}
                height={56}
              />
            </div>

            {/* Tracklist */}
            <div className="card overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid hsl(var(--b4) / 0.15)" }}
              >
                <div>
                  <h3
                    className="text-sm"
                    style={{
                      fontWeight: "var(--font-weight-medium)",
                      color: "hsl(var(--c1))",
                    }}
                  >
                    Tracklist
                  </h3>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "hsl(var(--c3))" }}
                  >
                    {set.detections.length > 0
                      ? `${set.detections.length} tracks`
                      : DETECTION_STATUS_LABELS[set.detection_status] ||
                        set.detection_status}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddTrack(true)}
                >
                  <svg
                    className="w-3.5 h-3.5 mr-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Add Track
                </Button>
              </div>

              {set.detections.length === 0 ? (
                <div className="text-center py-16 px-5">
                  <p className="text-text-muted text-sm mb-4">
                    {set.detection_status === "pending"
                      ? "Awaiting detection — run from admin panel."
                      : "No tracks detected yet."}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowAddTrack(true)}
                  >
                    Add a track manually
                  </Button>
                </div>
              ) : (
                (() => {
                  // Group consecutive detections with the same start_time into w/ groups
                  const groups: Array<{
                    primary: (typeof set.detections)[0];
                    withTracks: typeof set.detections;
                  }> = [];
                  for (const detection of set.detections) {
                    const lastGroup = groups[groups.length - 1];
                    if (
                      lastGroup &&
                      Math.abs(
                        detection.start_time_seconds -
                          lastGroup.primary.start_time_seconds
                      ) <= 2 &&
                      groups.length > 0
                    ) {
                      lastGroup.withTracks.push(detection);
                    } else {
                      groups.push({ primary: detection, withTracks: [] });
                    }
                  }

                  return groups.map((group, groupIdx) => {
                    const endTime =
                      group.primary.end_time_seconds ??
                      (groupIdx + 1 < groups.length
                        ? groups[groupIdx + 1].primary.start_time_seconds
                        : set.duration_seconds);
                    const isActive =
                      isCurrentlyPlaying &&
                      currentTime >= group.primary.start_time_seconds &&
                      currentTime < endTime;

                    return (
                      <DetectionGroup
                        key={group.primary.id}
                        primary={group.primary}
                        withTracks={group.withTracks}
                        index={groupIdx}
                        setId={set.id}
                        duration={set.duration_seconds}
                        onClickTrack={handleDetectionClick}
                        isActive={isActive}
                        isPlaying={isCurrentlyPlaying}
                      />
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:w-[300px] xl:w-[340px] shrink-0 space-y-5">
            {/* Metadata card — with event banner on top if event exists */}
            <div
              className="overflow-hidden rounded-[var(--card-radius)]"
              style={{ boxShadow: "var(--card-border), var(--card-shadow)" }}
            >
              {/* Event banner section */}
              {(set as any).event_info && (
                <Link
                  to={`/app/events/${
                    (set as any).event_info.slug || (set as any).event_info.id
                  }`}
                  className="block no-underline group relative h-[110px] overflow-hidden"
                >
                  {(set as any).event_info.cover_image_r2_key ? (
                    <img
                      src={getEventCoverUrl((set as any).event_info.id)}
                      alt={(set as any).event_info.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                    />
                  ) : (
                    <img
                      src={getPlaceholder('square')}
                      alt=""
                      className="w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                    {(set as any).event_info.logo_r2_key && (
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden shrink-0"
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                      >
                        <img
                          src={getEventLogoUrl((set as any).event_info.id)}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono tracking-wider text-white/50 mb-0.5">
                        EVENT
                      </p>
                      <h3 className="text-sm font-[var(--font-weight-bold)] text-white truncate leading-snug">
                        {(set as any).event_info.name}
                      </h3>
                      {(set as any).event_info.location && (
                        <p className="text-[11px] text-white/60 truncate mt-0.5">
                          {(set as any).event_info.location}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )}

              {/* Metadata section */}
              <div className="p-5" style={{ background: "hsl(var(--b5))" }}>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {set.genre && set.genre.trim() && <Badge variant="accent">{set.genre}</Badge>}
                  {(set as any).subgenre && (set as any).subgenre.trim() && (
                    <Badge variant="muted">{(set as any).subgenre}</Badge>
                  )}
                </div>
                {((set as any).venue ||
                  (set.event && !(set as any).event_info)) && (
                  <p className="text-sm text-text-secondary mb-2">
                    {(set as any).venue}
                    {(set as any).venue &&
                      set.event &&
                      !(set as any).event_info &&
                      " · "}
                    {!(set as any).event_info && set.event}
                  </p>
                )}
                {(set as any).recorded_date && (
                  <p className="text-xs font-mono text-text-muted">
                    {(set as any).recorded_date}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="card p-5">
              <div className="flex gap-6">
                <div className="stat-block">
                  <span className="stat-value">
                    {formatDuration(set.duration_seconds)}
                  </span>
                  <span className="stat-label">Duration</span>
                </div>
                {set.play_count > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">
                      {formatPlayCount(set.play_count)}
                    </span>
                    <span className="stat-label">Plays</span>
                  </div>
                )}
                {set.detections.length > 0 && (
                  <div className="stat-block">
                    <span className="stat-value">{set.detections.length}</span>
                    <span className="stat-label">Tracks</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {set.description && (
              <div className="card p-5">
                <h3 className="text-xs text-text-muted mb-3">About this set</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {set.description}
                </p>
              </div>
            )}

            {/* About the DJ */}
            {artistInfo && artistInfo.bio_summary && (
              <div className="card p-5">
                <h3 className="text-xs text-text-muted mb-3">About the DJ</h3>
                <Link
                  to={`/app/artists/${artistInfo.slug || artistInfo.id}`}
                  className="flex items-center gap-3 mb-3 no-underline group"
                >
                  {artistInfo.id ? (
                    <img
                      src={getArtistImageUrl(artistInfo.id)}
                      alt={artistInfo.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = getPlaceholder('square') }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-text-muted">
                        {artistInfo.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                      {artistInfo.name}
                    </p>
                    {artistInfo.listeners > 0 && (
                      <p className="text-[10px] font-mono text-text-muted">
                        {formatPlayCount(artistInfo.listeners)} listeners
                      </p>
                    )}
                  </div>
                </Link>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                  {artistInfo.bio_summary}
                </p>
                {artistTags.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {artistTags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="tag">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
