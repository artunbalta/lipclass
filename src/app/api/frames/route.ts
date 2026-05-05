import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

const PREFIX = "framesinteractive/";

export const revalidate = 3600;

export async function GET() {
  const frames: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (/\.(png|jpe?g|webp)$/i.test(blob.pathname)) {
        frames.push({ pathname: blob.pathname, url: blob.url });
      }
    }
    cursor = page.cursor;
  } while (cursor);

  frames.sort((a, b) => a.pathname.localeCompare(b.pathname));

  return NextResponse.json({ frames: frames.map((f) => f.url) });
}
