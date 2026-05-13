import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { ProcessForm, type ConnectedProvider } from "@/components/processes/process-form"
import { getConnectedAccounts } from "@/actions/integrations"

export default async function NewProcesoPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string }>
}) {
  const session = await auth()
  if (!hasRole(session?.user.role, "EDITOR")) redirect("/procesos")
  const sp = await searchParams

  const [parents, areas, clients, tags, accounts] = await Promise.all([
    prisma.process.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.area.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    getConnectedAccounts(),
  ])

  const connectedProviders: ConnectedProvider[] = accounts.map((a) => a.provider)

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      <PageHeader ribbon="02 · Nuevo proceso" title="Documentar proceso" />
      <Card>
        <CardContent className="p-6">
          <ProcessForm
            parents={parents}
            areas={areas}
            clients={clients}
            tags={tags}
            defaultParentId={sp.parentId ?? null}
            connectedProviders={connectedProviders}
          />
        </CardContent>
      </Card>
    </div>
  )
}
