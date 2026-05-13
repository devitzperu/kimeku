import { NextRequest } from "next/server"
import { stat, readFile } from "node:fs/promises"
import path from "node:path"
import { auth } from "@/lib/auth"
import mime from "mime"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth()
  if (!session?.user) return new Response("Unauthorized", { status: 401 })

  const { path: parts } = await params
  if (!parts?.length) return new Response("Not found", { status: 404 })

  const safe = parts.map((p) => p.replace(/[^\w.\-]/g, "_"))
  const filepath = path.resolve(UPLOAD_DIR, ...safe)
  const root = path.resolve(UPLOAD_DIR)
  if (!filepath.startsWith(root)) return new Response("Forbidden", { status: 403 })

  try {
    const s = await stat(filepath)
    if (!s.isFile()) return new Response("Not found", { status: 404 })
    const buf = await readFile(filepath)
    const type = mime.getType(filepath) ?? "application/octet-stream"
    return new Response(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(s.size),
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
