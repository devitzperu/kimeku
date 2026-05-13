"use client"

import * as React from "react"
import { Plus, Copy, Trash2, Loader2, KeyRound, Ban, Check } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createApiKey, revokeApiKey, deleteApiKey } from "@/actions/api-keys"
import { SCOPES } from "@/lib/api-key"
import { formatDateTime } from "@/lib/utils"

type Key = {
  id: string
  name: string
  prefix: string
  scopes: string[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  user: { name: string; email: string }
  userId: string
}

export function ApiKeysManager({
  keys,
  isAdmin,
  currentUserId,
}: {
  keys: Key[]
  isAdmin: boolean
  currentUserId: string
}) {
  const [creating, setCreating] = React.useState(false)
  const [created, setCreated] = React.useState<{ plaintext: string; prefix: string } | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nueva API Key
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">
              <KeyRound className="mx-auto mb-2 h-6 w-6 text-fg-subtle" />
              Aún no tienes claves activas.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {keys.map((k) => {
                const isOwner = k.userId === currentUserId
                const expired = k.expiresAt && k.expiresAt < new Date()
                const status = k.revokedAt
                  ? { label: "Revocada", variant: "danger" as const }
                  : expired
                    ? { label: "Expirada", variant: "warning" as const }
                    : { label: "Activa", variant: "success" as const }
                return (
                  <li key={k.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                    <KeyRound className="h-4 w-4 text-fg-subtle" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{k.name}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="font-mono text-[11px] text-fg-subtle mt-0.5">{k.prefix}…</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle mt-0.5">
                        {k.scopes.join(" · ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {k.lastUsedAt ? `usada ${formatDateTime(k.lastUsedAt)}` : "sin uso"}
                      </p>
                      {isAdmin && !isOwner && (
                        <p className="text-[10px] text-fg-subtle">por {k.user.name}</p>
                      )}
                    </div>
                    {!k.revokedAt && (isOwner || isAdmin) && <RevokeButton id={k.id} />}
                    {(isOwner || isAdmin) && <DeleteKeyButton id={k.id} />}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(d) => {
          setCreated(d)
          setCreating(false)
        }}
      />

      <ShowKeyDialog
        plaintext={created?.plaintext ?? null}
        onClose={() => setCreated(null)}
      />
    </>
  )
}

function CreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (d: { plaintext: string; prefix: string }) => void
}) {
  const [name, setName] = React.useState("")
  const [scopes, setScopes] = React.useState<string[]>([...SCOPES])
  const [expires, setExpires] = React.useState<string>("never")
  const [pending, start] = React.useTransition()

  function toggle(s: string) {
    setScopes((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]))
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    start(async () => {
      const expiresInDays = expires === "never" ? null : Number(expires)
      const res = await createApiKey({ name, scopes, expiresInDays })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      onCreated({ plaintext: res.plaintext, prefix: res.prefix })
      setName("")
      setScopes([...SCOPES])
      setExpires("never")
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva API Key</DialogTitle>
          <DialogDescription>
            Da un nombre descriptivo, elige permisos y expiración.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Nombre</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: N8N producción"
            />
          </div>

          <div className="space-y-2">
            <Label>Permisos</Label>
            <div className="space-y-1.5 rounded-md border border-border p-3">
              {SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={scopes.includes(s)} onCheckedChange={() => toggle(s)} />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Expiración</Label>
            <Select value={expires} onValueChange={setExpires}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Nunca</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
                <SelectItem value="365">1 año</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ShowKeyDialog({
  plaintext,
  onClose,
}: {
  plaintext: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = React.useState(false)
  const open = !!plaintext

  function copy() {
    if (!plaintext) return
    navigator.clipboard.writeText(plaintext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Key generada</DialogTitle>
          <DialogDescription>
            Copia esta clave AHORA. No se mostrará de nuevo. Guárdala en lugar seguro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-accent-border bg-accent-subtle p-3 font-mono text-xs break-all">
            {plaintext}
          </div>
          <Button onClick={copy} className="w-full">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar al portapapeles"}
          </Button>
          <Separator />
          <div className="rounded-md border border-border bg-muted p-3 space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Uso</p>
            <pre className="text-xs font-mono whitespace-pre-wrap">{`curl -H "X-API-Key: ${plaintext}" \\
  ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/processes`}</pre>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RevokeButton({ id }: { id: string }) {
  const [pending, start] = React.useTransition()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title="Revocar"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await revokeApiKey(id)
          if (res.ok) toast.success("Clave revocada")
          else toast.error(res.error)
        })
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
    </Button>
  )
}

function DeleteKeyButton({ id }: { id: string }) {
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-danger">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar clave?</DialogTitle>
          <DialogDescription>Acción permanente.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteApiKey(id)
                if (res.ok) {
                  toast.success("Eliminada")
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
