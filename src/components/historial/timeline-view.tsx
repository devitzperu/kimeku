"use client"

import * as React from "react"
import Link from "next/link"
import {
  Play,
  CheckCircle2,
  CircleDashed,
  SkipForward,
  Loader2,
  MessageSquare,
  Paperclip,
  FileText,
  BookOpen,
  Send,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn, formatDateTime, durationBetween, formatDuration } from "@/lib/utils"
import {
  startStep,
  finishStep,
  skipStep,
  addStepComment,
  attachToStep,
} from "@/actions/historial"
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload"

type Step = {
  id: string
  order: number
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
  startedAt: Date | null
  finishedAt: Date | null
  notes: string | null
  process: {
    id: string
    title: string
    parentId: string | null
    bitacoras: { bitacora: { id: string; title: string } }[]
  }
  comments: {
    id: string
    content: string
    createdAt: Date
    user: { name: string; avatar: string | null }
  }[]
  attachments: { id: string; filename: string; path: string; size: number; mimeType: string }[]
}

interface TimelineViewProps {
  historial: { id: string; status: string; steps: Step[] }
  canEdit: boolean
}

export function TimelineView({ historial, canEdit }: TimelineViewProps) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" aria-hidden />
      <ul className="space-y-3">
        {historial.steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} canEdit={canEdit} />
        ))}
      </ul>
    </div>
  )
}

const STATUS_DOT: Record<Step["status"], string> = {
  PENDING: "bg-bg border-2 border-border",
  IN_PROGRESS: "bg-accent ring-4 ring-accent/20 animate-pulse",
  COMPLETED: "bg-success",
  SKIPPED: "bg-fg-subtle",
}

function StepRow({ step, index, canEdit }: { step: Step; index: number; canEdit: boolean }) {
  const [open, setOpen] = React.useState(step.status === "IN_PROGRESS")
  const [pending, start] = React.useTransition()
  const [now, setNow] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (step.status !== "IN_PROGRESS") return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [step.status])

  const dur = durationBetween(step.startedAt, step.finishedAt)
  const live =
    now !== null && step.startedAt && step.status === "IN_PROGRESS"
      ? now - new Date(step.startedAt).getTime()
      : null

  return (
    <li className="relative pl-12">
      <span className={cn("absolute left-2.5 top-4 z-10 h-3 w-3 rounded-full", STATUS_DOT[step.status])} />
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {String(index + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex-1 text-left text-sm font-medium hover:text-accent transition-colors"
            >
              {step.process.title}
            </button>
            {step.comments.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {step.comments.length}
              </span>
            )}
            {step.attachments.length > 0 && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {step.attachments.length}
              </span>
            )}
            {dur && (
              <Badge variant="default" className="font-mono">
                {formatDuration(dur)}
              </Badge>
            )}
            {live !== null && (
              <Badge variant="warning" className="font-mono">
                ~{formatDuration(live)}
              </Badge>
            )}
            <Link
              href={`/procesos/${step.process.id}`}
              className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle hover:text-accent"
            >
              ver doc
            </Link>
          </div>

          {open && (
            <div className="space-y-3 pt-2 border-t border-border">
              {canEdit && (
                <div className="flex items-center gap-2">
                  {step.status === "PENDING" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        start(async () => {
                          const res = await startStep(step.id)
                          if (!res.ok) toast.error(res.error)
                        })
                      }
                      disabled={pending}
                    >
                      <Play className="h-3 w-3" />
                      Iniciar paso
                    </Button>
                  )}
                  {step.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        start(async () => {
                          const res = await finishStep(step.id)
                          if (!res.ok) toast.error(res.error)
                        })
                      }
                      disabled={pending}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Marcar completo
                    </Button>
                  )}
                  {(step.status === "PENDING" || step.status === "IN_PROGRESS") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        start(async () => {
                          const res = await skipStep(step.id)
                          if (!res.ok) toast.error(res.error)
                        })
                      }
                      disabled={pending}
                    >
                      <SkipForward className="h-3 w-3" />
                      Saltar
                    </Button>
                  )}
                  {pending && <Loader2 className="h-3 w-3 animate-spin text-fg-subtle" />}
                </div>
              )}

              {step.process.bitacoras.length > 0 && (
                <div className="rounded-md border border-border bg-muted/30 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle mb-2 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Bitácora relacionada
                  </p>
                  <ul className="space-y-1">
                    {step.process.bitacoras.map((b) => (
                      <li key={b.bitacora.id}>
                        <Link
                          href={`/bitacora/${b.bitacora.id}`}
                          className="text-xs hover:text-accent"
                        >
                          • {b.bitacora.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step.attachments.length > 0 && (
                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    Archivos
                  </p>
                  {step.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:border-accent-border hover:text-accent transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      {a.filename}
                    </a>
                  ))}
                </div>
              )}

              {step.comments.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    Comentarios
                  </p>
                  {step.comments.map((c) => {
                    const initials = c.user.name
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                    return (
                      <div key={c.id} className="flex gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-accent-subtle text-accent text-[9px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 rounded-md bg-muted px-3 py-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium">{c.user.name}</span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-fg-muted whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {canEdit && <CommentBox stepId={step.id} />}
              {canEdit && <AttachBox stepId={step.id} />}
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  )
}

function CommentBox({ stepId }: { stepId: string }) {
  const [content, setContent] = React.useState("")
  const [pending, start] = React.useTransition()

  function submit() {
    if (!content.trim()) return
    start(async () => {
      const res = await addStepComment(stepId, content)
      if (res.ok) {
        setContent("")
        toast.success("Comentario agregado")
      } else toast.error(res.error)
    })
  }

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Agregar comentario…"
        rows={2}
        className="text-xs"
      />
      <Button size="sm" onClick={submit} disabled={pending || !content.trim()}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
      </Button>
    </div>
  )
}

function AttachBox({ stepId }: { stepId: string }) {
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [pending, start] = React.useTransition()

  React.useEffect(() => {
    if (!files.length) return
    const last = files[files.length - 1]
    start(async () => {
      const res = await attachToStep(stepId, last)
      if (res.ok) {
        toast.success("Archivo asociado")
        setFiles([])
      } else toast.error(res.error)
    })
  }, [files, stepId])

  return (
    <FileUpload
      files={pending ? files : []}
      onFilesChange={setFiles}
      multiple={false}
      maxFiles={1}
    />
  )
}
