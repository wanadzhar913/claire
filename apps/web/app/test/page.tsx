"use client"

import { Summary } from "@/components/Summary"

export default function TestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
      <Summary 
        onClose={() => console.log("Close clicked")}
        onViewDetails={() => console.log("View details clicked")}
      />
    </main>
  )
}
