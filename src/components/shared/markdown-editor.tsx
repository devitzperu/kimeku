"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import "./markdown-editor.css"

interface MarkdownEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  height?: number
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.set("file", file)
  const res = await fetch("/api/upload", { method: "POST", body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error subiendo imagen" }))
    throw new Error(err.error ?? "Error subiendo imagen")
  }
  const data: { path: string } = await res.json()
  return data.path
}

export function MarkdownEditor({ value, onChange, placeholder, height = 320 }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const placeholderRef = useRef(placeholder)
  const initialValueRef = useRef(value)
  const lastEmittedRef = useRef(value)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    placeholderRef.current = placeholder
  }, [placeholder])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    let cancelled = false
    let crepeInstance: { destroy: () => Promise<unknown> } | null = null

    ;(async () => {
      const [{ Crepe }, { listenerCtx }] = await Promise.all([
        import("@milkdown/crepe"),
        import("@milkdown/kit/plugin/listener"),
      ])
      await Promise.all([
        import("@milkdown/crepe/theme/common/style.css"),
        import("@milkdown/crepe/theme/frame.css"),
      ])
      if (cancelled) return

      const crepe = new Crepe({
        root,
        defaultValue: initialValueRef.current,
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: placeholderRef.current ?? "Escribe aquí…",
            mode: "doc",
          },
          [Crepe.Feature.ImageBlock]: {
            onUpload: uploadImage,
            blockOnUpload: uploadImage,
            inlineOnUpload: uploadImage,
            inlineUploadPlaceholderText: "Pega URL o sube imagen",
            blockUploadPlaceholderText: "Arrastra, pega URL o sube imagen",
            onImageLoadError: () => {
              toast.error("No se pudo cargar la imagen")
            },
          },
        },
      })

      crepe.editor.config((ctx) => {
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          if (markdown === lastEmittedRef.current) return
          lastEmittedRef.current = markdown
          onChangeRef.current(markdown)
        })
      })

      await crepe.create()
      if (cancelled) {
        void crepe.destroy()
        return
      }
      crepeInstance = crepe
      setReady(true)
    })().catch((e) => {
      console.error("[MarkdownEditor] init failed", e)
      toast.error("Editor no pudo iniciar")
    })

    return () => {
      cancelled = true
      setReady(false)
      crepeInstance?.destroy()
    }
  }, [])

  useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    initialValueRef.current = value
  }, [value])

  return (
    <div
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
      data-theme={resolvedTheme === "dark" ? "dark" : "light"}
      className={cn(
        "kimeku-md-editor relative rounded-md border border-border bg-elevated",
        !ready && "animate-pulse",
      )}
      style={{ minHeight: height }}
    >
      <div ref={containerRef} style={{ minHeight: height }} />
    </div>
  )
}
