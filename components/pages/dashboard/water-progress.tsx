"use client"

import * as React from "react"
import { BsDropletFill } from "react-icons/bs"
import { AiOutlineClose } from "react-icons/ai"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

interface WaterLog {
  id: string
  amount: number
  date: string | Date
}

interface WaterProgressProps {
  initialLogs: WaterLog[]
  dailyGoal: number
}

const QUICK_AMOUNTS = [200, 300, 500]

export function WaterProgress({ initialLogs, dailyGoal }: WaterProgressProps) {
  const [logs, setLogs] = React.useState<WaterLog[]>(initialLogs)
  const [isAdding, setIsAdding] = React.useState(false)
  const [customAmount, setCustomAmount] = React.useState("")
  const [showCustom, setShowCustom] = React.useState(false)

  const total = logs.reduce((s, l) => s + l.amount, 0)
  const pct = dailyGoal > 0 ? Math.min((total / dailyGoal) * 100, 100) : 0
  const barColor = pct >= 100 ? "bg-blue-500" : pct >= 60 ? "bg-blue-400" : "bg-blue-300"

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
        const newLog = await res.json()
        setLogs((prev) => [...prev, newLog])
        setCustomAmount("")
        setShowCustom(false)
        const nextTotal = total + amount
        toast({
          description: dailyGoal > 0
            ? `+${amount}ml added. Today ${nextTotal}/${dailyGoal}ml.`
            : `+${amount}ml added. Today ${nextTotal}ml.`,
        })
      }
    } catch {
      toast({ title: "Error", description: "Could not log water.", variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  async function deleteLog(id: string) {
    const prev = logs
    setLogs((l) => l.filter((x) => x.id !== id))
    try {
      await fetch(`/api/water-logs/${id}`, { method: "DELETE" })
    } catch {
      setLogs(prev)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Water</CardTitle>
        <BsDropletFill className="h-4 w-4 text-blue-400" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          <span className="mb-1 text-sm text-muted-foreground">
            ml{dailyGoal > 0 && <> / {dailyGoal} goal</>}
          </span>
        </div>

        {/* Progress bar */}
        {dailyGoal > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {pct >= 100 ? "Daily goal reached 💧" : `${dailyGoal - total} ml remaining`}
            </p>
          </div>
        )}

        {/* Quick add buttons */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => addWater(amt)}
              disabled={isAdding}
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-blue-400 hover:text-blue-500 disabled:opacity-50"
            >
              +{amt}ml
            </button>
          ))}
          <button
            onClick={() => setShowCustom((v) => !v)}
            className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-blue-400 hover:text-blue-500"
          >
            Custom
          </button>
        </div>

        {/* Custom amount input */}
        {showCustom && (
          <div className="flex gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="ml"
              min={1}
              max={2000}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") addWater(Number(customAmount))
              }}
            />
            <button
              onClick={() => addWater(Number(customAmount))}
              disabled={isAdding || !customAmount}
              className="cursor-pointer rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        {/* Today's logs */}
        {logs.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            {logs.map((log) => (
              <div key={log.id} className="group flex items-center justify-between text-xs text-muted-foreground">
                <span>{log.amount} ml</span>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="cursor-pointer opacity-30 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5"
                  aria-label="Remove"
                >
                  <AiOutlineClose className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
