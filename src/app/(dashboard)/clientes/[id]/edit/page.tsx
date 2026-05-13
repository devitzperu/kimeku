import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { ClientForm } from "@/components/clientes/client-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!hasRole(session?.user.role, "ADMIN")) redirect("/clientes")

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) notFound()

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <PageHeader ribbon="C · Editar cliente" title={client.name} />
      <Card>
        <CardContent className="p-6">
          <ClientForm client={client} />
        </CardContent>
      </Card>
    </div>
  )
}
