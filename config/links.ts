import { Navigation } from "@/types"

export const navLinks: Navigation = {
  data: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Dashboard",
      href: "/dashboard",
    },
  ],
}

export const dashboardLinks: Navigation = {
  data: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "dashboard",
    },
    {
      title: "Food Log",
      href: "/dashboard/activities",
      icon: "activity",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
}
