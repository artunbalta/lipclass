// Optimizes every PNG/JPG/WebP in public/framesinteractive (3448×2404 originals
// are ~7 MB each = ~1 GB total — unusable from a CDN), then uploads them to
// Vercel Blob as compact WebP under the same filename stem.
//
// After re-encoded WebPs are uploaded, the old .png blobs at the same prefix
// are deleted so the API only returns one URL per frame.
//
// Prereqs:
//   1. `vercel link`
//   2. `vercel env pull`
//   3. `npm run upload-frames`
//
// Re-runnable (allowOverwrite: true).

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { put, list, del } from "@vercel/blob";

const SRC_DIR = path.join(process.cwd(), "public", "framesinteractive");
const PREFIX = "framesinteractive/";
const TARGET_WIDTH = 1600;
const QUALITY = 80;
const CONCURRENCY = 4;

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "Missing BLOB_READ_WRITE_TOKEN. Run `vercel env pull` first, or set it in your shell.",
  );
  process.exit(1);
}

const files = (await fs.readdir(SRC_DIR))
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error(`No frames found in ${SRC_DIR}`);
  process.exit(1);
}

console.log(
  `Optimizing ${files.length} frames → ${TARGET_WIDTH}px wide WebP @ Q${QUALITY}, then uploading…`,
);

let completed = 0;
let failed = 0;
let totalBytesIn = 0;
let totalBytesOut = 0;

async function processOne(file) {
  const stem = file.replace(/\.[^.]+$/, "");
  const input = path.join(SRC_DIR, file);
  try {
    const stat = await fs.stat(input);
    totalBytesIn += stat.size;

    const buffer = await sharp(input)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer();

    totalBytesOut += buffer.length;

    await put(`${PREFIX}${stem}.webp`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
      allowOverwrite: true,
    });
    completed++;
    process.stdout.write(
      `\r[${completed + failed}/${files.length}] ${file} → ${(buffer.length / 1024).toFixed(0)} KB    `,
    );
  } catch (err) {
    failed++;
    console.error(`\n  ✗ ${file}: ${err.message}`);
  }
}

for (let i = 0; i < files.length; i += CONCURRENCY) {
  const chunk = files.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(processOne));
}

console.log(
  `\nUpload done. ${completed} uploaded, ${failed} failed. ` +
    `Source ${(totalBytesIn / 1024 / 1024).toFixed(1)} MB → Blob ${(totalBytesOut / 1024 / 1024).toFixed(1)} MB.`,
);

// Clean up old .png/.jpg blobs at the same prefix so the API only returns
// the new .webp version of each frame.
console.log("\nCleaning up old non-WebP blobs at the same prefix…");
let cursor;
const toDelete = [];
do {
  const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
  for (const blob of page.blobs) {
    if (/\.(png|jpe?g)$/i.test(blob.pathname)) {
      toDelete.push(blob.url);
    }
  }
  cursor = page.cursor;
} while (cursor);

if (toDelete.length > 0) {
  // del() accepts an array of URLs.
  await del(toDelete);
  console.log(`Deleted ${toDelete.length} old non-WebP blobs.`);
} else {
  console.log("No old blobs to delete.");
}

if (failed > 0) process.exit(1);
