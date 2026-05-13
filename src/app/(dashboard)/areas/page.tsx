import Link from "next/link"
import { Plus, Building2, Pencil } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

export default async function AreasPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "ADMIN")

  const areas = await prisma.area.findMany({
    include: { _count: { select: { processes: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`A · ${areas.length} ${areas.length === 1 ? "área registrada" : "áreas registradas"}`}
        title="Áreas"
        description="Define las unidades organizacionales que ejecutan procesos. Sirven como filtro para la documentación."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/areas/new">
                <Plus className="h-4 w-4" />
                Nueva área
              </Link>
            </Button>
          ) : null
        }
      />

      {areas.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="Sin áreas"
          description="Crea la primera área para empezar a documentar procesos."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/areas/new">
                  <Plus className="h-4 w-4" />
                  Crear área
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Link key={area.id} href={`/areas/${area.id}`}>
              <Card className="group h-full hover:border-accent-border transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <Badge variant="default">{area._count.processes} procesos</Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-base group-hover:text-accent transition-colors">
                      {area.name}
                    </h3>
                    {area.description && (
                      <p className="text-xs text-fg-muted line-clamp-2">{area.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {formatDate(area.updatedAt)}
                    </span>
                    {canEdit && (
                      <Pencil className="h-3 w-3 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
