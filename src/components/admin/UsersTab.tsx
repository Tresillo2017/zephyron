import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { authClient } from "../../lib/auth-client";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import { formatRelativeTime } from "../../lib/formatTime";

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires?: string | null;
  reputation?: number;
  totalAnnotations?: number;
  totalVotes?: number;
  createdAt: string;
}

type ActionModal =
  | { type: "ban"; user: User }
  | { type: "delete"; user: User }
  | { type: "revoke"; user: User }
  | { type: "set-password"; user: User }
  | { type: "create" };

const BAN_EXPIRY_OPTIONS = [
  { label: "Permanent", value: "" },
  { label: "1 hour", value: "3600" },
  { label: "24 hours", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
  { label: "90 days", value: "7776000" },
];

// ─── Kebab menu ──────────────────────────────────────────────────────────────

function UserActionsMenu({
  user,
  loading,
  onSetRole,
  onBan,
  onUnban,
  onRevokeSessions,
  onImpersonate,
  onDelete,
  onSetPassword,
}: {
  user: User;
  loading: boolean;
  onSetRole: () => void;
  onBan: () => void;
  onUnban: () => void;
  onRevokeSessions: () => void;
  onImpersonate: () => void;
  onDelete: () => void;
  onSetPassword: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on scroll (since we use fixed positioning)
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, {
      passive: true,
      capture: true,
    });
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 320; // approximate max menu height
      const viewportH = window.innerHeight;
      // If menu would overflow below viewport, position above the button instead
      const fitsBelow = rect.bottom + 4 + menuHeight < viewportH;
      setMenuPos({
        top: fitsBelow ? rect.bottom + 4 : rect.top - menuHeight - 4,
        left: rect.right - 208, // 208 = menu width (w-52 = 13rem = 208px)
      });
    }
    setOpen((v) => !v);
  };

  const item = (
    label: string,
    onClick: () => void,
    danger = false,
    disabled = false
  ) => (
    <button
      key={label}
      disabled={disabled || loading}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      style={{ color: danger ? "hsl(0, 60%, 60%)" : "hsl(var(--c2))" }}
      onMouseEnter={(e) => {
        if (!disabled && !loading)
          e.currentTarget.style.background = danger
            ? "hsl(0, 60%, 50% / 0.12)"
            : "hsl(var(--b3) / 0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
      }}
    >
      {label}
    </button>
  );

  const divider = (
    <div
      key="div"
      className="h-px my-1"
      style={{ background: "hsl(var(--b4) / 0.4)" }}
    />
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={loading}
        className="p-1.5 rounded-lg cursor-pointer disabled:opacity-40 transition-colors"
        style={{ color: "hsl(var(--c3))" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "hsl(var(--b3) / 0.6)";
          e.currentTarget.style.color = "hsl(var(--c1))";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "";
          e.currentTarget.style.color = "hsl(var(--c3))";
        }}
        title="User actions"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        )}
      </button>

      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-52 z-[100] py-1.5 px-1.5 rounded-xl animate-[solarium_0.15s_var(--ease-spring)]"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              background: "hsl(var(--b5) / 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "var(--card-border), 0 12px 40px hsl(var(--b7) / 0.5)",
            }}
          >
            {/* Role */}
            {item(
              user.role === "admin" ? "Remove Admin" : "Make Admin",
              onSetRole
            )}

            {/* Set password */}
            {item("Set Password…", onSetPassword)}

            {/* Sessions */}
            {item("Revoke All Sessions", onRevokeSessions)}

            {/* Impersonate */}
            {item("Impersonate User", onImpersonate)}

            {divider}

            {/* Ban / Unban */}
            {user.banned
              ? item("Unban User", onUnban)
              : item("Ban User…", onBan, true)}

            {divider}

            {/* Delete */}
            {item("Delete User…", onDelete, true)}
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal] = useState<ActionModal | null>(null);

  // Ban form state
  const [banReason, setBanReason] = useState("");
  const [banExpiry, setBanExpiry] = useState("");
  // Set password form state
  const [newPassword, setNewPassword] = useState("");
  // Create user form state
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"user" | "admin">("user");
  const [createError, setCreateError] = useState("");

  const pageSize = 20;

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadUsers = async (currentPage = page, currentSearch = search) => {
    setIsLoading(true);
    try {
      const query: Record<string, unknown> = {
        limit: pageSize,
        offset: currentPage * pageSize,
        sortBy: "createdAt",
        sortDirection: "desc",
      };
      if (currentSearch.trim()) {
        query.searchBy = "email";
        query.searchValue = currentSearch.trim();
      }
      const res = await authClient.admin.listUsers({
        query: query as Parameters<
          typeof authClient.admin.listUsers
        >[0]["query"],
      });
      if (res.data) {
        setUsers(res.data.users as unknown as User[]);
        setTotal(res.data.total);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page, search);
  }, [page, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setSearch(searchInput);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const withLoading = async (userId: string, fn: () => Promise<void>) => {
    setActionLoading(userId);
    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    await withLoading(user.id, async () => {
      const res = await authClient.admin.setRole({
        userId: user.id,
        role: newRole as "admin" | "user",
      });
      if (res.error) {
        showToast(res.error.message ?? "Failed to update role", false);
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      showToast(
        `${user.name} is now ${
          newRole === "admin" ? "an admin" : "a regular user"
        }`
      );
    });
  };

  const handleBanConfirm = async () => {
    if (!modal || modal.type !== "ban") return;
    const { user } = modal;
    const opts: Record<string, unknown> = { userId: user.id };
    if (banReason.trim()) opts.banReason = banReason.trim();
    if (banExpiry) opts.banExpiresIn = parseInt(banExpiry);
    setModal(null);
    await withLoading(user.id, async () => {
      const res = await authClient.admin.banUser(
        opts as Parameters<typeof authClient.admin.banUser>[0]
      );
      if (res.error) {
        showToast(res.error.message ?? "Failed to ban user", false);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                banned: true,
                banReason: banReason.trim() || "Banned by admin",
              }
            : u
        )
      );
      showToast(`${user.name} has been banned`);
    });
    setBanReason("");
    setBanExpiry("");
  };

  const handleUnban = async (user: User) => {
    await withLoading(user.id, async () => {
      const res = await authClient.admin.unbanUser({ userId: user.id });
      if (res.error) {
        showToast(res.error.message ?? "Failed to unban", false);
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, banned: false, banReason: null } : u
        )
      );
      showToast(`${user.name} has been unbanned`);
    });
  };

  const handleRevokeSessions = async (user: User) => {
    setModal({ type: "revoke", user });
  };

  const handleRevokeConfirm = async () => {
    if (!modal || modal.type !== "revoke") return;
    const { user } = modal;
    setModal(null);
    await withLoading(user.id, async () => {
      const res = await authClient.admin.revokeUserSessions({
        userId: user.id,
      });
      if (res.error) {
        showToast(res.error.message ?? "Failed to revoke sessions", false);
        return;
      }
      showToast(`All sessions for ${user.name} revoked`);
    });
  };

  const handleImpersonate = async (user: User) => {
    await withLoading(user.id, async () => {
      const res = await authClient.admin.impersonateUser({ userId: user.id });
      if (res.error) {
        showToast(res.error.message ?? "Failed to impersonate", false);
        return;
      }
      showToast(`Now impersonating ${user.name} — reload to see their view`);
    });
  };

  const handleDeleteConfirm = async () => {
    if (!modal || modal.type !== "delete") return;
    const { user } = modal;
    setModal(null);
    await withLoading(user.id, async () => {
      const res = await authClient.admin.removeUser({ userId: user.id });
      if (res.error) {
        showToast(res.error.message ?? "Failed to delete user", false);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotal((t) => t - 1);
      showToast(`${user.name} has been permanently deleted`);
    });
  };

  const handleSetPassword = async (user: User, newPassword: string) => {
    await withLoading(user.id, async () => {
      const res = await authClient.admin.setUserPassword({
        userId: user.id,
        newPassword,
      });
      if (res.error) {
        showToast(res.error.message ?? "Failed to set password", false);
        return;
      }
      showToast(`Password updated for ${user.name}`);
    });
  };

  const handleCreateUser = async () => {
    setCreateError("");
    const res = await authClient.admin.createUser({
      name: createName.trim(),
      email: createEmail.trim(),
      password: createPassword,
      role: createRole,
    });
    if (res.error) {
      setCreateError(res.error.message ?? "Failed to create user");
      return;
    }
    if ((res.data as any)?.user) {
      const u = (res.data as any).user;
      const newUser: User = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role ?? createRole,
        banned: false,
        banReason: null,
        reputation: 0,
        createdAt: u.createdAt as unknown as string,
      };
      setUsers((prev) => [newUser, ...prev]);
      setTotal((t) => t + 1);
    }
    setModal(null);
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("user");
    setCreateError("");
    showToast("User created successfully");
  };

  const totalPages = Math.ceil(total / pageSize);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "hsl(var(--c3))" }}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            placeholder="Search by email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-[var(--button-radius)] text-sm placeholder:text-text-muted focus:outline-none transition-all duration-200"
            style={{
              background: "hsl(var(--b4) / 0.4)",
              color: "hsl(var(--c1))",
              boxShadow: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow =
                "inset 0 0 0 1px hsl(var(--h3) / 0.5)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setModal({ type: "create" })}
        >
          Create User
        </Button>
        <p
          className="text-sm shrink-0"
          style={{ color: "hsl(var(--c3))" }}
        >
          {total} user{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="mb-4 px-4 py-2.5 rounded-xl text-sm animate-[solarium_0.2s_var(--ease-spring)]"
          style={{
            background: toast.ok
              ? "hsl(var(--h3) / 0.12)"
              : "hsl(0, 60%, 50% / 0.12)",
            color: toast.ok ? "hsl(var(--h3))" : "hsl(0, 60%, 65%)",
            boxShadow: `inset 0 0 0 1px ${
              toast.ok ? "hsl(var(--h3) / 0.25)" : "hsl(0, 60%, 50% / 0.25)"
            }`,
          }}
        >
          {toast.msg}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p
          className="text-sm text-center py-8"
          style={{ color: "hsl(var(--c3))" }}
        >
          {search ? "No users matching that search." : "No users yet."}
        </p>
      ) : (
        <div className="card !p-0 overflow-hidden">
          {/* Header row */}
          <div
            className="flex items-center gap-4 px-4 py-2 text-xs font-[var(--font-weight-medium)]"
            style={{
              background: "hsl(var(--b4) / 0.35)",
              color: "hsl(var(--c3))",
              borderBottom: "1px solid hsl(var(--b4) / 0.3)",
            }}
          >
            <span className="flex-1">User</span>
            <span className="w-16 text-center">Role</span>
            <span className="w-14 text-center">Rep</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-8" />
          </div>

          {users.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-4 px-4 py-3 transition-colors"
              style={{
                borderTop:
                  index > 0 ? "1px solid hsl(var(--b4) / 0.2)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "hsl(var(--b4) / 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
            >
              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm font-[var(--font-weight-medium)] truncate"
                    style={{ color: "hsl(var(--c1))" }}
                  >
                    {user.name}
                  </p>
                  {user.banned && user.banReason && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-md shrink-0"
                      style={{
                        background: "hsl(0, 60%, 50% / 0.1)",
                        color: "hsl(0, 60%, 60%)",
                      }}
                      title={user.banReason}
                    >
                      {user.banReason.length > 24
                        ? user.banReason.slice(0, 24) + "…"
                        : user.banReason}
                    </span>
                  )}
                </div>
                {/* Email - blurred by default, show on hover */}
                <p
                  className="text-xs truncate group/email"
                  style={{ color: "hsl(var(--c3))" }}
                >
                  <span className="blur-sm group-hover/email:blur-none transition-all cursor-pointer">
                    {user.email}
                  </span>
                </p>
                {/* ID - copyable */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(user.id);
                    }}
                    className="text-[10px] font-mono truncate hover:underline cursor-pointer"
                    style={{ color: "hsl(var(--c3) / 0.7)" }}
                    title="Click to copy full ID"
                  >
                    ID: {user.id.slice(0, 12)}...
                  </button>
                  <span
                    className="text-[10px]"
                    style={{ color: "hsl(var(--c3) / 0.5)" }}
                  >
                    ·
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "hsl(var(--c3) / 0.7)" }}
                  >
                    {formatRelativeTime(user.createdAt)}
                  </span>
                </div>
              </div>

              {/* Role */}
              <div className="w-16 text-center">
                <Badge variant={user.role === "admin" ? "accent" : "muted"}>
                  {user.role || "user"}
                </Badge>
              </div>

              {/* Reputation */}
              <div className="w-14 text-center">
                <span
                  className="text-sm tabular-nums"
                  style={{ color: "hsl(var(--c2))" }}
                >
                  {(user as User & { reputation?: number }).reputation ?? 0}
                </span>
              </div>

              {/* Status */}
              <div className="w-20 text-center">
                {user.banned ? (
                  <Badge>Banned</Badge>
                ) : (
                  <span
                    className="text-xs"
                    style={{ color: "hsl(140, 55%, 60%)" }}
                  >
                    Active
                  </span>
                )}
              </div>

              {/* Actions kebab */}
              <div className="w-8 flex justify-end">
                <UserActionsMenu
                  user={user}
                  loading={actionLoading === user.id}
                  onSetRole={() => handleSetRole(user)}
                  onBan={() => setModal({ type: "ban", user })}
                  onUnban={() => handleUnban(user)}
                  onRevokeSessions={() => handleRevokeSessions(user)}
                  onImpersonate={() => handleImpersonate(user)}
                  onDelete={() => setModal({ type: "delete", user })}
                  onSetPassword={() => setModal({ type: "set-password", user })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm" style={{ color: "hsl(var(--c3))" }}>
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Ban modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === "ban"}
        onClose={() => {
          setModal(null);
          setBanReason("");
          setBanExpiry("");
        }}
        title={`Ban ${modal?.type === "ban" ? modal.user.name : ""}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "hsl(var(--c2))" }}>
            Banned users cannot sign in. You can set an optional reason and
            expiry.
          </p>

          <Input
            label="Reason (optional)"
            placeholder="e.g. Spam, harassment, violation of ToS…"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-[var(--font-weight-medium)]"
              style={{ color: "hsl(var(--c2))" }}
            >
              Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {BAN_EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBanExpiry(opt.value)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                  style={{
                    background:
                      banExpiry === opt.value
                        ? "hsl(var(--h3) / 0.15)"
                        : "hsl(var(--b4) / 0.4)",
                    color:
                      banExpiry === opt.value
                        ? "hsl(var(--h3))"
                        : "hsl(var(--c2))",
                    boxShadow:
                      banExpiry === opt.value
                        ? "inset 0 0 0 1px hsl(var(--h3) / 0.4)"
                        : "none",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="ghost"
              onClick={() => {
                setModal(null);
                setBanReason("");
                setBanExpiry("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBanConfirm}>
              Ban User
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Revoke sessions modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === "revoke"}
        onClose={() => setModal(null)}
        title="Revoke All Sessions"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "hsl(var(--c2))" }}>
            This will immediately sign out{" "}
            <span style={{ color: "hsl(var(--c1))" }}>
              {modal?.type === "revoke" ? modal.user.name : ""}
            </span>{" "}
            from all devices. They will need to sign in again.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeConfirm}>
              Revoke Sessions
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === "delete"}
        onClose={() => setModal(null)}
        title="Delete User"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "hsl(var(--c2))" }}>
            Permanently delete{" "}
            <span style={{ color: "hsl(var(--c1))" }}>
              {modal?.type === "delete" ? modal.user.name : ""}
            </span>
            ? This action cannot be undone. All their data will be removed.
          </p>
          <div
            className="px-3 py-2.5 rounded-xl text-xs"
            style={{
              background: "hsl(0, 60%, 50% / 0.08)",
              color: "hsl(0, 60%, 62%)",
              boxShadow: "inset 0 0 0 1px hsl(0, 60%, 50% / 0.2)",
            }}
          >
            This will permanently delete the account for{" "}
            <strong>{modal?.type === "delete" ? modal.user.email : ""}</strong>.
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Set password modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === "set-password"}
        onClose={() => {
          setModal(null);
          setNewPassword("");
        }}
        title={`Set Password — ${
          modal?.type === "set-password" ? modal.user.name : ""
        }`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "hsl(var(--c2))" }}>
            Set a new password for this user. They can change it after signing
            in.
          </p>
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setModal(null);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={newPassword.length < 8}
              onClick={async () => {
                if (modal?.type !== "set-password") return;
                const user = modal.user;
                setModal(null);
                await handleSetPassword(user, newPassword);
                setNewPassword("");
              }}
            >
              Set Password
            </Button>
          </div>
        </div>
      </Modal>
      {/* ── Create user modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={modal?.type === "create"}
        onClose={() => {
          setModal(null);
          setCreateName("");
          setCreateEmail("");
          setCreatePassword("");
          setCreateRole("user");
          setCreateError("");
        }}
        title="Create User"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            placeholder="Full name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            autoComplete="off"
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            autoComplete="off"
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            autoComplete="new-password"
          />

          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-[var(--font-weight-medium)]"
              style={{ color: "hsl(var(--c2))" }}
            >
              Role
            </label>
            <div className="flex gap-2">
              {(["user", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCreateRole(r)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer capitalize"
                  style={{
                    background:
                      createRole === r
                        ? "hsl(var(--h3) / 0.15)"
                        : "hsl(var(--b4) / 0.4)",
                    color:
                      createRole === r
                        ? "hsl(var(--h3))"
                        : "hsl(var(--c2))",
                    boxShadow:
                      createRole === r
                        ? "inset 0 0 0 1px hsl(var(--h3) / 0.4)"
                        : "none",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {createError && (
            <p className="text-xs" style={{ color: "hsl(0, 60%, 65%)" }}>
              {createError}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="ghost"
              onClick={() => {
                setModal(null);
                setCreateName("");
                setCreateEmail("");
                setCreatePassword("");
                setCreateRole("user");
                setCreateError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={
                !createName.trim() ||
                !createEmail.trim() ||
                createPassword.length < 8
              }
              onClick={handleCreateUser}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
