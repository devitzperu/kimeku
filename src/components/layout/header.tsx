import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNav } from "@/components/layout/mobile-nav"
import { UserMenu } from "@/components/layout/user-menu"
import { GlobalSearch } from "@/components/shared/global-search"
import type { Session } from "next-auth"

export function Header({ session }: { session: Session }) {
  const role = (session.user?.role ?? "VIEWER") as "ADMIN" | "EDITOR" | "VIEWER" | "CLIENT"
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur md:px-6">
      <MobileNav role={role} />

      <div className="flex-1 max-w-md">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu session={session} />
      </div>
    </header>
  )
}
