import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  SUBTITLE_MAX,
  type SearchHit,
  type SearchHitType,
  type SearchProvider,
} from "./types"

const LIMIT_PER_ENTITY = 6
const MIN_SIMILARITY = 0.1

interface RawRow {
  id: string
  title: string
  body: string
  score: number | string
}

function toScore(value: number | string): number {
  return typeof value === "number" ? value : Number(value)
}

function toSubtitle(body: string): string | null {
  if (!body) return null
  return body.slice(0, SUBTITLE_MAX)
}

function mapRows(
  rows: RawRow[],
  type: SearchHitType,
  hrefBase: string,
): SearchHit[] {
  return rows.map((r) => ({
    id: r.id,
    type,
    title: r.title,
    subtitle: toSubtitle(r.body),
    href: `${hrefBase}/${r.id}`,
    score: toScore(r.score),
  }))
}

export const pgProvider: SearchProvider = {
  async ready() {},
  async index() {},
  async remove() {},

  async search(q, opts) {
    const scope = opts.scope
    const term = `%${q}%`
    const sim = q
    const limit = opts.limit ?? 24

    const tasks: Promise<SearchHit[]>[] = []

    if (scope.role !== "CLIENT") {
      tasks.push(
        prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT id, title, COALESCE(description, '') AS body, score
          FROM (
            SELECT id, title, description,
              GREATEST(similarity(title, ${sim}), COALESCE(similarity(description, ${sim}), 0)) AS score
            FROM "Process"
            WHERE title ILIKE ${term} OR description ILIKE ${term}
          ) s
          WHERE score >= ${MIN_SIMILARITY}
          ORDER BY score DESC
          LIMIT ${LIMIT_PER_ENTITY}
        `).then((rows) => mapRows(rows, "process", "/procesos")),
      )

      tasks.push(
        prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT id, title, COALESCE(description, '') AS body, score
          FROM (
            SELECT id, title, description,
              GREATEST(similarity(title, ${sim}), COALESCE(similarity(description, ${sim}), 0)) AS score
            FROM "Bitacora"
            WHERE title ILIKE ${term} OR description ILIKE ${term}
          ) s
          WHERE score >= ${MIN_SIMILARITY}
          ORDER BY score DESC
          LIMIT ${LIMIT_PER_ENTITY}
        `).then((rows) => mapRows(rows, "bitacora", "/bitacora")),
      )

      tasks.push(
        prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT id, name AS title, COALESCE(description, '') AS body, score
          FROM (
            SELECT id, name, description,
              GREATEST(similarity(name, ${sim}), COALESCE(similarity(description, ${sim}), 0)) AS score
            FROM "Client"
            WHERE name ILIKE ${term} OR description ILIKE ${term}
          ) s
          WHERE score >= ${MIN_SIMILARITY}
          ORDER BY score DESC
          LIMIT ${LIMIT_PER_ENTITY}
        `).then((rows) => mapRows(rows, "client", "/clientes")),
      )

      tasks.push(
        prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT id, title, COALESCE(description, '') AS body, score
          FROM (
            SELECT id, title, description,
              GREATEST(similarity(title, ${sim}), COALESCE(similarity(description, ${sim}), 0)) AS score
            FROM "Todo"
            WHERE "ownerId" = ${scope.userId}
              AND (title ILIKE ${term} OR description ILIKE ${term})
          ) s
          WHERE score >= ${MIN_SIMILARITY}
          ORDER BY score DESC
          LIMIT ${LIMIT_PER_ENTITY}
        `).then((rows) => mapRows(rows, "todo", "/todos")),
      )
    } else if (scope.clientId) {
      tasks.push(
        prisma.$queryRaw<RawRow[]>(Prisma.sql`
          SELECT id, title, COALESCE(description, '') AS body, score
          FROM (
            SELECT id, title, description,
              GREATEST(similarity(title, ${sim}), COALESCE(similarity(description, ${sim}), 0)) AS score
            FROM "Todo"
            WHERE "clientId" = ${scope.clientId}
              AND "visibleToClient" = true
              AND (title ILIKE ${term} OR description ILIKE ${term})
          ) s
          WHERE score >= ${MIN_SIMILARITY}
          ORDER BY score DESC
          LIMIT ${LIMIT_PER_ENTITY}
        `).then((rows) => mapRows(rows, "todo", "/todos")),
      )
    }

    const grouped = await Promise.all(tasks)
    const hits = grouped.flat()
    return hits.sort((a, b) => b.score - a.score).slice(0, limit)
  },

  async rebuild() {},
}
