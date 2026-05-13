import { z } from "zod"
import { extendZodWithOpenApi, OpenApiGeneratorV31, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi"

extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

// Common schemas registered once
export const ErrorSchema = registry.register(
  "Error",
  z
    .object({
      error: z.string().openapi({ example: "Unauthorized" }),
      details: z.unknown().optional(),
    })
    .openapi("Error")
)

export const ProcessSchema = registry.register(
  "Process",
  z
    .object({
      id: z.string().openapi({ example: "clxxx..." }),
      title: z.string(),
      description: z.string().nullable(),
      parentId: z.string().nullable(),
      version: z.number().int(),
      order: z.number().int(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
    .openapi("Process")
)

export const BitacoraSchema = registry.register(
  "Bitacora",
  z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      version: z.number().int(),
      userId: z.string(),
      createdAt: z.string().datetime(),
    })
    .openapi("Bitacora")
)

export const HistorialSchema = registry.register(
  "Historial",
  z
    .object({
      id: z.string(),
      title: z.string(),
      processId: z.string(),
      userId: z.string(),
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
      startedAt: z.string().datetime().nullable(),
      finishedAt: z.string().datetime().nullable(),
    })
    .openapi("Historial")
)

// Auth scheme
registry.registerComponent("securitySchemes", "ApiKey", {
  type: "apiKey",
  in: "header",
  name: "X-API-Key",
  description: "Generated at /configuracion/api-keys. Send in `X-API-Key` header.",
})
registry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "Session JWT (browser auth).",
})

// Routes
registry.registerPath({
  method: "get",
  path: "/api/v1/processes",
  summary: "List processes",
  description: "Returns flat list of processes (without sub-tree). Filterable.",
  tags: ["Processes"],
  security: [{ ApiKey: [] }, { Bearer: [] }],
  request: {
    query: z.object({
      parentId: z.string().nullable().optional().openapi({ description: "Filter by parent. Use 'null' for roots." }),
      areaId: z.string().optional(),
      tagId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
    }),
  },
  responses: {
    200: {
      description: "Processes",
      content: { "application/json": { schema: z.object({ data: z.array(ProcessSchema) }) } },
    },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
})

registry.registerPath({
  method: "get",
  path: "/api/v1/processes/{id}",
  summary: "Get process by ID",
  tags: ["Processes"],
  security: [{ ApiKey: [] }, { Bearer: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Process", content: { "application/json": { schema: ProcessSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
})

registry.registerPath({
  method: "get",
  path: "/api/v1/bitacora",
  summary: "List bitacora entries",
  tags: ["Bitacora"],
  security: [{ ApiKey: [] }, { Bearer: [] }],
  request: {
    query: z.object({
      processId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
    }),
  },
  responses: {
    200: { description: "Bitacora list", content: { "application/json": { schema: z.object({ data: z.array(BitacoraSchema) }) } } },
  },
})

registry.registerPath({
  method: "get",
  path: "/api/v1/historial",
  summary: "List execution histories",
  tags: ["Historial"],
  security: [{ ApiKey: [] }, { Bearer: [] }],
  request: {
    query: z.object({
      processId: z.string().optional(),
      status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
    }),
  },
  responses: {
    200: { description: "Historial list", content: { "application/json": { schema: z.object({ data: z.array(HistorialSchema) }) } } },
  },
})

registry.registerPath({
  method: "post",
  path: "/api/v1/webhooks/{id}",
  summary: "Trigger flow via webhook",
  description: "Public webhook URL that triggers a flow execution. Authentication is per-flow (token in path or header).",
  tags: ["Flows"],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: z.unknown() } } },
  },
  responses: {
    202: { description: "Accepted, execution queued", content: { "application/json": { schema: z.object({ executionId: z.string() }) } } },
    404: { description: "Webhook not found", content: { "application/json": { schema: ErrorSchema } } },
  },
})

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "doc-ia API",
      version: "1.0.0",
      description: "REST API for process documentation. Use API keys for integrations (N8N, scripts) or session bearer for browser-side calls.",
    },
    servers: [{ url: process.env.AUTH_URL ?? "http://localhost:3000" }],
  })
}
