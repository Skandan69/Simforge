import { KNOWLEDGE_DOCUMENT_BUCKET } from "@simforge/shared";
import { supabaseAdmin } from "../lib/supabase.js";

export async function removeKnowledgeFiles(paths: string[]) {
  const uniquePaths = [...new Set(paths)].filter(Boolean);
  if (!uniquePaths.length) return;

  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { error } = await supabaseAdmin.storage
      .from(KNOWLEDGE_DOCUMENT_BUCKET)
      .remove(uniquePaths.slice(index, index + 100));
    if (error) throw new Error(`Storage cleanup failed: ${error.message}`);
  }
}

export async function downloadKnowledgeFile(path: string) {
  const { data, error } = await supabaseAdmin.storage.from(KNOWLEDGE_DOCUMENT_BUCKET).download(path);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Confirms an uploaded object really exists in private storage and returns its
 * true size, so the API never trusts the size/type a browser reports.
 */
export async function verifyUploadedKnowledgeFile(path: string, maxBytes: number) {
  const { data, error } = await supabaseAdmin.storage.from(KNOWLEDGE_DOCUMENT_BUCKET).info(path);
  if (error || !data) return { ok: false as const, reason: "NOT_FOUND" as const };
  const size = typeof data.size === "number" ? data.size : Number(data.metadata?.size ?? NaN);
  if (!Number.isFinite(size) || size <= 0) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (size > maxBytes) return { ok: false as const, reason: "TOO_LARGE" as const, size };
  return { ok: true as const, size };
}
