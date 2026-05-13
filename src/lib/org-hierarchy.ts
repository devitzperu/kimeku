import { prisma } from "@/lib/prisma"

type OrgRow = { id: string; parentId: string | null; userId: string | null }

async function loadAllNodes(): Promise<OrgRow[]> {
  return prisma.orgNode.findMany({
    select: { id: true, parentId: true, userId: true },
  })
}

function indexByParent(nodes: OrgRow[]): Map<string | null, OrgRow[]> {
  const byParent = new Map<string | null, OrgRow[]>()
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? []
    list.push(n)
    byParent.set(n.parentId, list)
  }
  return byParent
}

export async function getSubordinateUserIds(
  userId: string,
  opts?: { includeSelf?: boolean }
): Promise<string[]> {
  const nodes = await loadAllNodes()
  const root = nodes.find((n) => n.userId === userId)
  if (!root) return opts?.includeSelf ? [userId] : []

  const byParent = indexByParent(nodes)
  const result: string[] = []
  if (opts?.includeSelf) result.push(userId)

  const queue: string[] = [root.id]
  while (queue.length) {
    const id = queue.shift()!
    const children = byParent.get(id) ?? []
    for (const c of children) {
      if (c.userId) result.push(c.userId)
      queue.push(c.id)
    }
  }
  return result
}

export async function isAncestorOf(
  ancestorUserId: string,
  descendantUserId: string
): Promise<boolean> {
  if (ancestorUserId === descendantUserId) return false
  const ids = await getSubordinateUserIds(ancestorUserId)
  return ids.includes(descendantUserId)
}
