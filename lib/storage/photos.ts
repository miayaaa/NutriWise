import { promises as fs } from "fs"
import path from "path"
import { del, get, put } from "@vercel/blob"

// Progress photos live in a PRIVATE Vercel Blob store: every read goes through
// an authenticated route handler, never a public URL. Locally (no Blob
// credentials) they fall back to ./.uploads so the feature works in dev.

const LOCAL_DIR = path.join(process.cwd(), ".uploads")

function isVercelBlobConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return true
  if (process.env.NODE_ENV === "production") {
    throw new Error("Photo storage not configured: connect a private Blob store to this project")
  }
  return false
}

function localPath(pathname: string): string {
  const resolved = path.join(LOCAL_DIR, pathname)
  if (!resolved.startsWith(LOCAL_DIR + path.sep)) throw new Error("Invalid pathname")
  return resolved
}

export async function putPhoto(pathname: string, data: Buffer, contentType: string): Promise<void> {
  if (isVercelBlobConfigured()) {
    await put(pathname, data, { access: "private", contentType, addRandomSuffix: false })
    return
  }
  const file = localPath(pathname)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, data)
}

export type PhotoReadResult =
  | { status: 200; stream: ReadableStream<Uint8Array>; etag?: string }
  | { status: 304; etag: string }
  | { status: 404 }

export async function readPhoto(pathname: string, ifNoneMatch?: string): Promise<PhotoReadResult> {
  if (isVercelBlobConfigured()) {
    const result = await get(pathname, { access: "private", ifNoneMatch })
    if (!result) return { status: 404 }
    if (result.statusCode === 304) return { status: 304, etag: result.blob.etag }
    return { status: 200, stream: result.stream, etag: result.blob.etag }
  }
  try {
    const data = await fs.readFile(localPath(pathname))
    return { status: 200, stream: new Blob([data]).stream() }
  } catch {
    return { status: 404 }
  }
}

export async function readPhotoBuffer(pathname: string): Promise<Buffer | null> {
  const result = await readPhoto(pathname)
  if (result.status !== 200) return null
  return Buffer.from(await new Response(result.stream).arrayBuffer())
}

export async function deletePhoto(pathname: string): Promise<void> {
  if (isVercelBlobConfigured()) {
    await del(pathname)
    return
  }
  await fs.rm(localPath(pathname), { force: true })
}
