import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Lock, Code2, FileText, Building2, Users, Tag as TagIcon } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarkdownView } from "@/components/shared/markdown-view"
import { formatDateTime } from "@/lib/utils"

type SnapshotCodeBlock = {
  id?: string
  language: string
  path?: string | null
  description?: string | null
  cachedCode?: string
  code?: string
  lastSha?: string | null
  lastCommitSha?: string | null
}

type SnapshotRefList = { id?: string; name?: string }

type Snapshot = {
  title?: string
  description?: string | null
  parentId?: string | null
  areas?: { areaId: string; area?: SnapshotRefList }[]
  clients?: { clientId: string; client?: SnapshotRefList }[]
  tags?: { tagId: string; tag?: SnapshotRefList & { color?: string } }[]
  codeBlocks?: SnapshotCodeBlock[]
  attachments?: { id: string; filename: string; path: string; size: number }[]
}

export default async function ProcessVersionPage({
  params,
}: {
  params: Promise<{ id: string; v: string }>
}) {
  const { id, v } = await params
  const versionNum = Number.parseInt(v, 10)
  if (!Number.isFinite(versionNum) || versionNum < 1) notFound()

  const [process, version] = await Promise.all([
    prisma.process.findUnique({
      where: { id },
      select: { id: true, title: true, version: true },
    }),
    prisma.processVersion.findUnique({
      where: { processId_version: { processId: id, version: versionNum } },
      include: { editedBy: { select: { id: true, name: true, email: true } } },
    }),
  ])
  if (!process || !version) notFound()

  const snap = version.data as Snapshot
  const areaIds = (snap.areas ?? []).map((a) => a.areaId).filter(Boolean)
  const clientIds = (snap.clients ?? []).map((c) => c.clientId).filter(Boolean)
  const tagIds = (snap.tags ?? []).map((t) => t.tagId).filter(Boolean)

  const [areas, clients, tags] = await Promise.all([
    areaIds.length
      ? prisma.area.findMany({ where: { id: { in: areaIds } }, select: { id: true, name: true } })
      : Promise.resolve([] as { id: string; name: string }[]),
    clientIds.length
      ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
      : Promise.resolve([] as { id: string; name: string }[]),
    tagIds.length
      ? prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, name: true, color: true } })
      : Promise.resolve([] as { id: string; name: string; color: string }[]),
  ])

  const editorLabel = version.editedBy?.name ?? version.editedBy?.email ?? "—"

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={`/procesos/${id}/versions`}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase tracking-wider">Versiones</span>
        </Link>
      </Button>

      <PageHeader
        ribbon={`v${version.version} de ${process.version} · ${editorLabel} · ${formatDateTime(version.createdAt)}`}
        title={snap.title ?? process.title}
      />

      <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-subtle px-4 py-2.5 text-xs text-warning">
        <Lock className="h-3.5 w-3.5" />
        <span>
          Snapshot histórico de solo lectura. Para revertir, edita el proceso actual y vuelve a guardarlo.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-4 flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Descripción
              </p>
              <MarkdownView source={snap.description ?? ""} />
            </CardContent>
          </Card>

          {snap.codeBlocks && snap.codeBlocks.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle flex items-center gap-1.5">
                  <Code2 className="h-3 w-3" />
                  Código (snapshot)
                </p>
                {snap.codeBlocks.map((cb, i) => {
                  const code = cb.cachedCode ?? cb.code ?? ""
                  return (
                    <div key={cb.id ?? `${cb.path ?? "block"}-${i}`} className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="accent" className="font-mono normal-case tracking-normal">
                          {cb.language}
                        </Badge>
                        {cb.description && (
                          <span className="text-xs text-fg-muted">{cb.description}</span>
                        )}
                        {cb.path && (
                          <Badge variant="outline" className="font-mono normal-case tracking-normal">
                            {cb.path}
                          </Badge>
                        )}
                        {cb.lastCommitSha && (
                          <Badge variant="default" className="font-mono normal-case tracking-normal">
                            {cb.lastCommitSha.slice(0, 7)}
                          </Badge>
                        )}
                      </div>
                      {code ? (
                        <pre className="rounded-md border border-border bg-bg-muted p-4 text-xs overflow-x-auto">
                          <code className="font-mono">{code}</code>
                        </pre>
                      ) : (
                        <p className="text-xs text-fg-subtle italic">
                          Esta versión solo guardó referencia al archivo en Git (sin caché local).
                        </p>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {version.note && (
            <Card>
              <CardContent className="p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2">
                  Nota
                </p>
                <p className="text-sm">{version.note}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2">
                  Editor
                </p>
                <p className="text-sm">{editorLabel}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2">
                  Fecha (UTC)
                </p>
                <p className="font-mono text-xs">{version.createdAt.toISOString()}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle mt-1">
                  Local: {formatDateTime(version.createdAt)}
                </p>
              </div>

              {tags.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
                    <TagIcon className="h-3 w-3" />
                    Etiquetas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <Badge
                        key={t.id}
                        variant="default"
                        className="gap-1 normal-case font-sans tracking-normal text-xs"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {areas.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Áreas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {areas.map((a) => (
                      <Badge key={a.id} variant="outline" className="normal-case font-sans tracking-normal text-xs">
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {clients.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-2 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Clientes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {clients.map((c) => (
                      <Badge key={c.id} variant="outline" className="normal-case font-sans tracking-normal text-xs">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
