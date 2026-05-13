import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "icons");
const BG = "#0a0a0a";
const FG = "#ffffff";
const LETTER = "K";

await mkdir(OUT_DIR, { recursive: true });

async function gen(size) {
  const fontSize = Math.round(size * 0.6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${BG}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="${FG}" text-anchor="middle" dominant-baseline="central">${LETTER}</text>
  </svg>`;
  const out = join(OUT_DIR, `icon-${size}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("wrote", out);
}

await gen(192);
await gen(512);
