import { useState, useEffect } from 'react'
import { generateInviteCode, fetchInviteCodes, revokeInviteCode } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { formatRelativeTime } from '../../lib/formatTime'

interface InviteCode {
  id: string
  code: string
  max_uses: number
  used_count: number
  expires_at: string | null
  note: string | null
  created_at: string
}

export function InviteCodesTab() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [maxUses, setMaxUses] = useState('1')
  const [note, setNote] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const loadCodes = () => {
    setIsLoading(true)
    fetchInviteCodes()
      .then((res) => setCodes(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadCodes() }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await generateInviteCode({
        max_uses: parseInt(maxUses) || 1,
        note: note.trim() || undefined,
      })
      setNote('')
      loadCodes()
    } catch {
      // silent
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeInviteCode(id)
      setCodes((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // silent
    }
  }

  return (
    <div>
      {/* Generate form */}
      <div className="flex gap-3 items-end mb-6">
        <Input
          label="Max uses"
          type="number"
          min={1}
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          className="w-24"
        />
        <Input
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For whom?"
          className="flex-1"
        />
        <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? '...' : 'Generate Code'}
        </Button>
      </div>

      {/* Code list */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">No invite codes yet.</p>
      ) : (
        <div className="card !p-0 overflow-hidden">
          {codes.map((code, i) => {
            const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
            const isFullyUsed = code.max_uses > 0 && code.used_count >= code.max_uses

            return (
              <div
                key={code.id}
                className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? '' : ''}`}
              >
                <span className="font-mono text-sm text-accent font-bold tracking-wider w-24">
                  {code.code}
                </span>
                <div className="flex-1 min-w-0">
                  {code.note && <p className="text-xs text-text-secondary truncate">{code.note}</p>}
                  <p className="text-xs text-text-muted">
                    {code.used_count}/{code.max_uses} used · {formatRelativeTime(code.created_at)}
                  </p>
                </div>
                {isExpired && <Badge>Expired</Badge>}
                {isFullyUsed && <Badge variant="accent">Fully Used</Badge>}
                {!isExpired && !isFullyUsed && <Badge variant="accent">Active</Badge>}
                <button
                  onClick={() => handleRevoke(code.id)}
                  className="text-xs text-text-muted hover:text-danger transition-colors"
                >
                  Revoke
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
