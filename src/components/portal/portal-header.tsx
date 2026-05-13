"use client"

import * as React from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { logoutAction } from "@/actions/auth"

type PortalHeaderProps = {
  client: { id: string; name: string }
  userName: string
  userEmail: string
}

function shortCode(clientId: string) {
  const tail = clientId.slice(-6).toUpperCase()
  return `CL-${tail}`
}

export function PortalHeader({ client, userName, userEmail }: PortalHeaderProps) {
  const [pending, start] = React.useTransition()
  const code = shortCode(client.id)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-8">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg font-bold text-lg">
          k
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-widest text-fg-subtle">
            ◆ {code} · PORTAL
          </p>
          <p className="truncate text-sm font-semibold leading-tight">{client.name}</p>
        </div>
        <div className="hidden sm:block min-w-0 text-right">
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            {userName}
          </p>
          <p className="truncate text-xs text-fg-muted">{userEmail}</p>
        </div>
        <ThemeToggle />
        <form action={() => start(async () => { await logoutAction() })}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="gap-1.5"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest">
              Salir
            </span>
          </Button>
        </form>
      </div>
    </header>
  )
}
