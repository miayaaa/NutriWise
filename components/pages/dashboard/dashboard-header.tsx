interface DashboardHeaderProps {
  heading: string
  text?: string | null
  children?: React.ReactNode
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
      <div className="grid gap-0.5">
        <h1 className="text-xl font-bold md:text-3xl">{heading}</h1>
        {text && <p className="text-sm text-muted-foreground md:text-base">{text}</p>}
      </div>
      {children}
    </div>
  )
}
