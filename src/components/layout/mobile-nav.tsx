"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  Home,
  Layers,
  Users,
  Building2,
  GitBranch,
  BookOpen,
  Clock,
  Workflow,
  Tag,
  KeyRound,
  FileCode,
} from "lucide-react"

type Role = "ADMIN" | "EDITOR" | "VIEWER" | "CLIENT"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Role[]
}

const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Documentación", items: [
    { href: "/", label: "Resumen", icon: Home },
    { href: "/procesos", label: "Procesos", icon: Layers },
    { href: "/bitacora", label: "Bitácora", icon: BookOpen },
    { href: "/historial", label: "Historial", icon: Clock },
    { href: "/flows", label: "Flujos", icon: Workflow },
  ]},
  { group: "Configuración", items: [
    { href: "/areas", label: "Áreas", icon: Building2, roles: ["ADMIN"] },
    { href: "/organigrama", label: "Organigrama", icon: GitBranch, roles: ["ADMIN"] },
    { href: "/clientes", label: "Clientes", icon: Users, roles: ["ADMIN"] },
    { href: "/configuracion/tags", label: "Etiquetas", icon: Tag },
    { href: "/configuracion/api-keys", label: "API Keys", icon: KeyRound, roles: ["ADMIN"] },
    { href: "/docs", label: "Docs API", icon: FileCode },
  ]},
]

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir navegación">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 px-4">
        <SheetTitle className="sr-only">Navegación</SheetTitle>
        <div className="flex items-center gap-2 pt-2 pb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-fg font-bold text-lg">
            k
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg">kimeku</span>
          </div>
        </div>

        <nav className="space-y-6">
          {NAV.map((g) => {
            const items = g.items.filter((it) => !it.roles || it.roles.includes(role))
            if (items.length === 0) return null
            return (
            <div key={g.group}>
              <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                {g.group}
              </p>
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href))
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-accent-subtle text-accent"
                            : "text-fg-muted hover:bg-subtle hover:text-fg"
                        )}
                      >
                        <it.icon className="h-4 w-4" />
                        {it.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
