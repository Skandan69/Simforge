import {
  DOCUMENT_FILE_TYPES,
  DOCUMENT_MIME_TYPES,
  KNOWLEDGE_DOCUMENT_BUCKET,
  MAX_DOCUMENT_SIZE_BYTES,
  type DocumentFileType,
} from "@simforge/shared";
import { createClient } from "@/lib/supabase/client";

export function getDocumentFileType(file: File): DocumentFileType | null {
  const extension = file.name.split(".").pop()?.toUpperCase();
  if (!extension || !DOCUMENT_FILE_TYPES.includes(extension as DocumentFileType)) return null;
  return extension as DocumentFileType;
}

export function validateDocumentFile(file: File) {
  const fileType = getDocumentFileType(file);
  if (!fileType) throw new Error(`${file.name}: only PDF, DOCX, PPTX, and XLSX files are supported.`);
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) throw new Error(`${file.name}: files must be 50 MB or smaller.`);
  return fileType;
}

export function createStoragePath(organizationId: string, knowledgeBaseId: string, fileName: string) {
  const safeName = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-160);
  return `${organizationId}/${knowledgeBaseId}/${crypto.randomUUID()}-${safeName}`;
}

export async function uploadFileRequest(file: File, path: string, fileType: DocumentFileType, credentials: { baseUrl: string; publishableKey: string; accessToken: string }, onProgress: (progress: number) => void) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${credentials.baseUrl}/storage/v1/object/${KNOWLEDGE_DOCUMENT_BUCKET}/${encodedPath}`);
    request.setRequestHeader("Authorization", `Bearer ${credentials.accessToken}`);
    request.setRequestHeader("apikey", credentials.publishableKey);
    request.setRequestHeader("Content-Type", DOCUMENT_MIME_TYPES[fileType]);
    request.setRequestHeader("x-upsert", "false");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${request.status}).`));
    });
    request.addEventListener("error", () => reject(new Error("The upload connection failed.")));
    request.send(file);
  });
}

export async function uploadKnowledgeFile(file: File, path: string, fileType: DocumentFileType, onProgress: (progress: number) => void) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  await uploadFileRequest(file, path, fileType, {
    baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    accessToken: session.access_token,
  }, onProgress);
}

export async function removeUploadedFile(path: string) {
  await createClient().storage.from(KNOWLEDGE_DOCUMENT_BUCKET).remove([path]);
}

export async function getDocumentDownloadUrl(path: string, fileName: string) {
  const { data, error } = await createClient().storage.from(KNOWLEDGE_DOCUMENT_BUCKET).createSignedUrl(path, 60, { download: fileName });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
