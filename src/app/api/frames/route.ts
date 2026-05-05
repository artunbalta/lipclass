import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const DIR = "framesinteractive";

export async function GET() {
  const dirPath = path.join(process.cwd(), "public", DIR);
  const entries = await fs.readdir(dirPath);
  const files = entries
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
  return NextResponse.json({
    frames: files.map((f) => `/${DIR}/${f}`),
  });
}
