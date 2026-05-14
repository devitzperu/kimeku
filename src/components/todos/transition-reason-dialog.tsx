"use client"

import * as React from "react"
import { Loader2, Type, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { cn } from "@/lib/utils"

interface TransitionReasonDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  pending?: boolean
  onCancel: () => void
  onConfirm: (reason: string | null) => void
  container?: HTMLElement | null
}

type Mode = "simple" | "markdown"

export function TransitionReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
  container,
}: TransitionReasonDialogProps) {
  const [reason, setReason] = React.useState("")
  const [mode, setMode] = React.useState<Mode>("simple")
  const reasonRef = React.useRef(reason)

  React.useEffect(() => {
    reasonRef.current = reason
  }, [reason])

  React.useEffect(() => {
    if (open) {
      setReason("")
      setMode("simple")
      reasonRef.current = ""
    }
  }, [open])

  function submit() {
    const v = reasonRef.current.trim()
    onConfirm(v ? v : null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !pending) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onCancel()}>
      <DialogContent className="sm:max-w-2xl" onKeyDown={handleKeyDown} container={container}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-fg-subtle">
              Motivo (opcional)
            </label>
            <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-muted/40 p-0.5">
              <ModeButton
                active={mode === "simple"}
                onClick={() => setMode("simple")}
                disabled={pending}
                icon={<Type className="h-3 w-3" />}
                label="Texto"
              />
              <ModeButton
                active={mode === "markdown"}
                onClick={() => setMode("markdown")}
                disabled={pending}
                icon={<FileText className="h-3 w-3" />}
                label="Markdown"
              />
            </div>
          </div>

          {mode === "simple" ? (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe brevemente por qué…"
              rows={4}
              autoFocus
              disabled={pending}
            />
          ) : (
            <div className="rounded-md border border-border bg-bg-elevated">
              <MarkdownEditor
                key={`md-${open}`}
                value={reason}
                onChange={setReason}
                placeholder="Escribe en Markdown. Pega URLs o arrastra imágenes…"
                height={260}
              />
            </div>
          )}

          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            ⌘ / Ctrl + Enter para guardar
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModeButton({
  active,
  onClick,
  disabled,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors",
        active
          ? "bg-bg text-fg shadow-sm"
          : "text-fg-subtle hover:text-fg",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon}
      {label}
    </button>
  )
}
