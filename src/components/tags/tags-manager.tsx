"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createTag, updateTag, deleteTag } from "@/actions/tags"

type Tag = {
  id: string
  name: string
  color: string
  _count: { processes: number; todos: number }
}

export function TagsManager({ tags, canEdit }: { tags: Tag[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<Tag | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {tags.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-fg-muted">
              Sin etiquetas
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tags.map((t) => {
                const usage = t._count.processes + t._count.todos
                return (
                  <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                    <span
                      className="h-3 w-3 rounded-full ring-2 ring-bg shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="font-mono text-sm">{t.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {usage} {usage === 1 ? "uso" : "usos"}
                    </span>
                    {canEdit && (
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteButton id={t.id} name={t.name} usage={usage} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nueva etiqueta
        </Button>
      )}

      <TagDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSave={async (fd) => {
          const res = await createTag(fd)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Etiqueta creada")
          return true
        }}
      />

      <TagDialog
        open={!!editing}
        tag={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (fd) => {
          if (!editing) return false
          const res = await updateTag(editing.id, fd)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Etiqueta actualizada")
          return true
        }}
      />
    </>
  )
}

function TagDialog({
  open,
  tag,
  onClose,
  onSave,
}: {
  open: boolean
  tag?: Tag
  onClose: () => void
  onSave: (fd: FormData) => Promise<boolean>
}) {
  const [pending, start] = useTransition()
  const [name, setName] = useState(tag?.name ?? "")
  const [color, setColor] = useState(tag?.color ?? "#c2664a")

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("name", name)
    fd.set("color", color)
    start(async () => {
      const ok = await onSave(fd)
      if (ok) {
        setName("")
        setColor("#c2664a")
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tag ? "Editar etiqueta" : "Nueva etiqueta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Nombre</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="urgente"
              required
            />
            <p className="text-[11px] font-mono text-fg-subtle">solo letras, números, guion, guion bajo</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="tag-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded-md border border-border bg-elevated cursor-pointer"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tag ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteButton({ id, name, usage }: { id: string; name: string; usage: number }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const locked = usage > 0

  function onDelete() {
    start(async () => {
      const res = await deleteTag(id)
      if (res.ok) {
        toast.success("Etiqueta eliminada")
        setOpen(false)
      } else {
        toast.error(res.error)
      }
    })
  }

  if (locked) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled
                aria-label="No se puede eliminar: etiqueta en uso"
                className="text-fg-subtle opacity-60 cursor-not-allowed"
              >
                <Lock className="h-3.5 w-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            En uso por {usage} {usage === 1 ? "elemento" : "elementos"}. Quítala primero.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-danger hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar etiqueta &laquo;{name}&raquo;?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
