/**
 * Cloudflare R2 storage client (S3-compatible).
 * Replaces local /uploads directory for production media hosting.
 *
 * Required env vars:
 *   CF_R2_ACCOUNT_ID   — Cloudflare account ID
 *   CF_R2_ACCESS_KEY   — R2 access key ID
 *   CF_R2_SECRET_KEY   — R2 secret access key
 *   CF_R2_BUCKET       — R2 bucket name (e.g. "kliq-media")
 *   CF_R2_PUBLIC_URL   — Public URL for the bucket (e.g. "https://media.kliq.app")
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as crypto from "crypto";
import * as path from "path";

const ACCOUNT_ID  = process.env.CF_R2_ACCOUNT_ID ?? "";
const ACCESS_KEY  = process.env.CF_R2_ACCESS_KEY  ?? "";
const SECRET_KEY  = process.env.CF_R2_SECRET_KEY  ?? "";
const BUCKET      = process.env.CF_R2_BUCKET      ?? "kliq-media";
export const R2_PUBLIC_URL = process.env.CF_R2_PUBLIC_URL ?? "";

const isConfigured = !!(ACCOUNT_ID && ACCESS_KEY && SECRET_KEY);

export const r2 = isConfigured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    })
  : null;

export function r2Key(filename: string): string {
  const ext  = path.extname(filename);
  const hash = crypto.randomBytes(16).toString("hex");
  return `uploads/${hash}${ext}`;
}

export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  if (!r2) throw new Error("R2 not configured");
  const key = r2Key(filename);
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!r2) return;
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  expiresIn = 300
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!r2) throw new Error("R2 not configured");
  const key = r2Key(filename);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });
  return { uploadUrl, publicUrl: `${R2_PUBLIC_URL}/${key}` };
}
