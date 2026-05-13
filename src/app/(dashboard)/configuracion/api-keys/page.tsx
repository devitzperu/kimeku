import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { ApiKeysManager } from "@/components/api-keys/api-keys-manager"

export default async function ApiKeysPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const role = session.user.role
  if (role !== "ADMIN") redirect("/")
  const isAdmin = true

  const keys = await prisma.apiKey.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-8 max-w-5xl animate-fade-in">
      <PageHeader
        ribbon={`F · ${keys.length} ${keys.length === 1 ? "clave" : "claves"}`}
        title="API Keys"
        description="Genera claves para integraciones externas (N8N, scripts, webhooks). La clave en texto plano se muestra UNA SOLA VEZ al crearla."
      />
      <ApiKeysManager keys={keys} isAdmin={isAdmin} currentUserId={session!.user.id} />
    </div>
  )
}
