import "./globals.css"

import { Metadata, Viewport } from "next"
import { Inter, Barlow_Condensed } from "next/font/google"
import NextTopLoader from "nextjs-toploader"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url.base),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    {
      name: siteConfig.author,
      url: siteConfig.url.author,
    },
  ],
  creator: siteConfig.author,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url.base,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@_rdev7",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: `${siteConfig.url.base}/site.webmanifest`,
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("antialiased overflow-x-hidden w-full", inter.className, barlowCondensed.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextTopLoader color="#22c55e" height={2.5} showSpinner={false} />
          <div
            vaul-drawer-wrapper=""
            className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background"
          >
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
