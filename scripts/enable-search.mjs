#!/usr/bin/env node
import { PrismaClient } from "@prisma/client"

function buildDbUrl(env = process.env) {
  const host = env.DB_HOST ?? "localhost"
  const port = env.DB_PORT ?? "5432"
  const user = encodeURIComponent(env.DB_USER ?? "postgres")
  const password = encodeURIComponent(env.DB_PASSWORD ?? "")
  const name = env.DB_NAME ?? "postgres"
  const schema = env.DB_SCHEMA ?? "public"
  const params = env.DB_PARAMS?.trim()
  let url = `postgresql://${user}:${password}@${host}:${port}/${name}?schema=${schema}`
  if (params) url += `&${params.replace(/^[?&]+/, "")}`
  return url
}

const url = process.env.DATABASE_URL || buildDbUrl()
const prisma = new PrismaClient({ datasourceUrl: url })

const statements = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX IF NOT EXISTS idx_process_title_trgm ON "Process" USING gin (title gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_process_description_trgm ON "Process" USING gin (description gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_todo_title_trgm ON "Todo" USING gin (title gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_todo_description_trgm ON "Todo" USING gin (description gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_bitacora_title_trgm ON "Bitacora" USING gin (title gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_bitacora_description_trgm ON "Bitacora" USING gin (description gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_client_name_trgm ON "Client" USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_client_description_trgm ON "Client" USING gin (description gin_trgm_ops)`,
]

for (const sql of statements) {
  process.stdout.write(`-> ${sql}\n`)
  await prisma.$executeRawUnsafe(sql)
}

await prisma.$disconnect()
process.stdout.write("OK\n")
