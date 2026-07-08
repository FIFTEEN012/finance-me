import {
  DashboardHeroData,
  DashboardSummaryItem,
  WeeklyOverviewDay,
  BudgetQuestItem,
  RecentQuestTransaction,
  LevelProgressData,
  DailyQuestData,
  PaydayMiniData,
  RewardBadgeItem,
} from './forestDashboard'
import { DashboardHeroMission } from './DashboardHeroMission'
import { DashboardSummaryCard } from './DashboardSummaryCard'
import { WeeklyOverviewCard } from './WeeklyOverviewCard'
import { BudgetQuestCard } from './BudgetQuestCard'
import { RecentTransactionQuestCard } from './RecentTransactionQuestCard'
import { LevelProgressCard } from './LevelProgressCard'
import { DailyQuestCard } from './DailyQuestCard'
import { PaydayMiniCard } from './PaydayMiniCard'
import { RewardBadgeGrid } from './RewardBadgeGrid'

interface DashboardForestBoardProps {
  hero: DashboardHeroData
  summaryItems: DashboardSummaryItem[]
  weeklyDays: WeeklyOverviewDay[]
  budgetItems: BudgetQuestItem[]
  recentTransactions: RecentQuestTransaction[]
  levelProgress: LevelProgressData
  dailyQuest: DailyQuestData
  payday: PaydayMiniData
  rewardBadges: RewardBadgeItem[]
  onOpenQuickAdd: () => void
}

export function DashboardForestBoard({
  hero,
  summaryItems,
  weeklyDays,
  budgetItems,
  recentTransactions,
  levelProgress,
  dailyQuest,
  payday,
  rewardBadges,
  onOpenQuickAdd,
}: DashboardForestBoardProps) {
  return (
    <div className="w-full font-quest-body">
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-8 lg:space-y-6">
          <DashboardHeroMission hero={hero} />

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
            {summaryItems.map((item) => (
              <DashboardSummaryCard key={item.id} item={item} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
            <WeeklyOverviewCard days={weeklyDays} />
            <BudgetQuestCard items={budgetItems} />
          </section>

          <RecentTransactionQuestCard transactions={recentTransactions} />
        </div>

        <aside className="col-span-12 space-y-4 lg:col-span-4 lg:space-y-6">
          <LevelProgressCard progress={levelProgress} />
          <DailyQuestCard quest={dailyQuest} onAction={dailyQuest.ctaHref ? undefined : onOpenQuickAdd} />
          <PaydayMiniCard payday={payday} />
          <RewardBadgeGrid badges={rewardBadges} />
        </aside>
      </div>
    </div>
  )
}
