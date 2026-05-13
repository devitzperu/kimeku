"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eye } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MultiSelect } from "@/components/shared/multi-select"
import { RecurrencePicker } from "@/components/todos/recurrence-picker"
import { createTodo, updateTodo } from "@/actions/todos"
import type { TodoInput } from "@/lib/validations/todo"

type ProcessOption = { id: string; title: string }
type TagOption = { id: string; name: string; color?: string }
type ClientOption = { id: string; name: string }

interface TodoFormProps {
  initial?: {
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
    visibleToClient?: boolean
    clientId?: string | null
  }
  processes: ProcessOption[]
  tags: TagOption[]
  clients: ClientOption[]
}

function toLocalInput(d: Date | null): string {
  if (!d) return ""
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16)
}

function toDateInput(d: Date | null): string {
  if (!d) return ""
  return d.toISOString().slice(0, 10)
}

export function TodoForm({ initial, processes, tags, clients }: TodoFormProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initial?.title ?? "")
  const [description, setDescription] = React.useState(initial?.description ?? "")
  const [dueAt, setDueAt] = React.useState<Date | null>(initial?.dueAt ?? null)
  const [alarmAt, setAlarmAt] = React.useState<Date | null>(initial?.alarmAt ?? null)
  const [priority, setPriority] = React.useState(initial?.priority ?? 0)
  const [rrule, setRrule] = React.useState<string | null>(initial?.rrule ?? null)
  const [rruleUntil, setRruleUntil] = React.useState<Date | null>(initial?.rruleUntil ?? null)
  const [processId, setProcessId] = React.useState<string | null>(initial?.processId ?? null)
  const [tagIds, setTagIds] = React.useState<string[]>(initial?.tagIds ?? [])
  const [visibleToClient, setVisibleToClient] = React.useState<boolean>(
    initial?.visibleToClient ?? false
  )
  const [clientId, setClientId] = React.useState<string | null>(initial?.clientId ?? null)
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (visibleToClient && !clientId) {
      setError("Selecciona un cliente para mostrar esta actividad")
      return
    }
    const input: TodoInput = {
      title,
      description,
      dueAt,
      alarmAt,
      priority,
      rrule,
      rruleUntil,
      processId,
      tagIds,
      visibleToClient,
      clientId: visibleToClient ? clientId : null,
    }
    start(async () => {
      const res = initial ? await updateTodo(initial.id, input) : await createTodo(input)
      if (!res.ok) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(initial ? "Pendiente actualizado" : "Pendiente creado")
      const id = initial?.id ?? (res.data as { id: string } | undefined)?.id
      router.push(id ? `/todos/${id}` : "/todos")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Ej: Revisar pipeline ETL"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Notas</Label>
        <Textarea
          id="description"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Contexto, links, criterios…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dueAt">Fecha límite</Label>
          <Input
            id="dueAt"
            type="date"
            value={toDateInput(dueAt)}
            onChange={(e) => setDueAt(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alarmAt">Alarma</Label>
          <Input
            id="alarmAt"
            type="datetime-local"
            value={toLocalInput(alarmAt)}
            onChange={(e) => setAlarmAt(e.target.value ? new Date(e.target.value) : null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridad</Label>
          <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
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

      <div className="space-y-1.5">
        <Label>Proceso vinculado (opcional)</Label>
        <Select
          value={processId ?? "_none"}
          onValueChange={(v) => setProcessId(v === "_none" ? null : v)}
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
        <MultiSelect
          options={tags.map((t) => ({ value: t.id, label: t.name, color: t.color }))}
          selected={tagIds}
          onChange={setTagIds}
          placeholder="Seleccionar etiquetas…"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Recurrencia</Label>
        <RecurrencePicker
          value={rrule}
          onChange={setRrule}
          rruleUntil={rruleUntil}
          onRruleUntilChange={setRruleUntil}
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
            onCheckedChange={(c) => {
              setVisibleToClient(c)
              if (!c) setClientId(null)
            }}
          />
        </div>
        {visibleToClient && (
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select
              value={clientId ?? ""}
              onValueChange={(v) => setClientId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={clients.length === 0 ? "Sin clientes registrados" : "Seleccionar cliente"} />
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

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Guardar cambios" : "Crear pendiente"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
