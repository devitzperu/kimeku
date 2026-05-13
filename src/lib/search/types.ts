import type { Role } from "@prisma/client"

export type SearchHitType = "process" | "todo" | "bitacora" | "client"

export interface SearchDoc {
  id: string
  type: SearchHitType
  title: string
  body: string
  href: string
  ownerId?: string | null
  clientId?: string | null
  visibleToClient?: boolean
}

export interface SearchHit {
  id: string
  type: SearchHitType
  title: string
  subtitle: string | null
  href: string
  score: number
}

export interface SearchScope {
  userId: string
  role: Role
  clientId?: string | null
}

export interface SearchOpts {
  scope: SearchScope
  limit?: number
}

export interface SearchProvider {
  ready(): Promise<void>
  index(doc: SearchDoc): Promise<void>
  remove(type: SearchHitType, id: string): Promise<void>
  search(q: string, opts: SearchOpts): Promise<SearchHit[]>
  rebuild(): Promise<void>
}

export const SUBTITLE_MAX = 80
