import { z } from "zod"

export const todoSchema = z
  .object({
    title: z.string().min(1, "Título requerido").max(200),
    description: z.string().max(10000).optional().or(z.literal("")),
    dueAt: z.coerce.date().nullable().optional(),
    alarmAt: z.coerce.date().nullable().optional(),
    priority: z.coerce.number().int().min(0).max(2).default(0),
    rrule: z.string().max(500).nullable().optional(),
    rruleUntil: z.coerce.date().nullable().optional(),
    processId: z.string().nullable().optional(),
    tagIds: z.array(z.string()).default([]),
    visibleToClient: z.boolean().optional().default(false),
    clientId: z.string().nullable().optional(),
  })
  .refine((d) => !d.visibleToClient || !!d.clientId, {
    message: "Selecciona un cliente para mostrar esta actividad",
    path: ["clientId"],
  })

export const quickAddSchema = z.object({
  title: z.string().min(1, "Título requerido").max(200),
  dueAt: z.coerce.date().nullable().optional(),
})

export const todoPatchSchema = z
  .object({
    title: z.string().min(1, "Título requerido").max(200).optional(),
    description: z.string().max(10000).nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    alarmAt: z.coerce.date().nullable().optional(),
    priority: z.coerce.number().int().min(0).max(2).optional(),
    rrule: z.string().max(500).nullable().optional(),
    rruleUntil: z.coerce.date().nullable().optional(),
    processId: z.string().nullable().optional(),
    tagIds: z.array(z.string()).optional(),
    visibleToClient: z.boolean().optional(),
    clientId: z.string().nullable().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  })
  .strict()

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
})

export type TodoInput = z.infer<typeof todoSchema>
export type QuickAddInput = z.infer<typeof quickAddSchema>
export type TodoPatchInput = z.infer<typeof todoPatchSchema>
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>
