"use client"

import * as React from "react"
import { Tree, TreeNode as RTreeNode } from "react-organizational-chart"
import { Plus, Pencil, Trash2, GitBranch, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { createOrgNode, updateOrgNode, deleteOrgNode } from "@/actions/organigrama"

type OrgNode = {
  id: string
  name: string
  title: string | null
  parentId: string | null
  userId: string | null
  user: { id: string; name: string; email: string; avatar: string | null } | null
}

type User = { id: string; name: string; email: string }

type TreeShape = OrgNode & { children: TreeShape[] }

function buildTree(nodes: OrgNode[]): TreeShape[] {
  const map = new Map<string, TreeShape>()
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }))
  const roots: TreeShape[] = []
  nodes.forEach((n) => {
    const cur = map.get(n.id)!
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(cur)
    } else {
      roots.push(cur)
    }
  })
  return roots
}

export function OrgChartInner({
  nodes,
  users,
  canEdit,
}: {
  nodes: OrgNode[]
  users: User[]
  canEdit: boolean
}) {
  const [editing, setEditing] = React.useState<OrgNode | null>(null)
  const [creating, setCreating] = React.useState<{ parentId: string | null } | null>(null)
  const trees = buildTree(nodes)

  return (
    <>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating({ parentId: null })}>
            <Plus className="h-4 w-4" />
            Nueva posición raíz
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4 md:p-6 overflow-x-auto">
          <ScrollArea className="w-full">
            {trees.length === 0 ? (
              <div className="py-16 text-center text-sm text-fg-muted">
                <GitBranch className="mx-auto mb-2 h-8 w-8 text-fg-subtle" />
                Crea la primera posición para empezar.
              </div>
            ) : (
              <div className="min-w-fit py-6 px-2">
                {trees.map((root) => (
                  <Tree
                    key={root.id}
                    lineWidth="1px"
                    lineColor="var(--border)"
                    lineBorderRadius="6px"
                    label={
                      <NodeCard
                        node={root}
                        canEdit={canEdit}
                        onEdit={() => setEditing(root)}
                        onAddChild={() => setCreating({ parentId: root.id })}
                      />
                    }
                  >
                    {root.children.map((c) => (
                      <RenderBranch
                        key={c.id}
                        node={c}
                        canEdit={canEdit}
                        onEdit={(n) => setEditing(n)}
                        onAddChild={(parentId) => setCreating({ parentId })}
                      />
                    ))}
                  </Tree>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <NodeDialog
        open={!!creating}
        users={users}
        nodes={nodes}
        defaultParentId={creating?.parentId ?? null}
        onClose={() => setCreating(null)}
        onSave={async (input) => {
          const res = await createOrgNode(input)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Posición creada")
          return true
        }}
      />
      <NodeDialog
        open={!!editing}
        users={users}
        nodes={nodes}
        node={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (input) => {
          if (!editing) return false
          const res = await updateOrgNode(editing.id, input)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Posición actualizada")
          return true
        }}
        onDelete={async () => {
          if (!editing) return
          const res = await deleteOrgNode(editing.id)
          if (res.ok) {
            toast.success("Posición eliminada")
            setEditing(null)
          } else toast.error(res.error)
        }}
      />
    </>
  )
}

function RenderBranch({
  node,
  canEdit,
  onEdit,
  onAddChild,
}: {
  node: TreeShape
  canEdit: boolean
  onEdit: (n: OrgNode) => void
  onAddChild: (parentId: string) => void
}) {
  return (
    <RTreeNode
      label={
        <NodeCard
          node={node}
          canEdit={canEdit}
          onEdit={() => onEdit(node)}
          onAddChild={() => onAddChild(node.id)}
        />
      }
    >
      {node.children.map((c) => (
        <RenderBranch
          key={c.id}
          node={c}
          canEdit={canEdit}
          onEdit={onEdit}
          onAddChild={onAddChild}
        />
      ))}
    </RTreeNode>
  )
}

function NodeCard({
  node,
  canEdit,
  onEdit,
  onAddChild,
}: {
  node: OrgNode
  canEdit: boolean
  onEdit: () => void
  onAddChild: () => void
}) {
  const initials = node.user?.name
    ? node.user.name
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : node.name.slice(0, 2).toUpperCase()

  return (
    <div className="inline-flex flex-col items-center gap-2 group">
      <div className="rounded-lg border border-border bg-elevated px-4 py-3 shadow-sm hover:border-accent-border transition-colors min-w-45">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={node.user?.avatar ?? undefined} />
            <AvatarFallback className="bg-accent-subtle text-accent text-[10px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium leading-tight">{node.name}</p>
            {node.title && (
              <p className="text-[11px] font-mono uppercase tracking-wider text-fg-muted leading-tight mt-0.5">
                {node.title}
              </p>
            )}
            {node.user && (
              <p className="text-[10px] text-fg-subtle leading-tight mt-0.5">{node.user.email}</p>
            )}
          </div>
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onAddChild}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

function NodeDialog({
  open,
  users,
  nodes,
  node,
  defaultParentId,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  users: User[]
  nodes: OrgNode[]
  node?: OrgNode
  defaultParentId?: string | null
  onClose: () => void
  onSave: (input: { name: string; title: string; parentId: string | null; userId: string | null }) => Promise<boolean>
  onDelete?: () => void
}) {
  const [name, setName] = React.useState(node?.name ?? "")
  const [title, setTitle] = React.useState(node?.title ?? "")
  const [parentId, setParentId] = React.useState<string | null>(node?.parentId ?? defaultParentId ?? null)
  const [userId, setUserId] = React.useState<string | null>(node?.userId ?? null)
  const [pending, start] = React.useTransition()

  React.useEffect(() => {
    if (open) {
      setName(node?.name ?? "")
      setTitle(node?.title ?? "")
      setParentId(node?.parentId ?? defaultParentId ?? null)
      setUserId(node?.userId ?? null)
    }
  }, [open, node, defaultParentId])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    start(async () => {
      const ok = await onSave({ name, title, parentId, userId })
      if (ok) onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{node ? "Editar posición" : "Nueva posición"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Nombre / posición</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-title">Cargo / descripción breve</Label>
            <Input id="org-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Líder técnico" />
          </div>
          <div className="space-y-1.5">
            <Label>Reporta a</Label>
            <Select
              value={parentId ?? "_root"}
              onValueChange={(v) => setParentId(v === "_root" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_root">— Raíz</SelectItem>
                {nodes
                  .filter((n) => n.id !== node?.id)
                  .map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                      {n.title ? ` · ${n.title}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Usuario vinculado (opcional)</Label>
            <Select
              value={userId ?? "_none"}
              onValueChange={(v) => setUserId(v === "_none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Sin usuario</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {onDelete && node && (
              <Button type="button" variant="ghost" className="text-danger hover:text-danger" onClick={onDelete} disabled={pending}>
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {node ? "Guardar" : "Crear"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
