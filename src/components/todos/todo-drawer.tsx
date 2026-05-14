"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Check, Workflow, Trash, Bell, Eye } from "lucide-react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { CreatableMultiSelect } from "@/components/shared/creatable-multi-select"
import { createTag } from "@/actions/tags"
import { RecurrencePicker } from "@/components/todos/recurrence-picker"
import { StartHistorialButton } from "@/components/todos/start-historial-button"
import { TodoTimeline } from "@/components/todos/todo-timeline"
import { TransitionReasonDialog } from "@/components/todos/transition-reason-dialog"
import {
  patchTodo,
  completeTodo,
  reopenTodo,
  deleteTodo,
} from "@/actions/todos"
import type { TodoPatchInput } from "@/lib/validations/todo"

type TodoStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface TodoDrawerProps {
  initial: {
    id: string
    title: string
    description: string | null
    dueAt: Date | null
    alarmAt: Date | null
    priority: number
    rrule: string | null
    rruleUntil: Date | null
    processId: string | null
    tagIds: string[]
    process: { id: string; title: string } | null
    owner: { id: string; name: string }
    status: TodoStatus
    visibleToClient: boolean
    clientId: string | null
  }
  processes: { id: string; title: string }[]
  tags: { id: string; name: string; color?: string }[]
  clients: { id: string; name: string }[]
  readOnly: boolean
}

type SaveStatus = "idle" | "saving" | "saved" | "error"

function toLocalInput(d: Date | null): string {
  if (!d) return ""
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16)
}

function toDateInput(d: Date | null): string {
  if (!d) return ""
  return d.toISOString().slice(0, 10)
}

function formatSavedTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function TodoDrawer({ initial, processes, tags, clients, readOnly }: TodoDrawerProps) {
  const router = useRouter()

  const [title, setTitle] = React.useState(initial.title)
  const [description, setDescription] = React.useState(initial.description ?? "")
  const [dueAt, setDueAt] = React.useState<Date | null>(initial.dueAt)
  const [alarmAt, setAlarmAt] = React.useState<Date | null>(initial.alarmAt)
  const [priority, setPriority] = React.useState(initial.priority)
  const [rrule, setRrule] = React.useState<string | null>(initial.rrule)
  const [rruleUntil, setRruleUntil] = React.useState<Date | null>(initial.rruleUntil)
  const [processId, setProcessId] = React.useState<string | null>(initial.processId)
  const [tagIds, setTagIds] = React.useState<string[]>(initial.tagIds)
  const [tagOptions, setTagOptions] = React.useState(tags)
  React.useEffect(() => setTagOptions(tags), [tags])
  const [status, setStatus] = React.useState<TodoStatus>(initial.status)
  const [visibleToClient, setVisibleToClient] = React.useState<boolean>(initial.visibleToClient)
  const [clientId, setClientId] = React.useState<string | null>(initial.clientId)

  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null)

  const lastSaved = React.useRef({
    title: initial.title,
    description: initial.description ?? "",
  })

  const descTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const tagsTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const customRruleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [pending, start] = React.useTransition()
  const [actionPending, startAction] = React.useTransition()
  const [transitionOpen, setTransitionOpen] = React.useState(false)
  const [timelineKey, setTimelineKey] = React.useState(0)

  const savePatch = React.useCallback(
    (patch: TodoPatchInput) => {
      if (readOnly) return
      setSaveStatus("saving")
      start(async () => {
        const res = await patchTodo(initial.id, patch)
        if (!res.ok) {
          setSaveStatus("error")
          toast.error(res.error, { id: `patch-${initial.id}` })
          return
        }
        setSaveStatus("saved")
        setLastSavedAt(new Date().toISOString())
        router.refresh()
      })
    },
    [initial.id, readOnly, router]
  )

  function onTitleBlur() {
    if (readOnly) return
    if (title.trim() === lastSaved.current.title) return
    if (title.trim().length === 0) {
      setTitle(lastSaved.current.title)
      toast.error("El título no puede estar vacío")
      return
    }
    lastSaved.current.title = title.trim()
    savePatch({ title: title.trim() })
  }

  function onDescriptionChange(val: string) {
    setDescription(val)
    if (readOnly) return
    if (descTimerRef.current) clearTimeout(descTimerRef.current)
    descTimerRef.current = setTimeout(() => {
      if (val === lastSaved.current.description) return
      lastSaved.current.description = val
      savePatch({ description: val || null })
    }, 800)
  }

  function onDueAtChange(v: string) {
    const d = v ? new Date(v) : null
    setDueAt(d)
    savePatch({ dueAt: d })
  }

  function onAlarmAtChange(v: string) {
    const d = v ? new Date(v) : null
    setAlarmAt(d)
    savePatch({ alarmAt: d })
  }

  function onPriorityChange(v: string) {
    const n = Number(v)
    setPriority(n)
    savePatch({ priority: n })
  }

  function onProcessChange(v: string) {
    const id = v === "_none" ? null : v
    setProcessId(id)
    savePatch({ processId: id })
  }

  function onTagsChange(vals: string[]) {
    setTagIds(vals)
    if (tagsTimerRef.current) clearTimeout(tagsTimerRef.current)
    tagsTimerRef.current = setTimeout(() => {
      savePatch({ tagIds: vals })
    }, 300)
  }

  function onRruleChange(v: string | null) {
    setRrule(v)
    if (customRruleTimerRef.current) clearTimeout(customRruleTimerRef.current)
    customRruleTimerRef.current = setTimeout(() => {
      savePatch({ rrule: v })
    }, 400)
  }

  function onRruleUntilChange(d: Date | null) {
    setRruleUntil(d)
    savePatch({ rruleUntil: d })
  }

  function onToggleStatus() {
    if (readOnly) return
    setTransitionOpen(true)
  }

  function confirmTransition(reason: string | null) {
    startAction(async () => {
      const next: TodoStatus = status === "COMPLETED" ? "PENDING" : "COMPLETED"
      const res =
        status === "COMPLETED"
          ? await reopenTodo(initial.id, reason)
          : await completeTodo(initial.id, undefined, reason)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setStatus(next)
      setTransitionOpen(false)
      setTimelineKey((k) => k + 1)
      router.refresh()
    })
  }

  function onDelete() {
    if (readOnly) return
    if (!confirm("¿Eliminar este pendiente?")) return
    startAction(async () => {
      const res = await deleteTodo(initial.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      router.push("/todos")
    })
  }

  function flushPending() {
    if (descTimerRef.current) {
      clearTimeout(descTimerRef.current)
      descTimerRef.current = null
      if (description !== lastSaved.current.description) {
        lastSaved.current.description = description
        savePatch({ description: description || null })
      }
    }
    if (tagsTimerRef.current) {
      clearTimeout(tagsTimerRef.current)
      tagsTimerRef.current = null
      savePatch({ tagIds })
    }
    if (customRruleTimerRef.current) {
      clearTimeout(customRruleTimerRef.current)
      customRruleTimerRef.current = null
      savePatch({ rrule })
    }
  }

  function handleClose() {
    flushPending()
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/todos")
    }
  }

  React.useEffect(() => {
    return () => {
      if (descTimerRef.current) clearTimeout(descTimerRef.current)
      if (tagsTimerRef.current) clearTimeout(tagsTimerRef.current)
      if (customRruleTimerRef.current) clearTimeout(customRruleTimerRef.current)
    }
  }, [])

  const completed = status === "COMPLETED"

  return (
    <Sheet open onOpenChange={(open) => { if (!open) handleClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pr-8">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              {readOnly ? `06 · Solo lectura — ${initial.owner.name}` : `06 · ${initial.owner.name}`}
            </p>
            <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} pending={pending} />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={completed}
              disabled={readOnly || actionPending}
              onCheckedChange={onToggleStatus}
              className="mt-2"
            />
            <SheetTitle className="flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={onTitleBlur}
                disabled={readOnly}
                maxLength={200}
                className={`font-bold! text-2xl! leading-tight! border-0 px-0 shadow-none focus-visible:ring-0 ${completed ? "line-through text-fg-muted" : ""}`}
                placeholder="Título"
              />
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Editar pendiente. Los cambios se guardan automáticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {initial.processId && <StartHistorialButton todoId={initial.id} />}
              {initial.process && (
                <Button asChild variant="outline">
                  <Link href={`/procesos/${initial.process.id}`}>
                    <Workflow className="h-4 w-4" />
                    Ver proceso
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onDelete}
                disabled={actionPending}
                className="text-danger hover:text-danger"
              >
                <Trash className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          )}

          <Tabs defaultValue="main">
            <TabsList>
              <TabsTrigger value="main">Principal</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="drawer-dueAt">Fecha límite</Label>
                  <Input
                    id="drawer-dueAt"
                    type="date"
                    value={toDateInput(dueAt)}
                    onChange={(e) => onDueAtChange(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="drawer-alarmAt">Alarma</Label>
                  <Input
                    id="drawer-alarmAt"
                    type="datetime-local"
                    value={toLocalInput(alarmAt)}
                    onChange={(e) => onAlarmAtChange(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridad</Label>
                  <Select
                    value={String(priority)}
                    onValueChange={onPriorityChange}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal</SelectItem>
                      <SelectItem value="1">Alta</SelectItem>
                      <SelectItem value="2">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Proceso vinculado</Label>
                  <Select
                    value={processId ?? "_none"}
                    onValueChange={onProcessChange}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Sin proceso</SelectItem>
                      {processes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Etiquetas</Label>
                  <CreatableMultiSelect
                    options={tagOptions.map((t) => ({ value: t.id, label: t.name, color: t.color }))}
                    selected={tagIds}
                    onChange={onTagsChange}
                    placeholder="Seleccionar etiquetas…"
                    canCreate={!readOnly}
                    createLabel={(q) => `Crear etiqueta "${q}"`}
                    onCreate={async (name) => {
                      const fd = new FormData()
                      fd.set("name", name)
                      const res = await createTag(fd)
                      if (!res.ok) {
                        toast.error(res.error)
                        return null
                      }
                      setTagOptions((prev) => [
                        ...prev,
                        { id: res.data.id, name: res.data.name, color: res.data.color },
                      ])
                      toast.success("Etiqueta creada")
                      return { value: res.data.id, label: res.data.name, color: res.data.color }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Recurrencia</Label>
                <RecurrencePicker
                  value={rrule}
                  onChange={onRruleChange}
                  rruleUntil={rruleUntil}
                  onRruleUntilChange={onRruleUntilChange}
                />
              </div>

              <div className="space-y-3 rounded-md border border-border bg-bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Visible para cliente
                    </Label>
                    <p className="text-xs text-fg-muted">
                      Si está activo, el cliente verá esta actividad en su portal.
                    </p>
                  </div>
                  <Switch
                    checked={visibleToClient}
                    disabled={readOnly}
                    onCheckedChange={(c) => {
                      setVisibleToClient(c)
                      if (!c) {
                        setClientId(null)
                        savePatch({ visibleToClient: false, clientId: null })
                      } else if (clientId) {
                        savePatch({ visibleToClient: true, clientId })
                      }
                    }}
                  />
                </div>
                {visibleToClient && (
                  <div className="space-y-1.5">
                    <Label>Cliente</Label>
                    <Select
                      value={clientId ?? ""}
                      onValueChange={(v) => {
                        const id = v || null
                        setClientId(id)
                        if (id) savePatch({ visibleToClient: true, clientId: id })
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={clients.length === 0 ? "Sin clientes registrados" : "Seleccionar cliente"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {alarmAt && (
                <p className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                  <Bell className="h-3.5 w-3.5" />
                  Alarma activa: {alarmAt.toLocaleString()}
                </p>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-1.5">
              <Label htmlFor="drawer-description">Notas</Label>
              <MarkdownEditor
                value={description}
                onChange={onDescriptionChange}
                placeholder="Contexto, links, criterios…"
                height={420}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
                  Eventos · más reciente arriba · solo lectura
                </p>
              </div>
              <TodoTimeline todoId={initial.id} refreshKey={timelineKey} />
            </TabsContent>
          </Tabs>
        </div>

        <TransitionReasonDialog
          open={transitionOpen}
          title={completed ? "Reabrir actividad" : "Completar actividad"}
          description={
            completed
              ? "Se registrará un evento REOPENED en el historial."
              : "Se registrará un evento COMPLETED en el historial."
          }
          confirmLabel={completed ? "Reabrir" : "Completar"}
          pending={actionPending}
          onCancel={() => setTransitionOpen(false)}
          onConfirm={confirmTransition}
        />
      </SheetContent>
    </Sheet>
  )
}

function SaveIndicator({
  status,
  lastSavedAt,
  pending,
}: {
  status: SaveStatus
  lastSavedAt: string | null
  pending: boolean
}) {
  const showSaving = status === "saving" || pending
  return (
    <div className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle inline-flex items-center gap-1.5 min-h-4">
      {showSaving && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Guardando…
        </>
      )}
      {!showSaving && status === "saved" && lastSavedAt && (
        <>
          <Check className="h-3 w-3" />
          Guardado {formatSavedTime(lastSavedAt)}
        </>
      )}
      {!showSaving && status === "error" && (
        <span className="text-danger">Error al guardar</span>
      )}
    </div>
  )
}
