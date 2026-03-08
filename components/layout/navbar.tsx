"use client"

import { User } from "next-auth"

import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/layout/logo"
import { UserNavDisplay } from "@/components/user/user-nav-display"

interface NavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  user: Pick<User, "name" | "image" | "email">
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <header className="border-b">
      <nav className="mx-auto flex h-14 items-center justify-between px-4 md:px-8 lg:max-w-7xl">
        <Logo />
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserNavDisplay
            user={{
              name: user?.name,
              image: user?.image,
              email: user?.email,
            }}
          />
        </div>
      </nav>
    </header>
  )
}
