import { Shell } from "@/components/layout/shell"

function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
}

export default function DashboardLoading() {
  return (
    <Shell className="w-full px-4 md:px-0">
      {/* Header */}
      <Sk className="h-8 w-36" />

      {/* Quick Log Card */}
      <div className="rounded-xl border bg-card p-4">
        <Sk className="mb-3 h-4 w-20" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Sk key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>

      {/* 3-col stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Sk className="h-4 w-28" />
            <Sk className="h-10 w-24" />
            <Sk className="h-2 w-full" />
            <Sk className="h-3 w-32" />
          </div>
        ))}
      </div>
    </Shell>
  )
}
