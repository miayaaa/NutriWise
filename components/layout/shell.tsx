import * as React from "react"

import { cn } from "@/lib/utils"

interface ShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Shell({ children, className, ...props }: ShellProps) {
  return (
    <div className={cn("grid grid-cols-1 w-full min-w-0 items-start gap-4 md:gap-6", className)} {...props}>
      {children}
    </div>
  )
}
