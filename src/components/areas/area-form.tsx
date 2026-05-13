"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { createArea, updateArea } from "@/actions/areas"

type Area = { id: string; name: string; description: string | null }

export function AreaForm({ area }: { area?: Area }) {
  const router = useRouter()
  const [name, setName] = useState(area?.name ?? "")
  const [description, setDescription] = useState(area?.description ?? "")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set("name", name)
    fd.set("description", description)
    start(async () => {
      const res = area ? await updateArea(area.id, fd) : await createArea(fd)
      if (res && !res.ok) {
        setError(res.error)
        toast.error(res.error)
      } else {
        toast.success(area ? "Área actualizada" : "Área creada")
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      </div>

      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe el propósito del área, responsabilidades, contactos…"
        />
      </div>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {area ? "Guardar cambios" : "Crear área"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
