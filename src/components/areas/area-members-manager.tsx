"use client"

import * as React from "react"
import { Plus, Trash2, Loader2, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addAreaMember, removeAreaMember, type AreaMemberRow } from "@/actions/areas"

type Candidate = { id: string; name: string; email: string; avatar: string | null }

type Props = {
  areaId: string
  members: AreaMemberRow[]
  candidates: Candidate[]
  canManage: boolean
}

export function AreaMembersManager({ areaId, members, candidates, canManage }: Props) {
  const [adding, setAdding] = React.useState(false)

  return (
    <>
      {members.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-fg-muted">
          Sin integrantes asignados a esta área.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8">
                {m.avatar && <AvatarImage src={m.avatar} alt={m.name} />}
                <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate font-mono text-[11px] text-fg-subtle">{m.email}</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                {m.role}
              </Badge>
              {canManage && <RemoveButton areaId={areaId} userId={m.userId} name={m.name} />}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={candidates.length === 0}>
            <Plus className="h-3.5 w-3.5" />
            Agregar integrante
          </Button>
        </div>
      )}

      <AddMemberDialog
        open={adding}
        areaId={areaId}
        candidates={candidates}
        onClose={() => setAdding(false)}
      />
    </>
  )
}

function AddMemberDialog({
  open,
  areaId,
  candidates,
  onClose,
}: {
  open: boolean
  areaId: string
  candidates: Candidate[]
  onClose: () => void
}) {
  const [userId, setUserId] = React.useState<string>("")
  const [pending, start] = React.useTransition()

  React.useEffect(() => {
    if (open) setUserId("")
  }, [open])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!userId) return
    start(async () => {
      const res = await addAreaMember(areaId, userId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Integrante agregado")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar integrante al área</DialogTitle>
          <DialogDescription>
            Los integrantes definen qué área ejecuta cada actividad para los clientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger>
              <SelectValue placeholder={candidates.length === 0 ? "Sin candidatos disponibles" : "Seleccionar usuario"} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <UserRound className="h-3.5 w-3.5 text-fg-subtle" />
                    {c.name}
                    <span className="font-mono text-[10px] text-fg-subtle">{c.email}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !userId}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RemoveButton({ areaId, userId, name }: { areaId: string; userId: string; name: string }) {
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-danger" title="Quitar del área">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Quitar a {name}?</DialogTitle>
          <DialogDescription>
            Dejará de aparecer como integrante de esta área. Sus actividades existentes no cambian.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await removeAreaMember(areaId, userId)
                if (res.ok) {
                  toast.success("Integrante removido")
                  setOpen(false)
                } else toast.error(res.error)
              })
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Quitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}
