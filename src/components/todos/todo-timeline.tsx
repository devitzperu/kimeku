"use client"

import * as React from "react"
import { CirclePlus, Play, Pause, CheckCircle2, RotateCcw, Ban, History, Loader2 } from "lucide-react"
import type { TodoEventType } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { MarkdownView } from "@/components/shared/markdown-view"
import { listTodoEvents, type TodoEventView } from "@/actions/todos"

interface TodoTimelineProps {
  todoId: string
  /** Bump para forzar refetch (cambiar este número tras una transición). */
  refreshKey?: number
}

const TYPE_META: Record<TodoEventType, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  CREATED: { label: "Creada", icon: CirclePlus, tone: "text-fg-muted" },
  STARTED: { label: "Iniciada", icon: Play, tone: "text-info" },
  PAUSED: { label: "Pausada", icon: Pause, tone: "text-warning" },
  COMPLETED: { label: "Completada", icon: CheckCircle2, tone: "text-success" },
  REOPENED: { label: "Reabierta", icon: RotateCcw, tone: "text-info" },
  CANCELLED: { label: "Cancelada", icon: Ban, tone: "text-danger" },
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

export function TodoTimeline({ todoId, refreshKey = 0 }: TodoTimelineProps) {
  const [events, setEvents] = React.useState<TodoEventView[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    listTodoEvents(todoId).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        setError(res.error)
        setEvents([])
      } else {
        const list = (res.data ?? []).map((e) => ({ ...e, createdAt: new Date(e.createdAt) }))
        setEvents(list)
        setError(null)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [todoId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger">{error}</p>
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-10 text-center">
        <History className="h-5 w-5 text-fg-subtle" />
        <p className="text-sm text-fg-muted">Sin eventos registrados</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          Las transiciones futuras quedarán aquí
        </p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-3 border-l border-border pl-6">
      {events.map((ev) => {
        const meta = TYPE_META[ev.type]
        const Icon = meta.icon
        return (
          <li key={ev.id} className="relative">
            <span
              className="absolute -left-[35px] top-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-elevated"
              aria-hidden
            >
              <Icon className={`h-3.5 w-3.5 ${meta.tone}`} />
            </span>
            <div className="space-y-1 rounded-md border border-border bg-elevated px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className={`text-sm font-medium ${meta.tone}`}>{meta.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {formatDateTime(ev.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                <span>{ev.actor.name}</span>
              </div>
              {ev.reason && (
                <div className="rounded-sm border-l-2 border-border-strong bg-muted/40 px-2 py-1.5 text-xs text-fg">
                  <MarkdownView source={ev.reason} />
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Botón pequeño dentro del tab para refrescar manualmente. */
export function TodoTimelineRefresh({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onRefresh} className="text-xs">
      <RotateCcw className="h-3.5 w-3.5" />
      Refrescar
    </Button>
  )
}
