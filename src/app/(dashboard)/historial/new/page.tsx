import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { HistorialStartForm } from "@/components/historial/historial-start-form"

export default async function NewHistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ processId?: string }>
}) {
  const session = await auth()
  if (!hasRole(session?.user.role, "EDITOR")) redirect("/historial")
  const sp = await searchParams

  const processes = await prisma.process.findMany({
    where: { parentId: null },
    select: { id: true, title: true, _count: { select: { children: true } } },
    orderBy: { title: "asc" },
  })

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        ribbon="04 · Nueva ejecución"
        title="Iniciar ejecución"
        description="Selecciona un proceso. Se generarán automáticamente los pasos a partir de los sub-procesos."
      />
      <Card>
        <CardContent className="p-6">
          <HistorialStartForm processes={processes} defaultProcessId={sp.processId} />
        </CardContent>
      </Card>
    </div>
  )
}
