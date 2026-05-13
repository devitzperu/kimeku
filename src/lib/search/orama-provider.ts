import {
  create,
  insertMultiple,
  remove as oramaRemove,
  search as oramaSearch,
  upsert as oramaUpsert,
} from "@orama/orama"
import { stemmer } from "@orama/stemmers/spanish"
import { compositeId, loadAllDocs } from "./load-docs"
import {
  SUBTITLE_MAX,
  type SearchDoc,
  type SearchHit,
  type SearchHitType,
  type SearchProvider,
  type SearchScope,
} from "./types"

const schema = {
  id: "string",
  type: "enum",
  title: "string",
  body: "string",
  href: "string",
  ownerId: "string",
  clientId: "string",
  visibleToClient: "boolean",
} as const

type IndexedDoc = {
  id: string
  type: SearchHitType
  title: string
  body: string
  href: string
  ownerId: string
  clientId: string
  visibleToClient: boolean
}

type OramaDb = Awaited<ReturnType<typeof create<typeof schema>>>

let dbPromise: Promise<OramaDb> | null = null

function toRecord(doc: SearchDoc): IndexedDoc {
  return {
    id: compositeId(doc.type, doc.id),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    href: doc.href,
    ownerId: doc.ownerId ?? "",
    clientId: doc.clientId ?? "",
    visibleToClient: doc.visibleToClient ?? false,
  }
}

async function buildDb(): Promise<OramaDb> {
  const db = await create({
    schema,
    components: {
      tokenizer: {
        language: "spanish",
        stemming: true,
        stemmer,
        stopWords: [],
      },
    },
  })
  const docs = await loadAllDocs()
  if (docs.length > 0) {
    await insertMultiple(db, docs.map(toRecord))
  }
  return db
}

async function getDb(): Promise<OramaDb> {
  if (!dbPromise) {
    dbPromise = buildDb().catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

function canSee(doc: IndexedDoc, scope: SearchScope): boolean {
  if (doc.type === "todo") {
    if (scope.role === "CLIENT") {
      return (
        doc.visibleToClient &&
        !!scope.clientId &&
        doc.clientId === scope.clientId
      )
    }
    return doc.ownerId === scope.userId
  }
  if (scope.role === "CLIENT") return false
  return true
}

function subtitle(body: string): string | null {
  if (!body) return null
  return body.slice(0, SUBTITLE_MAX)
}

function splitId(compoundId: string): string {
  const idx = compoundId.indexOf(":")
  return idx === -1 ? compoundId : compoundId.slice(idx + 1)
}

export const oramaProvider: SearchProvider = {
  async ready() {
    await getDb()
  },

  async index(doc) {
    const db = await getDb()
    await oramaUpsert(db, toRecord(doc))
  },

  async remove(type, id) {
    const db = await getDb()
    try {
      await oramaRemove(db, compositeId(type, id))
    } catch {
      // doc may not be indexed yet; ignore
    }
  },

  async search(q, opts) {
    const db = await getDb()
    const result = await oramaSearch(db, {
      term: q,
      properties: ["title", "body"],
      limit: (opts.limit ?? 24) * 2,
      tolerance: 1,
      boost: {
        title: 2,
      },
    })

    const scope = opts.scope
    const limit = opts.limit ?? 24
    const hits: SearchHit[] = []
    for (const h of result.hits) {
      const doc = h.document as IndexedDoc
      if (!canSee(doc, scope)) continue
      hits.push({
        id: splitId(doc.id),
        type: doc.type,
        title: doc.title,
        subtitle: subtitle(doc.body),
        href: doc.href,
        score: h.score,
      })
      if (hits.length >= limit) break
    }
    return hits
  },

  async rebuild() {
    dbPromise = buildDb().catch((err) => {
      dbPromise = null
      throw err
    })
    await dbPromise
  },
}
