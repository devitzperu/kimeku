#!/usr/bin/env node
// Wrapper: loads .env, builds DATABASE_URL with URL-encoding, runs the given command.
import { config } from "dotenv"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "..", ".env") })

const enc = (s) => encodeURIComponent(s ?? "")
const host = process.env.DB_HOST ?? "localhost"
const port = process.env.DB_PORT ?? "5432"
const user = enc(process.env.DB_USER ?? "postgres")
const password = enc(process.env.DB_PASSWORD ?? "")
const name = process.env.DB_NAME ?? "postgres"
const schema = process.env.DB_SCHEMA ?? "public"
const params = (process.env.DB_PARAMS ?? "").trim().replace(/^[?&]+/, "")

let url = `postgresql://${user}:${password}@${host}:${port}/${name}?schema=${schema}`
if (params) url += `&${params}`
process.env.DATABASE_URL = url

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error("usage: node scripts/with-db.mjs <command> [args...]")
  process.exit(1)
}

const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env, shell: true })
process.exit(result.status ?? 1)
