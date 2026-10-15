import { LayoutGridFilled, ListCheckFilled, Search2Filled } from "@mingcute/react/core-filled";
import { IconButton, inputClass } from "../bleh";

export type SongViewMode = "list" | "grid";

interface SongsToolbarProps {
  total: number;
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: SongViewMode;
  onViewModeChange: (mode: SongViewMode) => void;
}

export function SongsToolbar({
  total,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: SongsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="shrink-0 text-[13px] tabular-nums text-muted">
        {total} song{total !== 1 ? "s" : ""}
      </p>
      <div className="relative w-full max-w-xs flex-1">
        <Search2Filled
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search songs"
          placeholder="Search songs…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={inputClass + " pl-9"}
        />
      </div>
      <div role="group" aria-label="View mode" className="ml-auto flex items-center gap-1">
        <IconButton
          label="List view"
          size="sm"
          tooltip={false}
          variant={viewMode === "list" ? "filled" : "subtle"}
          aria-pressed={viewMode === "list"}
          onClick={() => onViewModeChange("list")}
        >
          <ListCheckFilled />
        </IconButton>
        <IconButton
          label="Grid view"
          size="sm"
          tooltip={false}
          variant={viewMode === "grid" ? "filled" : "subtle"}
          aria-pressed={viewMode === "grid"}
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGridFilled />
        </IconButton>
      </div>
    </div>
  );
}
