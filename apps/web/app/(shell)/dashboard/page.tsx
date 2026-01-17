"use client"

import { SankeyDiagram } from "@/components/SankeyDiagram"
import { Subscriptions } from "@/components/subscriptions"
import { Goals } from "@/components/Goals"
import { Summary } from "@/components/Summary"

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6 min-w-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your financial activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-6 min-w-0">
          <SankeyDiagram height={500} className="w-full" />
          <Subscriptions className="w-full" showFlaggedReview={false} />
        </div>

        {/* Right Column */}
        <div className="md:col-span-1 flex flex-col gap-6 min-w-0">
          <Summary 
            className="shrink-0"
            onClose={() => console.log("Close clicked")}
            onViewDetails={() => console.log("View details clicked")}
          />
          <Goals className="flex-1" onAction={() => console.log("Goal action clicked")} />
        </div>
      </div>
    </div>
  )
}
