// One-shot migration: uploads every PNG/JPG/WebP in public/framesinteractive
// to Vercel Blob under the same filename, preserving order.
//
// Prereqs:
//   1. `vercel link`         — link the project
//   2. `vercel env pull`     — writes BLOB_READ_WRITE_TOKEN into .env.local
//   3. `npm run upload-frames`
//
// Re-running is safe (allowOverwrite: true).

import { promises as fs } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";

const SRC_DIR = path.join(process.cwd(), "public", "framesinteractive");
const PREFIX = "framesinteractive/";
const CONCURRENCY = 8;

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

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

console.log(`Uploading ${files.length} frames to Vercel Blob…`);

let completed = 0;
let failed = 0;

async function uploadOne(file) {
  const ext = path.extname(file).toLowerCase();
  const buffer = await fs.readFile(path.join(SRC_DIR, file));
  try {
    await put(`${PREFIX}${file}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
      allowOverwrite: true,
    });
    completed++;
    process.stdout.write(`\r[${completed + failed}/${files.length}] ${file}`);
  } catch (err) {
    failed++;
    console.error(`\n  ✗ ${file}: ${err.message}`);
  }
}

for (let i = 0; i < files.length; i += CONCURRENCY) {
  const chunk = files.slice(i, i + CONCURRENCY);
  await Promise.all(chunk.map(uploadOne));
}

console.log(`\nDone. ${completed} uploaded, ${failed} failed.`);
if (failed > 0) process.exit(1);
