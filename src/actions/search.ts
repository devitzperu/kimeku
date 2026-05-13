"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { searchProvider, type SearchHit, type SearchScope } from "@/lib/search"

export type { SearchHit, SearchHitType } from "@/lib/search"

export async function searchAction(query: string): Promise<SearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const user = await requireAuth()
  const scope: SearchScope = {
    userId: user.id,
    role: user.role,
    clientId: user.clientId ?? null,
  }

  return searchProvider.search(q, { scope, limit: 24 })
}
