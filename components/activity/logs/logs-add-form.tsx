"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CredenzaClose, CredenzaFooter } from "@/components/ui/credenza"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

interface LogsAddFormProps {
  activityId: string
  setShowLogAlert: (active: boolean) => void
  isFoodActivity?: boolean
}

interface CalorieEstimate {
  calories: number
  breakdown: Array<{ item: string; calories: number }>
  confidence: "high" | "medium" | "low"
}

const FormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  foodDescription: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof FormSchema>

const currentDate = new Date()
currentDate.setHours(0, 0, 0, 0)

const defaultValues: Partial<FormValues> = {
  date: currentDate,
  foodDescription: "",
}

const CONFIDENCE_CONFIG = {
  high: { label: "High confidence", className: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Medium confidence", className: "bg-amber-100 text-amber-700" },
  low: { label: "Low confidence", className: "bg-red-100 text-red-700" },
}

function CaloriePreviewCard({ estimate }: { estimate: CalorieEstimate }) {
  const conf = CONFIDENCE_CONFIG[estimate.confidence]
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Total calories */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Estimated
          </p>
          <p className="text-3xl font-bold text-foreground leading-none">
            {estimate.calories.toLocaleString()}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              kcal
            </span>
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            conf.className
          )}
        >
          {conf.label}
        </span>
      </div>

      {/* Breakdown */}
      {estimate.breakdown.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          {estimate.breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground/80 truncate max-w-[70%]">
                {item.item}
              </span>
              <span className="font-medium tabular-nums text-foreground/70 shrink-0">
                {item.calories} kcal
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CalorieSkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3 animate-pulse">
      <div className="flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-muted-foreground/20" />
          <div className="h-8 w-32 rounded bg-muted-foreground/20" />
        </div>
        <div className="h-6 w-24 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="space-y-2 pt-1 border-t border-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-2/5 rounded bg-muted-foreground/20" />
            <div className="h-4 w-16 rounded bg-muted-foreground/20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LogsAddForm({
  activityId,
  setShowLogAlert,
  isFoodActivity,
}: LogsAddFormProps) {
  const router = useRouter()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  })
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [estimate, setEstimate] = React.useState<CalorieEstimate | null>(null)
  const [isEstimating, setIsEstimating] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const foodDescription = form.watch("foodDescription")

  // Debounced auto-estimate as user types
  React.useEffect(() => {
    if (!isFoodActivity) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = foodDescription?.trim() ?? ""
    if (trimmed.length < 3) {
      setEstimate(null)
      setIsEstimating(false)
      return
    }

    setIsEstimating(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foodDescription: trimmed }),
        })
        if (res.ok) {
          const data = (await res.json()) as CalorieEstimate
          setEstimate(data)
        } else {
          setEstimate(null)
        }
      } catch {
        setEstimate(null)
      } finally {
        setIsEstimating(false)
      }
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [foodDescription, isFoodActivity])

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true)

    const response = await fetch(`/api/activities/${activityId}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: data.date,
        count: 1,
        foodDescription: data.foodDescription || undefined,
        // Pass the already-estimated calories to avoid a second AI call
        aiCalories: estimate?.calories,
      }),
    })

    if (!response?.ok) {
      toast({
        title: "Something went wrong.",
        description: "Your activity was not logged. Please try again.",
        variant: "destructive",
      })
    } else {
      const result = await response.json()
      const kcal = result.aiCalories ?? estimate?.calories
      toast({
        description: kcal
          ? `Logged! ${kcal} kcal recorded.`
          : "Your activity has been logged successfully.",
      })
    }

    setIsLoading(false)
    setShowLogAlert(false)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 px-4 md:px-0"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal sm:w-[320px]",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {isFoodActivity && (
          <>
            <FormField
              control={form.control}
              name="foodDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    What did you eat?
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      AI
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. a bowl of oatmeal with banana, one cup of coffee with milk"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live calorie preview */}
            {isEstimating && <CalorieSkeletonCard />}
            {!isEstimating && estimate && (
              <CaloriePreviewCard estimate={estimate} />
            )}
          </>
        )}

        <CredenzaFooter className="flex flex-col-reverse">
          <CredenzaClose asChild>
            <Button variant="outline">Cancel</Button>
          </CredenzaClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                <span>Logging...</span>
              </>
            ) : (
              <>
                <Icons.add className="mr-2 h-4 w-4" />
                <span>Add log</span>
              </>
            )}
          </Button>
        </CredenzaFooter>
      </form>
    </Form>
  )
}
