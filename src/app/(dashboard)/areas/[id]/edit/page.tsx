import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { AreaForm } from "@/components/areas/area-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function EditAreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!hasRole(session?.user.role, "ADMIN")) redirect("/areas")

  const area = await prisma.area.findUnique({ where: { id } })
  if (!area) notFound()

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <PageHeader ribbon="A · Editar área" title={area.name} />
      <Card>
        <CardContent className="p-6">
          <AreaForm area={area} />
        </CardContent>
      </Card>
    </div>
  )
}
