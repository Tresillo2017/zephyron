import { useState } from "react";
import { updateSongAdmin, getSongCoverUrl } from "../../lib/api";
import { SERVICES, ServiceIcon } from "../../lib/services";
import { Card, Input, InlineAlert } from "../bleh";
import type { Song } from "../../lib/types";
import { AdminButton, AdminModal } from "./adminUi";

interface DeleteSongModalProps {
  song: Song | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteSongModal({ song, deleting, onCancel, onConfirm }: DeleteSongModalProps) {
  return (
    <AdminModal
      isOpen={!!song}
      onClose={onCancel}
      title="Delete Song"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-text">
          Delete <span className="text-heading">{song?.artist} - {song?.title}</span>?
        </p>
        <p className="text-[12px] text-muted">
          This will unlink the song from all detections. The detections will remain but without song
          metadata.
        </p>
      </div>
    </AdminModal>
  );
}

interface EditSongModalProps {
  song: Song;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSongModal({ song, onClose, onSaved }: EditSongModalProps) {
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
    <AdminModal
      isOpen
      onClose={onClose}
      title="Edit Song"
      size="lg"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !artist.trim()}
          >
            {isSaving ? "Saving…" : "Save"}
          </AdminButton>
        </>
      }
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {coverPreview && (
          <div className="flex justify-center">
            <img
              src={coverPreview}
              alt=""
              className="h-24 w-24 rounded-xl object-cover shadow-[var(--subtle-shadow)]"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
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
        <Input
          label="Cover Art URL"
          value={coverArtUrl}
          onChange={(e) => setCoverArtUrl(e.target.value)}
          placeholder="https://..."
        />

        <ServiceLinkFields
          links={links}
          onChange={(key, value) => setLinks((prev) => ({ ...prev, [key]: value }))}
        />

        {(song.lastfm_album || song.lastfm_tags || song.lastfm_listeners) && (
          <LastFmInfo song={song} />
        )}

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
      </div>
    </AdminModal>
  );
}

function ServiceLinkFields({
  links,
  onChange,
}: {
  links: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[13px] font-medium text-text">Streaming Links</legend>
      {SERVICES.map((svc) => (
        <div key={svc.key} className="flex items-center gap-2">
          <ServiceIcon service={svc} size={16} className="shrink-0" />
          <span className="w-20 shrink-0 text-[12px] text-muted">{svc.label}</span>
          <div className="min-w-0 flex-1">
            <Input
              aria-label={`${svc.label} link`}
              value={links[svc.key] || ""}
              onChange={(e) => onChange(svc.key, e.target.value)}
              placeholder={svc.placeholder}
              className="!text-xs"
            />
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function LastFmInfo({ song }: { song: Song }) {
  return (
    <Card padded={false} className="p-3">
      <p className="mb-1 font-mono text-[11px] text-muted">LAST.FM DATA</p>
      {song.lastfm_album && <p className="text-[12px] text-text">Album: {song.lastfm_album}</p>}
      {song.lastfm_tags && (
        <p className="text-[12px] text-text">
          Tags:{" "}
          {typeof song.lastfm_tags === "string" ? JSON.parse(song.lastfm_tags).join(", ") : ""}
        </p>
      )}
      {song.lastfm_listeners && (
        <p className="text-[12px] text-text">
          Listeners: {song.lastfm_listeners.toLocaleString()}
        </p>
      )}
    </Card>
  );
}
