#!/usr/bin/env node
/* eslint-disable */
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const fs = require("node:fs")
const crypto = require("node:crypto")

const root = path.resolve(__dirname, "..")
const cwd = process.cwd()
const envPath = path.join(cwd, ".env")
const cmd = process.argv[2] || "help"

function loadEnv() {
  if (!fs.existsSync(envPath)) return false
  const raw = fs.readFileSync(envPath, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val
  }
  return true
}

function buildDatabaseUrl() {
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
  return url
}

function writeEnvTemplate() {
  const tpl = `# Postgres externo (requerido)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=changeme
DB_NAME=kimeku
DB_SCHEMA=public
DB_PARAMS=

# Auth
AUTH_SECRET=${crypto.randomBytes(32).toString("hex")}
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Uploads
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=25

# Cron
CRON_SECRET=${crypto.randomBytes(16).toString("hex")}

# PWA push (opcional). Genera con: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=

# Server
PORT=3000
HOSTNAME=0.0.0.0
`
  fs.writeFileSync(envPath, tpl)
}

function help() {
  console.log(`kimeku - AI-powered process documentation

Uso:
  npx kimeku init      Crea .env en el directorio actual con secretos generados
  npx kimeku doctor    Diagnostica conexion a Postgres y estado
  npx kimeku start     Aplica schema y arranca el servidor (default :3000)
  npx kimeku help      Muestra esta ayuda

Flujo tipico:
  1) Asegurate de tener Postgres corriendo y la DB creada.
  2) npx kimeku init
  3) Edita .env con tus credenciales DB_*
  4) npx kimeku start
`)
}

async function pingDatabase() {
  let Client
  try {
    Client = require(path.join(root, "node_modules/pg")).Client
  } catch {
    try { Client = require("pg").Client } catch {}
  }
  if (!Client) return { ok: false, reason: "pg-missing" }
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await c.connect()
    const r = await c.query("select current_database() as db, current_user as usr, version() as version")
    await c.end()
    return { ok: true, info: r.rows[0] }
  } catch (e) {
    try { await c.end() } catch {}
    return { ok: false, reason: "connect", error: e }
  }
}

function printDbHelp() {
  const { DB_HOST, DB_PORT, DB_USER, DB_NAME } = process.env
  console.error(`
No se puede conectar a Postgres en ${DB_HOST}:${DB_PORT} como ${DB_USER} -> ${DB_NAME}.

Verifica:
  1. Postgres esta corriendo en ${DB_HOST}:${DB_PORT}
  2. La DB "${DB_NAME}" existe. Crear:
       createdb -U ${DB_USER} ${DB_NAME}
     o desde psql:
       CREATE DATABASE ${DB_NAME};
  3. Las credenciales DB_USER / DB_PASSWORD en .env son correctas

Instalar Postgres:
  - Windows: https://www.postgresql.org/download/windows/
  - Mac:     brew install postgresql@16 && brew services start postgresql@16
  - Linux:   sudo apt install postgresql && sudo service postgresql start

Alternativa hostada gratis:
  - https://neon.tech
  - https://supabase.com
`)
}

function runPrismaPush() {
  const prismaBin = path.join(root, "node_modules/prisma/build/index.js")
  const schemaPath = path.join(root, "prisma/schema.prisma")
  if (!fs.existsSync(prismaBin)) {
    console.error("No se encontro prisma. Reinstala el paquete.")
    return 1
  }
  const r = spawnSync(process.execPath, [
    prismaBin, "db", "push",
    "--skip-generate",
    "--accept-data-loss",
    "--schema", schemaPath,
  ], { stdio: "inherit", env: process.env })
  return r.status ?? 1
}

function bootServer() {
  process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0"
  process.env.PORT = process.env.PORT || "3000"
  const serverPath = path.join(root, ".next/standalone/server.js")
  if (!fs.existsSync(serverPath)) {
    console.error("Falta .next/standalone/server.js. El paquete no fue construido con output:'standalone'.")
    process.exit(1)
  }
  process.chdir(path.join(root, ".next/standalone"))
  require(serverPath)
}

;(async () => {
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    help()
    return
  }

  if (cmd === "init") {
    if (fs.existsSync(envPath)) {
      console.error(`.env ya existe en ${envPath}. Aborto para no sobrescribir.`)
      process.exit(1)
    }
    writeEnvTemplate()
    console.log(`Creado: ${envPath}`)
    console.log("Edita las variables DB_* y luego corre: npx kimeku start")
    return
  }

  if (cmd === "doctor") {
    if (!loadEnv()) {
      console.error("No hay .env en el directorio actual. Corre primero: npx kimeku init")
      process.exit(1)
    }
    process.env.DATABASE_URL = buildDatabaseUrl()
    console.log("Variables cargadas desde .env")
    console.log(`  DB_HOST   = ${process.env.DB_HOST}`)
    console.log(`  DB_PORT   = ${process.env.DB_PORT}`)
    console.log(`  DB_USER   = ${process.env.DB_USER}`)
    console.log(`  DB_NAME   = ${process.env.DB_NAME}`)
    console.log(`  DB_SCHEMA = ${process.env.DB_SCHEMA}`)
    console.log(`  AUTH_URL  = ${process.env.AUTH_URL}`)
    console.log(`  PORT      = ${process.env.PORT || "3000"}`)

    const required = ["AUTH_SECRET"]
    const missing = required.filter((k) => !process.env[k])
    if (missing.length) {
      console.error(`Faltan vars requeridas: ${missing.join(", ")}`)
    }

    const res = await pingDatabase()
    if (!res.ok) {
      printDbHelp()
      process.exit(1)
    }
    console.log("Postgres OK:")
    console.log(`  db   = ${res.info.db}`)
    console.log(`  user = ${res.info.usr}`)
    console.log(`  ver  = ${res.info.version.split(" ").slice(0, 2).join(" ")}`)
    console.log("Listo. Puedes correr: npx kimeku start")
    return
  }

  if (cmd === "start") {
    if (!loadEnv()) {
      console.error("No hay .env. Corre primero: npx kimeku init")
      process.exit(1)
    }
    if (!process.env.AUTH_SECRET) {
      console.error("AUTH_SECRET faltante en .env. Genera uno con: openssl rand -hex 32")
      process.exit(1)
    }
    process.env.DATABASE_URL = buildDatabaseUrl()

    const ping = await pingDatabase()
    if (!ping.ok) {
      printDbHelp()
      process.exit(1)
    }

    console.log("Aplicando schema (prisma db push)...")
    const status = runPrismaPush()
    if (status !== 0) {
      console.error("Fallo prisma db push")
      process.exit(status)
    }

    console.log(`Arrancando Kimeku en http://${process.env.HOSTNAME}:${process.env.PORT}`)
    bootServer()
    return
  }

  console.error(`Comando desconocido: ${cmd}`)
  help()
  process.exit(1)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
