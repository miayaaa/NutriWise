"use client"

import * as React from "react"

import type { getDashboardData } from "@/lib/api/dashboard"
import type { getFoodHistory } from "@/lib/api/history"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityList } from "@/components/activity/activity-list"
import { logColumns } from "@/components/activity/logs/logs-columns"
import { LineChartComponent } from "@/components/charts/linechart"
import { PieChartComponent } from "@/components/charts/piechart"
import { DataTable } from "@/components/data-table"
import { DashboardCards } from "@/components/pages/dashboard/dashboard-cards"
import { FoodHistoryView } from "@/components/pages/dashboard/food-history-view"

type Tab = "analytics" | "history"

interface AnalyticsTabsProps {
  dashboardData: Awaited<ReturnType<typeof getDashboardData>>
  searchParams: { from: string; to: string }
  history: Awaited<ReturnType<typeof getFoodHistory>>
}

export function AnalyticsTabs({ dashboardData, searchParams, history }: AnalyticsTabsProps) {
  const [tab, setTab] = React.useState<Tab>("analytics")

  const activityData =
    dashboardData.activityCountByDate.length > 0 &&
    dashboardData.topActivities.length > 0

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex w-fit gap-1 rounded-full bg-muted p-1">
        {(["analytics", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "analytics" && (
        <>
          {activityData ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ScrollArea className="h-[17rem] rounded-lg border">
                <div className="divide-y divide-border">
                  <ActivityList activities={dashboardData.userActivities} />
                </div>
              </ScrollArea>
              <DashboardCards data={dashboardData} searchParams={searchParams} />
              <LineChartComponent data={dashboardData.activityCountByDate} />
              <PieChartComponent data={dashboardData.topActivities} />
            </div>
          ) : (
            <ScrollArea className="h-[25.1rem] rounded-lg border">
              <div className="divide-y divide-border">
                <ActivityList activities={dashboardData.userActivities} />
              </div>
            </ScrollArea>
          )}
          <DataTable columns={logColumns} data={dashboardData.logs}>
            Log History
          </DataTable>
        </>
      )}

      {tab === "history" && <FoodHistoryView history={history} />}
    </div>
  )
}
