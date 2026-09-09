import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const markPath = path.join(root, "public/brand/mark-on-dark.svg");
const iconsDir = path.join(root, "public/icons");

const MARKA = { r: 0x0c, g: 0x30, b: 0x0c, alpha: 1 };

async function tile(size, { padRatio = 0.18 } = {}) {
  const markSvg = await readFile(markPath);
  const inner = Math.round(size * (1 - 2 * padRatio));
  const markPng = await sharp(markSvg).resize(inner, inner).png().toBuffer();
  const left = Math.round((size - inner) / 2);
  const top = left;

  return sharp({
    create: { width: size, height: size, channels: 4, background: MARKA },
  })
    .composite([{ input: markPng, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  const icon192 = await tile(192, { padRatio: 0.16 });
  const icon512 = await tile(512, { padRatio: 0.16 });
  // Maskable needs larger safe zone (~20%+).
  const maskable = await tile(512, { padRatio: 0.22 });
  const apple = await tile(180, { padRatio: 0.16 });

  await writeFile(path.join(iconsDir, "icon-192.png"), icon192);
  await writeFile(path.join(iconsDir, "icon-512.png"), icon512);
  await writeFile(path.join(iconsDir, "icon-maskable-512.png"), maskable);
  await writeFile(path.join(iconsDir, "apple-touch-icon.png"), apple);
  await writeFile(path.join(root, "app/icon.png"), icon192);

  const oldLogo = path.join(root, "public/logo.png");
  try {
    await unlink(oldLogo);
    console.log("removed public/logo.png");
  } catch (e) {
    if (e && e.code !== "ENOENT") throw e;
  }

  console.log("wrote public/icons/* and app/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
