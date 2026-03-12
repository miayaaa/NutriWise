"use client"

import * as React from "react"
import { BsDropletFill, BsFire } from "react-icons/bs"
import { MdFastfood } from "react-icons/md"

import { cn } from "@/lib/utils"
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza"
import { QuickFoodLog, type QuickFoodLogHandle } from "@/components/pages/dashboard/quick-food-log"
import { WaterQuickLog } from "@/components/pages/dashboard/water-quick-log"
import { WorkoutLogForm } from "@/components/pages/dashboard/workout-log-form"

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

export function QuickLogCard() {
  const [open, setOpen] = React.useState<LogKey | null>(null)
  const foodLogRef = React.useRef<QuickFoodLogHandle>(null)
  const [foodCanLog, setFoodCanLog] = React.useState(false)
  const [foodLogging, setFoodLogging] = React.useState(false)

  const isMobile = !useMediaQuery("(min-width: 768px)")
  const keyboardOffset = useKeyboardOffset()
  // Only lift the drawer on mobile; desktop dialog is centered and unaffected
  const drawerStyle: React.CSSProperties | undefined = isMobile && keyboardOffset > 0
    ? {
        bottom: keyboardOffset,
        maxHeight: `min(90dvh, calc(100dvh - ${keyboardOffset + 40}px))`,
        transition: "bottom 0.2s ease, max-height 0.2s ease",
      }
    : undefined

  function handleFoodOpen(isOpen: boolean) {
    if (!isOpen) {
      setOpen(null)
      setFoodCanLog(false)
      setFoodLogging(false)
    }
  }

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
                onClick={() => setOpen(action.key)}
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

      {/* Food dialog — flex-col layout so the Log button stays in a sticky footer */}
      <Credenza open={open === "food"} onOpenChange={handleFoodOpen}>
        <CredenzaContent
          className="flex max-h-[90dvh] flex-col overflow-hidden p-0"
          style={drawerStyle}
        >
          <CredenzaHeader className="shrink-0 px-4 pt-5 pb-3">
            <CredenzaTitle>Log Food</CredenzaTitle>
            <CredenzaDescription>Describe what you ate — AI will estimate calories.</CredenzaDescription>
          </CredenzaHeader>

          {/* Scrollable form area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
            <QuickFoodLog
              ref={foodLogRef}
              onSuccess={() => setOpen(null)}
              hideButton
              onCanLogChange={setFoodCanLog}
              onLoggingChange={setFoodLogging}
            />
          </div>

          {/* Sticky footer button — always visible */}
          <div className="shrink-0 border-t bg-background px-4 py-3">
            <Button
              className="w-full"
              disabled={!foodCanLog || foodLogging}
              onClick={() => {
                void foodLogRef.current?.triggerLog()
              }}
            >
              {foodLogging ? (
                <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Logging...</>
              ) : (
                <><Icons.add className="mr-2 h-4 w-4" />Log meal</>
              )}
            </Button>
            {!isMobile && (
              <p className="mt-2 text-center text-xs text-muted-foreground">Tip: press Ctrl/Cmd + Enter to log faster.</p>
            )}
          </div>
        </CredenzaContent>
      </Credenza>

      {/* Water dialog */}
      <Credenza open={open === "water"} onOpenChange={(o) => { if (!o) setOpen(null) }}>
        <CredenzaContent style={drawerStyle}>
          <CredenzaHeader>
            <CredenzaTitle>Log Water</CredenzaTitle>
            <CredenzaDescription>Track your daily hydration.</CredenzaDescription>
          </CredenzaHeader>
          <div className="px-4 pb-6">
            <WaterQuickLog onSuccess={() => setOpen(null)} />
          </div>
        </CredenzaContent>
      </Credenza>

      {/* Workout dialog */}
      <Credenza open={open === "workout"} onOpenChange={(o) => { if (!o) setOpen(null) }}>
        <CredenzaContent className="max-h-[90dvh] overflow-y-auto" style={drawerStyle}>
          <CredenzaHeader>
            <CredenzaTitle>Log Workout</CredenzaTitle>
            <CredenzaDescription>Track strength, cardio, or any custom session.</CredenzaDescription>
          </CredenzaHeader>
          <div className="px-4 pb-6">
            <WorkoutLogForm onSuccess={() => setOpen(null)} />
          </div>
        </CredenzaContent>
      </Credenza>
    </>
  )
}
