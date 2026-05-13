"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FileText, ListTodo, NotebookPen, Building2, Search } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { searchAction, type SearchHit, type SearchHitType } from "@/actions/search"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 1500

const TYPE_META: Record<
  SearchHitType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  process: { label: "Procesos", icon: FileText },
  todo: { label: "TODOs", icon: ListTodo },
  bitacora: { label: "Bitácora", icon: NotebookPen },
  client: { label: "Clientes", icon: Building2 },
}

function groupHits(hits: SearchHit[]): Map<SearchHitType, SearchHit[]> {
  const map = new Map<SearchHitType, SearchHit[]>()
  for (const h of hits) {
    const list = map.get(h.type) ?? []
    list.push(h)
    map.set(h.type, list)
  }
  return map
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [loading, setLoading] = React.useState(false)
  const reqId = React.useRef(0)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  React.useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setHits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const myId = ++reqId.current
    const t = setTimeout(async () => {
      try {
        const result = await searchAction(trimmed)
        if (reqId.current !== myId) return
        setHits(result)
      } finally {
        if (reqId.current === myId) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  const grouped = React.useMemo(() => groupHits(hits), [hits])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const goNew = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 text-fg-subtle font-normal"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar procesos, bitácora…</span>
        <span className="sm:hidden">Buscar</span>
        <kbd className="ml-auto hidden sm:flex items-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar procesos, bitácora, TODOs, clientes…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 && !loading && (
            <CommandGroup heading="Acciones rápidas">
              <CommandItem onSelect={() => goNew("/procesos/new")}>
                <FileText className="text-fg-subtle" />
                Crear proceso
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => goNew("/todos/new")}>
                <ListTodo className="text-fg-subtle" />
                Nuevo TODO
                <CommandShortcut>⌘T</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => goNew("/bitacora/new")}>
                <NotebookPen className="text-fg-subtle" />
                Nueva bitácora
              </CommandItem>
              <CommandItem onSelect={() => goNew("/clientes")}>
                <Building2 className="text-fg-subtle" />
                Ir a clientes
              </CommandItem>
            </CommandGroup>
          )}

          {loading && <SearchSkeleton />}

          {!loading && query.trim().length >= 2 && hits.length === 0 && (
            <CommandEmpty>Sin resultados para “{query}”</CommandEmpty>
          )}

          {!loading &&
            Array.from(grouped.entries()).map(([type, items]) => {
              const meta = TYPE_META[type]
              const Icon = meta.icon
              return (
                <CommandGroup key={type} heading={meta.label}>
                  {items.map((hit) => (
                    <CommandItem
                      key={`${type}-${hit.id}`}
                      value={`${hit.title} ${hit.subtitle ?? ""} ${type}`}
                      onSelect={() => go(hit.href)}
                    >
                      <Icon className="text-fg-subtle shrink-0" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="truncate text-xs text-fg-subtle">
                            {hit.subtitle}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
        </CommandList>
      </CommandDialog>
    </>
  )
}

function SearchSkeleton() {
  return (
    <div className="p-2 space-y-1" aria-busy="true" aria-label="Cargando resultados">
      <SkeletonHeading />
      <SkeletonRow widthClass="w-3/5" />
      <SkeletonRow widthClass="w-4/5" />
      <SkeletonRow widthClass="w-2/4" />
      <SkeletonHeading />
      <SkeletonRow widthClass="w-3/4" />
      <SkeletonRow widthClass="w-2/5" />
    </div>
  )
}

function SkeletonHeading() {
  return (
    <div className="px-3 pt-3 pb-1.5">
      <div
        className={cn(
          "h-3 w-20 rounded bg-bg-muted",
          "animate-[pulse_1.6s_ease-in-out_infinite]"
        )}
      />
    </div>
  )
}

function SkeletonRow({ widthClass }: { widthClass: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-2.5">
      <div
        className={cn(
          "h-4 w-4 rounded bg-bg-muted shrink-0",
          "animate-[pulse_1.6s_ease-in-out_infinite]"
        )}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div
          className={cn(
            "h-3 rounded bg-bg-muted",
            widthClass,
            "animate-[pulse_1.6s_ease-in-out_infinite]"
          )}
        />
        <div
          className={cn(
            "h-2.5 w-1/3 rounded bg-bg-muted/60",
            "animate-[pulse_1.6s_ease-in-out_infinite] [animation-delay:120ms]"
          )}
        />
      </div>
    </div>
  )
}
