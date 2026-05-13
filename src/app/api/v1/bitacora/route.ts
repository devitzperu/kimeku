import type { NextRequest } from "next/server"
import { authenticateRequest, hasScope, unauthorized, forbidden } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const principal = await authenticateRequest(req)
  if (!principal) return unauthorized()
  if (!hasScope(principal, "read:bitacora")) return forbidden("read:bitacora")

  const sp = req.nextUrl.searchParams
  const processId = sp.get("processId")
  const limit = Math.min(Number(sp.get("limit") ?? 50), 200)

  const list = await prisma.bitacora.findMany({
    where: processId ? { processes: { some: { processId } } } : {},
    select: {
      id: true,
      title: true,
      description: true,
      version: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return Response.json({ data: list })
}
