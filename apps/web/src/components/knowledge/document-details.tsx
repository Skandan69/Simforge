"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Download, FileText, History, Loader2, Pencil, Replace, Save, Trash2, UserRound } from "lucide-react";
import { DOCUMENT_MIME_TYPES, type CreateDocumentVersionInput, type DocumentDetail } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import { createStoragePath, getDocumentDownloadUrl, removeUploadedFile, uploadKnowledgeFile, validateDocumentFile } from "@/lib/knowledge-files";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormMessage } from "@/components/auth/form-message";

export function DocumentDetails({ id }: { id: string }) {
  const router = useRouter();
  const replaceInput = useRef<HTMLInputElement>(null);
  const [document, setDocument] = useState<DocumentDetail>();
  const [error, setError] = useState<string>();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState<number>();

  const load = useCallback(async () => {
    const result = await apiFetch<DocumentDetail>(`/api/documents/${id}`);
    setDocument(result);
    setError(undefined);
  }, [id]);

  useEffect(() => {
    let active = true;
    void apiFetch<DocumentDetail>(`/api/documents/${id}`).then((result) => { if (active) setDocument(result); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Unable to load document details."); });
    return () => { active = false; };
  }, [id]);

  async function download(path: string, fileName: string) {
    try { window.location.assign(await getDocumentDownloadUrl(path, fileName)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to download this file."); }
  }

  async function saveMetadata(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document) return;
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/api/documents/${document.id}`, { method: "PUT", body: JSON.stringify({ fileName: String(form.get("fileName")), notes: String(form.get("notes")), status: String(form.get("status")) }) });
      await load();
      setEditOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to update document metadata."); }
    finally { setPending(false); }
  }

  async function replaceFile(file: File) {
    if (!document) return;
    setPending(true);
    setReplaceProgress(0);
    let storagePath: string | undefined;
    try {
      const fileType = validateDocumentFile(file);
      const organizationId = document.storagePath.split("/")[0];
      storagePath = createStoragePath(organizationId, document.knowledgeBase.id, file.name);
      await uploadKnowledgeFile(file, storagePath, fileType, setReplaceProgress);
      const input: CreateDocumentVersionInput = { fileName: file.name, fileType, mimeType: DOCUMENT_MIME_TYPES[fileType], sizeBytes: file.size, storagePath, notes: `Replaced version ${document.currentVersion}` };
      await apiFetch(`/api/documents/${document.id}/versions`, { method: "POST", body: JSON.stringify(input) });
      await load();
    } catch (caught) {
      if (storagePath) await removeUploadedFile(storagePath).catch(() => undefined);
      setError(caught instanceof Error ? caught.message : "Unable to replace this document.");
    } finally {
      setPending(false);
      setReplaceProgress(undefined);
      if (replaceInput.current) replaceInput.current.value = "";
    }
  }

  async function removeDocument() {
    if (!document) return;
    setPending(true);
    try {
      await apiFetch(`/api/documents/${document.id}`, { method: "DELETE" });
      router.replace(`/knowledge-studio/knowledge-bases/${document.knowledgeBase.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete this document.");
      setPending(false);
    }
  }

  if (error && !document) return <div className="rounded-xl border bg-card p-8 text-center"><h1 className="font-semibold">Document unavailable</h1><p className="mt-2 text-sm text-destructive">{error}</p><Button className="mt-5" onClick={() => void load()}>Try again</Button></div>;
  if (!document) return <div className="grid min-h-80 place-items-center rounded-xl border bg-card text-sm text-muted-foreground">Loading document details…</div>;

  return <div className="space-y-7"><Button asChild variant="ghost" size="sm" className="-ml-2"><Link href={`/knowledge-studio/knowledge-bases/${document.knowledgeBase.id}`}><ArrowLeft />{document.knowledgeBase.name}</Link></Button>{error && <FormMessage message={error} />}<section className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-6" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{document.fileType}</Badge><Badge variant={document.status === "Ready" ? "success" : "secondary"}>{document.status}</Badge><span className="text-xs text-muted-foreground">Version {document.currentVersion}</span></div><h1 className="mt-3 break-words text-2xl font-semibold tracking-tight">{document.fileName}</h1><p className="mt-2 text-sm text-muted-foreground">{document.knowledgeBase.name} · {document.knowledgeBase.department}</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void download(document.storagePath, document.fileName)}><Download />Download</Button>{document.canEdit && <><Button variant="outline" onClick={() => setEditOpen(true)}><Pencil />Edit</Button><Button variant="outline" onClick={() => replaceInput.current?.click()} disabled={pending}><Replace />Replace</Button><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Delete</Button><input ref={replaceInput} className="sr-only" type="file" accept=".pdf,.docx,.pptx,.xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void replaceFile(file); }} /></>}</div></div>{replaceProgress !== undefined && <div className="mt-6"><div className="mb-2 flex justify-between text-xs"><span>Uploading replacement…</span><span>{replaceProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${replaceProgress}%` }} /></div></div>}</section><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><Card><CardHeader><CardTitle className="text-base">Metadata</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Size</span><span>{formatBytes(document.sizeBytes)}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Uploaded by</span><span className="text-right">{document.uploadedBy.name}</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Upload date</span><span className="text-right">{formatDateTime(document.uploadedAt)}</span></div><div className="border-t pt-4"><p className="text-muted-foreground">Notes</p><p className="mt-2 whitespace-pre-wrap leading-6">{document.notes || "No notes added."}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="size-5 text-primary" />Version history</CardTitle></CardHeader><CardContent><div className="space-y-3">{document.versions.map((version) => <div key={version.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold">v{version.version}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{version.fileName}</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><UserRound className="size-3" />{version.uploadedBy.name}</span><span className="flex items-center gap-1"><Clock3 className="size-3" />{formatDateTime(version.uploadedAt)}</span><span>{formatBytes(version.sizeBytes)}</span></div>{version.notes && <p className="mt-2 text-xs text-muted-foreground">{version.notes}</p>}</div><Button variant="ghost" size="sm" onClick={() => void download(version.storagePath, version.fileName)}><Download />Download</Button></div>)}</div></CardContent></Card></div><Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit document metadata</DialogTitle><DialogDescription>Update display metadata only. The stored file remains unchanged.</DialogDescription></DialogHeader><form className="space-y-5" onSubmit={saveMetadata}><div className="space-y-2"><Label htmlFor="fileName">File name</Label><Input id="fileName" name="fileName" defaultValue={document.fileName} required /></div><div className="space-y-2"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={document.status} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="Ready">Ready</option><option value="Archived">Archived</option><option value="Failed">Failed</option></select></div><div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" defaultValue={document.notes} placeholder="Add context for reviewers and future versions." /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />}{pending ? "Saving…" : "Save metadata"}</Button></DialogFooter></form></DialogContent></Dialog><AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this document?</AlertDialogTitle><AlertDialogDescription>This permanently deletes the original file, all stored versions, metadata, and notes. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={() => void removeDocument()}>{pending ? "Deleting…" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
