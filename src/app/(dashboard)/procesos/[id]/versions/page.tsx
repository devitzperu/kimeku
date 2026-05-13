import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/utils"
import { getProviderForUser } from "@/lib/git/factory"
import type { GitCommit } from "@/lib/git/types"

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { editedBy: { select: { id: true, name: true, email: true } } },
      },
      repoBinding: true,
      codeBlocks: { orderBy: { order: "asc" } },
    },
  })
  if (!process) notFound()

  const binding = process.repoBinding

  let commits: GitCommit[] = []
  let commitsError: string | null = null
  if (binding && session?.user?.id) {
    try {
      const provider = await getProviderForUser(session.user.id, binding.provider)
      const seen = new Set<string>()
      for (const cb of process.codeBlocks) {
        if (!cb.path) continue
        const fullPath = binding.basePath ? `${binding.basePath}/${cb.path}` : cb.path
        const list = await provider.listCommits(binding.repoFullName, fullPath, binding.defaultBranch, 30)
        for (const c of list) {
          if (seen.has(c.sha)) continue
          seen.add(c.sha)
          commits.push(c)
        }
      }
      commits.sort((a, b) => (a.date < b.date ? 1 : -1))
      commits = commits.slice(0, 50)
    } catch (err) {
      commitsError = err instanceof Error ? err.message : "Error al leer commits"
    }
  }

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={`/procesos/${id}`}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Proceso</span>
        </Link>
      </Button>
      <PageHeader
        ribbon={`02 · ${process.versions.length} versiones · actual v${process.version}`}
        title={`Historial: ${process.title}`}
      />

      <Tabs defaultValue={binding ? "git" : "metadata"}>
        <TabsList>
          {binding && <TabsTrigger value="git">Código (Git)</TabsTrigger>}
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {binding && (
          <TabsContent value="git">
            <Card>
              <CardContent className="p-0">
                {commitsError ? (
                  <div className="px-5 py-6 text-xs text-warning">
                    {commitsError}
                  </div>
                ) : commits.length === 0 ? (
                  <div className="px-5 py-6 text-xs text-fg-muted">
                    Aún no hay commits para los archivos de este proceso.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {commits.map((c) => (
                      <li key={c.sha} className="px-5 py-4 flex items-center gap-3">
                        <Badge variant="outline" className="font-mono normal-case tracking-normal">
                          {c.sha.slice(0, 7)}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{c.message.split("\n")[0]}</p>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-fg-subtle">
                            {c.authorLogin ?? c.authorName} · {formatDateTime(new Date(c.date))}
                          </p>
                        </div>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-wider font-mono text-accent hover:underline"
                        >
                          ver →
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="metadata">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                <li className="px-5 py-4 flex items-center gap-3">
                  <Badge variant="accent">v{process.version}</Badge>
                  <span className="text-sm flex-1">Versión actual</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {formatDateTime(process.updatedAt)}
                  </span>
                </li>
                {process.versions.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/procesos/${id}/versions/${v.version}`}
                      className="px-5 py-4 flex items-center gap-3 hover:bg-subtle transition-colors"
                    >
                      <Badge variant="default">v{v.version}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg-muted truncate">
                          {v.note ?? <em className="text-fg-subtle italic">sin nota</em>}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                          {v.editedBy?.name ?? v.editedBy?.email ?? "—"}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {formatDateTime(v.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
