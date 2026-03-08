"use client"

import * as React from "react"
import { BsDropletFill } from "react-icons/bs"

import { toast } from "@/components/ui/use-toast"

const WATER_AMOUNTS = [200, 300, 500, 750]

export function WaterQuickLog({ onSuccess }: { onSuccess?: () => void }) {
  const [isAdding, setIsAdding] = React.useState(false)
  const [custom, setCustom] = React.useState("")

  async function addWater(amount: number) {
    if (isAdding || amount <= 0) return
    setIsAdding(true)
    try {
      const res = await fetch("/api/water-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      if (res.ok) {
        toast({ description: `+${amount}ml logged.` })
        onSuccess?.()
      }
    } catch {
      toast({ title: "Error", description: "Could not log water.", variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {WATER_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => addWater(amt)}
            disabled={isAdding}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 py-3 text-sm font-medium transition-colors hover:border-blue-400 hover:text-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <BsDropletFill className="mb-1 h-4 w-4 text-blue-400" />
            {amt}ml
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom ml"
          min={1}
          max={2000}
          inputMode="numeric"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          onKeyDown={(e) => { if (e.key === "Enter") addWater(Number(custom)) }}
        />
        <button
          onClick={() => addWater(Number(custom))}
          disabled={isAdding || !custom}
          className="cursor-pointer rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
