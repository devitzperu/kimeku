import { NextRequest } from "next/server"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { auth } from "@/lib/auth"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads"
const MAX_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20)

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/sql",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/zip",
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 })
  }

  if (file.size > MAX_MB * 1024 * 1024) {
    return Response.json({ error: `Archivo excede ${MAX_MB}MB` }, { status: 413 })
  }

  // SQL files come without standard mime; allow by extension
  const ext = path.extname(file.name).toLowerCase()
  const isSqlExt = ext === ".sql"
  if (!ALLOWED_MIME.has(file.type) && !isSqlExt) {
    return Response.json({ error: `Tipo no permitido: ${file.type || ext}` }, { status: 415 })
  }

  const yyyymm = new Date().toISOString().slice(0, 7)
  const subdir = path.join(UPLOAD_DIR, yyyymm)
  await mkdir(subdir, { recursive: true })

  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(0, 100)
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`
  const filepath = path.join(subdir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  const publicPath = `/api/files/${yyyymm}/${filename}`

  return Response.json({
    filename: file.name,
    path: publicPath,
    mimeType: file.type || (isSqlExt ? "application/sql" : "application/octet-stream"),
    size: file.size,
  })
}
