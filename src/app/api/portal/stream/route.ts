import { requireClientRole } from "@/lib/auth-helpers"
import { subscribe } from "@/lib/portal-events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const user = await requireClientRole()

  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // First frame must be a real `data:` event so EventSource triggers `onopen`
  // promptly across all runtimes (some buffer leading comments).
  const padding = " ".repeat(2048)
  await writer.write(encoder.encode(`: ${padding}\n\n`))
  await writer.write(encoder.encode(`event: ready\ndata: {"ok":true}\n\n`))

  const unsubscribe = subscribe(user.clientId, writer)

  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(`event: ping\ndata: {}\n\n`)).catch(() => {})
  }, 15_000)

  const close = () => {
    clearInterval(heartbeat)
    unsubscribe()
    writer.close().catch(() => {})
  }

  req.signal.addEventListener("abort", close)

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
