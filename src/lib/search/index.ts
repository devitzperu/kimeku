import { oramaProvider } from "./orama-provider"
import { pgProvider } from "./pg-provider"
import type { SearchDoc, SearchHitType, SearchProvider } from "./types"

const PROVIDER = process.env.SEARCH_PROVIDER ?? "orama"

export const searchProvider: SearchProvider =
  PROVIDER === "pg" ? pgProvider : oramaProvider

export async function indexDoc(doc: SearchDoc): Promise<void> {
  try {
    await searchProvider.index(doc)
  } catch (err) {
    console.error("[search] index failed", err)
  }
}

export async function removeDoc(
  type: SearchHitType,
  id: string,
): Promise<void> {
  try {
    await searchProvider.remove(type, id)
  } catch (err) {
    console.error("[search] remove failed", err)
  }
}

export * from "./types"
