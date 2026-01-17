"use client"

import { useState } from "react"
import Image from "next/image"
import { LayoutGrid, List as ListIcon, Plus, Target, Check } from "lucide-react"

import { Goals } from "@/components/Goals"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { mockGoals, formatMYR, type Goal } from "@/lib/goals-data"
import { cn } from "@/lib/utils"

const BANNER_OPTIONS = [
  "/banners/banner_1.jpg",
  "/banners/banner_2.jpg",
  "/banners/banner_3.jpg",
  "/banners/banner_4.jpg",
]

export default function GoalsPage() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [goals, setGoals] = useState<Goal[]>(mockGoals)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

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
          <Button size="sm" className="h-10 gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-6 w-4" />
            Add Goal
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <Goals goals={goals} onAction={() => console.log("Goal action clicked")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <AddGoalDialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAddGoal={(newGoal) => {
          setGoals((prev) => [...prev, newGoal])
          setIsAddModalOpen(false)
        }}
      />
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

interface AddGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddGoal: (goal: Goal) => void
}

function AddGoalDialog({ open, onOpenChange, onAddGoal }: AddGoalDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [currentSaved, setCurrentSaved] = useState("")
  const [selectedBanner, setSelectedBanner] = useState(BANNER_OPTIONS[0])

  const resetForm = () => {
    setName("")
    setTargetAmount("")
    setTargetDate("")
    setCurrentSaved("")
    setSelectedBanner(BANNER_OPTIONS[0])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const target = parseFloat(targetAmount) || 0
    const current = parseFloat(currentSaved) || 0

    // Format the date as "MMM YYYY"
    let formattedDeadline: string | null = null
    if (targetDate) {
      const date = new Date(targetDate + "-01") // Add day to make valid date
      formattedDeadline = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    }

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      name: name.trim(),
      target,
      current,
      deadline: formattedDeadline,
      status: "on-track",
      nextAction: "Keep saving towards your goal!",
      imageUrl: selectedBanner,
    }

    onAddGoal(newGoal)
    resetForm()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const isFormValid = name.trim() && targetAmount && parseFloat(targetAmount) > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Set up a new savings goal to track your progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g., New Car"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-amount">Target Amount (MYR)</Label>
              <Input
                id="target-amount"
                type="number"
                placeholder="80000"
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-saved">Current Saved (MYR)</Label>
              <Input
                id="current-saved"
                type="number"
                placeholder="5000"
                min="0"
                value={currentSaved}
                onChange={(e) => setCurrentSaved(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-date">Target Date</Label>
            <Input
              id="target-date"
              type="month"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Banner Image</Label>
            <div className="grid grid-cols-2 gap-3">
              {BANNER_OPTIONS.map((banner) => (
                <button
                  key={banner}
                  type="button"
                  onClick={() => setSelectedBanner(banner)}
                  className={cn(
                    "relative aspect-video rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    selectedBanner === banner
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <Image
                    src={banner}
                    alt="Banner option"
                    fill
                    className="object-cover"
                  />
                  {selectedBanner === banner && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid}>
              Create Goal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
