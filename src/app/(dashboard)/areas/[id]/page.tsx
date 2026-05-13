import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { listAreaMembers, listAreaCandidates } from "@/actions/areas"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarkdownView } from "@/components/shared/markdown-view"
import { DeleteAreaButton } from "@/components/areas/delete-area-button"
import { AreaMembersManager } from "@/components/areas/area-members-manager"
import { formatDate } from "@/lib/utils"

export default async function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "ADMIN")
  const canDelete = hasRole(session?.user.role, "ADMIN")

  const area = await prisma.area.findUnique({
    where: { id },
    include: {
      processes: {
        include: { process: { select: { id: true, title: true } } },
        take: 20,
      },
    },
  })

  if (!area) notFound()

  const [members, candidates] = await Promise.all([
    listAreaMembers(area.id),
    canDelete ? listAreaCandidates(area.id) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/areas">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Áreas</span>
        </Link>
      </Button>

      <PageHeader
        ribbon={`A · ${area.processes.length} procesos enlazados`}
        title={area.name}
        description={`Última actualización ${formatDate(area.updatedAt)}`}
        actions={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/areas/${area.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {canDelete && <DeleteAreaButton id={area.id} />}
          </>
        }
      />

      <Card>
        <CardContent className="p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-4">
            Descripción
          </p>
          <MarkdownView source={area.description ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              Integrantes · {members.length}
            </p>
          </div>
          <AreaMembersManager
            areaId={area.id}
            members={members}
            candidates={candidates}
            canManage={canDelete}
          />
        </CardContent>
      </Card>

      {area.processes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-4">
              Procesos enlazados
            </p>
            <div className="flex flex-wrap gap-2">
              {area.processes.map((p) => (
                <Link key={p.processId} href={`/procesos/${p.processId}`}>
                  <Badge variant="outline" className="hover:border-accent-border hover:text-accent transition-colors normal-case font-sans tracking-normal text-xs">
                    {p.process.title}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
