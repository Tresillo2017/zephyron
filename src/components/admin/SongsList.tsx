import type { ReactNode } from "react";
import { DeleteFilled, MusicFilled, PicFilled, Refresh1Filled } from "@mingcute/react/core-filled";
import { Card, IconButton, Table, THead, TBody, Tr, Th, Td } from "../bleh";
import { getSongCoverUrl } from "../../lib/api";
import { ServiceIconLink, getAvailableServices } from "../../lib/services";
import type { Song } from "../../lib/types";
import { cn } from "../../lib/cn";
import { AdminBadge, AdminButton, cellMuted } from "./adminUi";
import type { SongViewMode } from "./SongsToolbar";

export interface SongRowHandlers {
  actionMsg: Record<string, string>;
  onEnrich: (song: Song) => void;
  onCacheCover: (song: Song) => void;
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
}

interface SongsListProps extends SongRowHandlers {
  songs: Song[];
  viewMode: SongViewMode;
}

export function SongsList({ songs, viewMode, ...handlers }: SongsListProps) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {songs.map((song) => (
          <SongTile key={song.id} song={song} handlers={handlers} />
        ))}
      </div>
    );
  }
  return (
    <Table>
      <THead>
        <Tr>
          <Th>Song</Th>
          <Th className="w-36">Links</Th>
          <Th className="w-40 text-center">Stats</Th>
          <Th className="w-24 text-center">Source</Th>
          <Th className="w-36 text-right"><span className="sr-only">Actions</span></Th>
        </Tr>
      </THead>
      <TBody>
        {songs.map((song) => (
          <SongRow key={song.id} song={song} handlers={handlers} />
        ))}
      </TBody>
    </Table>
  );
}

function SongRow({ song, handlers }: { song: Song; handlers: SongRowHandlers }) {
  return (
    <Tr>
      <Td className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <SongArt song={song} className="h-9 w-9 shrink-0 rounded-md" iconSize={16} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-heading">{song.title}</p>
            <p className={cn(cellMuted, "truncate")}>
              {song.artist}
              {song.label && <span> · {song.label}</span>}
            </p>
          </div>
        </div>
      </Td>
      <Td>
        <SongLinks song={song} size={14} max={5} className="flex items-center gap-1.5" />
      </Td>
      <Td>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <SongStats song={song} />
        </div>
      </Td>
      <Td className="text-center">
        {song.source && <AdminBadge variant="muted">{song.source}</AdminBadge>}
      </Td>
      <Td className="text-right">
        <div className="flex flex-col items-end gap-0.5">
          <SongActions song={song} handlers={handlers} />
          <ActionMessage message={handlers.actionMsg[song.id]} />
        </div>
      </Td>
    </Tr>
  );
}

function SongTile({ song, handlers }: { song: Song; handlers: SongRowHandlers }) {
  return (
    <Card padded={false} className="flex flex-col gap-3 p-3">
      <SongArt song={song} className="aspect-square w-full rounded-lg" iconSize={40} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-heading">{song.title}</p>
        <p className={cn(cellMuted, "truncate")}>
          {song.artist}
          {song.label && ` · ${song.label}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {song.source && <AdminBadge variant="muted">{song.source}</AdminBadge>}
        <SongStats song={song} />
      </div>
      <SongLinks song={song} size={16} max={6} className="flex items-center gap-1.5" />
      <ActionMessage message={handlers.actionMsg[song.id]} />
      <div className="border-t border-b4/20 pt-2">
        <SongActions song={song} handlers={handlers} fill />
      </div>
    </Card>
  );
}

function SongArt({
  song,
  className,
  iconSize,
}: {
  song: Song;
  className: string;
  iconSize: number;
}) {
  const src = song.cover_art_r2_key
    ? getSongCoverUrl(song.id)
    : song.cover_art_url || song.lastfm_album_art || null;
  if (src) {
    return <img src={src} alt="" className={cn(className, "object-cover")} />;
  }
  return (
    <div
      aria-hidden="true"
      className={cn(className, "flex items-center justify-center bg-b4/40 text-muted")}
    >
      <MusicFilled size={iconSize} />
    </div>
  );
}

function SongLinks({
  song,
  size,
  max,
  className,
}: {
  song: Song;
  size: number;
  max: number;
  className: string;
}) {
  const links = getAvailableServices(song as unknown as Record<string, unknown>).slice(0, max);
  if (links.length === 0) return null;
  return (
    <div className={className}>
      {links.map(({ url, service }) => (
        <ServiceIconLink key={service.key} url={url} service={service} size={size} />
      ))}
    </div>
  );
}

function SongStats({ song }: { song: Song }) {
  return (
    <>
      {(song.like_count ?? 0) > 0 && (
        <AdminBadge variant="accent">{song.like_count} likes</AdminBadge>
      )}
      {(song.detection_count ?? 0) > 0 && (
        <AdminBadge variant="muted">
          {song.detection_count} use{song.detection_count !== 1 ? "s" : ""}
        </AdminBadge>
      )}
    </>
  );
}

function SongActions({
  song,
  handlers,
  fill = false,
}: {
  song: Song;
  handlers: SongRowHandlers;
  fill?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1", fill ? "w-full justify-between" : "justify-end")}>
      <IconButton
        label={`Enrich ${song.title} with Last.fm`}
        size="sm"
        tooltip={false}
        onClick={() => handlers.onEnrich(song)}
      >
        <Refresh1Filled />
      </IconButton>
      <IconButton
        label={`Cache cover art for ${song.title}`}
        size="sm"
        tooltip={false}
        onClick={() => handlers.onCacheCover(song)}
      >
        <PicFilled />
      </IconButton>
      <AdminButton variant="ghost" size="sm" onClick={() => handlers.onEdit(song)}>
        Edit
      </AdminButton>
      <IconButton
        label={`Delete ${song.title}`}
        size="sm"
        tooltip={false}
        className="text-error"
        onClick={() => handlers.onDelete(song)}
      >
        <DeleteFilled />
      </IconButton>
    </div>
  );
}

function ActionMessage({ message }: { message?: string }): ReactNode {
  if (!message) return null;
  return (
    <span
      role="status"
      className={cn("text-[12px]", message === "Failed" ? "text-error" : "text-accent-2")}
    >
      {message}
    </span>
  );
}
