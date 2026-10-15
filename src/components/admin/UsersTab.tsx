import { useState, useEffect, useCallback } from "react";
import { authClient } from "../../lib/auth-client";
import { formatRelativeTime } from "../../lib/formatTime";
import { DeleteFilled, Key1Filled, MailFilled, Search2Filled, ShieldFilled, UserForbidFilled, UserAdd2Filled } from "@mingcute/react/core-filled";
import { Input, Table, THead, TBody, Tr, Th, Td, Pagination, Skeleton, InlineAlert, Card } from "../bleh";
import { inputClass } from "../bleh/ui/inputClass";
import { AdminBadge, AdminButton, AdminModal, RowMenu, type RowMenuItem } from "./adminUi";

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

const PAGE_SIZE = 20;

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
  const [isCreating, setIsCreating] = useState(false);

  const pageSize = PAGE_SIZE;

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
    setIsCreating(true);
    try {
      const res = await authClient.admin.createUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        data: { skip_invite_check: true },
      });
      if (res.error) {
        setCreateError(res.error.message ?? "Failed to create user");
        return;
      }
      if ((res.data as any)?.user) {
        const newUser: User = {
          id: (res.data as any).user.id,
          name: (res.data as any).user.name,
          email: (res.data as any).user.email,
          role: (res.data as any).user.role ?? createRole,
          banned: false,
          banReason: null,
          reputation: 0,
          createdAt: (res.data as any).user.createdAt as unknown as string,
        };
        setUsers((prev) => [newUser, ...prev]);
        setTotal((t) => t + 1);
        setModal(null);
        setCreateName("");
        setCreateEmail("");
        setCreatePassword("");
        setCreateRole("user");
        setCreateError("");
        showToast("User created successfully");
      } else {
        setCreateError("User created but response was unexpected. Refresh to see changes.");
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const closeBan = () => {
    setModal(null);
    setBanReason("");
    setBanExpiry("");
  };

  const closeCreate = () => {
    setModal(null);
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("user");
    setCreateError("");
  };

  const menuFor = (user: User): RowMenuItem[] => [
    { label: user.role === "admin" ? "Remove Admin" : "Make Admin", icon: <ShieldFilled />, onSelect: () => handleSetRole(user) },
    { label: "Set Password…", icon: <Key1Filled />, onSelect: () => setModal({ type: "set-password", user }) },
    { label: "Revoke All Sessions", icon: <MailFilled />, onSelect: () => handleRevokeSessions(user) },
    { label: "Impersonate User", onSelect: () => handleImpersonate(user) },
    { type: "separator" },
    user.banned
      ? { label: "Unban User", icon: <UserForbidFilled />, onSelect: () => handleUnban(user) }
      : { label: "Ban User…", icon: <UserForbidFilled />, tone: "danger", onSelect: () => setModal({ type: "ban", user }) },
    { type: "separator" },
    { label: "Delete User…", icon: <DeleteFilled />, tone: "danger", onSelect: () => setModal({ type: "delete", user }) },
  ];

  const totalPages = Math.ceil(total / pageSize);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs flex-1">
          <Search2Filled size={14} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search users by email"
            placeholder="Search by email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={inputClass + " pl-9"}
          />
        </div>
        <AdminButton size="sm" variant="primary" onClick={() => setModal({ type: "create" })}>
          <UserAdd2Filled />
          Create User
        </AdminButton>
        <p className="shrink-0 text-[13px] text-muted tabular-nums">
          {total} user{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <InlineAlert tone={toast.ok ? "success" : "error"}>{toast.msg}</InlineAlert>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={40} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">
          {search ? "No users matching that search." : "No users yet."}
        </p>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>User</Th>
              <Th className="w-20 text-center">Role</Th>
              <Th className="w-16 text-center">Rep</Th>
              <Th className="w-24 text-center">Status</Th>
              <Th className="w-10"><span className="sr-only">Actions</span></Th>
            </Tr>
          </THead>
          <TBody>
            {users.map((user) => (
              <Tr key={user.id}>
                {/* User info */}
                <Td className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-heading">{user.name}</span>
                    {user.banned && user.banReason && (
                      <AdminBadge tone="error" className="shrink-0" >
                        <span title={user.banReason}>
                          {user.banReason.length > 24 ? user.banReason.slice(0, 24) + "…" : user.banReason}
                        </span>
                      </AdminBadge>
                    )}
                  </div>
                  {/* Email - blurred by default, show on hover */}
                  <p className="group/email truncate text-[12px] text-muted">
                    <span className="cursor-pointer transition-all blur-sm group-hover/email:blur-none">
                      {user.email}
                    </span>
                  </p>
                  {/* ID - copyable */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(user.id);
                      }}
                      className="cursor-pointer truncate font-mono text-[11px] hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 rounded-sm"
                      title="Click to copy full ID"
                    >
                      ID: {user.id.slice(0, 12)}...
                    </button>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(user.createdAt)}</span>
                  </div>
                </Td>

                {/* Role */}
                <Td className="text-center">
                  <AdminBadge variant={user.role === "admin" ? "accent" : "muted"}>
                    {user.role || "user"}
                  </AdminBadge>
                </Td>

                {/* Reputation */}
                <Td className="text-center text-[13px] tabular-nums text-text">
                  {(user as User & { reputation?: number }).reputation ?? 0}
                </Td>

                {/* Status */}
                <Td className="text-center">
                  {user.banned ? (
                    <AdminBadge tone="neutral">Banned</AdminBadge>
                  ) : (
                    <span className="text-[12px] text-success">Active</span>
                  )}
                </Td>

                {/* Actions menu */}
                <Td className="text-right">
                  <RowMenu
                    label={`Actions for ${user.name}`}
                    disabled={actionLoading === user.id}
                    items={menuFor(user)}
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
      )}

      {/* ── Ban modal ─────────────────────────────────────────────────────── */}
      <AdminModal
        isOpen={modal?.type === "ban"}
        onClose={closeBan}
        title={`Ban ${modal?.type === "ban" ? modal.user.name : ""}`}
        footer={
          <>
            <AdminButton variant="ghost" onClick={closeBan}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={handleBanConfirm}>Ban User</AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-text">
            Banned users cannot sign in. You can set an optional reason and expiry.
          </p>

          <Input
            label="Reason (optional)"
            placeholder="e.g. Spam, harassment, violation of ToS…"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <span className="ui-field-label">Duration</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ban duration">
              {BAN_EXPIRY_OPTIONS.map((opt) => (
                <AdminButton
                  key={opt.value}
                  size="sm"
                  role="radio"
                  aria-checked={banExpiry === opt.value}
                  variant={banExpiry === opt.value ? "primary" : "secondary"}
                  onClick={() => setBanExpiry(opt.value)}
                >
                  {opt.label}
                </AdminButton>
              ))}
            </div>
          </div>
        </div>
      </AdminModal>

      {/* ── Revoke sessions modal ─────────────────────────────────────────── */}
      <AdminModal
        isOpen={modal?.type === "revoke"}
        onClose={() => setModal(null)}
        title="Revoke All Sessions"
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setModal(null)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={handleRevokeConfirm}>Revoke Sessions</AdminButton>
          </>
        }
      >
        <p className="text-[13px] text-text">
          This will immediately sign out{" "}
          <span className="text-heading">{modal?.type === "revoke" ? modal.user.name : ""}</span>{" "}
          from all devices. They will need to sign in again.
        </p>
      </AdminModal>

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      <AdminModal
        isOpen={modal?.type === "delete"}
        onClose={() => setModal(null)}
        title="Delete User"
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setModal(null)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={handleDeleteConfirm}>Delete Permanently</AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-text">
            Permanently delete{" "}
            <span className="text-heading">{modal?.type === "delete" ? modal.user.name : ""}</span>
            ? This action cannot be undone. All their data will be removed.
          </p>
          <Card padded={false} className="px-3 py-2.5 text-[12px] text-error shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--error),transparent_70%)]">
            This will permanently delete the account for{" "}
            <strong>{modal?.type === "delete" ? modal.user.email : ""}</strong>.
          </Card>
        </div>
      </AdminModal>

      {/* ── Set password modal ────────────────────────────────────────────── */}
      <AdminModal
        isOpen={modal?.type === "set-password"}
        onClose={() => {
          setModal(null);
          setNewPassword("");
        }}
        title={`Set Password — ${modal?.type === "set-password" ? modal.user.name : ""}`}
        footer={
          <>
            <AdminButton
              variant="ghost"
              onClick={() => {
                setModal(null);
                setNewPassword("");
              }}
            >
              Cancel
            </AdminButton>
            <AdminButton
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
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-text">
            Set a new password for this user. They can change it after signing in.
          </p>
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </AdminModal>

      {/* ── Create user modal ─────────────────────────────────────────────── */}
      <AdminModal
        isOpen={modal?.type === "create"}
        onClose={closeCreate}
        title="Create User"
        footer={
          <>
            <AdminButton variant="ghost" onClick={closeCreate}>Cancel</AdminButton>
            <AdminButton
              variant="primary"
              disabled={
                !createName.trim() ||
                !createEmail.trim() ||
                createPassword.length < 8 ||
                isCreating
              }
              onClick={handleCreateUser}
            >
              {isCreating ? "Creating…" : "Create User"}
            </AdminButton>
          </>
        }
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
            <span className="ui-field-label">Role</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Role">
              {(["user", "admin"] as const).map((r) => (
                <AdminButton
                  key={r}
                  size="sm"
                  role="radio"
                  aria-checked={createRole === r}
                  variant={createRole === r ? "primary" : "secondary"}
                  onClick={() => setCreateRole(r)}
                  className="capitalize"
                >
                  {r}
                </AdminButton>
              ))}
            </div>
          </div>

          {createError && (
            <InlineAlert tone="error">{createError}</InlineAlert>
          )}
        </div>
      </AdminModal>
    </div>
  );
}
