import "server-only"

export type PortalTodoView = {
  id: string
  title: string
  description: string | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  dueAt: string | null
  completedAt: string | null
  processTitle: string | null
  areaNames: string[]
}

export type PortalEvent =
  | { type: "todo:upsert"; todo: PortalTodoView }
  | { type: "todo:delete"; id: string }

type Writer = WritableStreamDefaultWriter<Uint8Array>

declare global {
  // eslint-disable-next-line no-var
  var __kimekuPortalSubs: Map<string, Set<Writer>> | undefined
}

const subs: Map<string, Set<Writer>> =
  globalThis.__kimekuPortalSubs ?? (globalThis.__kimekuPortalSubs = new Map())
const encoder = new TextEncoder()

export function subscribe(clientId: string, writer: Writer) {
  let set = subs.get(clientId)
  if (!set) {
    set = new Set()
    subs.set(clientId, set)
  }
  set.add(writer)
  return () => {
    const current = subs.get(clientId)
    if (!current) return
    current.delete(writer)
    if (current.size === 0) subs.delete(clientId)
  }
}

export async function notify(clientId: string, payload: PortalEvent) {
  const set = subs.get(clientId)
  if (!set || set.size === 0) return
  const chunk = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
  const dead: Writer[] = []
  for (const w of set) {
    try {
      await w.write(chunk)
    } catch {
      dead.push(w)
    }
  }
  for (const w of dead) set.delete(w)
  if (set.size === 0) subs.delete(clientId)
}

export function encodeFrame(payload: PortalEvent | string) {
  if (typeof payload === "string") return encoder.encode(payload)
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
}
