"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Layers,
  Users,
  Building2,
  GitBranch,
  BookOpen,
  Clock,
  Settings,
  Workflow,
  Tag,
  KeyRound,
  FileCode,
  ListTodo,
  Plug,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  ribbon?: string
  roles?: ("ADMIN" | "EDITOR" | "VIEWER" | "CLIENT")[]
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Documentación",
    items: [
      { href: "/", label: "Resumen", icon: Home, ribbon: "01" },
      { href: "/procesos", label: "Procesos", icon: Layers, ribbon: "02" },
      { href: "/bitacora", label: "Bitácora", icon: BookOpen, ribbon: "03" },
      { href: "/historial", label: "Historial", icon: Clock, ribbon: "04" },
      { href: "/flows", label: "Flujos", icon: Workflow, ribbon: "05" },
      { href: "/todos", label: "Actividades", icon: ListTodo, ribbon: "06" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { href: "/areas", label: "Áreas", icon: Building2, ribbon: "A", roles: ["ADMIN"] },
      { href: "/organigrama", label: "Organigrama", icon: GitBranch, ribbon: "B", roles: ["ADMIN"] },
      { href: "/clientes", label: "Clientes", icon: Users, ribbon: "C", roles: ["ADMIN"] },
      { href: "/configuracion/tags", label: "Etiquetas", icon: Tag, ribbon: "D" },
      { href: "/configuracion/usuarios", label: "Usuarios", icon: Users, ribbon: "E", roles: ["ADMIN"] },
      { href: "/configuracion/api-keys", label: "API Keys", icon: KeyRound, ribbon: "F", roles: ["ADMIN"] },
      { href: "/configuracion/integraciones", label: "Integraciones", icon: Plug, ribbon: "G", roles: ["ADMIN"] },
      { href: "/docs", label: "Docs API", icon: FileCode, ribbon: "H" },
    ],
  },
]

export function Sidebar({ role }: { role: "ADMIN" | "EDITOR" | "VIEWER" | "CLIENT" }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored) setCollapsed(stored === "1")
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0")
      return next
    })
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-bg transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex items-center gap-2 px-4 py-5", collapsed && "justify-center px-2")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-fg font-bold text-lg">
            k
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-lg">kimeku</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {navGroups.map((group, gi) => (
            <div key={group.title} className={cn("mt-3", gi > 0 && "mt-6")}>
              {!collapsed && (
                <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                  {group.title}
                </p>
              )}
              {collapsed && gi > 0 && <div className="mx-2 my-3 h-px bg-border" />}
              <ul className="space-y-0.5">
                {group.items
                  .filter((it) => !it.roles || it.roles.includes(role))
                  .map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href))
                    const link = (
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-accent-subtle text-accent"
                            : "text-fg-muted hover:bg-subtle hover:text-fg"
                        )}
                      >
                        {active && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.ribbon && (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle group-hover:text-fg-muted">
                                {item.ribbon}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    )
                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">{item.label}</TooltipContent>
                          </Tooltip>
                        ) : (
                          link
                        )}
                      </li>
                    )
                  })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-border p-2", collapsed && "px-1")}>
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={toggle}
            className={cn("w-full justify-center gap-2", !collapsed && "justify-start")}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-widest">Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
