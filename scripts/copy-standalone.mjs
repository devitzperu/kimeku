#!/usr/bin/env node
// Copia .next/static y public/ dentro de .next/standalone/ tras `next build`.
// Next con output:"standalone" deja estos directorios fuera del bundle autocontenido.
import { cp, access, readdir, unlink, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, resolve, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const standalone = resolve(root, ".next/standalone")
const staticSrc = resolve(root, ".next/static")
const staticDst = resolve(standalone, ".next/static")
const publicSrc = resolve(root, "public")
const publicDst = resolve(standalone, "public")

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

if (!(await exists(standalone))) {
  console.error("No existe .next/standalone. Asegurate de tener output:'standalone' en next.config y haber corrido `next build`.")
  process.exit(1)
}

await cp(staticSrc, staticDst, { recursive: true })
console.log("copied .next/static -> .next/standalone/.next/static")

if (await exists(publicSrc)) {
  await cp(publicSrc, publicDst, { recursive: true })
  console.log("copied public/ -> .next/standalone/public")
}

// limpiar basura tmp de prisma engine y otros .tmp*
async function* walk(dir) {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else yield p
  }
}

let cleaned = 0
for await (const f of walk(standalone)) {
  if (/\.tmp\d+$/.test(f)) {
    try { await unlink(f); cleaned++ } catch {}
  }
}
if (cleaned) console.log(`cleaned ${cleaned} temp files`)

// quitar archivos basura del root del standalone
const junk = [
  "CLAUDE.md", "CLAUDE.local.md", "AGENTS.md", "LICENSE_EE.md",
  "tsconfig.tsbuildinfo", "pnpm-workspace.yaml", "eslint.config.mjs",
  "components.json", "postcss.config.mjs", "tsconfig.json",
  "proxy.ts", "next.config.ts", "scripts", "src",
]
for (const j of junk) {
  const p = join(standalone, j)
  if (await exists(p)) {
    await rm(p, { recursive: true, force: true })
  }
}
console.log("cleaned standalone root junk")
