import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { ClientForm } from "@/components/clientes/client-form"
import { Card, CardContent } from "@/components/ui/card"

export default async function NewClientPage() {
  const session = await auth()
  if (!hasRole(session?.user.role, "ADMIN")) redirect("/clientes")

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
      <PageHeader ribbon="C · Crear cliente" title="Nuevo cliente" />
      <Card>
        <CardContent className="p-6">
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  )
}
