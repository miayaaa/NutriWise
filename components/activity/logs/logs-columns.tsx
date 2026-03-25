"use client"

import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

import { LogsDeleteButton } from "./logs-delete-button"

export type LogsType = {
  id: string
  date: Date
  count: number
  foodDescription?: string | null
  aiCalories?: number | null
  source: "activity" | "food"
  activity: {
    id: string
    name: string
  }
}

export const logColumns: ColumnDef<LogsType>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
        <Icons.sort className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: (row) => {
      const date = new Date(row.getValue() as string)
      const formattedDate = Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date)
      return <div className="min-w-[5rem] px-4 text-sm">{formattedDate}</div>
    },
  },
  {
    accessorKey: "foodDescription",
    header: () => <div className="px-4">Meal</div>,
    cell: ({ row }) => {
      const desc = row.original.foodDescription
      if (!desc) return <div className="px-4 text-muted-foreground">—</div>
      return (
        <div className="max-w-[260px] truncate px-4 text-sm" title={desc}>
          {desc}
        </div>
      )
    },
  },
  {
    accessorKey: "aiCalories",
    header: () => <div className="px-4">Calories</div>,
    cell: ({ row }) => {
      const kcal = row.original.aiCalories
      if (!kcal) return <div className="px-4 text-muted-foreground">—</div>
      return (
        <div className="px-4 font-medium tabular-nums">
          {Math.round(kcal).toLocaleString("en-US")}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            kcal
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "activity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Activity
        <Icons.sort className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: (row) => {
      const { activity, source } = row.row.original
      if (source === "food") {
        return (
          <div className="px-4 text-sm text-muted-foreground">{activity.name}</div>
        )
      }
      return (
        <Link
          href={`/dashboard/activities/${activity.id}`}
          className={cn(buttonVariants({ variant: "ghost" }), "text-sm")}
        >
          {activity.name}
        </Link>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <LogsDeleteButton logs={row.original} />,
  },
]
