import Link from "next/link"
import { Plus, Workflow, Power } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

export default async function FlowsPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const flows = await prisma.flowDefinition.findMany({
    include: {
      process: { select: { id: true, title: true } },
      _count: { select: { executions: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`05 · ${flows.length} ${flows.length === 1 ? "flujo" : "flujos"}`}
        title="Flujos"
        description="Editor visual de flujos automatizados. Conecta nodos para definir lógica condicional, llamadas HTTP, esperas y notificaciones."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/flows/new">
                <Plus className="h-4 w-4" />
                Nuevo flujo
              </Link>
            </Button>
          ) : null
        }
      />

      {flows.length === 0 ? (
        <EmptyState
          icon={<Workflow className="h-5 w-5" />}
          title="Aún sin flujos"
          description="Convierte un proceso documentado en un flujo ejecutable."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/flows/new">
                  <Plus className="h-4 w-4" />
                  Crear flujo
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {flows.map((f) => (
            <Link key={f.id} href={`/flows/${f.id}`}>
              <Card className="group hover:border-accent-border transition-colors h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <Badge variant={f.active ? "success" : "default"} className="gap-1">
                      <Power className="h-2.5 w-2.5" />
                      {f.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-medium group-hover:text-accent transition-colors">
                      {f.name}
                    </h3>
                    <p className="text-xs text-fg-muted">
                      sobre <span className="text-fg">{f.process.title}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      v{f.version} · {f._count.executions} ejecuciones
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {formatDate(f.updatedAt)}
                    </span>
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
