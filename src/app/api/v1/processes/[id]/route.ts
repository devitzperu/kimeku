import type { NextRequest } from "next/server"
import {
  authenticateRequest,
  hasScope,
  unauthorized,
  forbidden,
  notFound,
} from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const principal = await authenticateRequest(req)
  if (!principal) return unauthorized()
  if (!hasScope(principal, "read:processes")) return forbidden("read:processes")

  const { id } = await params
  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      areas: { include: { area: true } },
      clients: { include: { client: true } },
      tags: { include: { tag: true } },
      codeBlocks: { orderBy: { order: "asc" } },
      attachments: true,
      children: {
        select: { id: true, title: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  })
  if (!process) return notFound()
  return Response.json(process)
}
