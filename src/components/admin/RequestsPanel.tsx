import type { SourceRequest, SetRequest } from '../../lib/api'
import { AdminBadge, AdminButton, safeUrl } from './adminUi'

export interface RequestsPanelProps {
  requestsTab: 'source' | 'sets'
  onRequestsTabChange: (tab: 'source' | 'sets') => void
  sourceRequests: SourceRequest[]
  setRequests: SetRequest[]
  loading: boolean
  actionMsg: string | null
  onDismissMsg: () => void
  onRefresh: () => void
  onSourceApprove: (id: string) => void
  onSourceReject: (id: string) => void
  onSetApprove: (id: string) => void
  onSetReject: (id: string) => void
}

/** Pending source/set requests from users, with approve and reject actions. */
export function RequestsPanel(props: RequestsPanelProps) {
  const { requestsTab, onRequestsTabChange, sourceRequests, setRequests, loading, actionMsg, onDismissMsg, onRefresh } = props
  return (
    <div className="overflow-hidden rounded-card shadow-inset">
      <div className="flex items-center gap-1 border-b border-b4/20 bg-b4/40 px-2">
        <TabButton active={requestsTab === 'source'} onClick={() => onRequestsTabChange('source')} count={sourceRequests.length}>
          Source Requests
        </TabButton>
        <TabButton active={requestsTab === 'sets'} onClick={() => onRequestsTabChange('sets')} count={setRequests.length}>
          Set Requests
        </TabButton>
        <div className="ml-auto py-1.5">
          <AdminButton variant="ghost" size="sm" onClick={onRefresh}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </AdminButton>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 text-[12px] text-accent-2">
          <span>{actionMsg}</span>
          <button
            type="button"
            onClick={onDismissMsg}
            aria-label="Dismiss message"
            className="ml-auto rounded-sm px-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2"
          >
            ×
          </button>
        </div>
      )}

      <div className="max-h-[600px] overflow-y-auto">
        {requestsTab === 'source' ? (
          <SourceRequestList requests={sourceRequests} onApprove={props.onSourceApprove} onReject={props.onSourceReject} />
        ) : (
          <SetRequestList requests={setRequests} onApprove={props.onSetApprove} onReject={props.onSetReject} />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2',
        active ? 'border-accent-2 text-accent-2' : 'border-transparent text-muted hover:text-text',
      ].join(' ')}
    >
      {children}
      {count > 0 && <AdminBadge variant="accent">{count}</AdminBadge>}
    </button>
  )
}

function RequestEmpty({ text }: { text: string }) {
  return <p className="py-12 text-center text-[13px] text-muted">{text}</p>
}

function ExternalLink({ url }: { url: string }) {
  const href = safeUrl(url)
  const label = url.length > 60 ? url.slice(0, 60) + '…' : url
  if (!href) return <span>{label}</span>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-2 hover:underline">
      {label}
    </a>
  )
}

function SourceRequestList({ requests, onApprove, onReject }: { requests: SourceRequest[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  if (requests.length === 0) return <RequestEmpty text="No pending source requests" />
  return (
    <>
      {requests.map((req) => (
        <div key={req.id} className="flex items-start gap-3 border-b border-b4/20 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-heading">{req.set_title} — {req.set_artist}</p>
            <p className="mt-0.5 truncate text-[12px] text-muted">
              <span className="mr-1 font-mono uppercase">{req.source_type}</span>
              <ExternalLink url={req.source_url} />
            </p>
            {req.user_name && <p className="mt-0.5 text-[12px] text-muted">by {req.user_name}</p>}
            {req.notes && <p className="mt-1 text-[12px] italic text-muted">{req.notes}</p>}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <AdminButton size="sm" onClick={() => onApprove(req.id)}>Apply</AdminButton>
            <AdminButton variant="danger" size="sm" onClick={() => onReject(req.id)}>Reject</AdminButton>
          </div>
        </div>
      ))}
    </>
  )
}

function SetRequestList({ requests, onApprove, onReject }: { requests: SetRequest[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  if (requests.length === 0) return <RequestEmpty text="No pending set requests" />
  return (
    <>
      {requests.map((req) => (
        <div key={req.id} className="flex items-start gap-3 border-b border-b4/20 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-heading">{req.artist} — {req.title}</p>
            {req.source_url && (
              <p className="mt-0.5 truncate text-[12px] text-muted">
                <span className="mr-1 font-mono uppercase">{req.source_type}</span>
                <ExternalLink url={req.source_url} />
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {req.event && <AdminBadge variant="muted">{req.event}</AdminBadge>}
              {req.genre && <AdminBadge variant="muted">{req.genre}</AdminBadge>}
              {req.user_name && <span className="text-[12px] text-muted">by {req.user_name}</span>}
            </div>
            {req.notes && <p className="mt-1 text-[12px] italic text-muted">{req.notes}</p>}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <AdminButton size="sm" onClick={() => onApprove(req.id)}>Approve</AdminButton>
            <AdminButton variant="danger" size="sm" onClick={() => onReject(req.id)}>Reject</AdminButton>
          </div>
        </div>
      ))}
    </>
  )
}
