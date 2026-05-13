"use client"

import { LogOut, User as UserIcon, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logoutAction } from "@/actions/auth"
import type { Session } from "next-auth"

export function UserMenu({ session }: { session: Session }) {
  const initials = (session.user.name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menú de usuario">
          <Avatar className="h-7 w-7">
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
            <AvatarFallback className="bg-accent-subtle text-accent">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <p className="font-sans normal-case tracking-normal text-sm text-fg">{session.user.name}</p>
          <p className="font-mono text-[10px] tracking-normal normal-case text-fg-subtle">
            {session.user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-fg-muted">
            Rol: {session.user.role}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/configuracion/perfil" className="cursor-pointer">
            <UserIcon className="mr-2 h-3.5 w-3.5" />
            <span className="font-sans normal-case tracking-normal">Mi perfil</span>
          </a>
        </DropdownMenuItem>
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span className="font-sans normal-case tracking-normal">Cerrar sesión</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
