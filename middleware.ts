import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"

export default withAuth(
  async function middleware(req) {
    const isAuth = !!req.nextauth.token
    const isAuthPage =
      req.nextUrl.pathname.startsWith("/signin") ||
      req.nextUrl.pathname.startsWith("/signup")
    const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard")

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }

      return null
    }

    if (isDashboardPage && !isAuth) {
      const signInUrl = new URL("/signin", req.url)
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
      return NextResponse.redirect(signInUrl)
    }

    return null
  },
  {
    callbacks: {
      async authorized() {
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup"],
}
