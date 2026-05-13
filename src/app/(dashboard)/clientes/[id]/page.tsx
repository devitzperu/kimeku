import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil, Trash2, ArrowLeft, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarkdownView } from "@/components/shared/markdown-view"
import { DeleteClientButton } from "@/components/clientes/delete-client-button"
import { formatDate } from "@/lib/utils"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "ADMIN")
  const canDelete = hasRole(session?.user.role, "ADMIN")

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      processes: {
        include: { process: { select: { id: true, title: true } } },
        take: 20,
      },
    },
  })
  if (!client) notFound()

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/clientes">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Clientes</span>
        </Link>
      </Button>
      <PageHeader
        ribbon={`C · ${client.processes.length} procesos enlazados`}
        title={client.name}
        description={`Última actualización ${formatDate(client.updatedAt)}`}
        actions={
          <>
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/clientes/${client.id}/usuarios`}>
                  <Users className="h-4 w-4" />
                  Usuarios del portal
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/clientes/${client.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
            {canDelete && <DeleteClientButton id={client.id} />}
          </>
        }
      />
      <Card>
        <CardContent className="p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-4">
            Descripción
          </p>
          <MarkdownView source={client.description ?? ""} />
        </CardContent>
      </Card>
      {client.processes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-4">
              Procesos enlazados
            </p>
            <div className="flex flex-wrap gap-2">
              {client.processes.map((p) => (
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
