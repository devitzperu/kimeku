import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PortalHeader } from "@/components/portal/portal-header"
import { DisableContextMenu } from "@/components/shared/disable-context-menu"

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "CLIENT") redirect("/")
  if (!session.user.clientId) redirect("/login")

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    select: { id: true, name: true },
  })
  if (!client) redirect("/login")

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <DisableContextMenu />
      <PortalHeader
        client={client}
        userName={session.user.name ?? "Cliente"}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
