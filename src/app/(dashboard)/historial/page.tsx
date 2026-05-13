import Link from "next/link"
import { Plus, Clock, Play, CheckCircle2, XCircle, CircleDashed } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, durationBetween, formatDuration } from "@/lib/utils"

const STATUS_META = {
  PENDING: { icon: CircleDashed, variant: "default" as const, label: "Pendiente" },
  IN_PROGRESS: { icon: Play, variant: "warning" as const, label: "En curso" },
  COMPLETED: { icon: CheckCircle2, variant: "success" as const, label: "Completado" },
  CANCELLED: { icon: XCircle, variant: "danger" as const, label: "Cancelado" },
}

export default async function HistorialPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const list = await prisma.historial.findMany({
    include: {
      process: { select: { id: true, title: true } },
      user: { select: { name: true } },
      _count: { select: { steps: true } },
      steps: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`04 · ${list.length} ${list.length === 1 ? "ejecución" : "ejecuciones"}`}
        title="Historial"
        description="Línea de tiempo de ejecuciones de procesos. Marca pasos, agrega comentarios, mide tiempos."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/historial/new">
                <Plus className="h-4 w-4" />
                Iniciar ejecución
              </Link>
            </Button>
          ) : null
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-5 w-5" />}
          title="Aún sin historial"
          description="Inicia la ejecución de un proceso para empezar a documentar el flujo."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/historial/new">
                  <Plus className="h-4 w-4" />
                  Iniciar
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((h) => {
            const meta = STATUS_META[h.status]
            const Icon = meta.icon
            const completed = h.steps.filter((s) => s.status === "COMPLETED").length
            const total = h.steps.length
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0
            const dur = durationBetween(h.startedAt, h.finishedAt)
            return (
              <Link key={h.id} href={`/historial/${h.id}`}>
                <Card className="group hover:border-accent-border transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={meta.variant} className="gap-1">
                            <Icon className="h-2.5 w-2.5" />
                            {meta.label}
                          </Badge>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                            {h.user.name}
                          </span>
                        </div>
                        <h3 className="text-base font-medium group-hover:text-accent transition-colors">
                          {h.title}
                        </h3>
                        <p className="text-xs text-fg-muted mt-0.5">
                          Sobre proceso{" "}
                          <span className="text-fg">{h.process.title}</span>
                        </p>
                      </div>
                      {dur && (
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs">{formatDuration(dur)}</p>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                            duración
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
                        <span className="text-fg-subtle">
                          {completed}/{total} pasos
                        </span>
                        <span className="text-fg-subtle">{formatDateTime(h.createdAt)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-subtle overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
