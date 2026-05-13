import Link from "next/link"
import { Plus, Layers, Search } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProcessTree, type TreeNode } from "@/components/processes/process-tree"

type ProcessRow = {
  id: string
  title: string
  parentId: string | null
  version: number
  tags: { tag: { id: string; name: string; color: string } }[]
  _count: { children: number }
}

function buildTree(rows: ProcessRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  rows.forEach((r) => {
    map.set(r.id, {
      id: r.id,
      title: r.title,
      version: r.version,
      childCount: r._count.children,
      tags: r.tags.map((t) => t.tag),
      children: [],
    })
  })
  const roots: TreeNode[] = []
  rows.forEach((r) => {
    const node = map.get(r.id)!
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export default async function ProcesosPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const all = await prisma.process.findMany({
    include: {
      tags: { include: { tag: true } },
      _count: { select: { children: true } },
    },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
  })

  const tree = buildTree(all as ProcessRow[])

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`02 · ${all.length} ${all.length === 1 ? "proceso" : "procesos"} totales`}
        title="Procesos"
        description="Documentación jerárquica. Cada proceso puede contener sub-procesos ordenados, código asociado y archivos."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/procesos/new">
                <Plus className="h-4 w-4" />
                Nuevo proceso
              </Link>
            </Button>
          ) : null
        }
      />

      {tree.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="Aún no hay procesos"
          description="Empieza documentando un proceso raíz. Luego añade sub-procesos para construir la jerarquía."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/procesos/new">
                  <Plus className="h-4 w-4" />
                  Crear primer proceso
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardContent className="p-3 md:p-4">
            <ProcessTree nodes={tree} canEdit={canEdit} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
