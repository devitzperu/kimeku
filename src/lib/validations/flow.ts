import { z } from "zod"

const NODE_TYPES = ["start", "manual", "http", "script", "webhook", "condition", "delay", "notification", "end"] as const
export type FlowNodeType = (typeof NODE_TYPES)[number]

export const flowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(NODE_TYPES),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).default({}),
})

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
})

export const flowDefinitionSchema = z.object({
  processId: z.string().optional(),
  name: z.string().min(1).max(200),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  triggers: z
    .array(
      z.object({
        type: z.enum(["manual", "cron", "webhook"]),
        config: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .default([]),
})

export type FlowDefinitionInput = z.infer<typeof flowDefinitionSchema>
