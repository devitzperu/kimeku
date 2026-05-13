"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { MultiSelect } from "@/components/shared/multi-select"
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload"
import { createBitacora, updateBitacora } from "@/actions/bitacora"

interface BitacoraFormProps {
  initial?: {
    id: string
    title: string
    description: string | null
    processIds: string[]
    attachments: UploadedFile[]
  }
  processes: { id: string; title: string }[]
  defaultProcessId?: string
}

export function BitacoraForm({ initial, processes, defaultProcessId }: BitacoraFormProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initial?.title ?? "")
  const [description, setDescription] = React.useState(initial?.description ?? "")
  const [processIds, setProcessIds] = React.useState<string[]>(
    initial?.processIds ?? (defaultProcessId ? [defaultProcessId] : [])
  )
  const [attachments, setAttachments] = React.useState<UploadedFile[]>(initial?.attachments ?? [])
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const input = { title, description, processIds, attachments }
    start(async () => {
      const res = initial
        ? await updateBitacora(initial.id, input)
        : await createBitacora(input)
      if (!res.ok) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(initial ? "Bitácora actualizada" : "Entrada creada")
      const id = initial?.id ?? (res.data as { id: string } | undefined)?.id
      if (id) router.push(`/bitacora/${id}`)
      else router.push("/bitacora")
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
          placeholder="Ej: Falla migración X — solución Y"
        />
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="links">Procesos</TabsTrigger>
          <TabsTrigger value="files">Evidencia</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder="Qué pasó, cuándo, por qué, cómo se resolvió, qué aprendimos…"
            height={400}
          />
        </TabsContent>
        <TabsContent value="links">
          <div className="space-y-1.5">
            <Label>Procesos relacionados</Label>
            <MultiSelect
              options={processes.map((p) => ({ value: p.id, label: p.title }))}
              selected={processIds}
              onChange={setProcessIds}
              placeholder="Vincular procesos…"
            />
          </div>
        </TabsContent>
        <TabsContent value="files">
          <FileUpload files={attachments} onFilesChange={setAttachments} />
        </TabsContent>
      </Tabs>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Guardar cambios" : "Publicar entrada"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
