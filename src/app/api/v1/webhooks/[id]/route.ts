import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Public webhook trigger for flow definitions.
 * The flow definition's `triggers` JSON should contain a webhook spec with token.
 * This endpoint reads body and queues a flow execution.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const flow = await prisma.flowDefinition.findUnique({ where: { id } })
  if (!flow || !flow.active) {
    return Response.json({ error: "Webhook not found" }, { status: 404 })
  }

  // Token check from triggers config
  type WebhookTrigger = { type: string; token?: string }
  const triggers = (flow.triggers as WebhookTrigger[] | null) ?? []
  const webhookTrigger = triggers.find((t) => t.type === "webhook")
  if (!webhookTrigger) {
    return Response.json({ error: "Webhook not configured" }, { status: 404 })
  }
  if (webhookTrigger.token) {
    const provided = req.headers.get("x-webhook-token") ?? req.nextUrl.searchParams.get("token")
    if (provided !== webhookTrigger.token) {
      return Response.json({ error: "Invalid token" }, { status: 401 })
    }
  }

  let input: unknown = null
  try {
    input = await req.json()
  } catch {
    input = null
  }

  const execution = await prisma.flowExecution.create({
    data: {
      flowDefinitionId: flow.id,
      status: "PENDING",
      triggeredBy: "webhook",
      input: input as never,
    },
  })

  // TODO: queue actual execution worker (out of scope for MVP)

  return Response.json({ executionId: execution.id }, { status: 202 })
}
