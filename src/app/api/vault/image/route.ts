import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { VAULT_DIR, isInsideDir } from "@/lib/vault/config";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
};

const notFound = () => new NextResponse("File not found", { status: 404 });

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");
  if (!file) {
    return new NextResponse("Missing file parameter", { status: 400 });
  }

  const absolutePath = path.resolve(VAULT_DIR, file);
  if (!isInsideDir(VAULT_DIR, absolutePath)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Images only: the vault's notes and data files are not served here.
  const contentType = MIME_TYPES[path.extname(absolutePath).toLowerCase()];
  if (!contentType) return notFound();

  try {
    const data = await fs.readFile(/*turbopackIgnore: true*/ absolutePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return notFound();
  }
}
