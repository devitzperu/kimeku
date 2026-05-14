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

Instalacion (una sola vez):
  npm install -g @devitzperu/kimeku

Comandos:
  kimeku init      Crea .env en el directorio actual con secretos generados
  kimeku doctor    Diagnostica conexion a Postgres y estado
  kimeku start     Aplica schema y arranca el servidor (default :3000)
  kimeku help      Muestra esta ayuda

Flujo tipico:
  1) Asegurate de tener Postgres corriendo y la DB creada.
  2) kimeku init
  3) Edita .env con tus credenciales DB_*
  4) kimeku start

Actualizar:
  npm install -g @devitzperu/kimeku@latest
`)
}

async function pingDatabase() {
  let Client
  try {
    const resolved = require.resolve("pg", { paths: [root, __dirname] })
    Client = require(resolved).Client
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

function resolvePrismaBin() {
  // intenta en orden: require.resolve (sube node_modules ancestrales),
  // luego paths comunes (paquete instalado por npm/pnpm)
  try {
    return require.resolve("prisma/build/index.js", { paths: [root, __dirname] })
  } catch {}
  const candidates = [
    path.join(root, "node_modules/prisma/build/index.js"),
    path.join(root, "../prisma/build/index.js"),
    path.join(root, "../../prisma/build/index.js"),
    path.join(root, "../../../prisma/build/index.js"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function runPrismaPush() {
  const prismaBin = resolvePrismaBin()
  const schemaPath = path.join(root, "prisma/schema.prisma")
  if (!prismaBin) {
    console.error("No se encontro el CLI de prisma. Reinstala el paquete.")
    return 1
  }
  if (!fs.existsSync(schemaPath)) {
    console.error(`No se encontro schema.prisma en ${schemaPath}`)
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

function ensurePrismaClient() {
  // Si node_modules/.prisma/client no existe, correr generate.
  // Pasa la primera vez o si postinstall fallo.
  try {
    const generatedPath = require.resolve(".prisma/client", { paths: [root, __dirname] })
    if (fs.existsSync(generatedPath)) return 0
  } catch {}
  const prismaBin = resolvePrismaBin()
  const schemaPath = path.join(root, "prisma/schema.prisma")
  if (!prismaBin || !fs.existsSync(schemaPath)) return 1
  console.log("Generando Prisma Client (primera ejecucion)...")
  const r = spawnSync(process.execPath, [
    prismaBin, "generate", "--schema", schemaPath,
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

function startInternalScheduler() {
  // Scheduler embebido para /api/cron/todo-alarms.
  // Reemplaza la necesidad de configurar crontab/Vercel Cron en el SO.
  // Desactivar con DISABLE_INTERNAL_CRON=true.
  if (process.env.DISABLE_INTERNAL_CRON === "true") {
    console.log("Internal cron deshabilitado (DISABLE_INTERNAL_CRON=true)")
    return
  }
  if (!process.env.CRON_SECRET) {
    console.log("Internal cron deshabilitado (CRON_SECRET ausente en .env)")
    return
  }

  const port = process.env.PORT || "3000"
  const url = `http://127.0.0.1:${port}/api/cron/todo-alarms`
  const secret = process.env.CRON_SECRET
  const intervalMs = Number(process.env.CRON_INTERVAL_MS || 60000)

  async function tick() {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secret}` },
      })
      if (!res.ok) {
        console.error(`[cron] ${res.status} ${res.statusText}`)
      }
    } catch (e) {
      console.error(`[cron] fetch fallo: ${e?.message ?? e}`)
    }
  }

  // primera ejecucion luego de 15s para dar tiempo al server a estar listo
  setTimeout(() => {
    tick()
    setInterval(tick, intervalMs)
  }, 15000)

  console.log(`Internal cron activo: ${url} cada ${intervalMs / 1000}s`)
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
    console.log("Edita las variables DB_* y luego corre: kimeku start")
    return
  }

  if (cmd === "doctor") {
    if (!loadEnv()) {
      console.error("No hay .env en el directorio actual. Corre primero: kimeku init")
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
    console.log("Listo. Puedes correr: kimeku start")
    return
  }

  if (cmd === "start") {
    if (!loadEnv()) {
      console.error("No hay .env. Corre primero: kimeku init")
      process.exit(1)
    }
    if (!process.env.AUTH_SECRET) {
      console.error("AUTH_SECRET faltante en .env. Genera uno con: openssl rand -hex 32")
      process.exit(1)
    }
    process.env.DATABASE_URL = buildDatabaseUrl()

    // Auto-sync AUTH_URL con PORT si user cambio PORT pero no AUTH_URL
    const port = process.env.PORT || "3000"
    const defaultAuthUrl = "http://localhost:3000"
    const rawAuth = (process.env.AUTH_URL ?? "").trim()
    const invalidAuth = !rawAuth || rawAuth === "null" || rawAuth === "undefined"
    if (invalidAuth || rawAuth === defaultAuthUrl) {
      process.env.AUTH_URL = `http://localhost:${port}`
    }
    try {
      const u = new URL(process.env.AUTH_URL)
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error(`protocolo invalido: ${u.protocol}`)
      }
    } catch (e) {
      console.error(`AUTH_URL invalido: "${process.env.AUTH_URL}". Debe ser URL http(s) absoluta (ej: https://kimeku.tis.pe). ${e?.message ?? ""}`)
      process.exit(1)
    }
    process.env.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST || "true"

    const ping = await pingDatabase()
    if (!ping.ok) {
      printDbHelp()
      process.exit(1)
    }

    const genStatus = ensurePrismaClient()
    if (genStatus !== 0) {
      console.error("Fallo prisma generate")
      process.exit(genStatus)
    }

    console.log("Aplicando schema (prisma db push)...")
    const status = runPrismaPush()
    if (status !== 0) {
      console.error("Fallo prisma db push")
      process.exit(status)
    }

    console.log(`Arrancando Kimeku en http://${process.env.HOSTNAME}:${process.env.PORT}`)
    startInternalScheduler()
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
