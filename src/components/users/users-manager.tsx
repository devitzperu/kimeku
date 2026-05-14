"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, ShieldAlert, Eye } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/shared/password-input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createUser, updateUser, deleteUser } from "@/actions/users"
import { formatDate } from "@/lib/utils"

type User = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "EDITOR" | "VIEWER"
  avatar: string | null
  createdAt: Date
}

const ROLE_META: Record<User["role"], { icon: React.ComponentType<{ className?: string }>; variant: "danger" | "warning" | "default" }> = {
  ADMIN: { icon: ShieldAlert, variant: "danger" },
  EDITOR: { icon: ShieldCheck, variant: "warning" },
  VIEWER: { icon: Eye, variant: "default" },
}

export function UsersManager({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {users.map((u) => {
              const meta = ROLE_META[u.role]
              const initials = u.name
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
              const Icon = meta.icon
              return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar ?? undefined} />
                    <AvatarFallback className="bg-accent-subtle text-accent">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      {u.id === currentUserId && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">tú</span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted truncate">{u.email}</p>
                  </div>
                  <Badge variant={meta.variant} className="gap-1">
                    <Icon className="h-2.5 w-2.5" />
                    {u.role}
                  </Badge>
                  <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {formatDate(u.createdAt)}
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(u)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {u.id !== currentUserId && <DeleteUserButton id={u.id} name={u.name} />}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <UserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSave={async (fd) => {
          const res = await createUser(fd)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Usuario creado")
          return true
        }}
      />

      <UserDialog
        key={editing?.id ?? "edit-empty"}
        open={!!editing}
        user={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (fd) => {
          if (!editing) return false
          const res = await updateUser(editing.id, fd)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Usuario actualizado")
          return true
        }}
      />
    </>
  )
}

function UserDialog({
  open,
  user,
  onClose,
  onSave,
}: {
  open: boolean
  user?: User
  onClose: () => void
  onSave: (fd: FormData) => Promise<boolean>
}) {
  const [pending, start] = useTransition()
  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<User["role"]>(user?.role ?? "VIEWER")

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("name", name)
    fd.set("email", email)
    if (password) fd.set("password", password)
    fd.set("role", role)
    start(async () => {
      const ok = await onSave(fd)
      if (ok) {
        setName("")
        setEmail("")
        setPassword("")
        setRole("VIEWER")
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{user ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Nombre</Label>
              <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">
                {user ? "Contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              </Label>
              <PasswordInput
                id="user-password"
                value={password}
                onChange={setPassword}
                required={!user}
                minLength={user ? undefined : 8}
                placeholder={user ? "Sin cambios" : "Mínimo 8 caracteres"}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as User["role"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin · acceso total</SelectItem>
                  <SelectItem value="EDITOR">Editor · crear y editar</SelectItem>
                  <SelectItem value="VIEWER">Viewer · solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-bg-muted/40 px-6 py-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {user ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteUserButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-danger hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar a {name}?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteUser(id)
                if (res.ok) {
                  toast.success("Usuario eliminado")
                  setOpen(false)
                } else toast.error(res.error)
              })
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
