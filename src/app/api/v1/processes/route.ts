import type { NextRequest } from "next/server"
import { authenticateRequest, hasScope, unauthorized, forbidden } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const principal = await authenticateRequest(req)
  if (!principal) return unauthorized()
  if (!hasScope(principal, "read:processes")) return forbidden("read:processes")

  const sp = req.nextUrl.searchParams
  const parentId = sp.get("parentId")
  const areaId = sp.get("areaId")
  const tagId = sp.get("tagId")
  const limit = Math.min(Number(sp.get("limit") ?? 50), 200)

  const processes = await prisma.process.findMany({
    where: {
      ...(parentId !== null
        ? parentId === "null"
          ? { parentId: null }
          : { parentId }
        : {}),
      ...(areaId ? { areas: { some: { areaId } } } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      parentId: true,
      version: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    take: limit,
  })

  return Response.json({ data: processes })
}
