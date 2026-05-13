import type { NextRequest } from "next/server"
import { authenticateRequest, hasScope, unauthorized, forbidden } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const principal = await authenticateRequest(req)
  if (!principal) return unauthorized()
  if (!hasScope(principal, "read:historial")) return forbidden("read:historial")

  const sp = req.nextUrl.searchParams
  const processId = sp.get("processId")
  const status = sp.get("status") as
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | null
  const limit = Math.min(Number(sp.get("limit") ?? 50), 200)

  const list = await prisma.historial.findMany({
    where: {
      ...(processId ? { processId } : {}),
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      title: true,
      processId: true,
      userId: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return Response.json({ data: list })
}
