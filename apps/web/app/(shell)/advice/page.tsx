"use client"

import { Chat } from "@/components/Chat"

export default function AdvicePage() {
  return (
    <div className="space-y-8 min-w-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advice</h1>
        <p className="text-muted-foreground mt-2">
          Get personalized financial advice and insights
        </p>
      </div>

      <Chat />
    </div>
  )
}
