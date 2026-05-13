"use client"

import { Plus, Trash2, GripVertical, FileCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CodeBlock = {
  language: string
  code: string
  description?: string | null
  path?: string | null
  lastCommitSha?: string | null
}

const LANGUAGES = [
  "sql",
  "javascript",
  "typescript",
  "python",
  "bash",
  "shell",
  "powershell",
  "json",
  "yaml",
  "html",
  "css",
  "go",
  "rust",
  "java",
  "csharp",
  "php",
  "ruby",
  "plaintext",
]

interface CodeBlockEditorProps {
  blocks: CodeBlock[]
  onChange: (blocks: CodeBlock[]) => void
  bindingActive?: boolean
}

export function CodeBlockEditor({ blocks, onChange, bindingActive }: CodeBlockEditorProps) {
  function update(i: number, patch: Partial<CodeBlock>) {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  }
  function add() {
    onChange([
      ...blocks,
      { language: "sql", code: "", description: "", path: bindingActive ? "" : null },
    ])
  }
  function remove(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-fg-muted">
          Sin bloques de código. Agrega scripts SQL, comandos shell, snippets…
        </p>
      ) : (
        blocks.map((block, i) => (
          <div key={i} className="rounded-lg border border-border bg-elevated p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-fg-subtle" />
              <Select value={block.language} onValueChange={(v) => update(i, { language: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l} className="font-mono text-xs">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={block.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Descripción breve (opcional)"
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)}>
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            </div>
            {bindingActive && (
              <div className="flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5 text-fg-subtle shrink-0" />
                <Input
                  value={block.path ?? ""}
                  onChange={(e) => update(i, { path: e.target.value })}
                  placeholder="ruta/al/archivo.sql (relativa al basePath del repo)"
                  className="font-mono text-xs"
                />
                {block.lastCommitSha && (
                  <Badge variant="outline" className="font-mono normal-case tracking-normal">
                    {block.lastCommitSha.slice(0, 7)}
                  </Badge>
                )}
              </div>
            )}
            <Textarea
              value={block.code}
              onChange={(e) => update(i, { code: e.target.value })}
              placeholder="-- código aquí"
              className="font-mono text-xs min-h-[140px]"
              spellCheck={false}
            />
          </div>
        ))
      )}

      <Button type="button" variant="outline" onClick={add}>
        <Plus className="h-4 w-4" />
        Agregar bloque de código
      </Button>
    </div>
  )
}
