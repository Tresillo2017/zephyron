import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { formatRelativeTime } from '../../lib/formatTime'

interface User {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  reputation?: number
  totalAnnotations?: number
  totalVotes?: number
  createdAt: string
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const pageSize = 20

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await authClient.admin.listUsers({
        query: {
          limit: pageSize,
          offset: page * pageSize,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        },
      })
      if (res.data) {
        setUsers(res.data.users as unknown as User[])
        setTotal(res.data.total)
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [page])

  const handleSetRole = async (userId: string, newRole: string) => {
    setActionLoading(userId)
    try {
      await authClient.admin.setRole({ userId, role: newRole as 'admin' | 'user' })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const handleBan = async (userId: string) => {
    setActionLoading(userId)
    try {
      await authClient.admin.banUser({ userId, banReason: 'Banned by admin' })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned: true } : u))
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnban = async (userId: string) => {
    setActionLoading(userId)
    try {
      await authClient.admin.unbanUser({ userId })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned: false } : u))
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-muted">{total} user{total !== 1 ? 's' : ''} total</p>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">No users yet.</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-2 bg-surface-overlay text-xs text-text-muted font-medium">
            <span className="flex-1">User</span>
            <span className="w-20 text-center">Role</span>
            <span className="w-16 text-center">Rep</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-40 text-right">Actions</span>
          </div>

          {users.map((user, index) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 px-4 py-3 ${index > 0 ? 'border-t border-border' : 'border-t border-border'}`}
            >
              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
                <p className="text-[10px] text-text-muted">{formatRelativeTime(user.createdAt)}</p>
              </div>

              {/* Role */}
              <div className="w-20 text-center">
                <Badge variant={user.role === 'admin' ? 'accent' : 'muted'}>
                  {user.role || 'user'}
                </Badge>
              </div>

              {/* Reputation */}
              <div className="w-16 text-center">
                <span className="text-sm text-text-secondary">{(user as any).reputation ?? 0}</span>
              </div>

              {/* Status */}
              <div className="w-20 text-center">
                {user.banned ? (
                  <Badge>Banned</Badge>
                ) : (
                  <span className="text-xs text-success">Active</span>
                )}
              </div>

              {/* Actions */}
              <div className="w-40 flex gap-1 justify-end flex-shrink-0">
                {user.role !== 'admin' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetRole(user.id, 'admin')}
                    disabled={actionLoading === user.id}
                  >
                    Make Admin
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetRole(user.id, 'user')}
                    disabled={actionLoading === user.id}
                  >
                    Remove Admin
                  </Button>
                )}
                {user.banned ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnban(user.id)}
                    disabled={actionLoading === user.id}
                  >
                    Unban
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleBan(user.id)}
                    disabled={actionLoading === user.id}
                  >
                    Ban
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <Button size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
