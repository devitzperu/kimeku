"use client"

import * as React from "react"
import { Workflow, Building2, Clock, CheckCircle2, ListTodo, Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { EmptyState } from "@/components/layout/empty-state"
import { PortalCard } from "@/components/portal/portal-card"
import { PortalDrawer } from "@/components/portal/portal-drawer"
import { PortalStatusBar } from "@/components/portal/portal-status-bar"
import { cn } from "@/lib/utils"
import type { PortalTodoView, PortalEvent } from "@/lib/portal-events"

type StreamStatus = "connecting" | "live" | "reconnecting" | "polling"

type PortalDashboardProps = {
  initial: PortalTodoView[]
  clientCode: string
}

export function PortalDashboard({ initial, clientCode }: PortalDashboardProps) {
  const [todos, setTodos] = React.useState<PortalTodoView[]>(initial)
  const [status, setStatus] = React.useState<StreamStatus>("connecting")
  const [lastUpdate, setLastUpdate] = React.useState<Date>(() => new Date())
  const [highlightId, setHighlightId] = React.useState<string | null>(null)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const todosRef = React.useRef(initial)

  React.useEffect(() => {
    todosRef.current = todos
  }, [todos])

  React.useEffect(() => {
    let es: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let alive = true

    function applyEvent(prev: PortalTodoView[], ev: PortalEvent) {
      if (ev.type === "todo:upsert") {
        const idx = prev.findIndex((t) => t.id === ev.todo.id)
        const next = idx === -1 ? [ev.todo, ...prev] : prev.slice()
        if (idx !== -1) next[idx] = ev.todo
        return next.sort(sortPortalTodos)
      }
      return prev.filter((t) => t.id !== ev.id)
    }

    async function refetch() {
      try {
        const res = await fetch("/api/portal/list", { cache: "no-store" })
        if (!res.ok) return
        const body = (await res.json()) as { todos: PortalTodoView[] }
        if (!alive) return
        setTodos(body.todos.sort(sortPortalTodos))
        setLastUpdate(new Date())
      } catch {
        /* ignore */
      }
    }

    function startPolling() {
      if (pollTimer) return
      pollTimer = setInterval(refetch, 10_000)
    }

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }

    function markLive() {
      setStatus("live")
      stopPolling()
      refetch()
    }

    function connect() {
      if (!alive) return
      setStatus((s) => (s === "polling" ? "reconnecting" : s))
      es = new EventSource("/api/portal/stream")
      es.onopen = markLive
      es.addEventListener("ready", markLive)
      es.addEventListener("ping", () => setLastUpdate(new Date()))
      es.onmessage = (msg) => {
        if (!msg.data) return
        try {
          const data = JSON.parse(msg.data) as PortalEvent
          setTodos((prev) => applyEvent(prev, data))
          setLastUpdate(new Date())
          if (data.type === "todo:upsert") {
            setHighlightId(data.todo.id)
            window.setTimeout(() => setHighlightId(null), 1200)
          }
        } catch {
          /* ignore non-json */
        }
      }
      es.onerror = () => {
        es?.close()
        es = null
        setStatus("polling")
        startPolling()
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(connect, 5_000)
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") refetch()
    }

    connect()
    // Always-on safety polling at 5s — covers SSE drops and serverless gaps.
    const safetyPoll = setInterval(refetch, 5_000)
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", refetch)

    return () => {
      alive = false
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      clearInterval(safetyPoll)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", refetch)
      stopPolling()
    }
  }, [])

  const pending = todos.filter((t) => t.status === "PENDING")
  const inProgress = todos.filter((t) => t.status === "IN_PROGRESS")
  const completed = todos.filter((t) => t.status === "COMPLETED")
  const totalActive = pending.length + inProgress.length
  const openTodo = openId ? todos.find((t) => t.id === openId) ?? null : null

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <section className="space-y-3 border-b border-border pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-3">
              <h1 className="font-semibold text-3xl md:text-4xl tracking-tight leading-tight">
                Actividades
              </h1>
              <span className="font-mono text-xs md:text-sm uppercase tracking-widest text-fg-subtle">
                ◆ {totalActive} activas
              </span>
            </div>
            <p className="max-w-2xl text-base text-fg-muted">
              Lo que el equipo está ejecutando para ti, en vivo.
            </p>
          </div>
          <OnlineIndicator status={status} />
        </div>

        <div className="grid grid-cols-3 gap-2 md:hidden">
          <Stat count={pending.length} label="Pend." icon={<Clock className="h-3.5 w-3.5" />} />
          <Stat count={inProgress.length} label="Curso" icon={<Loader2 className="h-3.5 w-3.5" />} />
          <Stat count={completed.length} label="Hechas" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        </div>
      </section>

      <div className="hidden md:grid md:grid-cols-3 md:gap-4">
        <Column
          tone="pending"
          title="PENDIENTES"
          count={pending.length}
          todos={pending}
          highlightId={highlightId}
          onOpen={setOpenId}
        />
        <Column
          tone="inprogress"
          title="EN CURSO"
          count={inProgress.length}
          todos={inProgress}
          highlightId={highlightId}
          onOpen={setOpenId}
        />
        <Column
          tone="completed"
          title="COMPLETADAS · 30D"
          count={completed.length}
          todos={completed}
          highlightId={highlightId}
          onOpen={setOpenId}
        />
      </div>

      <div className="md:hidden">
        <Tabs defaultValue={inProgress.length > 0 ? "inprogress" : "pending"}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Pend.</span>
              <span className="font-mono text-[10px]">{pending.length}</span>
            </TabsTrigger>
            <TabsTrigger value="inprogress" className="flex-1 gap-1.5">
              <Loader2 className="h-3.5 w-3.5" />
              <span>Curso</span>
              <span className="font-mono text-[10px]">{inProgress.length}</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Hechas</span>
              <span className="font-mono text-[10px]">{completed.length}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4 space-y-2">
            {pending.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="h-5 w-5" />}
                title="Sin actividades pendientes"
                description="Cuando el equipo agregue una, aparecerá aquí en vivo."
              />
            ) : (
              pending.map((t, i) => (
                <PortalCard
                  key={t.id}
                  todo={t}
                  tone="pending"
                  highlight={highlightId === t.id}
                  index={i}
                  onOpen={() => setOpenId(t.id)}
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="inprogress" className="mt-4 space-y-2">
            {inProgress.length === 0 ? (
              <EmptyState
                icon={<Loader2 className="h-5 w-5" />}
                title="Sin actividades en curso"
                description="Cuando el equipo inicie una, aparecerá aquí en vivo."
              />
            ) : (
              inProgress.map((t, i) => (
                <PortalCard
                  key={t.id}
                  todo={t}
                  tone="inprogress"
                  highlight={highlightId === t.id}
                  index={i}
                  onOpen={() => setOpenId(t.id)}
                />
              ))
            )}
          </TabsContent>
          <TabsContent value="completed" className="mt-4 space-y-2">
            {completed.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="Sin completadas en 30 días"
                description="Aún no hay cierres recientes."
              />
            ) : (
              completed.map((t, i) => (
                <PortalCard
                  key={t.id}
                  todo={t}
                  tone="completed"
                  highlight={highlightId === t.id}
                  index={i}
                  onOpen={() => setOpenId(t.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PortalDrawer
        todo={openTodo}
        clientCode={clientCode}
        open={!!openTodo}
        onOpenChange={(o) => {
          if (!o) setOpenId(null)
        }}
      />

      <PortalStatusBar status={status} lastUpdate={lastUpdate} clientCode={clientCode} />
    </div>
  )
}

function Column({
  tone,
  title,
  count,
  todos,
  highlightId,
  onOpen,
}: {
  tone: "pending" | "inprogress" | "completed"
  title: string
  count: number
  todos: PortalTodoView[]
  highlightId: string | null
  onOpen: (id: string) => void
}) {
  const Icon = tone === "inprogress" ? Loader2 : tone === "pending" ? Workflow : Building2
  const emptyText =
    tone === "inprogress"
      ? "Aún nadie ha empezado una actividad."
      : tone === "pending"
        ? "Sin pendientes. Aparecerán en vivo cuando el equipo las cree."
        : "Sin cierres en los últimos 30 días."
  return (
    <section className="flex flex-col rounded-lg border border-border bg-bg-elevated">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
          ◆ {String(count).padStart(2, "0")} {title}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 text-fg-subtle",
            tone === "inprogress" && "animate-spin text-warning"
          )}
          aria-hidden
        />
      </header>
      <div className="space-y-2 p-3 min-h-50">
        {todos.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">
            {emptyText}
          </div>
        ) : (
          todos.map((t, i) => (
            <PortalCard
              key={t.id}
              todo={t}
              tone={tone}
              highlight={highlightId === t.id}
              index={i}
              onOpen={() => onOpen(t.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function Stat({ count, label, icon }: { count: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-bg-elevated px-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-bg-muted text-fg-muted">
        {icon}
      </div>
      <div>
        <p className="font-mono text-3xl font-semibold leading-none tabular-nums">
          {String(count).padStart(2, "0")}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          {label}
        </p>
      </div>
    </div>
  )
}

function OnlineIndicator({ status }: { status: StreamStatus }) {
  const color =
    status === "live"
      ? "var(--success)"
      : status === "polling"
        ? "var(--warning)"
        : status === "reconnecting"
          ? "var(--warning)"
          : "var(--fg-subtle)"
  const label =
    status === "live"
      ? "en línea"
      : status === "polling"
        ? "respaldo activo"
        : status === "reconnecting"
          ? "reconectando"
          : "conectando"
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full animate-pulse-soft"
        style={{ background: color }}
        aria-hidden
      />
      <span className="font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
        {label}
      </span>
    </div>
  )
}

const STATUS_ORDER: Record<PortalTodoView["status"], number> = {
  PENDING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  CANCELLED: 3,
}

function sortPortalTodos(a: PortalTodoView, b: PortalTodoView) {
  if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  const aDate = a.dueAt ?? a.completedAt
  const bDate = b.dueAt ?? b.completedAt
  if (!aDate && !bDate) return 0
  if (!aDate) return 1
  if (!bDate) return -1
  return new Date(aDate).getTime() - new Date(bDate).getTime()
}
