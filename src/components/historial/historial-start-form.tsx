"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createHistorial } from "@/actions/historial"

interface Props {
  processes: { id: string; title: string; _count: { children: number } }[]
  defaultProcessId?: string
}

export function HistorialStartForm({ processes, defaultProcessId }: Props) {
  const router = useRouter()
  const [processId, setProcessId] = React.useState(defaultProcessId ?? "")
  const [title, setTitle] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [pending, start] = React.useTransition()

  const selected = processes.find((p) => p.id === processId)
  const previousProcessId = React.useRef<string>("")

  React.useEffect(() => {
    if (!selected || previousProcessId.current === selected.id) return
    previousProcessId.current = selected.id
    if (!title) {
      const stamp = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      })
      setTitle(`${selected.title} · ${stamp}`)
    }
  }, [selected, title])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!processId) {
      toast.error("Selecciona un proceso")
      return
    }
    start(async () => {
      const res = await createHistorial({ title, processId, notes })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Ejecución iniciada")
      const id = (res.data as { id: string } | undefined)?.id
      if (id) router.push(`/historial/${id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Proceso raíz</Label>
        <Select value={processId} onValueChange={setProcessId}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir proceso…" />
          </SelectTrigger>
          <SelectContent>
            {processes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
                <span className="ml-2 font-mono text-[10px] uppercase text-fg-subtle">
                  {p._count.children} sub
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="h-title">Título de esta ejecución</Label>
        <Input
          id="h-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ej: Auditoría producción · Detergentes"
        />
        <p className="text-[11px] font-mono text-fg-subtle">
          Identifica esta corrida específica.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="h-notes">Notas iniciales (opcional)</Label>
        <Textarea
          id="h-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contexto, motivo, equipo involucrado…"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Crear ejecución
      </Button>
    </form>
  )
}
