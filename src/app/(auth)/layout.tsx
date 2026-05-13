import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-bg overflow-hidden">
      <div className="bg-grid bg-grid-mask absolute inset-0 opacity-50" aria-hidden />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-bold text-2xl">kimeku</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="relative z-10 px-6 py-4 text-center font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
        documentación de procesos · open source
      </footer>
    </div>
  )
}
