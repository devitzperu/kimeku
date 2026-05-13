import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { listClientUsers } from "@/actions/client-users"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ClientUsersManager } from "@/components/clientes/client-users-manager"

export const dynamic = "force-dynamic"

export default async function ClientUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!hasRole(session?.user.role, "ADMIN")) redirect(`/clientes/${id}`)

  const client = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true } })
  if (!client) notFound()

  const users = await listClientUsers(id)
  const isAdmin = hasRole(session?.user.role, "ADMIN")

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={`/clientes/${id}`}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">{client.name}</span>
        </Link>
      </Button>
      <PageHeader
        ribbon={`C · ${users.length} ${users.length === 1 ? "usuario" : "usuarios"} cliente`}
        title="Usuarios del portal"
        description="Usuarios externos del cliente que pueden ingresar al portal y ver actividades asignadas."
      />
      <ClientUsersManager clientId={id} users={users} canCreate={isAdmin} canRevoke={isAdmin} />
    </div>
  )
}
