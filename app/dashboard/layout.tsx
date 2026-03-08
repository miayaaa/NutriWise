import { dashboardLinks } from "@/config/links"
import { getCurrentUser } from "@/lib/session"
import Footer from "@/components/layout/footer"
import Navbar from "@/components/layout/navbar"
import { DashboardNav } from "@/components/pages/dashboard/dashboard-nav"
import { MobileBottomNav } from "@/components/pages/dashboard/mobile-bottom-nav"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen w-full flex-col space-y-3 overflow-x-hidden md:space-y-6">
      <Navbar
        user={{
          name: user?.name,
          image: user?.image,
          email: user?.email,
        }}
      />
      <div className="grid grid-cols-1 w-full flex-1 gap-6 px-0 md:grid-cols-[200px_1fr] md:px-6">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav items={dashboardLinks.data} />
        </aside>
        <main className="min-w-0 flex-1 overflow-x-hidden pb-20 md:pb-0">{children}</main>
      </div>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  )
}
