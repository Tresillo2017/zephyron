import { ActivityFeed } from '../components/activity/ActivityFeed'

export function ActivityPage() {
  return (
    <div className="px-6 lg:px-10 py-6">
      <h1
        className="text-3xl font-[var(--font-weight-bold)] mb-6"
        style={{ color: 'hsl(var(--c1))' }}
      >
        My Activity
      </h1>

      <ActivityFeed feed="me" showLoadMore />
    </div>
  )
}
