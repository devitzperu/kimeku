"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
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
import { createFlow } from "@/actions/flows"

export function NewFlowForm({
  processes,
  defaultProcessId,
}: {
  processes: { id: string; title: string }[]
  defaultProcessId?: string
}) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [processId, setProcessId] = React.useState(defaultProcessId ?? "")
  const [pending, start] = React.useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!processId) {
      toast.error("Selecciona un proceso")
      return
    }
    start(async () => {
      const res = await createFlow({
        processId,
        name,
        nodes: [
          { id: "start", type: "start", position: { x: 100, y: 100 }, data: { label: "Inicio" } },
          { id: "end", type: "end", position: { x: 400, y: 100 }, data: { label: "Fin" } },
        ],
        edges: [{ id: "e0", source: "start", target: "end" }],
        triggers: [{ type: "manual", config: {} }],
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const id = (res.data as { id: string } | undefined)?.id
      if (id) router.push(`/flows/${id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="flow-name">Nombre del flujo</Label>
        <Input
          id="flow-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ej: Notificar deploy a Slack"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Proceso vinculado</Label>
        <Select value={processId} onValueChange={setProcessId}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir proceso…" />
          </SelectTrigger>
          <SelectContent>
            {processes.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Crear y editar
      </Button>
    </form>
  )
}
