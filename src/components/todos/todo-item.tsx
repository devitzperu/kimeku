"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Repeat, Bell, Workflow, MoreVertical, Trash, Play, Pause, Square, Eye, EyeOff, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  completeTodo,
  reopenTodo,
  startTodo,
  pauseTodo,
  deleteTodo,
  startHistorialFromTodo,
  setTodoVisibility,
  listClientsForSelect,
} from "@/actions/todos"
import { broadcastTodoChange } from "@/components/todos/dashboard-todos-provider"
import { TransitionReasonDialog } from "@/components/todos/transition-reason-dialog"
import { TRANSITION_META, type TransitionAction } from "@/components/todos/transition-meta"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

export type TodoItemView = {
  id: string
  title: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  priority: number
  dueAt: Date | null
  alarmAt: Date | null
  rrule: string | null
  processId: string | null
  occurrenceDate: Date | null
  isOccurrence: boolean
  tags: { tag: { id: string; name: string; color: string } }[]
  visibleToClient?: boolean
  clientId?: string | null
  clientName?: string | null
}

const PRIORITY_LABEL = ["", "Alta", "Urgente"]
const PRIORITY_VARIANT = ["default", "warning", "danger"] as const

interface TodoItemProps {
  todo: TodoItemView
  readOnly?: boolean
}

export function TodoItem({ todo, readOnly }: TodoItemProps) {
  const router = useRouter()
  const [pending, start] = React.useTransition()
  const [pendingAction, setPendingAction] = React.useState<TransitionAction | null>(null)
  const completed = todo.status === "COMPLETED"
  const inProgress = todo.status === "IN_PROGRESS"

  function onPlay() {
    setPendingAction("start")
  }
  function onPause() {
    setPendingAction("pause")
  }
  function onStop() {
    setPendingAction("complete")
  }
  function onReopen() {
    setPendingAction("reopen")
  }

  function executeAction(reason: string | null) {
    if (!pendingAction) return
    const occ = todo.isOccurrence ? todo.occurrenceDate ?? undefined : undefined
    const run =
      pendingAction === "start"
        ? () => startTodo(todo.id, reason)
        : pendingAction === "pause"
        ? () => pauseTodo(todo.id, reason)
        : pendingAction === "complete"
        ? () => completeTodo(todo.id, occ, reason)
        : () => reopenTodo(todo.id, reason)
    start(async () => {
      const res = await run()
      if (!res.ok) {
        toast.error(res.error ?? "Error")
      } else {
        broadcastTodoChange()
      }
      setPendingAction(null)
      router.refresh()
    })
  }

  function onDelete() {
    if (!confirm("¿Eliminar este pendiente?")) return
    start(async () => {
      const res = await deleteTodo(todo.id)
      if (!res.ok) toast.error(res.error)
      else {
        broadcastTodoChange()
        router.refresh()
      }
    })
  }

  function onStartHistorial() {
    start(async () => {
      const res = await startHistorialFromTodo(todo.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const id = (res.data as { historialId: string } | undefined)?.historialId
      if (id) router.push(`/historial/${id}`)
    })
  }

  return (
    <div className="group flex items-start gap-3 rounded-md border border-border bg-bg-elevated px-3 py-2.5 hover:border-accent-border transition-colors">
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        {completed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending || readOnly}
            onClick={onReopen}
            title="Reabrir"
            className="text-success"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          </Button>
        ) : (
          <>
            {inProgress ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending || readOnly}
                onClick={onPause}
                title="Pausar"
                className="text-warning"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={pending || readOnly}
                onClick={onPlay}
                title="Reanudar"
                className="text-accent"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={pending || readOnly}
              onClick={onStop}
              title="Marcar como completada"
              className="text-fg-muted hover:text-success"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {inProgress && (
              <Badge variant="warning" className="shrink-0 gap-1 font-mono text-[10px] uppercase tracking-wider">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning animate-pulse-soft" />
                en curso
              </Badge>
            )}
            <Link
              href={`/todos/${todo.id}`}
              className={`text-sm leading-snug truncate ${completed ? "line-through text-fg-muted" : ""}`}
            >
              {todo.title}
            </Link>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1">
              <ClientVisibilityToggle todo={todo} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {todo.processId && (
                    <DropdownMenuItem onSelect={onStartHistorial}>
                      <Play className="h-3.5 w-3.5" />
                      Iniciar Historial
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onDelete} className="text-danger">
                    <Trash className="h-3.5 w-3.5" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-fg-subtle">
          {todo.occurrenceDate && (
            <span>{formatDateTime(todo.occurrenceDate)}</span>
          )}
          {todo.alarmAt && (
            <span className="inline-flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {formatDateTime(todo.alarmAt)}
            </span>
          )}
          {todo.rrule && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              recurrente
            </span>
          )}
          {todo.processId && (
            <span className="inline-flex items-center gap-1">
              <Workflow className="h-3 w-3" />
              proceso
            </span>
          )}
          {todo.priority > 0 && (
            <Badge variant={PRIORITY_VARIANT[todo.priority]}>
              {PRIORITY_LABEL[todo.priority]}
            </Badge>
          )}
          {todo.visibleToClient && todo.clientName && (
            <Badge variant="outline" className="gap-1 border-accent-border text-accent">
              <Eye className="h-3 w-3" />
              {todo.clientName}
            </Badge>
          )}
          {todo.tags.map(({ tag }) => (
            <Badge key={tag.id} style={{ borderColor: tag.color, color: tag.color }} variant="outline">
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
      <TransitionReasonDialog
        open={!!pendingAction}
        title={pendingAction ? TRANSITION_META[pendingAction].title : ""}
        description={pendingAction ? TRANSITION_META[pendingAction].description : undefined}
        confirmLabel={pendingAction ? TRANSITION_META[pendingAction].confirmLabel : ""}
        pending={pending}
        onCancel={() => setPendingAction(null)}
        onConfirm={executeAction}
      />
    </div>
  )
}

function ClientVisibilityToggle({ todo }: { todo: TodoItemView }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  const [clients, setClients] = React.useState<{ id: string; name: string }[] | null>(null)
  const [selectedClient, setSelectedClient] = React.useState<string>(todo.clientId ?? "")
  const visible = !!todo.visibleToClient

  async function ensureClients() {
    if (clients) return
    const res = await listClientsForSelect()
    if (res.ok && res.data) setClients(res.data)
  }

  function commit(newVisible: boolean, clientId: string | null) {
    start(async () => {
      const res = await setTodoVisibility(todo.id, newVisible, clientId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      broadcastTodoChange()
      setOpen(false)
      router.refresh()
    })
  }

  function onClick() {
    if (visible) {
      commit(false, null)
      return
    }
    if (todo.clientId) {
      commit(true, todo.clientId)
      return
    }
    ensureClients()
    setOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) ensureClients() }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          disabled={pending}
          title={visible ? "Ocultar para cliente" : "Mostrar a un cliente"}
          className={cn(
            "transition-opacity",
            visible
              ? "text-accent opacity-100"
              : "text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-accent"
          )}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
            Asignar cliente
          </p>
          <p className="text-xs text-fg-muted">
            Elige el cliente que verá esta actividad en su portal.
          </p>
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger>
            <SelectValue placeholder={clients ? "Seleccionar cliente" : "Cargando…"} />
          </SelectTrigger>
          <SelectContent>
            {(clients ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!selectedClient || pending}
            onClick={() => commit(true, selectedClient)}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Activar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
