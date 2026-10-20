"use client"

import * as React from "react"

import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface BaseProps {
  children: React.ReactNode
}

interface RootCredenzaProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface CredenzaProps extends BaseProps {
  className?: string
  style?: React.CSSProperties
  asChild?: true
}

const desktop = "(min-width: 768px)"

// The root decides Dialog vs Drawer ONCE and shares it with every part.
// If each part ran its own media query, a part remounted by the root's
// Drawer→Dialog switch would start from the hook's initial value and render
// Drawer pieces inside a Dialog (with mismatched Radix versions that throws
// "`DialogPortal` must be used within `Dialog`").
const CredenzaContext = React.createContext(false)
const useIsDesktop = () => React.useContext(CredenzaContext)

const Credenza = ({ children, ...props }: RootCredenzaProps) => {
  const isDesktop = useMediaQuery(desktop)

  return (
    <CredenzaContext.Provider value={isDesktop}>
      {isDesktop ? (
        <Dialog {...props}>{children}</Dialog>
      ) : (
        <Drawer {...props}>{children}</Drawer>
      )}
    </CredenzaContext.Provider>
  )
}

const CredenzaTrigger = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaTrigger = isDesktop ? DialogTrigger : DrawerTrigger

  return (
    <CredenzaTrigger className={className} {...props}>
      {children}
    </CredenzaTrigger>
  )
}

const CredenzaClose = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaClose = isDesktop ? DialogClose : DrawerClose

  return (
    <CredenzaClose className={className} {...props}>
      {children}
    </CredenzaClose>
  )
}

const CredenzaContent = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaContent = isDesktop ? DialogContent : DrawerContent

  return (
    <CredenzaContent className={className} {...props}>
      {children}
    </CredenzaContent>
  )
}

const CredenzaDescription = ({
  className,
  children,
  ...props
}: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaDescription = isDesktop ? DialogDescription : DrawerDescription

  return (
    <CredenzaDescription className={className} {...props}>
      {children}
    </CredenzaDescription>
  )
}

const CredenzaHeader = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaHeader = isDesktop ? DialogHeader : DrawerHeader

  return (
    <CredenzaHeader className={className} {...props}>
      {children}
    </CredenzaHeader>
  )
}

const CredenzaTitle = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaTitle = isDesktop ? DialogTitle : DrawerTitle

  return (
    <CredenzaTitle className={className} {...props}>
      {children}
    </CredenzaTitle>
  )
}

const CredenzaFooter = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useIsDesktop()
  const CredenzaFooter = isDesktop ? DialogFooter : DrawerFooter

  return (
    <CredenzaFooter className={className} {...props}>
      {children}
    </CredenzaFooter>
  )
}

export {
  Credenza,
  CredenzaTrigger,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaFooter,
}
