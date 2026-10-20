"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BsDropletFill, BsFire } from "react-icons/bs"
import { MdFastfood } from "react-icons/md"

import { cn } from "@/lib/utils"
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza"
import { FoodLogSheet } from "@/components/pages/dashboard/food-log-sheet"
import { WaterQuickLog } from "@/components/pages/dashboard/water-quick-log"

const LOG_ACTIONS = [
  {
    key: "food",
    label: "Log Food",
    sub: "AI estimates calories",
    icon: MdFastfood,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "hover:border-emerald-400",
  },
  {
    key: "water",
    label: "Log Water",
    sub: "Track hydration",
    icon: BsDropletFill,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "hover:border-blue-400",
  },
  {
    key: "workout",
    label: "Log Workout",
    sub: "Strength, cardio & more",
    icon: BsFire,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "hover:border-orange-400",
  },
] as const

type LogKey = (typeof LOG_ACTIONS)[number]["key"]

interface QuickLogCardProps {
  fastingEnabled?: boolean
  fastingStart?: number
  fastingEnd?: number
}

export function QuickLogCard({ fastingEnabled, fastingStart, fastingEnd }: QuickLogCardProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState<LogKey | null>(null)

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Log
        </p>
        <div className="grid grid-cols-3 gap-3">
          {LOG_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.key}
                onClick={() => action.key === "workout" ? router.push("/dashboard/log-workout") : setOpen(action.key)}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 transition-colors duration-200 active:scale-95",
                  action.bg,
                  action.border
                )}
              >
                <Icon className={cn("h-6 w-6", action.color)} />
                <span className="text-xs font-medium leading-tight text-center">{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <FoodLogSheet
        open={open === "food"}
        onOpenChange={(o) => { if (!o) setOpen(null) }}
        fastingEnabled={fastingEnabled}
        fastingStart={fastingStart}
        fastingEnd={fastingEnd}
      />

      {/* Water dialog */}
      <Credenza open={open === "water"} onOpenChange={(o) => { if (!o) setOpen(null) }}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>Log Water</CredenzaTitle>
            <CredenzaDescription>Track your daily hydration.</CredenzaDescription>
          </CredenzaHeader>
          <div className="px-4 pb-6">
            <WaterQuickLog onSuccess={() => setOpen(null)} />
          </div>
        </CredenzaContent>
      </Credenza>

    </>
  )
}
