"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import "@uiw/react-md-editor/markdown-editor.css"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-md border border-border bg-muted animate-pulse" />
  ),
})

interface MarkdownEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  height?: number
}

export function MarkdownEditor({ value, onChange, placeholder, height = 320 }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const colorMode = mounted && resolvedTheme === "dark" ? "dark" : "light"
  return (
    <div data-color-mode={colorMode}>
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        textareaProps={{ placeholder }}
        preview="edit"
        visibleDragbar={false}
      />
    </div>
  )
}
