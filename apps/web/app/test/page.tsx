"use client"

import { Summary } from "@/components/Summary"
import { SankeyDiagram } from "@/components/SankeyDiagram"

export default function TestPage() {
  return (
    <main className="min-h-screen p-8 bg-muted/30">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Cash Flow Visualization</h1>
        <SankeyDiagram />
        
        <div className="flex items-center justify-center">
          <Summary 
            onClose={() => console.log("Close clicked")}
            onViewDetails={() => console.log("View details clicked")}
          />
        </div>
      </div>
    </main>
  )
}
