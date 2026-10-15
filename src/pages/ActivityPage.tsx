import { ActivityFeed } from '../components/activity/ActivityFeed'
import { ContentCard, Section, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import './library.css'

export function ActivityPage() {
  return (
    <PageFrame>
      <ContentCard
        toolbar={<Toolbar><h1 className="zl-toolbar-title">My Activity</h1></Toolbar>}
        main={
          <Section>
            <ActivityFeed feed="me" showLoadMore />
          </Section>
        }
      />
    </PageFrame>
  )
}
