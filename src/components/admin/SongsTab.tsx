import { useState, useEffect, useCallback } from "react";
import {
  fetchSongsAdmin,
  updateSongAdmin,
  deleteSongAdmin,
  cacheSongCoverAdmin,
  enrichSongAdmin,
  getSongCoverUrl,
} from "../../lib/api";
import {
  SERVICES,
  ServiceIcon,
  ServiceIconLink,
  getAvailableServices,
} from "../../lib/services";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import type { Song } from "../../lib/types";

export function SongsTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Song | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});

  const loadSongs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchSongsAdmin(search || undefined, page);
      setSongs(res.data);
      setTotal(res.total);
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteSongAdmin(confirmDelete.id);
      setSongs((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {
      /* silent */
    } finally {
      setDeleting(false);
    }
  };

  const handleCacheCover = async (song: Song) => {
    try {
      await cacheSongCoverAdmin(song.id);
      setActionMsg((prev) => ({ ...prev, [song.id]: "Cover art queued" }));
      setTimeout(
        () =>
          setActionMsg((prev) => {
            const n = { ...prev };
            delete n[song.id];
            return n;
          }),
        3000
      );
    } catch {
      setActionMsg((prev) => ({ ...prev, [song.id]: "Failed" }));
    }
  };

  const handleEnrich = async (song: Song) => {
    try {
      await enrichSongAdmin(song.id);
      setActionMsg((prev) => ({ ...prev, [song.id]: "Enrichment queued" }));
      setTimeout(
        () =>
          setActionMsg((prev) => {
            const n = { ...prev };
            delete n[song.id];
            return n;
          }),
        3000
      );
    } catch {
      setActionMsg((prev) => ({ ...prev, [song.id]: "Failed" }));
    }
  };

  if (isLoading && songs.length === 0)
    return <Skeleton className="h-64 w-full rounded-xl" />;

  const totalPages = Math.ceil(total / 50);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <p className="text-sm shrink-0" style={{ color: "hsl(var(--c3))" }}>
          {total} song{total !== 1 ? "s" : ""}
        </p>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search songs..."
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm placeholder:text-text-muted focus:outline-none"
          style={{
            background: "hsl(var(--b4) / 0.4)",
            color: "hsl(var(--c1))",
          }}
        />
      </div>

      {/* List */}
      {songs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm" style={{ color: "hsl(var(--c3))" }}>
            {search
              ? "No songs match your search."
              : "No songs in the database yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {songs.map((song) => (
            <div key={song.id} className="card !p-3">
              <div className="flex items-center gap-3">
                {/* Cover art */}
                {song.cover_art_r2_key ||
                song.cover_art_url ||
                song.lastfm_album_art ? (
                  <img
                    src={
                      song.cover_art_r2_key
                        ? getSongCoverUrl(song.id)
                        : (song.cover_art_url || song.lastfm_album_art)!
                    }
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ background: "hsl(var(--b4) / 0.4)" }}
                  >
                    <svg
                      className="w-4 h-4"
                      style={{ color: "hsl(var(--c3) / 0.3)" }}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={{
                      color: "hsl(var(--c1))",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    {song.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-xs truncate"
                      style={{ color: "hsl(var(--c2))" }}
                    >
                      {song.artist}
                    </span>
                    {song.label && (
                      <>
                        <span
                          className="text-[10px]"
                          style={{ color: "hsl(var(--c3) / 0.4)" }}
                        >
                          ·
                        </span>
                        <span
                          className="text-[10px] truncate"
                          style={{ color: "hsl(var(--c3))" }}
                        >
                          {song.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Service link icons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {getAvailableServices(
                    song as unknown as Record<string, unknown>
                  )
                    .slice(0, 5)
                    .map(({ url, service }) => (
                      <ServiceIconLink
                        key={service.key}
                        url={url}
                        service={service}
                        size={14}
                      />
                    ))}
                </div>

                {/* Like count */}
                {(song.like_count ?? 0) > 0 && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                    style={{
                      background: "hsl(var(--h3) / 0.1)",
                      color: "hsl(var(--h3))",
                    }}
                    title={`${song.like_count} like${song.like_count !== 1 ? 's' : ''}`}
                  >
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                    {song.like_count}
                  </span>
                )}

                {/* Detection count */}
                {(song.detection_count ?? 0) > 0 && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "hsl(var(--b4) / 0.4)",
                      color: "hsl(var(--c3))",
                    }}
                  >
                    {song.detection_count} use
                    {song.detection_count !== 1 ? "s" : ""}
                  </span>
                )}

                {/* Source badge */}
                {song.source && <Badge variant="muted">{song.source}</Badge>}

                {/* Action message */}
                {actionMsg[song.id] && (
                  <span
                    className="text-[10px]"
                    style={{ color: "hsl(var(--h3))" }}
                  >
                    {actionMsg[song.id]}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEnrich(song)}
                    title="Enrich with Last.fm"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCacheCover(song)}
                    title="Cache cover art"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSong(song)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(song)}
                    title="Delete"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      style={{ color: "hsl(0, 60%, 55%)" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <span
            className="text-xs font-mono"
            style={{ color: "hsl(var(--c3))" }}
          >
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Song"
      >
        <p className="text-sm mb-2" style={{ color: "hsl(var(--c2))" }}>
          Delete{" "}
          <strong>
            {confirmDelete?.artist} - {confirmDelete?.title}
          </strong>
          ?
        </p>
        <p className="text-xs mb-4" style={{ color: "hsl(var(--c3))" }}>
          This will unlink the song from all detections. The detections will
          remain but without song metadata.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(null)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      {/* Edit modal */}
      {editingSong && (
        <EditSongModal
          song={editingSong}
          onClose={() => setEditingSong(null)}
          onSaved={() => {
            setEditingSong(null);
            loadSongs();
          }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// Edit Song Modal
// ═══════════════════════════════════════════

function EditSongModal({
  song,
  onClose,
  onSaved,
}: {
  song: Song;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [label, setLabel] = useState(song.label || "");
  const [album, setAlbum] = useState(song.album || "");
  const [coverArtUrl, setCoverArtUrl] = useState(song.cover_art_url || "");
  const [links, setLinks] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const svc of SERVICES) {
      initial[svc.key] = (song[svc.key] as string) || "";
    }
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full px-3 py-2 bg-[hsl(var(--b4)/0.4)] rounded-[var(--button-radius)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none";

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {
        title: title.trim(),
        artist: artist.trim(),
        label: label.trim() || null,
        album: album.trim() || null,
        cover_art_url: coverArtUrl.trim() || null,
      };
      for (const svc of SERVICES) {
        data[svc.key] = links[svc.key]?.trim() || null;
      }
      await updateSongAdmin(song.id, data);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const coverPreview = song.cover_art_r2_key
    ? getSongCoverUrl(song.id)
    : coverArtUrl || song.lastfm_album_art;

  return (
    <Modal isOpen onClose={onClose} title="Edit Song">
      <div
        style={{ maxHeight: "75vh", overflow: "auto" }}
        className="space-y-3"
      >
        {/* Cover art preview */}
        {coverPreview && (
          <div className="flex justify-center">
            <img
              src={coverPreview}
              alt=""
              className="w-24 h-24 rounded-xl object-cover"
              style={{ boxShadow: "0 4px 20px hsl(var(--b7) / 0.4)" }}
            />
          </div>
        )}

        {/* Basic info */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="OWSLA"
          />
          <Input
            label="Album"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            placeholder="Album name"
          />
        </div>
        <div>
          <label
            className="text-sm font-[var(--font-weight-medium)] block mb-1.5"
            style={{ color: "hsl(var(--c2))" }}
          >
            Cover Art URL
          </label>
          <input
            value={coverArtUrl}
            onChange={(e) => setCoverArtUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>

        {/* Service links */}
        <div>
          <p
            className="text-sm font-[var(--font-weight-medium)] mb-2"
            style={{ color: "hsl(var(--c2))" }}
          >
            Streaming Links
          </p>
          <div className="space-y-2">
            {SERVICES.map((svc) => (
              <div key={svc.key} className="flex items-center gap-2">
                <ServiceIcon service={svc} size={16} className="shrink-0" />
                <span
                  className="text-[11px] w-20 shrink-0"
                  style={{ color: "hsl(var(--c3))" }}
                >
                  {svc.label}
                </span>
                <input
                  value={links[svc.key] || ""}
                  onChange={(e) =>
                    setLinks((prev) => ({ ...prev, [svc.key]: e.target.value }))
                  }
                  placeholder={svc.placeholder}
                  className={`${inputClass} !text-xs`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Last.fm info (read-only) */}
        {(song.lastfm_album || song.lastfm_tags || song.lastfm_listeners) && (
          <div
            className="rounded-lg p-3"
            style={{ background: "hsl(var(--b5) / 0.5)" }}
          >
            <p
              className="text-[10px] font-mono mb-1"
              style={{ color: "hsl(var(--c3))" }}
            >
              LAST.FM DATA
            </p>
            {song.lastfm_album && (
              <p className="text-xs" style={{ color: "hsl(var(--c2))" }}>
                Album: {song.lastfm_album}
              </p>
            )}
            {song.lastfm_tags && (
              <p className="text-xs" style={{ color: "hsl(var(--c2))" }}>
                Tags:{" "}
                {typeof song.lastfm_tags === "string"
                  ? JSON.parse(song.lastfm_tags).join(", ")
                  : ""}
              </p>
            )}
            {song.lastfm_listeners && (
              <p className="text-xs" style={{ color: "hsl(var(--c2))" }}>
                Listeners: {song.lastfm_listeners.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs" style={{ color: "hsl(0, 60%, 55%)" }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !artist.trim()}
            className="flex-1"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
