import { redirect } from "next/navigation"
import { Mail, ShieldCheck, User as UserIcon, CalendarDays } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { NotificationsPlaceholder } from "@/components/profile/notifications-placeholder"
import { formatDate } from "@/lib/utils"

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role === "CLIENT") redirect("/portal")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, role: true, createdAt: true },
  })
  if (!user) redirect("/login")

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      <PageHeader
        ribbon="P"
        title="Mi perfil"
        description="Tu cuenta y preferencias personales."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-accent" />
            <CardTitle>Datos de cuenta</CardTitle>
          </div>
          <CardDescription>Información asociada a tu sesión</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={UserIcon} label="Nombre" value={user.name} />
            <Field icon={Mail} label="Email" value={user.email} mono />
            <Field
              icon={ShieldCheck}
              label="Rol"
              value={<Badge variant="accent">{user.role}</Badge>}
            />
            <Field
              icon={CalendarDays}
              label="Miembro desde"
              value={formatDate(user.createdAt)}
            />
          </dl>
        </CardContent>
      </Card>

      <ChangePasswordForm />

      <NotificationsPlaceholder />
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-fg-subtle">
        <Icon className="h-3 w-3" />
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={mono ? "font-mono text-sm text-fg" : "text-sm text-fg"}>{value}</div>
    </div>
  )
}
