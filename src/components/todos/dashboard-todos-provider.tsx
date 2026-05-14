"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Bell, Repeat, Workflow, X, Play, Pause, Square, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { listOwnTodos, completeTodo, startTodo, pauseTodo } from "@/actions/todos"
import { formatDateTime } from "@/lib/utils"
import { usePomodoro, PomodoroPanel, type PomodoroState } from "@/components/todos/pomodoro-widget"
import type { TodoItemView } from "@/components/todos/todo-item"
import { TransitionReasonDialog } from "@/components/todos/transition-reason-dialog"
import { TRANSITION_META, type TransitionAction } from "@/components/todos/transition-meta"

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(opts?: { width?: number; height?: number }): Promise<Window>
      window: Window | null
    }
  }
}

const PRIORITY_LABEL = ["", "Alta", "Urgente"]
const PRIORITY_VARIANT = ["default", "warning", "danger"] as const

export function broadcastTodoChange() {
  if (typeof window === "undefined") return
  try {
    const ch = new BroadcastChannel("kimeku-todos")
    ch.postMessage({ type: "todo-changed" })
    ch.close()
  } catch {
    // ignore
  }
}

interface DashboardTodosContextValue {
  pomodoro: PomodoroState
  pipSupported: boolean
  pipOpen: boolean
  openPip: () => Promise<void>
}

const DashboardTodosContext = React.createContext<DashboardTodosContextValue | null>(null)

export function useDashboardTodos() {
  const ctx = React.useContext(DashboardTodosContext)
  if (!ctx) throw new Error("useDashboardTodos must be used within DashboardTodosProvider")
  return ctx
}

export function DashboardTodosProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pomodoro = usePomodoro()
  const [pipSupported, setPipSupported] = React.useState(false)
  const [pipWin, setPipWin] = React.useState<Window | null>(null)

  React.useEffect(() => {
    setPipSupported(typeof window !== "undefined" && "documentPictureInPicture" in window)
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel("kimeku-todos")
      channel.onmessage = (ev) => {
        if (ev.data?.type === "todo-changed") router.refresh()
      }
    } catch {
      // ignore
    }
    return () => {
      channel?.close()
    }
  }, [router])

  const openPip = React.useCallback(async () => {
    if (!window.documentPictureInPicture) return
    if (window.documentPictureInPicture.window) {
      window.documentPictureInPicture.window.focus()
      return
    }
    const win = await window.documentPictureInPicture.requestWindow({ width: 360, height: 600 })

    for (const ss of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(ss.cssRules).map((r) => r.cssText).join("")
        const style = win.document.createElement("style")
        style.textContent = css
        win.document.head.appendChild(style)
      } catch {
        const href = (ss as CSSStyleSheet).href
        if (!href) continue
        const link = win.document.createElement("link")
        link.rel = "stylesheet"
        link.href = href
        win.document.head.appendChild(link)
      }
    }

    if (document.documentElement.classList.contains("dark")) {
      win.document.documentElement.classList.add("dark")
    }
    win.document.documentElement.lang = document.documentElement.lang || "es"
    win.document.body.className = document.body.className
    win.document.title = "Actividades"

    const onClose = () => {
      setPipWin(null)
      win.removeEventListener("pagehide", onClose)
    }
    win.addEventListener("pagehide", onClose)
    setPipWin(win)
  }, [])

  return (
    <DashboardTodosContext.Provider
      value={{ pomodoro, pipSupported, pipOpen: !!pipWin, openPip }}
    >
      {children}
      {pipWin
        ? createPortal(
            <PipDiarioView pipWin={pipWin} pomodoro={pomodoro} />,
            pipWin.document.body
          )
        : null}
    </DashboardTodosContext.Provider>
  )
}

interface PipDiarioViewProps {
  pipWin: Window
  pomodoro: PomodoroState
}

function PipDiarioView({ pipWin, pomodoro }: PipDiarioViewProps) {
  const [todos, setTodos] = React.useState<TodoItemView[]>([])
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<Map<string, string>>(new Map())
  const [pendingTransition, setPendingTransition] = React.useState<{
    todo: TodoItemView
    action: TransitionAction
  } | null>(null)

  const fetchTodos = React.useCallback(async () => {
    const res = await listOwnTodos()
    if (!res.ok || !res.data) return
    const mapped: TodoItemView[] = res.data.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as TodoItemView["status"],
      priority: t.priority,
      dueAt: t.dueAt,
      alarmAt: t.alarmAt,
      rrule: t.rrule,
      processId: t.processId,
      occurrenceDate: t.occurrenceDate,
      isOccurrence: t.isOccurrence,
      tags: t.tags,
      visibleToClient: t.visibleToClient,
      clientId: t.clientId,
      clientName: t.clientName ?? null,
    }))
    const active = mapped.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS")
    active.sort((a, b) => {
      if (a.status !== b.status) return a.status === "IN_PROGRESS" ? -1 : 1
      return 0
    })
    setTodos(active)
  }, [])

  React.useEffect(() => {
    fetchTodos()
    const id = setInterval(fetchTodos, 5_000)
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel("kimeku-todos")
      channel.onmessage = (ev) => {
        if (ev.data?.type === "todo-changed") fetchTodos()
      }
    } catch {
      // ignore
    }
    return () => {
      clearInterval(id)
      channel?.close()
    }
  }, [fetchTodos])

  function setErr(key: string, msg: string) {
    setErrors((m) => new Map(m).set(key, msg))
    setTimeout(() => {
      setErrors((m) => {
        const n = new Map(m)
        n.delete(key)
        return n
      })
    }, 2500)
  }

  async function run(
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>
  ) {
    setPendingId(key)
    const res = await action()
    setPendingId(null)
    if (!res.ok) {
      setErr(key, res.error ?? "Error")
      return
    }
    broadcastTodoChange()
    fetchTodos()
  }

  function onPlay(t: TodoItemView) {
    setPendingTransition({ todo: t, action: "start" })
  }
  function onPause(t: TodoItemView) {
    setPendingTransition({ todo: t, action: "pause" })
  }
  function onStop(t: TodoItemView) {
    setPendingTransition({ todo: t, action: "complete" })
  }

  function executePipTransition(reason: string | null) {
    if (!pendingTransition) return
    const { todo: t, action } = pendingTransition
    const occ = t.isOccurrence ? t.occurrenceDate ?? undefined : undefined
    const fn =
      action === "start"
        ? () => startTodo(t.id, reason)
        : action === "pause"
        ? () => pauseTodo(t.id, reason)
        : () => completeTodo(t.id, occ, reason)
    setPendingTransition(null)
    run(itemKey(t), fn)
  }

  return (
    <div className="flex h-screen flex-col bg-bg text-fg font-sans">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            ◆ {todos.length} actividades
          </p>
          <h1 className="font-semibold text-base tracking-tight leading-none mt-1">
            Actividades
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => pipWin.close()}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="border-b border-border px-3 py-2">
        <PomodoroPanel state={pomodoro} compact />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {todos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-xs text-fg-muted">
            Sin actividades.
          </p>
        ) : (
          todos.map((t) => {
            const key = itemKey(t)
            const err = errors.get(key)
            const inProgress = t.status === "IN_PROGRESS"
            const busy = pendingId === key
            return (
              <div
                key={key}
                className="flex items-start gap-2 rounded-md border border-border bg-bg-elevated px-2.5 py-2"
              >
                <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                  {inProgress ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onPause(t)}
                      disabled={busy}
                      title="Pausar"
                      className="text-warning h-6 w-6"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 fill-current" />}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onPlay(t)}
                      disabled={busy}
                      title="Reanudar"
                      className="text-accent h-6 w-6"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onStop(t)}
                    disabled={busy}
                    title="Completar"
                    className="text-fg-muted hover:text-success h-6 w-6"
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {inProgress && (
                      <Badge variant="warning" className="font-mono text-[9px] uppercase tracking-wider">
                        en curso
                      </Badge>
                    )}
                    <p className="text-sm font-semibold leading-snug">{t.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-semibold text-fg-muted">
                    {t.occurrenceDate && <span>{formatDateTime(t.occurrenceDate)}</span>}
                    {t.alarmAt && (
                      <span className="inline-flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        {formatDateTime(t.alarmAt)}
                      </span>
                    )}
                    {t.rrule && (
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                      </span>
                    )}
                    {t.processId && (
                      <span className="inline-flex items-center gap-1">
                        <Workflow className="h-3 w-3" />
                      </span>
                    )}
                    {t.priority > 0 && (
                      <Badge variant={PRIORITY_VARIANT[t.priority]}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                    )}
                    {t.visibleToClient && t.clientName && (
                      <Badge variant="outline" className="gap-1 border-accent-border text-accent font-sans normal-case tracking-normal">
                        <Eye className="h-3 w-3" />
                        {t.clientName}
                      </Badge>
                    )}
                  </div>
                  {err && <p className="text-[10px] text-danger">{err}</p>}
                </div>
              </div>
            )
          })
        )}
      </div>

      <TransitionReasonDialog
        open={!!pendingTransition}
        title={pendingTransition ? TRANSITION_META[pendingTransition.action].title : ""}
        description={
          pendingTransition ? TRANSITION_META[pendingTransition.action].description : undefined
        }
        confirmLabel={
          pendingTransition ? TRANSITION_META[pendingTransition.action].confirmLabel : ""
        }
        pending={pendingId !== null}
        onCancel={() => setPendingTransition(null)}
        onConfirm={executePipTransition}
        container={pipWin.document.body}
      />
    </div>
  )
}

function itemKey(t: TodoItemView): string {
  return t.isOccurrence && t.occurrenceDate
    ? `${t.id}-${t.occurrenceDate.toISOString()}`
    : t.id
}
