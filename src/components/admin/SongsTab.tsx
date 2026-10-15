import { useState, useEffect, useCallback } from "react";
import {
  fetchSongsAdmin,
  deleteSongAdmin,
  cacheSongCoverAdmin,
  enrichSongAdmin,
} from "../../lib/api";
import { Pagination, Skeleton } from "../bleh";
import type { Song } from "../../lib/types";
import { SongsToolbar, type SongViewMode } from "./SongsToolbar";
import { SongsList } from "./SongsList";
import { DeleteSongModal, EditSongModal } from "./SongModals";

const PAGE_SIZE = 50;
const ACTION_MSG_TTL_MS = 3000;

export function SongsTab() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<SongViewMode>("list");
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

  const flashActionMsg = (songId: string, msg: string) => {
    setActionMsg((prev) => ({ ...prev, [songId]: msg }));
    setTimeout(
      () =>
        setActionMsg((prev) => {
          const next = { ...prev };
          delete next[songId];
          return next;
        }),
      ACTION_MSG_TTL_MS
    );
  };

  const markActionFailed = (songId: string) => {
    setActionMsg((prev) => ({ ...prev, [songId]: "Failed" }));
  };

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
      flashActionMsg(song.id, "Cover art queued");
    } catch {
      markActionFailed(song.id);
    }
  };

  const handleEnrich = async (song: Song) => {
    try {
      await enrichSongAdmin(song.id);
      flashActionMsg(song.id, "Enrichment queued");
    } catch {
      markActionFailed(song.id);
    }
  };

  if (isLoading && songs.length === 0) return <Skeleton height={256} borderRadius={12} />;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <SongsToolbar
        total={total}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {songs.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          {search ? "No songs match your search." : "No songs in the database yet."}
        </p>
      ) : (
        <SongsList
          songs={songs}
          viewMode={viewMode}
          actionMsg={actionMsg}
          onEnrich={handleEnrich}
          onCacheCover={handleCacheCover}
          onEdit={setEditingSong}
          onDelete={setConfirmDelete}
        />
      )}

      {totalPages > 1 && (
        <Pagination
          page={page - 1}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={(p) => setPage(p + 1)}
        />
      )}

      <DeleteSongModal
        song={confirmDelete}
        deleting={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />

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
    </div>
  );
}
