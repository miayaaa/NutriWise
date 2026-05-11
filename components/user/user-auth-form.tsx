"use client"

import * as React from "react"
import { ClientSafeProvider, getProviders, signIn } from "next-auth/react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [providers, setProviders] = React.useState<Record<string, ClientSafeProvider> | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false)
  const [isGithubLoading, setIsGithubLoading] = React.useState<boolean>(false)

  const getCallbackUrl = React.useCallback(() => {
    if (typeof window === "undefined") return "/dashboard"

    return new URLSearchParams(window.location.search).get("callbackUrl") || "/dashboard"
  }, [])

  React.useEffect(() => {
    let isMounted = true

    const loadProviders = async () => {
      const availableProviders = await getProviders()
      if (isMounted) {
        setProviders(availableProviders)
      }
    }

    void loadProviders()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      {providers?.google && (
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => {
            setIsGoogleLoading(true)
            setIsLoading(true)
            signIn("google", { callbackUrl: getCallbackUrl() })
          }}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}{" "}
          Continue with Google
        </button>
      )}
      {providers?.github && (
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }))}
          onClick={() => {
            setIsGithubLoading(true)
            setIsLoading(true)
            signIn("github", { callbackUrl: getCallbackUrl() })
          }}
          disabled={isGithubLoading || isLoading}
        >
          {isGithubLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.github className="mr-2 h-4 w-4" />
          )}{" "}
          Continue with Github
        </button>
      )}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <button
        type="button"
        className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
        onClick={() => {
          setIsLoading(true)
          const key = "nutriwise_guest_id"
          let guestId = localStorage.getItem(key)
          if (!guestId) {
            guestId = crypto.randomUUID().replace(/-/g, "")
            localStorage.setItem(key, guestId)
          }
          signIn("guest", { callbackUrl: getCallbackUrl(), guestId })
        }}
        disabled={isLoading}
      >
        Continue as Guest
      </button>
      {providers && Object.keys(providers).length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sign-in providers are configured.
        </p>
      )}
    </div>
  )
}
