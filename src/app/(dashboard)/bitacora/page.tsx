import Link from "next/link"
import { Plus, BookOpen } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, truncate } from "@/lib/utils"

export default async function BitacoraPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const entries = await prisma.bitacora.findMany({
    include: {
      user: { select: { name: true, email: true, avatar: true } },
      processes: { include: { process: { select: { id: true, title: true } } } },
      _count: { select: { attachments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`03 · ${entries.length} ${entries.length === 1 ? "entrada" : "entradas"}`}
        title="Bitácora"
        description="Registro cronológico de eventos, incidentes, deploys, observaciones — vinculado a procesos."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/bitacora/new">
                <Plus className="h-4 w-4" />
                Nueva entrada
              </Link>
            </Button>
          ) : null
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Bitácora vacía"
          description="Documenta el primer evento o incidente."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/bitacora/new">
                  <Plus className="h-4 w-4" />
                  Crear entrada
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {entries.map((b) => {
            const initials = (b.user.name ?? "U")
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
            return (
              <Link key={b.id} href={`/bitacora/${b.id}`}>
                <Card className="group hover:border-accent-border transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-9 w-9 mt-0.5">
                        <AvatarImage src={b.user.avatar ?? undefined} />
                        <AvatarFallback className="bg-accent-subtle text-accent text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium group-hover:text-accent transition-colors truncate">
                              {b.title}
                            </h3>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle mt-0.5">
                              {b.user.name} · v{b.version} · {formatDateTime(b.createdAt)}
                            </p>
                          </div>
                          {b._count.attachments > 0 && (
                            <Badge variant="default">{b._count.attachments} adjuntos</Badge>
                          )}
                        </div>
                        {b.description && (
                          <p className="text-xs text-fg-muted line-clamp-2">
                            {truncate(b.description.replace(/[#*`]/g, ""), 200)}
                          </p>
                        )}
                        {b.processes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {b.processes.map((p) => (
                              <Badge
                                key={p.processId}
                                variant="outline"
                                className="normal-case font-sans tracking-normal text-xs"
                              >
                                {p.process.title}
                              </Badge>
                            ))}
                          </div>
                        )}
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
