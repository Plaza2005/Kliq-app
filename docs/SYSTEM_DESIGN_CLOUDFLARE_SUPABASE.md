# Cloudflare Storage & Supabase Metadata System Design

## Architecture Overview

KLIQ utilizes a hybrid media storage and database architecture combining **Cloudflare (R2, Stream & Images)** for high-volume binary object storage and streaming media delivery with **Supabase PostgreSQL** for structured metadata, relational post/reel mapping, Row Level Security (RLS), and ownership policies.

```
                  +-----------------------+
                  |  Client (App/Control) |
                  +-----------+-----------+
                              |
              1. Get presigned|upload URL & register metadata
                              v
                  +-----------+-----------+
                  |  KLIQ Fastify Server  |
                  +-----+-----------+-----+
                        |           |
    2. Save metadata &  |           | 3. Generate presigned
       RLS record       v           v    R2 upload target
             +----------+---+   +---+-----------+
             | Supabase     |   | Cloudflare    |
             | PostgreSQL   |   | R2 / Stream   |
             +--------------+   +---------------+
```

---

## 1. Responsibilities & Separation of Concerns

### Cloudflare Infrastructure
* **Cloudflare R2**: Object storage for user avatars, post attachments, audio files, raw video assets, and static media files. Direct uploads bypass server CPU/memory overhead using presigned S3-compatible URLs.
* **Cloudflare Stream & Images**: High-performance video delivery pipeline handling adaptive bitrate HLS/DASH transcoding, thumbnails, and automated webp/avif image resizing.

### Supabase PostgreSQL Database
* **Structured Metadata (`media_objects`)**: Tracks file metadata, MIME types, filesize, storage provider keys (`cf_r2`, `cf_stream`, `supabase_storage`), transcode status (`processing`, `ready`, `error`), and resolution.
* **Relational Mapping**: Associates media assets directly with Posts, Reels, Stories, Messages, Products, or Live Streams.
* **Row Level Security (RLS)**: Enforces access rules ensuring only content owners or authorized viewers can generate upload targets, read private assets, or delete records.

---

## 2. PostgreSQL Database Schema (`media_objects`)

```sql
CREATE TABLE public.media_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    storage_provider TEXT NOT NULL CHECK (storage_provider IN ('cf_r2', 'cf_stream', 'supabase_storage', 'local')),
    object_key TEXT NOT NULL,
    public_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    duration_seconds INT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('upload_pending', 'processing', 'ready', 'error')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast lookups by owner and storage status
CREATE INDEX idx_media_objects_owner ON public.media_objects(owner_id);
CREATE INDEX idx_media_objects_provider_key ON public.media_objects(storage_provider, object_key);

-- Row Level Security (RLS)
ALTER TABLE public.media_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public or own media" ON public.media_objects
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own media objects" ON public.media_objects
    FOR INSERT WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Users can update own media objects" ON public.media_objects
    FOR UPDATE USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can delete own media objects" ON public.media_objects
    FOR DELETE USING (auth.uid()::text = owner_id);
```

---

## 3. Upload Flow & Ingestion Lifecycle

1. **Upload Target Request (`POST /media/upload-target`)**:
   * Client sends payload `{ filename, mimeType, sizeBytes, context }`.
   * Server validates user JWT authentication and file restrictions.
   * Server creates a record in Supabase `media_objects` table with `status = 'upload_pending'`.
   * Server generates a signed Cloudflare R2 upload URL and returns both the target upload URL and `mediaObjectId`.

2. **Direct Binary Upload**:
   * Client uploads binary stream directly to Cloudflare R2 using the presigned URL.

3. **Metadata Confirmation (`POST /media/confirm`)**:
   * Client notifies server upon successful binary upload completion.
   * Server verifies object presence and updates `status = 'ready'` in Supabase `media_objects`.

---

## 4. Environment Variables Configuration

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase Project API URL |
| `SUPABASE_PUBLISHABLE_KEY` | Public anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin service role key for RLS bypass when registering metadata |
| `CLOUDFLARE_R2_BUCKET` | R2 bucket name (`kliq-media`) |
| `CLOUDFLARE_R2_ACCESS_KEY` | S3 API Access Key ID |
| `CLOUDFLARE_R2_SECRET_KEY` | S3 API Secret Access Key |
| `CF_R2_PUBLIC_URL` | CDN public base URL for Cloudflare R2 objects |
