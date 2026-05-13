import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { OrgChart } from "@/components/organigrama/org-chart"
import { GitBranch } from "lucide-react"

export default async function OrganigramaPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "ADMIN")

  const [nodes, users] = await Promise.all([
    prisma.orgNode.findMany({
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: [{ parentId: "asc" }, { order: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`B · ${nodes.length} ${nodes.length === 1 ? "posición" : "posiciones"}`}
        title="Organigrama"
        description="Estructura organizacional. Vincula posiciones a usuarios para definir permisos y notificaciones futuras."
      />

      {nodes.length === 0 && !canEdit ? (
        <EmptyState
          icon={<GitBranch className="h-5 w-5" />}
          title="Sin organigrama"
          description="Aún no hay posiciones definidas."
        />
      ) : (
        <OrgChart nodes={nodes} users={users} canEdit={canEdit} />
      )}
    </div>
  )
}
