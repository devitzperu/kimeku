import { z } from "zod"

export const repoBindingSchema = z.object({
  provider: z.enum(["GITHUB", "GITLAB"]),
  repoFullName: z.string().min(1, "Selecciona un repositorio").max(200),
  defaultBranch: z.string().min(1, "Rama requerida").max(120).default("main"),
  basePath: z
    .string()
    .max(200)
    .default("")
    .transform((v) => v.replace(/^\/+|\/+$/g, "")),
  enableWebhook: z.boolean().default(false),
})

export type RepoBindingInput = z.infer<typeof repoBindingSchema>
