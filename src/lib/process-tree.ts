import { prisma } from "@/lib/prisma"

export async function walkProcessTree(rootId: string): Promise<{ processId: string }[]> {
  const all = await prisma.process.findMany({
    select: { id: true, parentId: true, order: true, title: true },
  })
  const byParent = new Map<string | null, typeof all>()
  for (const p of all) {
    const list = byParent.get(p.parentId) ?? []
    list.push(p)
    byParent.set(p.parentId, list)
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order)

  const steps: { processId: string }[] = []
  function dfs(id: string) {
    steps.push({ processId: id })
    const children = byParent.get(id) ?? []
    for (const c of children) dfs(c.id)
  }
  dfs(rootId)
  return steps
}
