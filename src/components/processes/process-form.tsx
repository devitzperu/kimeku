"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, GitBranch as GitBranchIcon } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { MultiSelect } from "@/components/shared/multi-select"
import { CreatableMultiSelect } from "@/components/shared/creatable-multi-select"
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload"
import { CodeBlockEditor, type CodeBlock } from "@/components/processes/code-block-editor"
import { createProcess, updateProcess } from "@/actions/processes"
import { createTag } from "@/actions/tags"
import { bindProcessToRepo, unbindProcess } from "@/actions/repo-binding"
import { listMyRepos, listMyBranches } from "@/actions/integrations"
import type { ProcessInput } from "@/lib/validations/process"

export type ConnectedProvider = "github" | "gitlab"

export interface RepoBindingInitial {
  provider: "GITHUB" | "GITLAB"
  repoFullName: string
  defaultBranch: string
  basePath: string
  webhookActive: boolean
}

type ParentOption = { id: string; title: string }
type Option = { id: string; name: string; color?: string }

interface ProcessFormProps {
  initial?: {
    id: string
    title: string
    description: string | null
    parentId: string | null
    areaIds: string[]
    clientIds: string[]
    tagIds: string[]
    codeBlocks: CodeBlock[]
    attachments: UploadedFile[]
    repoBinding: RepoBindingInitial | null
  }
  parents: ParentOption[]
  areas: Option[]
  clients: Option[]
  tags: Option[]
  defaultParentId?: string | null
  connectedProviders: ConnectedProvider[]
}

export function ProcessForm({
  initial,
  parents,
  areas,
  clients,
  tags,
  defaultParentId,
  connectedProviders,
}: ProcessFormProps) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initial?.title ?? "")
  const [description, setDescription] = React.useState(initial?.description ?? "")
  const [parentId, setParentId] = React.useState<string | null>(
    initial?.parentId ?? defaultParentId ?? null
  )
  const [areaIds, setAreaIds] = React.useState<string[]>(initial?.areaIds ?? [])
  const [clientIds, setClientIds] = React.useState<string[]>(initial?.clientIds ?? [])
  const [tagIds, setTagIds] = React.useState<string[]>(initial?.tagIds ?? [])
  const [tagOptions, setTagOptions] = React.useState<Option[]>(tags)
  React.useEffect(() => setTagOptions(tags), [tags])
  const [codeBlocks, setCodeBlocks] = React.useState<CodeBlock[]>(initial?.codeBlocks ?? [])
  const [attachments, setAttachments] = React.useState<UploadedFile[]>(initial?.attachments ?? [])
  const [commitMessage, setCommitMessage] = React.useState("")
  const [pending, start] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const initialBinding = initial?.repoBinding ?? null
  const [bindingProvider, setBindingProvider] = React.useState<"GITHUB" | "GITLAB" | "">(
    initialBinding?.provider ?? ""
  )
  const [bindingRepo, setBindingRepo] = React.useState(initialBinding?.repoFullName ?? "")
  const [bindingBranch, setBindingBranch] = React.useState(initialBinding?.defaultBranch ?? "main")
  const [bindingBasePath, setBindingBasePath] = React.useState(initialBinding?.basePath ?? "")
  const [bindingWebhook, setBindingWebhook] = React.useState(!!initialBinding?.webhookActive)
  const [bindingEnabled, setBindingEnabled] = React.useState(!!initialBinding)
  const [migrateExisting, setMigrateExisting] = React.useState(false)
  const [bindPending, setBindPending] = React.useState(false)
  const [repoOptions, setRepoOptions] = React.useState<{ fullName: string; defaultBranch: string }[]>([])
  const [branchOptions, setBranchOptions] = React.useState<string[]>([])

  const bindingActive = bindingEnabled && !!initialBinding

  const parentOptions = parents.filter((p) => p.id !== initial?.id)

  React.useEffect(() => {
    if (!bindingProvider) {
      setRepoOptions([])
      return
    }
    let cancelled = false
    listMyRepos(bindingProvider).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) setRepoOptions(res.data)
      else if (!res.ok) toast.error(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [bindingProvider])

  React.useEffect(() => {
    if (!bindingProvider || !bindingRepo) {
      setBranchOptions([])
      return
    }
    let cancelled = false
    listMyBranches(bindingProvider, bindingRepo).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) setBranchOptions(res.data)
      else if (!res.ok) toast.error(res.error)
    })
    return () => {
      cancelled = true
    }
  }, [bindingProvider, bindingRepo])

  async function applyBinding() {
    if (!initial) {
      toast.error("Guarda el proceso primero, luego vincúlalo a un repo")
      return
    }
    if (!bindingProvider || !bindingRepo) {
      toast.error("Selecciona provider y repo")
      return
    }
    setBindPending(true)
    const res = await bindProcessToRepo({
      processId: initial.id,
      input: {
        provider: bindingProvider,
        repoFullName: bindingRepo,
        defaultBranch: bindingBranch || "main",
        basePath: bindingBasePath || "",
        enableWebhook: bindingWebhook,
      },
      migrateExistingCode: migrateExisting,
    })
    setBindPending(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Vinculación guardada")
    router.refresh()
  }

  async function removeBinding() {
    if (!initial) return
    if (!confirm("¿Desvincular el proceso del repositorio? El código permanece en kimeku como caché.")) return
    setBindPending(true)
    const res = await unbindProcess(initial.id)
    setBindPending(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Desvinculado")
    router.refresh()
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const input: ProcessInput = {
      title,
      description,
      parentId: parentId || null,
      areaIds,
      clientIds,
      tagIds,
      codeBlocks: codeBlocks.map((b) => ({
        language: b.language,
        code: b.code,
        description: b.description ?? null,
        path: b.path ?? null,
      })),
      attachments,
      commitMessage: bindingActive ? commitMessage || undefined : undefined,
    }
    start(async () => {
      const res = initial
        ? await updateProcess(initial.id, input)
        : await createProcess(input)
      if (!res.ok) {
        setError(res.error)
        toast.error(res.error)
        return
      }
      toast.success(initial ? "Proceso actualizado" : "Proceso creado")
      const id = initial?.id ?? (res.data as { id: string } | undefined)?.id
      if (id) router.push(`/procesos/${id}`)
      else router.push("/procesos")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Ej: Auditoría producción semanal"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Proceso padre</Label>
          <Select
            value={parentId ?? "_root"}
            onValueChange={(v) => setParentId(v === "_root" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_root">— Sin padre (raíz)</SelectItem>
              {parentOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">Descripción</TabsTrigger>
          <TabsTrigger value="code">Código</TabsTrigger>
          {initial && <TabsTrigger value="repo">Repositorio</TabsTrigger>}
          <TabsTrigger value="meta">Etiquetas y vínculos</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <div className="space-y-1.5">
            <Label>Descripción del proceso</Label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Pasos, contexto, criterios de éxito, observaciones…"
              height={400}
            />
          </div>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <CodeBlockEditor
            blocks={codeBlocks}
            onChange={setCodeBlocks}
            bindingActive={bindingActive}
          />
          {bindingActive && (
            <div className="space-y-1.5">
              <Label htmlFor="commitMessage">Mensaje de commit (opcional)</Label>
              <Input
                id="commitMessage"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={`kimeku: actualiza ${title || "proceso"}`}
                maxLength={200}
              />
              <p className="text-[11px] text-fg-subtle font-mono">
                Si lo dejas vacío, se usará el mensaje por defecto.
              </p>
            </div>
          )}
        </TabsContent>

        {initial && (
          <TabsContent value="repo" className="space-y-4">
            <div className="rounded-lg border border-border bg-elevated p-5 space-y-4">
              <div className="flex items-center gap-3">
                <GitBranchIcon className="h-4 w-4 text-fg-muted" />
                <div className="flex-1">
                  <p className="text-sm">Almacenar código en repositorio Git</p>
                  <p className="text-xs text-fg-muted">
                    Cada bloque con `path` se commiteará al repo elegido. Versiones = git log.
                  </p>
                </div>
                <Switch checked={bindingEnabled} onCheckedChange={setBindingEnabled} />
              </div>

              {bindingEnabled && (
                <div className="space-y-3">
                  {connectedProviders.length === 0 && (
                    <p className="rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-xs text-warning">
                      No tienes ninguna cuenta conectada.{" "}
                      <a href="/configuracion/integraciones" className="underline">
                        Conecta GitHub o GitLab primero.
                      </a>
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Provider</Label>
                      <Select
                        value={bindingProvider}
                        onValueChange={(v) => setBindingProvider(v as "GITHUB" | "GITLAB")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Elegir…" />
                        </SelectTrigger>
                        <SelectContent>
                          {connectedProviders.includes("github") && (
                            <SelectItem value="GITHUB">GitHub</SelectItem>
                          )}
                          {connectedProviders.includes("gitlab") && (
                            <SelectItem value="GITLAB">GitLab</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Repositorio</Label>
                      <Select
                        value={bindingRepo}
                        onValueChange={(v) => {
                          setBindingRepo(v)
                          const found = repoOptions.find((r) => r.fullName === v)
                          if (found) setBindingBranch(found.defaultBranch)
                        }}
                        disabled={!bindingProvider || repoOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {repoOptions.map((r) => (
                            <SelectItem key={r.fullName} value={r.fullName}>
                              {r.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rama</Label>
                      <Select
                        value={bindingBranch}
                        onValueChange={setBindingBranch}
                        disabled={!bindingRepo || branchOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="main" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Subdirectorio (basePath)</Label>
                      <Input
                        value={bindingBasePath}
                        onChange={(e) => setBindingBasePath(e.target.value)}
                        placeholder="procesos/auditoria"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-md border border-border bg-bg p-3">
                    <Switch checked={bindingWebhook} onCheckedChange={setBindingWebhook} />
                    <div className="flex-1">
                      <p className="text-sm">Recibir cambios externos vía webhook</p>
                      <p className="text-xs text-fg-muted">
                        kimeku registrará un webhook en el repo para detectar pushes hechos desde la web del provider.
                      </p>
                    </div>
                  </div>

                  {!initialBinding && codeBlocks.length > 0 && (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-bg p-3">
                      <Switch checked={migrateExisting} onCheckedChange={setMigrateExisting} />
                      <div className="flex-1">
                        <p className="text-sm">Migrar bloques actuales al repo</p>
                        <p className="text-xs text-fg-muted">
                          Hace un commit inicial con los bloques de código actuales.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" onClick={applyBinding} disabled={bindPending}>
                      {bindPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {initialBinding ? "Actualizar vinculación" : "Vincular"}
                    </Button>
                    {initialBinding && (
                      <Button type="button" variant="ghost" onClick={removeBinding} disabled={bindPending}>
                        Desvincular
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="meta" className="space-y-5">
          <div className="space-y-1.5">
            <Label>Áreas</Label>
            <MultiSelect
              options={areas.map((a) => ({ value: a.id, label: a.name }))}
              selected={areaIds}
              onChange={setAreaIds}
              placeholder="Seleccionar áreas…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Clientes (opcional)</Label>
            <MultiSelect
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              selected={clientIds}
              onChange={setClientIds}
              placeholder="Seleccionar clientes…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            <CreatableMultiSelect
              options={tagOptions.map((t) => ({ value: t.id, label: t.name, color: t.color }))}
              selected={tagIds}
              onChange={setTagIds}
              placeholder="Seleccionar etiquetas…"
              canCreate
              createLabel={(q) => `Crear etiqueta "${q}"`}
              onCreate={async (name) => {
                const fd = new FormData()
                fd.set("name", name)
                const res = await createTag(fd)
                if (!res.ok) {
                  toast.error(res.error)
                  return null
                }
                setTagOptions((prev) => [
                  ...prev,
                  { id: res.data.id, name: res.data.name, color: res.data.color },
                ])
                toast.success("Etiqueta creada")
                return { value: res.data.id, label: res.data.name, color: res.data.color }
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="files">
          <FileUpload files={attachments} onFilesChange={setAttachments} />
        </TabsContent>
      </Tabs>

      {error && (
        <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Guardar cambios" : "Crear proceso"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
