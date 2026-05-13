import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { TagsManager } from "@/components/tags/tags-manager"

export default async function TagsPage() {
  const session = await auth()
  const canEdit = hasRole(session?.user.role, "EDITOR")

  const tags = await prisma.tag.findMany({
    include: { _count: { select: { processes: true, todos: true } } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <PageHeader
        ribbon={`D · ${tags.length} ${tags.length === 1 ? "etiqueta" : "etiquetas"}`}
        title="Etiquetas"
        description="Categoriza procesos para encontrarlos rápido. Usa colores para clasificar visualmente."
      />
      <TagsManager tags={tags} canEdit={canEdit} />
    </div>
  )
}
