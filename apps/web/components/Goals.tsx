"use client"

import * as React from "react"
import { Target } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMYR, type Goal, type GoalStatus } from "@/lib/goals-data"
import { useApi } from "@/hooks/use-api"

export interface GoalsProps {
  onAction?: () => void
  goals?: Goal[]
  className?: string
}

export function Goals({ onAction, goals: customGoals, className }: GoalsProps) {
  const router = useRouter()
  const { get, isLoaded, isSignedIn } = useApi()

  const [goals, setGoals] = React.useState<Goal[]>(customGoals ?? [])
  const [loading, setLoading] = React.useState<boolean>(!customGoals)
  const [error, setError] = React.useState<string | null>(null)

  const isUsingCustomGoals = Array.isArray(customGoals)

  React.useEffect(() => {
    if (isUsingCustomGoals) {
      setGoals(customGoals ?? [])
      setLoading(false)
      setError(null)
      return
    }

    if (!isLoaded) return
    if (!isSignedIn) {
      setGoals([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function loadDashboardGoals() {
      setLoading(true)
      setError(null)
      try {
        const result = await get<BackendGoal[]>(`/api/v1/goals?limit=2`)
        if (cancelled) return
        const mapped = result.map(mapBackendGoalToUi).slice(0, 2)
        setGoals(mapped)
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : "Failed to load goals"
        setError(message)
        setGoals([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDashboardGoals()

    return () => {
      cancelled = true
    }
  }, [customGoals, get, isLoaded, isSignedIn, isUsingCustomGoals])

  const hasGoals = goals.length > 0
  const showDashboardCta = !isUsingCustomGoals

  const handleCtaClick = () => {
    if (isUsingCustomGoals) {
      onAction?.()
      return
    }
    router.push("/goals")
  }

  return (
    <Card className={cn("w-full border shadow-lg bg-background", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold">Goals</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {loading
                ? "Loading goals…"
                : hasGoals
                  ? `Tracking ${goals.length} active goals`
                  : "No goals yet"}
            </p>
          </div>

          {!loading && !hasGoals && (
            <Badge variant="outline" className="shrink-0">
              No goal
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        {!!error && !hasGoals && (
          <p className="text-xs text-destructive">Failed to load goals: {error}</p>
        )}

        {!loading && hasGoals ? (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progressPct = Math.round((goal.current / goal.target) * 100)
              const statusLabel = goal.status === "behind" ? "Behind" : "On track"
              const statusClass =
                goal.status === "behind"
                  ? "bg-warning/10 text-warning-foreground border-warning/30"
                  : "bg-success/10 text-success-foreground border-success/30"

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
                          goal.status === "behind" ? "bg-warning" : "bg-primary"
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
            <p className="text-sm">
              {isLoaded && !isSignedIn && showDashboardCta ? "Sign in to view your goals." : "No goals yet."}
            </p>
            <p className="text-xs text-muted-foreground">
              {showDashboardCta
                ? "Create a goal to track progress and get next-step suggestions."
                : "Create a goal to track progress and get next-step suggestions."}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button className="w-full" onClick={handleCtaClick} disabled={loading}>
          {isUsingCustomGoals ? (hasGoals ? "Add a goal" : "Create a goal") : hasGoals ? "View all goals" : "Create a goal"}
        </Button>
      </CardFooter>
    </Card>
  )
}

type BackendGoal = {
  id: string
  user_id: number
  name: string
  target_amount: number | string
  current_saved: number | string
  target_year: number
  target_month: number
  banner_key: string
  created_at?: string | null
}

type BannerKey = "banner_1" | "banner_2" | "banner_3" | "banner_4"

function deadlineFromYearMonth(year: number, month: number): string {
  const date = new Date(year, Math.max(0, month - 1), 1)
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function statusFromProgress(progress: number): GoalStatus {
  if (!Number.isFinite(progress) || progress <= 0.25) return "behind"
  return "on-track"
}

function nextActionFromStatus(status: GoalStatus): string {
  return status === "behind"
    ? "Consider increasing your monthly savings toward this goal."
    : "Keep going — you’re on track."
}

function imageUrlFromBannerKey(bannerKey: string): string | undefined {
  if (
    bannerKey === "banner_1" ||
    bannerKey === "banner_2" ||
    bannerKey === "banner_3" ||
    bannerKey === "banner_4"
  ) {
    return `/banners/${bannerKey}.jpg`
  }
  return undefined
}

function mapBackendGoalToUi(goal: BackendGoal): Goal {
  const target = Number(goal.target_amount)
  const current = Number(goal.current_saved)
  const progress = target > 0 ? current / target : 0
  const status = statusFromProgress(progress)

  return {
    id: goal.id,
    name: goal.name,
    target,
    current,
    deadline: deadlineFromYearMonth(goal.target_year, goal.target_month),
    status,
    nextAction: nextActionFromStatus(status),
    imageUrl: imageUrlFromBannerKey(goal.banner_key),
  }
}
