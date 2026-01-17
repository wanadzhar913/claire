"use client"

import { useState } from "react"
import Image from "next/image"
import { LayoutGrid, List as ListIcon, Plus, Target } from "lucide-react"

import { Goals } from "@/components/Goals"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockGoals, formatMYR, type Goal } from "@/lib/goals-data"
import { cn } from "@/lib/utils"

export default function GoalsPage() {
  const [view, setView] = useState<"grid" | "list">("grid")

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-2">
            Track your financial goals and progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
          <Button size="sm" className="h-10 gap-2">
            <Plus className="h-6 w-4" />
            Add Goal
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <Goals goals={mockGoals} onAction={() => console.log("Goal action clicked")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const progressPct = Math.round((goal.current / goal.target) * 100)
  const statusLabel = goal.status === "behind" ? "Behind" : "On track"
  const statusClass =
    goal.status === "behind"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-emerald-100 text-emerald-900 border-emerald-200"

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-md">
      <div className="h-42 bg-muted/30 w-full relative group overflow-hidden rounded-t-4xl">
        {goal.imageUrl ? (
          <Image
            src={goal.imageUrl}
            alt={goal.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105 rounded-t-4xl"
          />
        ) : (
          <div className="absolute border-2 border-red-inset-0 flex items-center justify-center text-muted-foreground/10 group-hover:text-muted-foreground/20 transition-colors rounded-xl">
            <Target className="h-16 w-16" />
          </div>
        )}
        <div className="absolute top-3 right-3 z-10">
          <Badge className={cn("font-normal shadow-sm", statusClass)} variant="outline">
            {statusLabel}
          </Badge>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg leading-tight">{goal.name}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {goal.deadline ? `Target: ${goal.deadline}` : "No target/deadline"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium text-xs">Progress</span>
            <span className="font-bold text-xs">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                goal.status === "behind" ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <span className="font-medium text-foreground">{formatMYR(goal.current)}</span>
            <span>of {formatMYR(goal.target)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" className="w-full h-8 text-xs">
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
