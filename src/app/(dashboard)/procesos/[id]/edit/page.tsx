import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth-helpers"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { ProcessForm, type ConnectedProvider } from "@/components/processes/process-form"
import { getConnectedAccounts } from "@/actions/integrations"

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!hasRole(session?.user.role, "EDITOR")) redirect("/procesos")

  const [process, parents, areas, clients, tags, accounts] = await Promise.all([
    prisma.process.findUnique({
      where: { id },
      include: {
        areas: true,
        clients: true,
        tags: true,
        codeBlocks: { orderBy: { order: "asc" } },
        attachments: true,
        repoBinding: true,
      },
    }),
    prisma.process.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.area.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
    getConnectedAccounts(),
  ])

  if (!process) notFound()

  const connectedProviders: ConnectedProvider[] = accounts.map((a) => a.provider)

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      <PageHeader ribbon={`02 · v${process.version}`} title={`Editar: ${process.title}`} />
      <Card>
        <CardContent className="p-6">
          <ProcessForm
            initial={{
              id: process.id,
              title: process.title,
              description: process.description,
              parentId: process.parentId,
              areaIds: process.areas.map((a) => a.areaId),
              clientIds: process.clients.map((c) => c.clientId),
              tagIds: process.tags.map((t) => t.tagId),
              codeBlocks: process.codeBlocks.map((c) => ({
                language: c.language,
                code: c.cachedCode,
                description: c.description,
                path: c.path,
                lastCommitSha: c.lastCommitSha,
              })),
              attachments: process.attachments.map((a) => ({
                filename: a.filename,
                path: a.path,
                mimeType: a.mimeType,
                size: a.size,
              })),
              repoBinding: process.repoBinding
                ? {
                    provider: process.repoBinding.provider,
                    repoFullName: process.repoBinding.repoFullName,
                    defaultBranch: process.repoBinding.defaultBranch,
                    basePath: process.repoBinding.basePath,
                    webhookActive: process.repoBinding.webhookActive,
                  }
                : null,
            }}
            parents={parents}
            areas={areas}
            clients={clients}
            tags={tags}
            connectedProviders={connectedProviders}
          />
        </CardContent>
      </Card>
    </div>
  )
}
