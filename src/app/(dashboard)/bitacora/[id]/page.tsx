import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Pencil, Trash2, FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MarkdownView } from "@/components/shared/markdown-view"
import { DeleteBitacoraButton } from "@/components/bitacora/delete-bitacora-button"
import { formatDateTime } from "@/lib/utils"

export default async function BitacoraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")
  const canDelete = hasRole(session?.user.role, "ADMIN")

  const b = await prisma.bitacora.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, avatar: true } },
      processes: { include: { process: { select: { id: true, title: true } } } },
      attachments: true,
    },
  })
  if (!b) notFound()

  const initials = (b.user.name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/bitacora">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Bitácora</span>
        </Link>
      </Button>

      <PageHeader
        ribbon={`03 · v${b.version} · ${formatDateTime(b.createdAt)}`}
        title={b.title}
        actions={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/bitacora/${b.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {canDelete && <DeleteBitacoraButton id={b.id} />}
          </>
        }
      />

      <div className="flex items-center gap-3 rounded-lg border border-border bg-elevated p-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src={b.user.avatar ?? undefined} />
          <AvatarFallback className="bg-accent-subtle text-accent text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{b.user.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{b.user.email}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <MarkdownView source={b.description ?? ""} />
        </CardContent>
      </Card>

      {b.processes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-3">
              Procesos relacionados
            </p>
            <div className="flex flex-wrap gap-2">
              {b.processes.map((p) => (
                <Link key={p.processId} href={`/procesos/${p.processId}`}>
                  <Badge
                    variant="outline"
                    className="hover:border-accent-border hover:text-accent transition-colors normal-case font-sans tracking-normal text-xs"
                  >
                    {p.process.title}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {b.attachments.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
              Evidencia
            </p>
            <ul className="space-y-1">
              {b.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-accent-border hover:text-accent transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-fg-muted" />
                    <span className="flex-1 truncate">{a.filename}</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
