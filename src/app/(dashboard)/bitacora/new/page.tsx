import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { BitacoraForm } from "@/components/bitacora/bitacora-form"

export default async function NewBitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ processId?: string }>
}) {
  const session = await auth()
  if (!hasRole(session?.user.role, "EDITOR")) redirect("/bitacora")
  const sp = await searchParams

  const processes = await prisma.process.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  })

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <PageHeader ribbon="03 · Nueva entrada" title="Nueva bitácora" />
      <Card>
        <CardContent className="p-6">
          <BitacoraForm
            processes={processes}
            defaultProcessId={sp.processId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
