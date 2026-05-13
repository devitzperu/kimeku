"use client"

import * as React from "react"
import { Plus, Trash2, Loader2, UserRound, Copy, Check, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
  createClientUser,
  revokeClientUser,
  type ClientUserRow,
} from "@/actions/client-users"
import { suggestPassword } from "@/lib/password-suggest"
import { formatDateTime } from "@/lib/utils"

type Props = {
  clientId: string
  users: ClientUserRow[]
  canCreate: boolean
  canRevoke: boolean
}

export function ClientUsersManager({ clientId, users, canCreate, canRevoke }: Props) {
  const [creating, setCreating] = React.useState(false)
  const [created, setCreated] = React.useState<{ email: string; password: string } | null>(null)

  return (
    <>
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">
              <UserRound className="mx-auto mb-2 h-6 w-6 text-fg-subtle" />
              Aún no hay usuarios para este cliente.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                  <UserRound className="h-4 w-4 text-fg-subtle" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="font-mono text-[11px] text-fg-subtle truncate">{u.email}</p>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle shrink-0">
                    creado {formatDateTime(u.createdAt)}
                  </p>
                  {canRevoke && <RevokeButton id={u.id} email={u.email} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateDialog
        clientId={clientId}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(d) => {
          setCreated(d)
          setCreating(false)
        }}
      />

      <ShowCredentialsDialog credentials={created} onClose={() => setCreated(null)} />
    </>
  )
}

function CreateDialog({
  clientId,
  open,
  onClose,
  onCreated,
}: {
  clientId: string
  open: boolean
  onClose: () => void
  onCreated: (d: { email: string; password: string }) => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [pending, start] = React.useTransition()

  React.useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setPassword(suggestPassword())
    }
  }, [open])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    start(async () => {
      const res = await createClientUser(clientId, { name, email, password })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      if (!res.data) return
      onCreated({ email: res.data.email, password: res.data.password })
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario del cliente</DialogTitle>
          <DialogDescription>
            Se creará una cuenta con rol cliente que podrá ingresar al portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Nombre</Label>
            <Input
              id="cu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Contacto Acme"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="contacto@acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Contraseña inicial</Label>
            <div className="flex gap-2">
              <Input
                id="cu-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Generar contraseña"
                onClick={() => setPassword(suggestPassword())}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Mínimo 8 caracteres. Se mostrará una sola vez.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ShowCredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: { email: string; password: string } | null
  onClose: () => void
}) {
  const open = !!credentials
  const [copied, setCopied] = React.useState(false)

  function copy() {
    if (!credentials) return
    const text = `Email: ${credentials.email}\nContraseña: ${credentials.password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credenciales generadas</DialogTitle>
          <DialogDescription>
            Copia estas credenciales AHORA. La contraseña no se mostrará de nuevo.
          </DialogDescription>
        </DialogHeader>
        {credentials && (
          <div className="space-y-3">
            <div className="space-y-2 rounded-md border border-accent-border bg-accent-subtle p-3 font-mono text-xs">
              <p>
                <span className="text-fg-subtle">Email:</span> {credentials.email}
              </p>
              <p>
                <span className="text-fg-subtle">Contraseña:</span> {credentials.password}
              </p>
            </div>
            <Button onClick={copy} className="w-full">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar credenciales"}
            </Button>
            <Separator />
            <p className="text-xs text-fg-muted">
              Envíalas al cliente por un canal seguro. Al ingresar, será redirigido al portal.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RevokeButton({ id, email }: { id: string; email: string }) {
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-danger" title="Revocar acceso">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Revocar acceso?</DialogTitle>
          <DialogDescription>
            {email} no podrá ingresar al portal. Acción permanente.
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
                const res = await revokeClientUser(id)
                if (res.ok) {
                  toast.success("Acceso revocado")
                  setOpen(false)
                } else toast.error(res.error)
              })
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Revocar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
