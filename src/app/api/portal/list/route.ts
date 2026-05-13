import { NextResponse } from "next/server"
import { listPortalTodos } from "@/actions/portal"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const todos = await listPortalTodos()
  return NextResponse.json({ todos })
}
