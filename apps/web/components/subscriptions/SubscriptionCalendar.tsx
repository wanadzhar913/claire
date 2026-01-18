"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { Subscription } from "./types"
import type { BankingTransaction } from "./api-types"
import { formatCurrency } from "./utils"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

function parseDateOnly(isoDate: string) {
  // Backend returns YYYY-MM-DD; force local midnight so month/day comparisons are stable.
  return new Date(`${isoDate}T00:00:00`)
}

function getMerchantKeyFromTx(tx: BankingTransaction) {
  return tx.subscription_merchant_key ?? tx.merchant_name ?? "Unknown"
}

function clampDayToMonth(day: number, year: number, monthIndex: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(Math.max(1, day), daysInMonth)
}

type DayBucket = {
  predicted: Subscription[]
  charged: Array<{
    merchantKey: string
    displayName: string
    amount: number
  }>
}

export function SubscriptionCalendar({
  subscriptions,
  transactions,
  monthlySpend,
  className,
}: {
  subscriptions: Subscription[]
  transactions: BankingTransaction[]
  monthlySpend: number
  className?: string
}) {
  const [viewDate, setViewDate] = React.useState(() => new Date())

  const today = React.useMemo(() => new Date(), [])
  const year = viewDate.getFullYear()
  const monthIndex = viewDate.getMonth()
  const monthName = viewDate.toLocaleString("default", { month: "long" })

  const daysInMonth = React.useMemo(
    () => new Date(year, monthIndex + 1, 0).getDate(),
    [year, monthIndex]
  )

  // Monday start: Sunday (0) -> 6, Mon (1) -> 0, etc.
  const startOffset = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay()
    return firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  }, [year, monthIndex])

  const monthTransactions = React.useMemo(() => {
    return (transactions || []).filter((tx) => {
      const d = parseDateOnly(tx.transaction_date)
      return d.getFullYear() === year && d.getMonth() === monthIndex
    })
  }, [transactions, year, monthIndex])

  const latestTxDayByMerchantKey = React.useMemo(() => {
    // backend default: order_desc by transaction_date, so first occurrence is latest
    const map = new Map<string, number>()
    for (const tx of transactions || []) {
      const key = getMerchantKeyFromTx(tx)
      if (!map.has(key)) map.set(key, tx.transaction_day)
    }
    return map
  }, [transactions])

  const dayBuckets = React.useMemo(() => {
    const buckets = new Map<number, DayBucket>()

    // predicted renewals: use latest tx day-of-month per subscription
    for (const sub of subscriptions || []) {
      const dayRaw = latestTxDayByMerchantKey.get(sub.id)
      if (!dayRaw) continue
      const day = clampDayToMonth(dayRaw, year, monthIndex)
      const bucket = buckets.get(day) ?? { predicted: [], charged: [] }
      bucket.predicted.push(sub)
      buckets.set(day, bucket)
    }

    // actual charges in this month
    for (const tx of monthTransactions) {
      const d = parseDateOnly(tx.transaction_date)
      const day = d.getDate()
      const merchantKey = getMerchantKeyFromTx(tx)
      const displayName = tx.subscription_name ?? tx.merchant_name ?? "Unknown"
      const amount = Number(tx.amount ?? 0)
      const bucket = buckets.get(day) ?? { predicted: [], charged: [] }
      bucket.charged.push({ merchantKey, displayName, amount })
      buckets.set(day, bucket)
    }

    // stable ordering for tooltips/logos
    for (const bucket of buckets.values()) {
      bucket.predicted.sort((a, b) => a.name.localeCompare(b.name))
      bucket.charged.sort((a, b) => a.displayName.localeCompare(b.displayName))
    }

    return buckets
  }, [subscriptions, latestTxDayByMerchantKey, year, monthIndex, monthTransactions])

  const goPrev = () => setViewDate(new Date(year, monthIndex - 1, 1))
  const goNext = () => setViewDate(new Date(year, monthIndex + 1, 1))

  const hasAnyTx = (transactions || []).length > 0

  return (
    <Card
      className={cn(
        // Compact widget sizing: cap width so day cells don't become huge on desktop
        "w-full max-w-3xl mx-auto border bg-background p-3 md:p-4",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            aria-label="Previous month"
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="leading-tight">
            <div className="text-md font-semibold">
              {monthName} <span className="text-muted-foreground">{year}</span>
            </div>
            {!hasAnyTx && (
              <div className="text-xs text-muted-foreground">
                No charge history yet to estimate renewals.
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            aria-label="Next month"
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-right">
          <div className="text-md font-medium uppercase tracking-wider text-muted-foreground">
            Monthly Spend
          </div>
          <div className="text-base font-semibold">{formatCurrency(monthlySpend)}</div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const bucket = dayBuckets.get(day)
          const predicted = bucket?.predicted ?? []
          const charged = bucket?.charged ?? []

          const isToday =
            day === today.getDate() &&
            monthIndex === today.getMonth() &&
            year === today.getFullYear()

          const hasPredicted = predicted.length > 0
          const hasCharged = charged.length > 0

          const logoSubs = predicted.slice(0, 3)
          const overflow = Math.max(0, predicted.length - logoSubs.length)

          const Cell = (
            <div
              className={cn(
                "group relative flex aspect-square flex-col items-center justify-start rounded-lg border p-1 transition-colors",
                "bg-muted/10 hover:bg-muted/20",
                isToday && "ring-2 ring-primary/40",
                hasPredicted && "bg-muted/15",
              )}
            >
              <div
                className={cn(
                  "text-[11px] font-medium",
                  isToday ? "text-foreground" : "text-muted-foreground",
                  hasPredicted && "text-foreground"
                )}
              >
                {day}
              </div>

              {/* Predicted renewals (logos) */}
              {hasPredicted && (
                <div className="absolute bottom-1 flex items-center gap-0.5">
                  {logoSubs.map((sub) => (
                    <Avatar
                      key={sub.id}
                      className="h-4 w-4 border border-border bg-transparent"
                    >
                      <AvatarImage
                        src={sub.logo}
                        alt={`${sub.name} logo`}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                        {sub.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {overflow > 0 && (
                    <div className="h-4 min-w-4 rounded-full border border-border bg-background px-1 text-[9px] leading-4 text-muted-foreground">
                      +{overflow}
                    </div>
                  )}
                </div>
              )}

              {/* Actual charge marker */}
              {hasCharged && (
                <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
              )}
            </div>
          )

          if (!hasPredicted && !hasCharged) return <div key={day}>{Cell}</div>

          return (
            <Tooltip key={day}>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">{Cell}</div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={10} className="p-0">
                <div className="w-[200px] p-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="text-sm font-semibold">
                      {monthName} {day}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {hasCharged ? "Charged" : "Renews"}
                    </div>
                  </div>

                  {hasPredicted && (
                    <div className="mb-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Predicted renewals
                      </div>
                      <div className="space-y-1">
                        {predicted.slice(0, 6).map((s) => (
                          <div key={s.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{s.name}</div>
                              <div className="truncate text-[10px] text-muted-foreground">
                                {s.category}
                              </div>
                            </div>
                            <div className="text-xs font-semibold">{formatCurrency(s.amount)}</div>
                          </div>
                        ))}
                        {predicted.length > 6 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{predicted.length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasCharged && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Actual charges
                      </div>
                      <div className="space-y-1">
                        {charged.slice(0, 6).map((c, idx) => (
                          <div
                            key={`${c.merchantKey}-${idx}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 truncate text-xs">{c.displayName}</div>
                            <div className="text-xs font-semibold">{formatCurrency(c.amount)}</div>
                          </div>
                        ))}
                        {charged.length > 6 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{charged.length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </Card>
  )
}

