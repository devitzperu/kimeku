"use client"

import * as React from "react"
import { Upload, Loader2, X, FileText, FileImage, FileCode } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type UploadedFile = {
  filename: string
  path: string
  mimeType: string
  size: number
}

interface FileUploadProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
}

export function FileUpload({ files, onFilesChange, accept, multiple = true, maxFiles = 10 }: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handle(fileList: FileList | null) {
    if (!fileList?.length) return
    if (files.length + fileList.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos`)
      return
    }
    setUploading(true)
    try {
      const uploaded: UploadedFile[] = []
      for (const f of Array.from(fileList)) {
        const fd = new FormData()
        fd.set("file", f)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Error subiendo" }))
          toast.error(`${f.name}: ${err.error}`)
          continue
        }
        uploaded.push(await res.json())
      }
      if (uploaded.length) {
        onFilesChange([...files, ...uploaded])
        toast.success(`${uploaded.length} archivo(s) subido(s)`)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function remove(idx: number) {
    onFilesChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div
        onDrop={(e) => {
          e.preventDefault()
          handle(e.dataTransfer.files)
        }}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-6 py-8 text-center transition-colors hover:border-accent-border",
          uploading && "opacity-60 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handle(e.target.files)}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={uploading}
        />
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        ) : (
          <Upload className="h-5 w-5 text-fg-muted" />
        )}
        <p className="text-sm">
          <span className="font-medium">Arrastra archivos</span>
          <span className="text-fg-muted"> o haz click para seleccionar</span>
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          imágenes · pdf · sql · texto · zip
        </p>
      </div>

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm"
            >
              {iconFor(f.mimeType)}
              <span className="flex-1 truncate">{f.filename}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {humanSize(f.size)}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-fg-muted shrink-0" />
  if (mime.includes("sql") || mime.includes("json") || mime.includes("text"))
    return <FileCode className="h-4 w-4 text-fg-muted shrink-0" />
  return <FileText className="h-4 w-4 text-fg-muted shrink-0" />
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
