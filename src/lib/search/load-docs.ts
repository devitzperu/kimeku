import { prisma } from "@/lib/prisma"
import type { SearchDoc, SearchHitType } from "./types"

export async function loadAllDocs(): Promise<SearchDoc[]> {
  const [processes, todos, bitacoras, clients] = await Promise.all([
    prisma.process.findMany({
      select: { id: true, title: true, description: true },
    }),
    prisma.todo.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        ownerId: true,
        clientId: true,
        visibleToClient: true,
      },
    }),
    prisma.bitacora.findMany({
      select: { id: true, title: true, description: true },
    }),
    prisma.client.findMany({
      select: { id: true, name: true, description: true },
    }),
  ])

  const docs: SearchDoc[] = []

  for (const p of processes) {
    docs.push({
      id: p.id,
      type: "process",
      title: p.title,
      body: p.description ?? "",
      href: `/procesos/${p.id}`,
    })
  }

  for (const t of todos) {
    docs.push({
      id: t.id,
      type: "todo",
      title: t.title,
      body: t.description ?? "",
      href: `/todos/${t.id}`,
      ownerId: t.ownerId,
      clientId: t.clientId,
      visibleToClient: t.visibleToClient,
    })
  }

  for (const b of bitacoras) {
    docs.push({
      id: b.id,
      type: "bitacora",
      title: b.title,
      body: b.description ?? "",
      href: `/bitacora/${b.id}`,
    })
  }

  for (const c of clients) {
    docs.push({
      id: c.id,
      type: "client",
      title: c.name,
      body: c.description ?? "",
      href: `/clientes/${c.id}`,
    })
  }

  return docs
}

export function compositeId(type: SearchHitType, id: string): string {
  return `${type}:${id}`
}
