"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { useKeyboardOffset } from "@/hooks/use-keyboard-offset"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { QuickFoodLog, type QuickFoodLogHandle } from "@/components/pages/dashboard/quick-food-log"

interface FoodLogSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fastingEnabled?: boolean
  fastingStart?: number
  fastingEnd?: number
}

/**
 * The one "Log Food" screen — used by the dashboard Quick Log card and the
 * mobile bottom-nav FAB.
 *
 * Mobile: a full-screen page with the input at the top and the Log action in
 * the top-right header, like a native iOS compose screen. Nothing is anchored
 * to the bottom, so the keyboard can't cover the input or the confirm button,
 * and we never fight Safari's own scroll-into-view (a keyboard-chasing bottom
 * sheet got pushed off the top of the screen on iPhone). The keyboard height
 * is only used as bottom padding so content below it can be scrolled up.
 *
 * Desktop (md+): a centered dialog with the Log button in a footer.
 */
export function FoodLogSheet({ open, onOpenChange, fastingEnabled, fastingStart, fastingEnd }: FoodLogSheetProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const foodLogRef = React.useRef<QuickFoodLogHandle>(null)
  const [canLog, setCanLog] = React.useState(false)
  const [isLogging, setIsLogging] = React.useState(false)
  const { keyboardOffset } = useKeyboardOffset()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCanLog(false)
      setIsLogging(false)
    }
    onOpenChange(next)
  }

  const logLabel = isLogging ? (
    <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Logging…</>
  ) : (
    <><Icons.add className="mr-2 h-4 w-4" />Log meal</>
  )
  const triggerLog = () => void foodLogRef.current?.triggerLog()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 hidden bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:block" />
        <DialogPrimitive.Content
          ref={contentRef}
          // Mobile: don't auto-focus anything (no keyboard until the user taps
          // the input). Desktop: jump straight into the textarea.
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            if (window.matchMedia("(min-width: 768px)").matches) {
              contentRef.current?.querySelector("textarea")?.focus()
            }
          }}
          className="fixed inset-0 z-50 flex flex-col bg-background duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 max-md:data-[state=open]:slide-in-from-bottom-8 md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border md:shadow-lg md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%] md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]"
        >
          {/* Header — mobile: [✕] title [Log]; desktop: title + description + ✕ */}
          <div className="flex shrink-0 items-center gap-2 border-b px-2 py-2 md:border-0 md:px-6 md:pb-2 md:pt-6">
            <DialogPrimitive.Close
              className="cursor-pointer rounded-md p-2 text-muted-foreground hover:text-foreground md:order-last md:-mr-2"
              aria-label="Close"
            >
              <Icons.close className="h-5 w-5 md:h-4 md:w-4" />
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1 text-center md:text-left">
              <DialogPrimitive.Title className="text-base font-semibold md:text-lg">Log Food</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only md:not-sr-only md:text-sm md:text-muted-foreground">
                Describe what you ate — AI will estimate calories.
              </DialogPrimitive.Description>
            </div>
            <Button size="sm" className="md:hidden" disabled={!canLog || isLogging} onClick={triggerLog}>
              {isLogging ? <Icons.spinner className="h-4 w-4 animate-spin" /> : "Log"}
            </Button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 md:px-6"
            style={keyboardOffset > 0 ? { paddingBottom: keyboardOffset + 16 } : undefined}
          >
            <QuickFoodLog
              ref={foodLogRef}
              onSuccess={() => handleOpenChange(false)}
              hideButton
              onCanLogChange={setCanLog}
              onLoggingChange={setIsLogging}
              fastingEnabled={fastingEnabled}
              fastingStart={fastingStart}
              fastingEnd={fastingEnd}
            />
          </div>

          {/* Desktop footer */}
          <div className="hidden shrink-0 border-t px-6 py-3 md:block">
            <Button className="w-full" disabled={!canLog || isLogging} onClick={triggerLog}>
              {logLabel}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Tip: press Ctrl/Cmd + Enter to log faster.</p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
