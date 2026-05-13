import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { NewFlowForm } from "@/components/flows/new-flow-form"

export default async function NewFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ processId?: string }>
}) {
  const session = await auth()
  if (!hasRole(session?.user.role, "EDITOR")) redirect("/flows")
  const sp = await searchParams

  const processes = await prisma.process.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  })

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
      <PageHeader ribbon="05 · Nuevo flujo" title="Crear flujo" description="Vincula un flujo automatizado a un proceso documentado." />
      <Card>
        <CardContent className="p-6">
          <NewFlowForm processes={processes} defaultProcessId={sp.processId} />
        </CardContent>
      </Card>
    </div>
  )
}
