import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { AreaForm } from "@/components/areas/area-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function NewAreaPage() {
  const session = await auth()
  if (!hasRole(session?.user.role, "ADMIN")) redirect("/areas")

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <PageHeader
        ribbon="A · Crear área"
        title="Nueva área"
        description="Las áreas representan unidades organizacionales (Soporte, Operaciones, etc.)."
      />
      <Card>
        <CardContent className="p-6">
          <AreaForm />
        </CardContent>
      </Card>
    </div>
  )
}
