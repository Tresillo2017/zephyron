import { ActivityFeed } from '../components/activity/ActivityFeed'
import { ContentCard, Section, Toolbar } from '../components/bleh'
import { PageFrame } from '../components/shell'
import './library.css'

export function CommunityPage() {
  return (
    <PageFrame>
      <ContentCard
        toolbar={<Toolbar><h1 className="zl-toolbar-title">Community Activity</h1></Toolbar>}
        main={
          <Section>
            <ActivityFeed feed="community" showLoadMore />
          </Section>
        }
      />
    </PageFrame>
  )
}
