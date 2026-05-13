import { auth } from "@/lib/auth"
import { listPortalTodos } from "@/actions/portal"
import { PortalDashboard } from "@/components/portal/portal-dashboard"

export const dynamic = "force-dynamic"

export default async function PortalPage() {
  const session = await auth()
  const initial = await listPortalTodos()
  const clientId = session?.user.clientId ?? null
  return <PortalDashboard initial={initial} clientCode={shortCode(clientId)} />
}

function shortCode(clientId: string | null) {
  if (!clientId) return "CL-???"
  const tail = clientId.slice(-6).toUpperCase()
  return `CL-${tail}`
}
