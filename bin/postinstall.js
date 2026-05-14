#!/usr/bin/env node
/* eslint-disable */
// Postinstall: genera Prisma Client con engine del SO target.
// Necesario porque el bundle standalone se construye en Windows pero corre en
// cualquier SO. Se invoca al hacer `npm install -g @devitzperu/kimeku`.
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const fs = require("node:fs")

const root = path.resolve(__dirname, "..")
const schemaPath = path.join(root, "prisma/schema.prisma")
const standaloneDir = path.join(root, ".next/standalone")
const standaloneSchema = path.join(standaloneDir, "prisma/schema.prisma")

function resolvePrismaBin() {
  try {
    return require.resolve("prisma/build/index.js", { paths: [root, __dirname] })
  } catch {}
  const candidates = [
    path.join(root, "node_modules/prisma/build/index.js"),
    path.join(root, "../prisma/build/index.js"),
    path.join(root, "../../prisma/build/index.js"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function generate(schema, label) {
  const bin = resolvePrismaBin()
  if (!bin) {
    console.warn("[kimeku postinstall] prisma CLI no encontrado, skip generate")
    return
  }
  if (!fs.existsSync(schema)) return
  console.log(`[kimeku postinstall] prisma generate (${label})`)
  const r = spawnSync(process.execPath, [
    bin, "generate", "--schema", schema,
  ], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
    },
  })
  if (r.status !== 0) {
    console.warn(`[kimeku postinstall] generate ${label} fallo, se reintentara en kimeku start`)
  }
}

// Copia schema al standalone (puede no estar ahi por defecto)
if (fs.existsSync(schemaPath) && !fs.existsSync(standaloneSchema)) {
  fs.mkdirSync(path.dirname(standaloneSchema), { recursive: true })
  fs.copyFileSync(schemaPath, standaloneSchema)
}

// Generate dentro del standalone para que server.js encuentre el client
if (fs.existsSync(standaloneDir)) {
  // Cambia CWD a standalone para que generate cree .prisma ahi
  const originalCwd = process.cwd()
  try {
    process.chdir(standaloneDir)
    generate(standaloneSchema || schemaPath, "standalone")
  } finally {
    process.chdir(originalCwd)
  }
}

// Generate al root tambien para que `prisma db push` desde bin/kimeku.js funcione
generate(schemaPath, "root")
