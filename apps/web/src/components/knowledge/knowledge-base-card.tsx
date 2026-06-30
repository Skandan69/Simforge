"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, BookOpen, CalendarDays, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { KnowledgeBaseSummary } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { KnowledgeBaseDialog } from "./knowledge-base-dialog";

export function KnowledgeBaseCard({ knowledgeBase, canEdit, onChanged, onError }: { knowledgeBase: KnowledgeBaseSummary; canEdit: boolean; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function archive() {
    setPending(true);
    try {
      await apiFetch(`/api/knowledge-bases/${knowledgeBase.id}`, { method: "PUT", body: JSON.stringify({ status: knowledgeBase.status === "Active" ? "Archived" : "Active" }) });
      await onChanged();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to update this knowledge base.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await apiFetch(`/api/knowledge-bases/${knowledgeBase.id}`, { method: "DELETE" });
      await onChanged();
      setDeleteOpen(false);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to delete this knowledge base.");
    } finally {
      setPending(false);
    }
  }

  return <><Card className="group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"><CardHeader className="pb-4"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></span><div className="flex items-center gap-2"><Badge variant={knowledgeBase.status === "Active" ? "success" : "secondary"}>{knowledgeBase.status}</Badge>{canEdit && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${knowledgeBase.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil />Edit</DropdownMenuItem><DropdownMenuItem disabled={pending} onSelect={() => void archive()}><Archive />{knowledgeBase.status === "Active" ? "Archive" : "Restore"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></div><CardTitle className="mt-4 line-clamp-1 text-lg">{knowledgeBase.name}</CardTitle><p className="text-xs font-medium uppercase tracking-wider text-primary">{knowledgeBase.department}</p></CardHeader><CardContent className="flex flex-1 flex-col"><p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">{knowledgeBase.description}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><FileText className="size-4" />{knowledgeBase.documentCount} documents</span><span className="flex items-center justify-end gap-2"><CalendarDays className="size-4" />{formatDate(knowledgeBase.updatedAt)}</span></div><Button asChild variant="outline" className="mt-4 w-full"><Link href={`/knowledge-studio/knowledge-bases/${knowledgeBase.id}`}>Open library</Link></Button></CardContent></Card><KnowledgeBaseDialog open={editOpen} onOpenChange={setEditOpen} knowledgeBase={knowledgeBase} onSaved={onChanged} /><AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete “{knowledgeBase.name}”?</AlertDialogTitle><AlertDialogDescription>This permanently removes the knowledge base, all document metadata, every stored file, and its version history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={() => void remove()}>{pending ? "Deleting…" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
