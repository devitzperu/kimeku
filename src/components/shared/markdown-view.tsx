"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"

const Markdown = dynamic(() => import("@uiw/react-md-editor").then((m) => m.default.Markdown), {
  ssr: false,
  loading: () => <div className="h-12 rounded-md bg-muted animate-pulse" />,
})

export function MarkdownView({ source }: { source: string }) {
  const { resolvedTheme } = useTheme()
  if (!source?.trim()) return <p className="text-sm text-fg-subtle italic">Sin descripción</p>
  return (
    <div data-color-mode={resolvedTheme === "dark" ? "dark" : "light"} className="prose-doc">
      <Markdown source={source} style={{ background: "transparent", color: "inherit" }} />
    </div>
  )
}
