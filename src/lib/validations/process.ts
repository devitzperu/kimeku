import { z } from "zod"

export const processSchema = z.object({
  title: z.string().min(1, "Título requerido").max(200),
  description: z.string().max(50000).optional().or(z.literal("")),
  parentId: z.string().nullable().optional(),
  areaIds: z.array(z.string()).default([]),
  clientIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  codeBlocks: z
    .array(
      z.object({
        language: z.string().min(1).max(50),
        code: z.string().min(1).max(50000),
        description: z.string().max(500).optional().nullable(),
        path: z
          .string()
          .max(300)
          .optional()
          .nullable()
          .transform((v) => (v ? v.replace(/^\/+|\/+$/g, "") : v)),
      })
    )
    .default([]),
  commitMessage: z.string().max(200).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        path: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })
    )
    .default([]),
})

export type ProcessInput = z.infer<typeof processSchema>

export const reorderSchema = z.object({
  parentId: z.string().nullable(),
  ids: z.array(z.string()),
})
