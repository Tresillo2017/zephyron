import { useState, useEffect } from 'react'
import { generateInviteCode, fetchInviteCodes, revokeInviteCode } from '../../lib/api'
import { Input, Table, THead, TBody, Tr, Th, Td } from '../bleh'
import { formatRelativeTime } from '../../lib/formatTime'
import { AdminBadge, AdminButton, cellMono, cellMuted } from './adminUi'

interface InviteCode {
  id: string
  code: string
  max_uses: number
  used_count: number
  expires_at: string | null
  note: string | null
  created_at: string
}

function codeStatus(code: InviteCode): { label: string; tone: 'success' | 'accent' | 'neutral' } {
  if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: 'Expired', tone: 'neutral' }
  if (code.max_uses > 0 && code.used_count >= code.max_uses) return { label: 'Fully Used', tone: 'accent' }
  return { label: 'Active', tone: 'success' }
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
    <div className="flex flex-col gap-4">
      {/* Generate form */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <Input
            label="Max uses"
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <Input
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For whom?"
          />
        </div>
        <AdminButton variant="primary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? '...' : 'Generate Code'}
        </AdminButton>
      </div>

      {/* Code list */}
      {isLoading ? (
        <p className={cellMuted}>Loading...</p>
      ) : codes.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">No invite codes yet.</p>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Code</Th>
              <Th>Note</Th>
              <Th>Usage</Th>
              <Th>Created</Th>
              <Th>Status</Th>
              <Th className="w-0"><span className="sr-only">Actions</span></Th>
            </Tr>
          </THead>
          <TBody>
            {codes.map((code) => {
              const status = codeStatus(code)
              return (
                <Tr key={code.id}>
                  <Td className={cellMono}>{code.code}</Td>
                  <Td className="max-w-[260px] truncate text-[13px]">{code.note ?? <span className="text-muted">—</span>}</Td>
                  <Td className={cellMuted + ' tabular-nums'}>{code.used_count}/{code.max_uses}</Td>
                  <Td className={cellMuted}>{formatRelativeTime(code.created_at)}</Td>
                  <Td><AdminBadge tone={status.tone}>{status.label}</AdminBadge></Td>
                  <Td className="text-right">
                    <AdminButton variant="danger" size="sm" onClick={() => handleRevoke(code.id)}>
                      Revoke
                    </AdminButton>
                  </Td>
                </Tr>
              )
            })}
          </TBody>
        </Table>
      )}
    </div>
  )
}
