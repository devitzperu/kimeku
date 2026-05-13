import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { BitacoraForm } from "@/components/bitacora/bitacora-form"

export default async function EditBitacoraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!hasRole(session?.user.role, "EDITOR")) redirect("/bitacora")

  const [b, processes] = await Promise.all([
    prisma.bitacora.findUnique({
      where: { id },
      include: { processes: true, attachments: true },
    }),
    prisma.process.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ])

  if (!b) notFound()

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <PageHeader ribbon={`03 · Editar v${b.version}`} title={b.title} />
      <Card>
        <CardContent className="p-6">
          <BitacoraForm
            initial={{
              id: b.id,
              title: b.title,
              description: b.description,
              processIds: b.processes.map((p) => p.processId),
              attachments: b.attachments.map((a) => ({
                filename: a.filename,
                path: a.path,
                mimeType: a.mimeType,
                size: a.size,
              })),
            }}
            processes={processes}
          />
        </CardContent>
      </Card>
    </div>
  )
}
