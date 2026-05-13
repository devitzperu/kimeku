import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Play, CheckCircle2, XCircle } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TimelineView } from "@/components/historial/timeline-view"
import { HistorialActions } from "@/components/historial/historial-actions"
import { formatDateTime, durationBetween, formatDuration } from "@/lib/utils"

const STATUS_META = {
  PENDING: { variant: "default" as const, label: "Pendiente" },
  IN_PROGRESS: { variant: "warning" as const, label: "En curso" },
  COMPLETED: { variant: "success" as const, label: "Completado" },
  CANCELLED: { variant: "danger" as const, label: "Cancelado" },
}

export default async function HistorialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const h = await prisma.historial.findUnique({
    where: { id },
    include: {
      process: { select: { id: true, title: true } },
      user: { select: { name: true, email: true } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          process: {
            select: {
              id: true,
              title: true,
              parentId: true,
              bitacoras: {
                include: { bitacora: { select: { id: true, title: true } } },
              },
            },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true, avatar: true } } },
          },
          attachments: true,
        },
      },
    },
  })
  if (!h) notFound()

  const meta = STATUS_META[h.status]
  const dur = durationBetween(h.startedAt, h.finishedAt)
  const completed = h.steps.filter((s) => s.status === "COMPLETED").length

  return (
    <div className="space-y-8 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/historial">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Historial</span>
        </Link>
      </Button>

      <PageHeader
        ribbon={`04 · ${completed}/${h.steps.length} pasos · ${meta.label.toUpperCase()}`}
        title={h.title}
        description={
          <>
            Sobre <Link href={`/procesos/${h.process.id}`} className="text-accent underline-offset-4 hover:underline">{h.process.title}</Link>
            {" · "}
            iniciado por {h.user.name}
          </>
        }
        actions={canEdit ? <HistorialActions historial={h} /> : null}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Estado" value={
          <Badge variant={meta.variant}>{meta.label}</Badge>
        } />
        <StatCard
          label="Inicio"
          value={h.startedAt ? formatDateTime(h.startedAt) : "—"}
        />
        <StatCard
          label="Duración"
          value={dur ? formatDuration(dur) : "—"}
        />
      </div>

      <TimelineView historial={h} canEdit={canEdit} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-elevated p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">{label}</p>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  )
}
