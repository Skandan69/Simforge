"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, UploadCloud, XCircle } from "lucide-react";
import { DOCUMENT_MIME_TYPES, type CreateDocumentInput, type DocumentSummary } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { createStoragePath, removeUploadedFile, uploadKnowledgeFile, validateDocumentFile } from "@/lib/knowledge-files";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "success" | "failed";
  error?: string;
}

export function DocumentUpload({ organizationId, knowledgeBaseId, disabled, onComplete }: { organizationId: string; knowledgeBaseId: string; disabled?: boolean; onComplete: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  function addFiles(files: File[]) {
    setItems(files.map((file) => ({ id: crypto.randomUUID(), file, progress: 0, status: "queued" })));
  }

  async function uploadOne(item: UploadItem) {
    let storagePath: string | undefined;
    try {
      const fileType = validateDocumentFile(item.file);
      storagePath = createStoragePath(organizationId, knowledgeBaseId, item.file.name);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "uploading" } : entry));
      await uploadKnowledgeFile(item.file, storagePath, fileType, (progress) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress } : entry)));
      const metadata: CreateDocumentInput & { knowledgeBaseId: string } = {
        knowledgeBaseId,
        fileName: item.file.name,
        fileType,
        mimeType: DOCUMENT_MIME_TYPES[fileType],
        sizeBytes: item.file.size,
        storagePath,
      };
      await apiFetch<DocumentSummary>("/api/documents", { method: "POST", body: JSON.stringify(metadata) });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, progress: 100, status: "success" } : entry));
    } catch (caught) {
      if (storagePath) await removeUploadedFile(storagePath).catch(() => undefined);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "failed", error: caught instanceof Error ? caught.message : "Upload failed" } : entry));
    }
  }

  async function startUpload() {
    setUploading(true);
    await Promise.all(items.filter((item) => item.status === "queued" || item.status === "failed").map(uploadOne));
    await onComplete();
    setUploading(false);
  }

  return <div className="space-y-4"><div className={cn("rounded-xl border-2 border-dashed p-7 text-center transition-colors", dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20", disabled && "pointer-events-none opacity-50")} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><UploadCloud className="size-6" /></span><h3 className="mt-4 text-sm font-semibold">Drop documents here</h3><p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, PPTX, XLSX · up to 50 MB each</p><Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={disabled}><FileUp />Choose files</Button><input ref={inputRef} type="file" className="sr-only" multiple accept=".pdf,.docx,.pptx,.xlsx" onChange={(event) => addFiles(Array.from(event.target.files ?? []))} /></div>{items.length > 0 && <div className="space-y-2">{items.map((item) => <div key={item.id} className="rounded-lg border bg-card p-3"><div className="flex items-start gap-3"><span className="mt-0.5 text-muted-foreground">{item.status === "success" ? <CheckCircle2 className="size-5 text-emerald-500" /> : item.status === "failed" ? <XCircle className="size-5 text-destructive" /> : item.status === "uploading" ? <Loader2 className="size-5 animate-spin text-primary" /> : <FileUp className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="truncate text-sm font-medium">{item.file.name}</p><span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span></div>{item.status === "failed" ? <p className="mt-1 text-xs text-destructive">{item.error}</p> : <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", item.status === "success" ? "bg-emerald-500" : "bg-primary")} style={{ width: `${item.progress}%` }} /></div>}</div></div></div>)}<div className="flex justify-end"><Button onClick={() => void startUpload()} disabled={uploading || !items.some((item) => item.status !== "success")}>{uploading && <Loader2 className="animate-spin" />}{uploading ? "Uploading…" : "Upload documents"}</Button></div></div>}</div>;
}
