"use client"

import * as React from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  Play,
  Square,
  HandMetal,
  Globe,
  Code2,
  Webhook,
  GitFork,
  Timer,
  Bell,
  Save,
  Loader2,
  Trash2,
  Settings,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { updateFlow } from "@/actions/flows"
import { cn } from "@/lib/utils"

const NODE_DEFS = [
  { type: "start", label: "Inicio", icon: Play, color: "var(--success)" },
  { type: "manual", label: "Manual", icon: HandMetal, color: "var(--info)" },
  { type: "http", label: "HTTP", icon: Globe, color: "var(--accent)" },
  { type: "script", label: "Script", icon: Code2, color: "var(--warning)" },
  { type: "webhook", label: "Webhook", icon: Webhook, color: "var(--accent)" },
  { type: "condition", label: "Condición", icon: GitFork, color: "var(--warning)" },
  { type: "delay", label: "Espera", icon: Timer, color: "var(--info)" },
  { type: "notification", label: "Notificar", icon: Bell, color: "var(--accent)" },
  { type: "end", label: "Fin", icon: Square, color: "var(--danger)" },
] as const

type NodeType = (typeof NODE_DEFS)[number]["type"]
type FlowData = { label?: string; [k: string]: unknown }

const NODE_META = Object.fromEntries(NODE_DEFS.map((n) => [n.type, n])) as Record<
  NodeType,
  (typeof NODE_DEFS)[number]
>

function CustomNode({ data, type, selected }: NodeProps) {
  const meta = NODE_META[type as NodeType] ?? NODE_META.manual
  const Icon = meta.icon
  const isStart = type === "start"
  const isEnd = type === "end"
  const d = data as FlowData
  const subtitle = subtitleFor(type as NodeType, d)

  return (
    <div
      className={cn(
        "group rounded-lg border bg-elevated px-3 py-2 shadow-sm min-w-[180px] max-w-[260px] transition-all",
        selected ? "border-accent ring-2 ring-accent/30" : "border-border"
      )}
    >
      {!isStart && <Handle type="target" position={Position.Left} className="!bg-fg-subtle !w-2 !h-2" />}
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: `color-mix(in oklch, ${meta.color} 18%, transparent)`, color: meta.color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{d.label ?? meta.label}</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle truncate">
            {subtitle ?? type}
          </p>
        </div>
        <Pencil className="h-3 w-3 text-fg-subtle opacity-0 group-hover:opacity-100" />
      </div>
      {!isEnd && <Handle type="source" position={Position.Right} className="!bg-fg-subtle !w-2 !h-2" />}
    </div>
  )
}

function subtitleFor(type: NodeType, d: FlowData): string | null {
  switch (type) {
    case "http":
      return d.method && d.url ? `${d.method} ${String(d.url).slice(0, 30)}` : null
    case "delay":
      return d.seconds ? `${d.seconds} ${d.unit ?? "s"}` : null
    case "condition":
      return d.expression ? String(d.expression).slice(0, 30) : null
    case "notification":
      return d.channel ? `→ ${d.channel}` : null
    case "webhook":
      return d.path ? `/${d.path}` : null
    case "script":
      return d.language ? String(d.language) : "code"
    case "manual":
      return d.assignee ? `@${d.assignee}` : null
    default:
      return null
  }
}

const NODE_TYPES = Object.fromEntries(NODE_DEFS.map((d) => [d.type, CustomNode]))

interface Props {
  flowId: string
  initialName: string
  initialNodes: unknown
  initialEdges: unknown
  initialTriggers: unknown
  canEdit: boolean
}

export function FlowEditorInner({
  flowId,
  initialName,
  initialNodes,
  initialEdges,
  canEdit,
}: Props) {
  const [name, setName] = React.useState(initialName)
  const [nodes, setNodes] = React.useState<Node[]>(
    Array.isArray(initialNodes) ? (initialNodes as Node[]) : []
  )
  const [edges, setEdges] = React.useState<Edge[]>(
    Array.isArray(initialEdges) ? (initialEdges as Edge[]) : []
  )
  const [selected, setSelected] = React.useState<Node | null>(null)
  const [editing, setEditing] = React.useState<Node | null>(null)
  const [pending, start] = React.useTransition()
  const [dirty, setDirty] = React.useState(false)

  const onNodesChange = React.useCallback((changes: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns))
    if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) setDirty(true)
  }, [])
  const onEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    setEdges((es) => applyEdgeChanges(changes, es))
    if (changes.some((c) => c.type !== "select")) setDirty(true)
  }, [])
  const onConnect = React.useCallback((conn: Connection) => {
    setEdges((es) =>
      addEdge({ ...conn, id: `e_${conn.source}_${conn.target}_${crypto.randomUUID().slice(0, 6)}` }, es)
    )
    setDirty(true)
  }, [])

  function addNode(type: NodeType) {
    const id = `${type}_${crypto.randomUUID().slice(0, 8)}`
    const meta = NODE_META[type]
    setNodes((ns) => [
      ...ns,
      {
        id,
        type,
        position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: { label: meta.label } as FlowData,
      },
    ])
    setDirty(true)
  }

  function patchNode(nodeId: string, patch: Partial<FlowData>) {
    setNodes((ns) =>
      ns.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data as FlowData), ...patch } } : n))
    )
    setSelected((s) => (s && s.id === nodeId ? { ...s, data: { ...(s.data as FlowData), ...patch } } : s))
    setEditing((e) => (e && e.id === nodeId ? { ...e, data: { ...(e.data as FlowData), ...patch } } : e))
    setDirty(true)
  }

  function deleteNode(nodeId: string) {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId))
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelected(null)
    setEditing(null)
    setDirty(true)
  }

  function save() {
    start(async () => {
      const res = await updateFlow(flowId, {
        processId: "",
        name,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: (n.type as NodeType) ?? "manual",
          position: n.position,
          data: (n.data as FlowData) ?? {},
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: typeof e.label === "string" ? e.label : undefined,
        })),
        triggers: [],
      })
      if (res.ok) {
        toast.success("Flujo guardado")
        setDirty(false)
      } else toast.error(res.error)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
      <div className="rounded-lg border border-border bg-elevated overflow-hidden h-[640px]">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setDirty(true)
            }}
            className="border-0 bg-transparent shadow-none font-medium focus-visible:ring-0 px-0"
            disabled={!canEdit}
          />
          {dirty && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-warning shrink-0">
              ● cambios sin guardar
            </span>
          )}
          {canEdit && (
            <Button size="sm" onClick={save} disabled={pending || !dirty}>
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Guardar
            </Button>
          )}
        </div>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onNodeDoubleClick={(_, n) => setEditing(n)}
            onPaneClick={() => setSelected(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} color="var(--border)" />
            <Controls className="!shadow-sm" />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      <aside className="space-y-3">
        <div className="rounded-lg border border-border bg-elevated p-3 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">Paleta de nodos</p>
          <div className="grid grid-cols-2 gap-1.5">
            {NODE_DEFS.map((nd) => {
              const Icon = nd.icon
              return (
                <Button
                  key={nd.type}
                  variant="outline"
                  size="sm"
                  onClick={() => addNode(nd.type as NodeType)}
                  disabled={!canEdit}
                  className="justify-start gap-1.5"
                >
                  <Icon className="h-3 w-3" style={{ color: nd.color }} />
                  <span className="text-[11px]">{nd.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {selected ? (
          <QuickInspector
            node={selected}
            canEdit={canEdit}
            onChange={(patch) => patchNode(selected.id, patch)}
            onOpenFull={() => setEditing(selected)}
            onDelete={() => deleteNode(selected.id)}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle mb-1">Sin selección</p>
            <p className="text-xs text-fg-muted">
              Click en un nodo para editar rápido. Doble click para abrir el editor completo.
            </p>
          </div>
        )}
      </aside>

      {editing && (
        <FullNodeEditor
          node={editing}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
          onChange={(patch) => patchNode(editing.id, patch)}
          onDelete={() => deleteNode(editing.id)}
        />
      )}
    </div>
  )
}

function QuickInspector({
  node,
  canEdit,
  onChange,
  onOpenFull,
  onDelete,
}: {
  node: Node
  canEdit: boolean
  onChange: (patch: Partial<FlowData>) => void
  onOpenFull: () => void
  onDelete: () => void
}) {
  const data = node.data as FlowData
  const type = node.type as NodeType
  const meta = NODE_META[type] ?? NODE_META.manual
  const Icon = meta.icon

  return (
    <div className="rounded-lg border border-border bg-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ background: `color-mix(in oklch, ${meta.color} 18%, transparent)`, color: meta.color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">{type}</p>
          <p className="text-xs text-fg-muted truncate font-mono">{node.id}</p>
        </div>
        {canEdit && (
          <Button size="icon-sm" variant="ghost" onClick={onDelete} className="text-danger">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quick-label">Etiqueta</Label>
        <Input
          id="quick-label"
          value={(data.label as string) ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          disabled={!canEdit}
        />
      </div>

      {canEdit && (
        <Button variant="outline" size="sm" onClick={onOpenFull} className="w-full">
          <Settings className="h-3.5 w-3.5" />
          Editar configuración
        </Button>
      )}
    </div>
  )
}

function FullNodeEditor({
  node,
  canEdit,
  onClose,
  onChange,
  onDelete,
}: {
  node: Node
  canEdit: boolean
  onClose: () => void
  onChange: (patch: Partial<FlowData>) => void
  onDelete: () => void
}) {
  const data = node.data as FlowData
  const type = node.type as NodeType
  const meta = NODE_META[type] ?? NODE_META.manual
  const Icon = meta.icon

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: `color-mix(in oklch, ${meta.color} 18%, transparent)`, color: meta.color }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            {(data.label as string) ?? meta.label}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-widest">
            tipo · {type} · id · {node.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="advanced">Avanzado</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-1.5">
              <Label>Etiqueta visible</Label>
              <Input
                value={(data.label as string) ?? ""}
                onChange={(e) => onChange({ label: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción / notas</Label>
              <Textarea
                value={(data.description as string) ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Notas internas para mantenimiento del flujo…"
                disabled={!canEdit}
              />
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <NodeTypeFields type={type} data={data} onChange={onChange} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-1.5">
              <Label>Timeout (segundos)</Label>
              <Input
                type="number"
                value={(data.timeout as number) ?? ""}
                onChange={(e) =>
                  onChange({ timeout: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Sin límite"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reintentos en error</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={(data.retries as number) ?? 0}
                onChange={(e) => onChange({ retries: Number(e.target.value) })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>En caso de error</Label>
              <Select
                value={(data.onError as string) ?? "fail"}
                onValueChange={(v) => onChange({ onError: v })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fail">Fallar el flujo</SelectItem>
                  <SelectItem value="continue">Continuar igual</SelectItem>
                  <SelectItem value="skip">Saltar este nodo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {canEdit && (
            <Button variant="ghost" onClick={onDelete} className="text-danger hover:text-danger">
              <Trash2 className="h-4 w-4" />
              Eliminar nodo
            </Button>
          )}
          <Button onClick={onClose} className="ml-auto">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NodeTypeFields({
  type,
  data,
  onChange,
  canEdit,
}: {
  type: NodeType
  data: FlowData
  onChange: (patch: Partial<FlowData>) => void
  canEdit: boolean
}) {
  switch (type) {
    case "start":
      return (
        <p className="text-sm text-fg-muted italic">
          Punto de entrada del flujo. No requiere configuración.
        </p>
      )

    case "end":
      return (
        <div className="space-y-1.5">
          <Label>Resultado a devolver (JSON)</Label>
          <Textarea
            value={(data.output as string) ?? ""}
            onChange={(e) => onChange({ output: e.target.value })}
            placeholder='{"status": "ok"}'
            className="font-mono text-xs min-h-[100px]"
            disabled={!canEdit}
          />
        </div>
      )

    case "manual":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Asignar a (usuario o rol)</Label>
            <Input
              value={(data.assignee as string) ?? ""}
              onChange={(e) => onChange({ assignee: e.target.value })}
              placeholder="user@email.com o EDITOR"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instrucciones</Label>
            <Textarea
              value={(data.instructions as string) ?? ""}
              onChange={(e) => onChange({ instructions: e.target.value })}
              placeholder="Qué debe hacer el usuario antes de continuar el flujo…"
              className="min-h-[120px]"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Botón de confirmación</Label>
            <Input
              value={(data.confirmLabel as string) ?? "Continuar"}
              onChange={(e) => onChange({ confirmLabel: e.target.value })}
              disabled={!canEdit}
            />
          </div>
        </>
      )

    case "http":
      return (
        <>
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select
                value={(data.method as string) ?? "GET"}
                onValueChange={(v) => onChange({ method: v })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <SelectItem key={m} value={m} className="font-mono">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input
                value={(data.url as string) ?? ""}
                onChange={(e) => onChange({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Headers (JSON)</Label>
            <Textarea
              value={(data.headers as string) ?? ""}
              onChange={(e) => onChange({ headers: e.target.value })}
              placeholder='{"Authorization": "Bearer ..."}'
              className="font-mono text-xs"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body (JSON)</Label>
            <Textarea
              value={(data.body as string) ?? ""}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder='{"key": "value"}'
              className="font-mono text-xs min-h-[100px]"
              disabled={!canEdit}
            />
          </div>
        </>
      )

    case "script":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Lenguaje</Label>
            <Select
              value={(data.language as string) ?? "javascript"}
              onValueChange={(v) => onChange({ language: v })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["javascript", "typescript", "python", "bash", "powershell", "sql"].map((l) => (
                  <SelectItem key={l} value={l} className="font-mono">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Textarea
              value={(data.code as string) ?? ""}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="// código a ejecutar"
              className="font-mono text-xs min-h-[180px]"
              spellCheck={false}
              disabled={!canEdit}
            />
          </div>
        </>
      )

    case "webhook":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Path único</Label>
            <Input
              value={(data.path as string) ?? ""}
              onChange={(e) => onChange({ path: e.target.value.replace(/[^a-z0-9-_]/gi, "") })}
              placeholder="deploy-prod"
              className="font-mono"
              disabled={!canEdit}
            />
            <p className="text-[11px] font-mono text-fg-subtle">
              POST /api/v1/webhooks/&lt;flowId&gt;
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Token de seguridad (opcional)</Label>
            <Input
              value={(data.token as string) ?? ""}
              onChange={(e) => onChange({ token: e.target.value })}
              placeholder="Header X-Webhook-Token"
              type="password"
              disabled={!canEdit}
            />
          </div>
        </>
      )

    case "condition":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Expresión</Label>
            <Textarea
              value={(data.expression as string) ?? ""}
              onChange={(e) => onChange({ expression: e.target.value })}
              placeholder="input.status === 'ok'"
              className="font-mono text-xs"
              disabled={!canEdit}
            />
            <p className="text-[11px] font-mono text-fg-subtle">
              Variables disponibles: input, prev, env
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Etiqueta rama TRUE</Label>
              <Input
                value={(data.trueLabel as string) ?? "Sí"}
                onChange={(e) => onChange({ trueLabel: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Etiqueta rama FALSE</Label>
              <Input
                value={(data.falseLabel as string) ?? "No"}
                onChange={(e) => onChange({ falseLabel: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>
        </>
      )

    case "delay":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={0}
              value={(data.seconds as number) ?? 60}
              onChange={(e) => onChange({ seconds: Number(e.target.value) })}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Unidad</Label>
            <Select
              value={(data.unit as string) ?? "seconds"}
              onValueChange={(v) => onChange({ unit: v })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Segundos</SelectItem>
                <SelectItem value="minutes">Minutos</SelectItem>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    case "notification":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Canal</Label>
            <Select
              value={(data.channel as string) ?? "email"}
              onValueChange={(v) => onChange({ channel: v })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="discord">Discord</SelectItem>
                <SelectItem value="webhook">Webhook custom</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Destinatarios (separados por coma)</Label>
            <Input
              value={(data.recipients as string) ?? ""}
              onChange={(e) => onChange({ recipients: e.target.value })}
              placeholder="ops@empresa.com, #devops"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Asunto / Título</Label>
            <Input
              value={(data.subject as string) ?? ""}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="Deploy completado"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mensaje</Label>
            <Textarea
              value={(data.message as string) ?? ""}
              onChange={(e) => onChange({ message: e.target.value })}
              placeholder="Soporta variables: {{input.x}}, {{prev.result}}"
              className="min-h-[120px]"
              disabled={!canEdit}
            />
          </div>
        </>
      )

    default:
      return null
  }
}
