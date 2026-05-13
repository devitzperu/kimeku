import { buildOpenApiDocument } from "@/lib/openapi"

export const dynamic = "force-static"

export async function GET() {
  const doc = buildOpenApiDocument()
  return Response.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
