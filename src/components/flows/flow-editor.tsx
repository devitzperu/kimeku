"use client"

import dynamic from "next/dynamic"

const Editor = dynamic(() => import("./flow-editor-inner").then((m) => m.FlowEditorInner), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] rounded-lg border border-border bg-muted animate-pulse" />
  ),
})

export function FlowEditor(props: {
  flowId: string
  initialName: string
  initialNodes: unknown
  initialEdges: unknown
  initialTriggers: unknown
  canEdit: boolean
}) {
  return <Editor {...props} />
}
