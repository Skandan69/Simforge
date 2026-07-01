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
