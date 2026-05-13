import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { IntegrationsManager } from "@/components/integrations/integrations-manager"
import { getConnectedAccounts } from "@/actions/integrations"

export default async function IntegracionesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const role = session.user.role
  if (role !== "ADMIN") redirect("/")

  const accounts = await getConnectedAccounts()

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <PageHeader
        ribbon="G · Integraciones Git"
        title="Conexiones GitHub / GitLab"
        description="Conecta tu cuenta para poder versionar el código de los procesos en repositorios reales. Cada commit aparece como tu usuario en el proveedor."
      />
      <IntegrationsManager accounts={accounts} />
    </div>
  )
}
