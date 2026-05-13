import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

export default async function ClientesPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "ADMIN")

  const clients = await prisma.client.findMany({
    include: { _count: { select: { processes: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        ribbon={`C · ${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
        title="Clientes"
        description="Vincula procesos con los clientes a los que sirven. Útil para auditorías y reporting."
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/clientes/new">
                <Plus className="h-4 w-4" />
                Nuevo cliente
              </Link>
            </Button>
          ) : null
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Sin clientes"
          description="Agrega clientes para enlazarlos con tus procesos."
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/clientes/new">
                  <Plus className="h-4 w-4" />
                  Crear cliente
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`}>
              <Card className="group h-full hover:border-accent-border transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
                      <Users className="h-4 w-4" />
                    </div>
                    <Badge variant="default">{c._count.processes} procesos</Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-base group-hover:text-accent transition-colors">
                      {c.name}
                    </h3>
                    {c.description && (
                      <p className="text-xs text-fg-muted line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {formatDate(c.updatedAt)}
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
