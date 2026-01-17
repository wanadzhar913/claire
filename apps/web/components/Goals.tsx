"use client"

import * as React from "react"
import { Target } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type GoalStatus = "on-track" | "behind"

type Goal = {
  id: string
  name: string
  target: number
  current: number
  deadline: string | null
  status: GoalStatus
  nextAction: string
}

const mockGoals: Goal[] = [
  {
    id: "vacation",
    name: "Japan trip",
    target: 6_000,
    current: 1_200,
    deadline: "Dec 2026",
    status: "behind",
    nextAction: "Increase monthly contribution by MYR 300.",
  },
  {
    id: "emergency",
    name: "Emergency fund",
    target: 15_000,
    current: 8_500,
    deadline: null,
    status: "on-track",
    nextAction: "Add MYR 500 to reach 60% milestone.",
  },
]

function formatMYR(value: number) {
  return `MYR ${value.toLocaleString("en-MY")}`
}

export interface GoalsProps {
  onAction?: () => void
}

export function Goals({ onAction }: GoalsProps) {
  const goals = mockGoals.slice(0, 2)
  const hasGoals = goals.length > 0

  return (
    <Card className="w-full border shadow-lg bg-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold">Goals</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {hasGoals ? `Tracking ${goals.length} active goals` : "What is my active goal?"}
            </p>
          </div>

          {!hasGoals && (
            <Badge variant="outline" className="shrink-0">
              No goal
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {hasGoals ? (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progressPct = Math.round((goal.current / goal.target) * 100)
              const statusLabel = goal.status === "behind" ? "Behind" : "On track"
              const statusClass =
                goal.status === "behind"
                  ? "bg-amber-100 text-amber-900 border-amber-200"
                  : "bg-emerald-100 text-emerald-900 border-emerald-200"

              return (
                <div key={goal.id} className="p-3 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium truncate">{goal.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {goal.deadline ?? "No deadline"} · {formatMYR(goal.target)}
                      </p>
                    </div>
                    <Badge className={cn("shrink-0", statusClass)}>{statusLabel}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <p className="text-xs font-medium">{progressPct}%</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-background">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          goal.status === "behind" ? "bg-amber-500" : "bg-primary"
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatMYR(goal.current)} / {formatMYR(goal.target)}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">{goal.nextAction}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">No active goal yet.</p>
            <p className="text-xs text-muted-foreground">
              Create a goal to track progress and get next-step suggestions.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button className="w-full" onClick={onAction}>
          {hasGoals ? "View all plans" : "Create a goal"}
        </Button>
      </CardFooter>
    </Card>
  )
}
