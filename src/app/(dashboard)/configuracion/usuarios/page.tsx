import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { UsersManager } from "@/components/users/users-manager"

export default async function UsersPage() {
  const session = await auth()
  if (!hasRole(session?.user.role, "ADMIN")) redirect("/")

  const rows = await prisma.user.findMany({
    where: { role: { not: "CLIENT" } },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  const users = rows.map((u) => ({ ...u, role: u.role as "ADMIN" | "EDITOR" | "VIEWER" }))

  return (
    <div className="space-y-8 max-w-5xl animate-fade-in">
      <PageHeader
        ribbon={`E · ${users.length} ${users.length === 1 ? "usuario" : "usuarios"}`}
        title="Usuarios"
        description="Solo los administradores pueden gestionar usuarios y roles."
      />
      <UsersManager users={users} currentUserId={session!.user.id} />
    </div>
  )
}
