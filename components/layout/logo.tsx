import Link from "next/link"

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      {/* Icon mark */}
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-primary-foreground"
          aria-hidden="true"
        >
          {/* Leaf shape */}
          <path
            d="M12 3C8.5 3 5 7 5 12c0 3.5 1.8 6.5 4.5 8.2L10 16c-1.5-.8-2.5-2.5-2.5-4 0-2.8 2-5.5 4.5-6.3V18l3.5-7c.8-1.6.8-3.5-.2-5C14.3 4.8 13.2 3 12 3z"
            fill="currentColor"
          />
          {/* Spark dot */}
          <circle cx="17" cy="6" r="1.5" fill="currentColor" opacity="0.7" />
        </svg>
      </div>

      {/* Brand name */}
      <span
        className="text-[1.35rem] leading-none tracking-tight"
        style={{ fontFamily: "var(--font-brand)", fontWeight: 700 }}
      >
        Nutri
        <span className="text-primary">Wise</span>
      </span>
    </Link>
  )
}
