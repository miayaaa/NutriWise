"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai"
import { BsDropletFill, BsFire } from "react-icons/bs"
import { MdFastfood } from "react-icons/md"

import { dashboardLinks } from "@/config/links"
import { cn } from "@/lib/utils"
import { Icons } from "@/components/icons"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { QuickFoodLog } from "@/components/pages/dashboard/quick-food-log"
import { WaterQuickLog } from "@/components/pages/dashboard/water-quick-log"
import { WorkoutLogForm } from "@/components/pages/dashboard/workout-log-form"

type LogType = "food" | "water" | "workout"

const LOG_OPTIONS: { type: LogType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "food",    label: "Log Food",    icon: <MdFastfood className="h-6 w-6" />,    color: "bg-emerald-500" },
  { type: "water",   label: "Log Water",   icon: <BsDropletFill className="h-6 w-6" />, color: "bg-blue-500" },
  { type: "workout", label: "Log Workout", icon: <BsFire className="h-6 w-6" />,        color: "bg-orange-500" },
]

// dashboardLinks.data layout: [Dashboard, History, Coach, Settings]
// Bottom nav: Dashboard | History | [FAB] | Coach | Settings
const NAV_LEFT  = [dashboardLinks.data[0], dashboardLinks.data[1]]  // Dashboard, History
const NAV_RIGHT = [dashboardLinks.data[2], dashboardLinks.data[3]]  // Coach, Settings

export function MobileBottomNav() {
  const path = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [logType, setLogType] = React.useState<LogType | null>(null)

  function openLog(type: LogType) {
    setMenuOpen(false)
    setLogType(type)
  }

  function NavLink({ item }: { item: (typeof dashboardLinks.data)[number] }) {
    const Icon = Icons[item.icon || "next"]
    const isActive = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href ?? ""))
    return (
      <Link href={item.href ?? "/"} className="flex flex-1 flex-col items-center gap-1 py-2 min-w-0">
        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-[10px] transition-colors truncate", isActive ? "font-medium text-primary" : "text-muted-foreground")}>
          {item.title}
        </span>
      </Link>
    )
  }

  const drawerTitle = logType === "food" ? "Log Food" : logType === "workout" ? "Log Workout" : ""

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
        <div className="flex h-16 items-center px-1">
          {/* Left tabs */}
          {NAV_LEFT.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          {/* Center FAB */}
          <div className="flex w-16 shrink-0 flex-col items-center">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "-translate-y-3 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95",
                menuOpen ? "bg-muted text-foreground rotate-45" : "bg-primary text-primary-foreground"
              )}
              aria-label="Log"
            >
              <AiOutlinePlus className="h-6 w-6" />
            </button>
          </div>

          {/* Right tabs */}
          {NAV_RIGHT.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>

      {/* Log type picker — slides up above FAB */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed bottom-[4.5rem] left-1/2 z-40 -translate-x-1/2 flex gap-3 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {LOG_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => openLog(opt.type)}
                className={cn(
                  "flex flex-col items-center gap-1 cursor-pointer"
                )}
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md", opt.color)}>
                  {opt.icon}
                </div>
                <span className="text-[10px] font-medium text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Food / Workout drawers */}
      <Drawer open={logType === "food" || logType === "workout"} onOpenChange={(o) => { if (!o) setLogType(null) }}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader>
            <DrawerTitle>{drawerTitle}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8">
            {logType === "food" && <QuickFoodLog onSuccess={() => setLogType(null)} />}
            {logType === "workout" && <WorkoutLogForm onSuccess={() => setLogType(null)} />}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Water — quick add bottom sheet */}
      <Drawer open={logType === "water"} onOpenChange={(o) => { if (!o) setLogType(null) }}>
        <DrawerContent>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>Log Water</DrawerTitle>
            <button onClick={() => setLogType(null)} className="cursor-pointer text-muted-foreground">
              <AiOutlineClose className="h-4 w-4" />
            </button>
          </DrawerHeader>
          <div className="px-4 pb-8">
            <WaterQuickLog onSuccess={() => setLogType(null)} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
