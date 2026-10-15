import { useState, useCallback, useRef, type ReactNode } from "react";
import {
  adminCreateSet,
  fetchArtists,
  fetchEvents,
  import1001Tracklists,
  type Track1001Preview,
} from "../../lib/api";
import { Input, textareaClass, inputClass } from "../bleh";
import { AdminButton, AdminBadge } from "./adminUi";
import {
  AutocompleteInput,
  type AutocompleteOption,
} from "../ui/AutocompleteInput";
import { ImportArtistModal } from "./ArtistsTab";
import {
  parse1001TracklistFromHtml,
  parse1001TracklistMetadata,
} from "../../lib/parse-1001tracklists";
import { GENRES } from "../../lib/constants";
import { cn } from "../../lib/cn";

const STREAM_SOURCES = ["youtube", "soundcloud", "hearthis", "none"] as const;
const STREAM_SOURCE_LABEL: Record<(typeof STREAM_SOURCES)[number], string> = {
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  hearthis: "HearThis",
  none: "None",
};

const FIELD_LABEL = "mb-1 block text-xs font-medium text-text";
const HAIRLINE = "shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--b4),transparent_75%)]";

// ─── Form field label ─────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={FIELD_LABEL}>
      {children}
    </label>
  );
}

// ─── Inline Requests Panel ────────────────────────────────────────────────────

function RequestsPanel() {
  return <div className={cn("mt-5 overflow-hidden rounded-card", HAIRLINE)}></div>;
}

// ─── Parsed tracklist preview ─────────────────────────────────────────────────

/** Brand dots shown per track for each linked streaming service. */
function PlatformDots({ track }: { track: Track1001Preview }) {
  return (
    <div className="flex shrink-0 gap-1">
      {track.spotify_url && <span aria-hidden className="size-1.5 rounded-full bg-[#1DB954]" />}
      {track.apple_music_url && <span aria-hidden className="size-1.5 rounded-full bg-[#FA243C]" />}
      {track.soundcloud_url && <span aria-hidden className="size-1.5 rounded-full bg-[#FF6100]" />}
      {track.beatport_url && <span aria-hidden className="size-1.5 rounded-full bg-[#94D500]" />}
    </div>
  );
}

function ParsedTrackRow({ track: t, index: i }: { track: Track1001Preview; index: number }) {
  const isId = !t.is_identified && t.artist === "ID" && t.title === "ID";
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-xs shadow-[inset_0_-1px_0_color-mix(in_oklch,var(--b4),transparent_90%)]",
        i % 2 === 1 && "bg-b5/20",
      )}
    >
      {t.artwork_url ? (
        <img src={t.artwork_url} alt="" className="size-6 shrink-0 rounded object-cover" />
      ) : (
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded",
            isId ? "bg-error/20" : "bg-b4/50",
          )}
        >
          {isId && <span className="text-[8px] text-error">?</span>}
        </div>
      )}
      <span
        className={cn(
          "w-5 shrink-0 text-right font-mono text-[10px] tabular-nums",
          t.is_continuation ? "text-accent-2/50" : isId ? "text-error/80" : "text-muted",
        )}
      >
        {t.is_continuation ? "w/" : String(t.position).padStart(2, "0")}
      </span>
      {t.cue_time && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted">{t.cue_time}</span>
      )}
      <div className="min-w-0 flex-1 truncate">
        {isId ? (
          <span className="italic text-error/80">ID - ID</span>
        ) : (
          <>
            <span className="text-text">{t.artist}</span>
            <span className="text-muted"> — </span>
            <span className="text-heading">{t.title}</span>
            {t.is_mashup && (
              <span className="ml-1 rounded bg-b4/40 px-1 py-0.5 font-mono text-[9px] text-muted">
                mashup
              </span>
            )}
          </>
        )}
      </div>
      <PlatformDots track={t} />
    </div>
  );
}

function ParsedTracksPreview({
  parsedTracks,
  identifiedCount,
  idCount,
}: {
  parsedTracks: Track1001Preview[];
  identifiedCount: number;
  idCount: number;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden rounded-card", HAIRLINE)}>
      <div className="flex shrink-0 items-center justify-between bg-b5/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-accent-2">
            {parsedTracks.filter((t) => !t.is_continuation).length} tracks
          </span>
          {identifiedCount > 0 && <span className="text-[10px] text-muted">{identifiedCount} ID'd</span>}
          {idCount > 0 && <span className="text-[10px] text-error">{idCount} unknown</span>}
        </div>
        <AdminBadge variant="accent">1001Tracklists</AdminBadge>
      </div>
      <div className="max-h-[340px] flex-1 overflow-y-auto">
        {parsedTracks.map((t, i) => (
          <ParsedTrackRow key={i} track={t} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── SetsUploadTab ────────────────────────────────────────────────────────────

export function SetsUploadTab({
  onSetCreated,
  onClose,
}: { onSetCreated?: () => void; onClose?: () => void } = {}) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [subgenre, setSubgenre] = useState("");
  const [venue, setVenue] = useState("");
  const [event, setEvent] = useState("");
  const [recordedDate, setRecordedDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  // Source type + URL
  const [streamSource, setStreamSource] = useState<
    "youtube" | "soundcloud" | "hearthis" | "none"
  >("youtube");
  const [sourceUrl, setSourceUrl] = useState("");

  // YouTube / streaming metadata (parsed from 1001TL HTML, or manual)
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoId, setVideoId] = useState("");

  // 1001Tracklists
  const [tracklistUrl, setTracklistUrl] = useState("");
  const [tracklistHtml, setTracklistHtml] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTracks, setParsedTracks] = useState<Track1001Preview[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Linked artist/event IDs
  const [artistId, setArtistId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [showArtistModal, setShowArtistModal] = useState(false);
  const pendingCreateRef = useRef(false);

  // Additional artists (co-DJs, b2b)
  const [coArtistValue, setCoArtistValue] = useState("");
  const [coArtistId, setCoArtistId] = useState<string | null>(null);
  const [additionalArtists, setAdditionalArtists] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Autocomplete fetch functions
  const fetchArtistOptions = useCallback(
    async (q: string): Promise<AutocompleteOption[]> => {
      const res = await fetchArtists(q);
      return (res.data || []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        label: a.name as string,
        sublabel: a.set_count ? `${a.set_count} sets` : undefined,
      }));
    },
    []
  );

  const fetchEventOptions = useCallback(
    async (q: string): Promise<AutocompleteOption[]> => {
      const res = await fetchEvents(q);
      return (res.data || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        label: e.name as string,
        sublabel: [e.year, e.series].filter(Boolean).join(" · ") || undefined,
      }));
    },
    []
  );

  async function doCreate(resolvedArtistId: string | null) {
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const durationSeconds = (parseInt(durationMinutes) || 60) * 60;

      // Build artist_ids list
      const artistIds: string[] = [];
      if (resolvedArtistId) artistIds.push(resolvedArtistId);
      additionalArtists.forEach((a) => {
        if (!artistIds.includes(a.id)) artistIds.push(a.id);
      });

      // Build artist display string (for the sets.artist text field)
      const allArtistNames = [
        artist.trim(),
        ...additionalArtists.map((a) => a.name),
      ].filter(Boolean);
      const artistDisplayName =
        allArtistNames.length > 1 ? allArtistNames.join(" & ") : artist.trim();

      setSuccess("Creating set...");
      const res = await adminCreateSet({
        title: title.trim(),
        artist: artistDisplayName,
        description: description.trim() || undefined,
        genre: genre || undefined,
        subgenre: subgenre.trim() || undefined,
        venue: venue.trim() || undefined,
        event: event.trim() || undefined,
        recorded_date: recordedDate || undefined,
        duration_seconds: durationSeconds,
        thumbnail_url: thumbnailUrl || undefined,
        // Source type
        stream_type: streamSource === "none" ? undefined : streamSource,
        source_url:
          streamSource === "soundcloud" || streamSource === "hearthis"
            ? sourceUrl.trim()
            : undefined,
        // YouTube specific
        youtube_video_id:
          streamSource === "youtube" && videoId ? videoId : undefined,
        tracklist_1001_url: tracklistUrl.trim() || undefined,
        // Artist IDs
        artist_id: resolvedArtistId || undefined,
        artist_ids: artistIds.length > 0 ? artistIds : undefined,
        event_id: eventId || undefined,
      });

      const id = res.data.id;

      if (parsedTracks.length > 0) {
        setSuccess(`Set created. Importing ${parsedTracks.length} tracks...`);
        try {
          const importRes = await import1001Tracklists(id, parsedTracks);
          setSuccess(
            `Set created. Imported ${importRes.data.imported} tracks from 1001Tracklists.`
          );
          setParsedTracks([]);
          setTracklistHtml("");
        } catch {
          setSuccess(
            `Set created (${id}), but track import failed. You can re-import from the Edit panel.`
          );
        }
      } else {
        setSuccess(
          `Set created (${id}). You can add a tracklist via Edit or trigger ML detection.`
        );
      }

      // Reset form
      setTitle("");
      setArtist("");
      setDescription("");
      setGenre("");
      setSubgenre("");
      setVenue("");
      setEvent("");
      setRecordedDate("");
      setDurationMinutes("");
      setThumbnailUrl("");
      setVideoId("");
      setTracklistUrl("");
      setTracklistHtml("");
      setArtistId(null);
      setEventId(null);
      setStreamSource("youtube");
      setSourceUrl("");
      setAdditionalArtists([]);
      setCoArtistValue("");
      setCoArtistId(null);
      onSetCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create set");
    } finally {
      setIsCreating(false);
    }
  }

  const handleCreateArtist = useCallback((_name: string) => {
    setShowArtistModal(true);
  }, []);

  const handleArtistCreated = useCallback((id: string, name: string) => {
    setArtistId(id);
    setArtist(name);
    setShowArtistModal(false);
    if (pendingCreateRef.current) {
      pendingCreateRef.current = false;
      setTimeout(() => doCreate(id), 50);
    }
  }, []);

  const handleAddCoArtist = () => {
    if (!coArtistId || !coArtistValue.trim()) return;
    if (additionalArtists.find((a) => a.id === coArtistId)) return;
    setAdditionalArtists((prev) => [
      ...prev,
      { id: coArtistId, name: coArtistValue },
    ]);
    setCoArtistValue("");
    setCoArtistId(null);
  };

  const handleRemoveCoArtist = (id: string) => {
    setAdditionalArtists((prev) => prev.filter((a) => a.id !== id));
  };

  const handleParse = () => {
    if (!tracklistHtml.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setSuccess(null);
    try {
      const tracks = parse1001TracklistFromHtml(tracklistHtml);
      if (tracks.length === 0) {
        setParseError(
          "No tracks found. Make sure you pasted the full page source (Ctrl+U), not just the visible text."
        );
        return;
      }
      setParsedTracks(tracks as Track1001Preview[]);

      const meta = parse1001TracklistMetadata(tracklistHtml);

      if (meta.title && !title) setTitle(meta.title);
      if (meta.artist && !artist) setArtist(meta.artist);
      if (meta.date && !recordedDate) setRecordedDate(meta.date);
      if (meta.genre && !genre) setGenre(meta.genre);
      if (meta.venue && !venue) setVenue(meta.venue);
      if (meta.duration_seconds && !durationMinutes) {
        setDurationMinutes(Math.round(meta.duration_seconds / 60).toString());
      }
      if (meta.youtube_video_id && !videoId) {
        setVideoId(meta.youtube_video_id);
        // Auto-set source to youtube if we got a video ID
        if (streamSource === "none") setStreamSource("youtube");
      }
      if (meta.tracklist_id && !tracklistUrl) {
        setTracklistUrl(
          `https://www.1001tracklists.com/tracklist/${meta.tracklist_id}/`
        );
      }
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse HTML"
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleCreate = async () => {
    const missing: string[] = [];
    if (!title.trim()) missing.push("title");
    if (!artist.trim()) missing.push("artist");
    if (!durationMinutes) missing.push("duration");

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    // Validate source URL if external type
    if (
      (streamSource === "soundcloud" || streamSource === "hearthis") &&
      !sourceUrl.trim()
    ) {
      setError(
        `Please provide a ${
          streamSource === "soundcloud" ? "SoundCloud" : "HearThis"
        } URL`
      );
      return;
    }

    if (!artistId && artist.trim()) {
      setError(null);
      try {
        const searchRes = await fetchArtists(artist.trim());
        const exactMatch = (searchRes.data || []).find(
          (a: Record<string, unknown>) =>
            (a.name as string).toLowerCase() === artist.trim().toLowerCase()
        );
        if (exactMatch) {
          setArtistId(exactMatch.id as string);
          await doCreate(exactMatch.id as string);
          return;
        }
      } catch {}
      pendingCreateRef.current = true;
      setShowArtistModal(true);
      return;
    }

    await doCreate(artistId);
  };

  const identifiedCount = parsedTracks.filter(
    (t) => t.is_identified || (t.artist !== "ID" && t.title !== "ID")
  ).length;
  const idCount = parsedTracks.filter(
    (t) => !t.is_identified && t.artist === "ID" && t.title === "ID"
  ).length;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex min-h-[420px] gap-5">
        {/* ═══ LEFT COLUMN: 1001TL source + tracklist ═══ */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[16px] font-medium text-heading">1001Tracklists source</span>
          </div>

          {/* URL */}
          <Input
            value={tracklistUrl}
            onChange={(e) => setTracklistUrl(e.target.value)}
            placeholder="https://www.1001tracklists.com/tracklist/..."
            aria-label="1001Tracklists URL"
            className="mb-2 w-full"
          />

          {/* HTML paste */}
          <div className={cn("mb-2 rounded-card bg-b5/50 p-3", HAIRLINE)}>
            <div className="mb-2 flex items-start gap-2">
              <svg
                className="mt-0.5 size-3.5 shrink-0 text-accent-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <p className="text-[11px] text-muted">
                Open the 1001tracklists page, press{" "}
                <kbd className="rounded bg-b3 px-1 py-0.5 font-mono text-[10px] text-text">
                  Ctrl+U
                </kbd>{" "}
                to view source, select all, copy, and paste below.
              </p>
            </div>

            <textarea
              value={tracklistHtml}
              onChange={(e) => setTracklistHtml(e.target.value)}
              placeholder="Paste the full page source HTML here..."
              aria-label="Page source HTML"
              rows={3}
              className={cn(textareaClass, "font-mono text-xs")}
            />

            <div className="mt-2 flex items-center gap-2">
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={handleParse}
                disabled={isParsing || !tracklistHtml.trim()}
              >
                {isParsing
                  ? "Parsing..."
                  : parsedTracks.length > 0
                  ? "Re-parse"
                  : "Parse"}
              </AdminButton>
              {tracklistHtml.trim() && (
                <span className="font-mono text-[10px] text-muted">
                  {(tracklistHtml.length / 1024).toFixed(0)} KB
                </span>
              )}
              {parsedTracks.length > 0 && (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setParsedTracks([]);
                    setTracklistHtml("");
                    setParseError(null);
                  }}
                >
                  Clear
                </AdminButton>
              )}
            </div>
            {parseError && (
              <p role="alert" className="mt-1.5 text-[11px] text-error">
                {parseError}
              </p>
            )}
          </div>

          {/* Parsed tracks preview */}
          {parsedTracks.length > 0 && (
            <ParsedTracksPreview
              parsedTracks={parsedTracks}
              identifiedCount={identifiedCount}
              idCount={idCount}
            />
          )}
        </div>

        {/* ═══ RIGHT COLUMN: Set metadata + actions ═══ */}
        <div className="flex w-72 shrink-0 flex-col">
          <span className="mb-1.5 text-[16px] font-medium text-heading">Set metadata</span>

          <div className="flex flex-1 flex-col gap-3">
            <div>
              <FieldLabel htmlFor="set-title">Title *</FieldLabel>
              <Input
                id="set-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Set title"
                className="w-full"
              />
            </div>

            <div>
              <FieldLabel>Artist / DJ *</FieldLabel>
              <AutocompleteInput
                value={artist}
                onChange={setArtist}
                onSelect={(opt) => setArtistId(opt.id)}
                onClear={() => setArtistId(null)}
                selectedId={artistId}
                fetchOptions={fetchArtistOptions}
                placeholder="DJ name"
                onCreateNew={handleCreateArtist}
                createNewLabel="Create artist"
              />
              {/* Co-artists */}
              {additionalArtists.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {additionalArtists.map((a) => (
                    <span
                      key={a.id}
                      className="flex items-center gap-1 rounded-md bg-accent-2/12 px-2 py-0.5 text-xs text-accent-2"
                    >
                      {a.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveCoArtist(a.id)}
                        aria-label={`Remove ${a.name}`}
                        className="ml-0.5 leading-none opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Co-artist picker */}
              <div className="mt-1.5 flex gap-1.5">
                <div className="min-w-0 flex-1">
                  <AutocompleteInput
                    value={coArtistValue}
                    onChange={setCoArtistValue}
                    onSelect={(opt) => setCoArtistId(opt.id)}
                    onClear={() => setCoArtistId(null)}
                    selectedId={coArtistId}
                    fetchOptions={fetchArtistOptions}
                    placeholder="Add co-artist..."
                  />
                </div>
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={handleAddCoArtist}
                  disabled={!coArtistId}
                >
                  Add
                </AdminButton>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="set-venue">Venue</FieldLabel>
              <Input
                id="set-venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Club / Festival stage"
                className="w-full"
              />
            </div>

            <div>
              <FieldLabel>Event</FieldLabel>
              <AutocompleteInput
                value={event}
                onChange={setEvent}
                onSelect={(opt) => setEventId(opt.id)}
                onClear={() => setEventId(null)}
                selectedId={eventId}
                fetchOptions={fetchEventOptions}
                placeholder="Boiler Room Berlin"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel htmlFor="set-genre">Genre</FieldLabel>
                <select
                  id="set-genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className={cn(inputClass, "w-full")}
                >
                  <option value="">Select...</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="set-subgenre">Subgenre</FieldLabel>
                <Input
                  id="set-subgenre"
                  value={subgenre}
                  onChange={(e) => setSubgenre(e.target.value)}
                  placeholder="Dark Techno"
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel htmlFor="set-date">Date</FieldLabel>
                <Input
                  id="set-date"
                  type="date"
                  value={recordedDate}
                  onChange={(e) => setRecordedDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="set-duration">Duration *</FieldLabel>
                <Input
                  id="set-duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="90 min"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="set-description">Description</FieldLabel>
              <textarea
                id="set-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Set description..."
                rows={2}
                className={cn(textareaClass, "w-full")}
              />
            </div>

            {/* ─── Source section ─── */}
            <div>
              <span className="mb-1.5 block text-xs font-medium text-text">Stream source</span>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {STREAM_SOURCES.map((type) => (
                  <AdminButton
                    key={type}
                    size="sm"
                    variant={streamSource === type ? "primary" : "secondary"}
                    aria-pressed={streamSource === type}
                    onClick={() => setStreamSource(type)}
                  >
                    {STREAM_SOURCE_LABEL[type]}
                  </AdminButton>
                ))}
              </div>

              {/* YouTube: show video ID (manual or parsed) */}
              {streamSource === "youtube" && (
                <div>
                  <Input
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    placeholder="YouTube video ID (optional)"
                    aria-label="YouTube video ID"
                    className="w-full font-mono text-xs"
                  />
                  {videoId && (
                    <div className={cn("mt-1.5 flex items-center gap-2 rounded-item bg-b4/30 px-2.5 py-1.5", HAIRLINE)}>
                      <svg
                        className="size-3 shrink-0 text-error"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                      </svg>
                      <span className="font-mono text-[10px] text-muted">{videoId}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SoundCloud / HearThis: URL input */}
              {(streamSource === "soundcloud" ||
                streamSource === "hearthis") && (
                <Input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={
                    streamSource === "soundcloud"
                      ? "https://soundcloud.com/..."
                      : "https://hearthis.at/..."
                  }
                  aria-label="Stream source URL"
                  className="w-full"
                />
              )}

              {/* None: just a note */}
              {streamSource === "none" && (
                <p className="text-[10px] text-muted">
                  Set will be added without a stream source. Users can suggest
                  sources later.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs text-error">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="mt-2 text-xs text-success">
              {success}
            </p>
          )}

          <div className="mt-auto flex gap-3 pt-3">
            {onClose && (
              <AdminButton variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </AdminButton>
            )}
            <AdminButton
              variant="primary"
              onClick={handleCreate}
              disabled={
                isCreating ||
                !title.trim() ||
                !artist.trim() ||
                !durationMinutes
              }
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create DJ Set"}
            </AdminButton>
          </div>
        </div>
      </div>

      {/* ═══ Requests panel ═══ */}
      <RequestsPanel />

      {/* Import Artist modal */}
      {showArtistModal && (
        <ImportArtistModal
          onClose={() => {
            setShowArtistModal(false);
            pendingCreateRef.current = false;
          }}
          onCreated={handleArtistCreated}
        />
      )}
    </div>
  );
}
