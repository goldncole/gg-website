// Pre-generates optimized, responsive WebP variants from the original PNG
// photography in `image-originals/` and writes them to `public/images/`.
//
// Why: the source art is 39 PNGs averaging ~2.5 MB (photographs saved as
// lossless PNG, served unoptimized from `public/`, so Astro's build-time image
// pipeline never touches them). This script converts each *referenced* photo to
// WebP at sensible, capped widths plus 1-2 smaller responsive variants, and
// emits `src/lib/image-manifest.json` so components can build `srcset`/`sizes`
// and width/height attributes from a single source of truth.
//
// Run with:  npm run optimize:images
// Output is committed; it is NOT part of `astro build`.

import sharp from "sharp";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "image-originals");
const OUT_DIR = path.join(ROOT, "public", "images");
const MANIFEST = path.join(ROOT, "src", "lib", "image-manifest.json");

const QUALITY = 80; // WebP quality — visually lossless for this photography
const ICON_QUALITY = 86; // emblem has fine edges/alpha; keep a touch higher

// role → candidate widths (the script never upscales beyond the source width,
// and caps the largest variant at the role's max on-screen need × ~2 for retina)
const ROLE_WIDTHS = {
  full: [768, 1280, 1920, 2560], // full-bleed pinned heroes + dark bands
  default: [400, 800, 1400], // cards, split heroes, portraits
  icon: [640], // ghosted emblem watermark
};

// Referenced photos and their role. Anything in image-originals/ NOT listed here
// is intentionally left out of the build (unused/legacy art) so it never ships.
const ROLE = {
  // full-bleed pinned heroes / dark bands
  "Hero-hall3": "full",
  "sacred-marble-threshold": "full",
  "governance-hero2": "full",
  // emblem watermark + favicon
  "gold-icon": "icon",
};
const DEFAULT_PHOTOS = [
  "vaults",
  "refinery",
  "blockchain-protocol",
  "market-maker",
  "trader",
  "bullion-dealer",
  "allocator",
  "private-holders",
  "module-01",
  "module-02",
  "module-03",
  "module-04-reserve",
  "module-02-claim",
  "module-03-unit",
  "vault-hall",
  "usg",
  "gold-bar-marble",
  "gold-bar",
  "marble-hall-pillars",
  "monumental-marble-hall",
  "vault-door-detail",
];
for (const base of DEFAULT_PHOTOS) ROLE[base] ??= "default";

const roleMax = (role) => Math.max(...ROLE_WIDTHS[role]);

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });

  const available = new Set(await readdir(SRC_DIR));
  const manifest = {};
  let totalOut = 0;

  for (const [base, role] of Object.entries(ROLE)) {
    const file = `${base}.png`;
    if (!available.has(file)) {
      console.warn(`! missing source for "${base}" (${file}) — skipped`);
      continue;
    }

    const srcPath = path.join(SRC_DIR, file);
    const input = await readFile(srcPath);
    const meta = await sharp(input).metadata();
    const max = Math.min(meta.width, roleMax(role));

    // widths: every candidate strictly smaller than the source width, capped at
    // the role max, plus the capped max itself; de-duplicated + sorted asc.
    const widths = Array.from(
      new Set(
        ROLE_WIDTHS[role]
          .filter((w) => w < meta.width && w <= max)
          .concat(max),
      ),
    ).sort((a, b) => a - b);

    const variants = [];
    for (const w of widths) {
      const isLargest = w === max;
      // largest variant gets the clean `${base}.webp` name (used as default src
      // for non-responsive contexts like markdown); smaller ones are suffixed.
      const outName = isLargest ? `${base}.webp` : `${base}-${w}.webp`;
      const h = Math.round((meta.height * w) / meta.width);
      const buf = await sharp(input)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: role === "icon" ? ICON_QUALITY : QUALITY })
        .toBuffer();
      await writeFile(path.join(OUT_DIR, outName), buf);
      totalOut += buf.length;
      variants.push({ w, h, src: `/images/${outName}`, bytes: buf.length });
    }

    const largest = variants[variants.length - 1];
    manifest[base] = {
      width: largest.w,
      height: largest.h,
      src: largest.src,
      srcset: variants.map((v) => `${v.src} ${v.w}w`).join(", "),
      variants: variants.map(({ w, h, src }) => ({ w, h, src })),
    };

    const kb = (n) => `${(n / 1024).toFixed(0)}KB`;
    console.log(
      `${base.padEnd(26)} ${meta.width}x${meta.height} png → ` +
        `${variants.length} webp [${widths.join(", ")}]  ` +
        `largest ${kb(largest.bytes)}`,
    );
  }

  // Optimized PNG favicon (kept as PNG for broad <link rel=icon> support).
  const faviconBuf = await sharp(await readFile(path.join(SRC_DIR, "gold-icon.png")))
    .resize({ width: 256, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  await writeFile(path.join(OUT_DIR, "gold-icon.png"), faviconBuf);
  totalOut += faviconBuf.length;
  console.log(`gold-icon.png (favicon) → ${(faviconBuf.length / 1024).toFixed(0)}KB`);

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `\nWrote ${Object.keys(manifest).length} images, total emitted ` +
      `${(totalOut / 1024 / 1024).toFixed(2)} MB → public/images/`,
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
