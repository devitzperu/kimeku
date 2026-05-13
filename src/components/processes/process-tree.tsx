"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, ChevronDown, Plus, FileText, GripVertical } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { reorderProcesses } from "@/actions/processes"

export type TreeNode = {
  id: string
  title: string
  version: number
  childCount: number
  tags: { id: string; name: string; color: string }[]
  children?: TreeNode[]
}

interface ProcessTreeProps {
  nodes: TreeNode[]
  canEdit: boolean
}

function reorderInTree(
  nodes: TreeNode[],
  parentId: string | null,
  fromId: string,
  toId: string
): TreeNode[] {
  if (parentId === null) {
    const fromIdx = nodes.findIndex((n) => n.id === fromId)
    const toIdx = nodes.findIndex((n) => n.id === toId)
    if (fromIdx < 0 || toIdx < 0) return nodes
    return arrayMove(nodes, fromIdx, toIdx)
  }
  return nodes.map((n) => {
    if (n.id === parentId && n.children) {
      const fromIdx = n.children.findIndex((c) => c.id === fromId)
      const toIdx = n.children.findIndex((c) => c.id === toId)
      if (fromIdx < 0 || toIdx < 0) return n
      return { ...n, children: arrayMove(n.children, fromIdx, toIdx) }
    }
    if (n.children?.length) {
      return { ...n, children: reorderInTree(n.children, parentId, fromId, toId) }
    }
    return n
  })
}

function getSiblingIds(nodes: TreeNode[], parentId: string | null): string[] {
  if (parentId === null) return nodes.map((n) => n.id)
  for (const n of nodes) {
    if (n.id === parentId && n.children) return n.children.map((c) => c.id)
    if (n.children?.length) {
      const found = getSiblingIds(n.children, parentId)
      if (found.length) return found
    }
  }
  return []
}

export function ProcessTree({ nodes, canEdit }: ProcessTreeProps) {
  const [tree, setTree] = React.useState<TreeNode[]>(nodes)

  const snapshotKey = React.useMemo(() => JSON.stringify(nodes.map((n) => snapshotIds(n))), [nodes])
  React.useEffect(() => {
    setTree(nodes)
  }, [snapshotKey, nodes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeParent = (active.data.current?.parentId ?? null) as string | null
    const overParent = (over.data.current?.parentId ?? null) as string | null
    if (activeParent !== overParent) return

    const prev = tree
    const next = reorderInTree(tree, activeParent, String(active.id), String(over.id))
    setTree(next)

    const newIds = getSiblingIds(next, activeParent)
    const result = await reorderProcesses(activeParent, newIds)
    if (!result.ok) {
      setTree(prev)
      toast.error(result.error || "No se pudo reordenar")
    }
  }

  const rootIds = tree.map((n) => n.id)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rootIds} strategy={verticalListSortingStrategy} disabled={!canEdit}>
        <ul className="space-y-0.5">
          {tree.map((n) => (
            <TreeRow key={n.id} node={n} parentId={null} depth={0} canEdit={canEdit} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function snapshotIds(n: TreeNode): unknown {
  return [n.id, n.children?.map(snapshotIds) ?? []]
}

function TreeRow({
  node,
  parentId,
  depth,
  canEdit,
}: {
  node: TreeNode
  parentId: string | null
  depth: number
  canEdit: boolean
}) {
  const [open, setOpen] = React.useState(depth < 1)
  const hasChildren = (node.children?.length ?? 0) > 0

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { parentId },
    disabled: !canEdit,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const childIds = node.children?.map((c) => c.id) ?? []

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md hover:bg-subtle transition-colors",
          depth > 0 && "border-l border-border ml-2"
        )}
      >
        {canEdit && (
          <button
            type="button"
            {...listeners}
            className="flex h-7 w-5 items-center justify-center text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-fg cursor-grab active:cursor-grabbing touch-none"
            aria-label="Reordenar"
          >
            <GripVertical className="h-3 w-3" />
          </button>
        )}

        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className={cn(
            "flex h-7 w-5 items-center justify-center text-fg-subtle hover:text-fg",
            !hasChildren && "opacity-0 cursor-default"
          )}
          aria-label={open ? "Colapsar" : "Expandir"}
        >
          {hasChildren ? (
            open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : null}
        </button>

        <Link
          href={`/procesos/${node.id}`}
          className="flex-1 flex items-center gap-2 py-2 pr-3 min-w-0"
          style={{ paddingLeft: depth > 0 ? `${depth * 0.5}rem` : 0 }}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-fg-subtle group-hover:text-accent transition-colors" />
          <span className="text-sm truncate group-hover:text-accent transition-colors">{node.title}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle shrink-0">
            v{node.version}
          </span>
          {node.childCount > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle shrink-0">
              · {node.childCount}
            </span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {node.tags.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="h-2.5 w-2.5 rounded-full ring-2 ring-bg shadow-sm"
                style={{ backgroundColor: t.color }}
                title={t.name}
              />
            ))}
          </div>
        </Link>

        {canEdit && (
          <Button asChild variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
            <Link href={`/procesos/new?parentId=${node.id}`} aria-label="Crear sub-proceso">
              <Plus className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>

      {hasChildren && open && (
        <SortableContext items={childIds} strategy={verticalListSortingStrategy} disabled={!canEdit}>
          <ul
            className="mt-0.5"
            style={{ marginLeft: `${(depth + 1) * 0.75}rem` }}
          >
            {node.children!.map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                parentId={node.id}
                depth={depth + 1}
                canEdit={canEdit}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </li>
  )
}
