/**
 * Minimal Supabase Storage upload helper (dependency-free, via the Storage REST
 * API). Used for live-stream auto-thumbnails. Returns a public URL, or null when
 * Supabase isn't configured / the upload fails.
 */
export async function uploadBufferToSupabase(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!supabaseUrl || !serviceKey || !bucket) return null;
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filename}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    });
    if (res.ok) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
    }
  } catch {
    /* fall through to null */
  }
  return null;
}
