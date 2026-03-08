import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export default function HeroHeader() {
  return (
    <>
      <section className="space-y-8 pb-12 pt-4 md:space-y-16 md:pt-10 lg:py-32">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            AI-Powered Nutrition Tracking
          </span>
          <h1 className="text-4xl font-semibold sm:text-5xl md:text-6xl lg:text-7xl">
            Eat smart,{" "}
            <span className="text-primary">live well.</span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Describe your meals in plain language. NutriWise uses AI to estimate
            calories instantly — no barcode scanning, no manual entry.
          </p>
          <div className="flex gap-4">
            <Link
              href="/signin"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Start Tracking Free
            </Link>
          </div>
        </div>

        {/* App preview mockup */}
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <div className="rounded-2xl border bg-card p-6 shadow-lg">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">
                  1,840{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    kcal
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-right">
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="font-semibold text-primary">2,000 kcal</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: "92%" }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-muted-foreground">
                160 kcal remaining
              </p>
            </div>

            {/* Meal log entries */}
            <div className="space-y-3">
              {[
                {
                  meal: "Breakfast",
                  desc: "Oatmeal with banana and honey",
                  kcal: 420,
                  time: "8:30 AM",
                },
                {
                  meal: "Lunch",
                  desc: "Grilled chicken salad with olive oil",
                  kcal: 560,
                  time: "12:45 PM",
                },
                {
                  meal: "Snack",
                  desc: "Greek yogurt and mixed berries",
                  kcal: 210,
                  time: "3:00 PM",
                },
                {
                  meal: "Dinner",
                  desc: "Salmon with steamed broccoli and rice",
                  kcal: 650,
                  time: "7:15 PM",
                },
              ].map((entry) => (
                <div
                  key={entry.meal}
                  className="flex items-center justify-between rounded-xl border bg-background px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {entry.meal} · {entry.time}
                      </p>
                      <p className="text-sm">{entry.desc}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {entry.kcal} kcal
                  </span>
                </div>
              ))}
            </div>

            {/* AI badge */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-primary">AI estimated</span>{" "}
                — just describe your meal in plain text
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
