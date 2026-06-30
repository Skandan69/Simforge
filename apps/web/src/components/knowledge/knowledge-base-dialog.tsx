"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { CreateKnowledgeBaseInput, KnowledgeBaseSummary } from "@simforge/shared";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/auth/form-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBase?: KnowledgeBaseSummary;
  onSaved: () => Promise<void>;
}

export function KnowledgeBaseDialog({ open, onOpenChange, knowledgeBase, onSaved }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const input: CreateKnowledgeBaseInput = {
      name: String(form.get("name")),
      description: String(form.get("description")),
      department: String(form.get("department")),
    };
    try {
      await apiFetch(knowledgeBase ? `/api/knowledge-bases/${knowledgeBase.id}` : "/api/knowledge-bases", {
        method: knowledgeBase ? "PUT" : "POST",
        body: JSON.stringify(input),
      });
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this knowledge base.");
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{knowledgeBase ? "Edit knowledge base" : "Create knowledge base"}</DialogTitle><DialogDescription>{knowledgeBase ? "Update the ownership context and description." : "Create a focused home for a department’s approved documents."}</DialogDescription></DialogHeader><form className="space-y-5" onSubmit={handleSubmit}><FormMessage message={error} /><div className="space-y-2"><Label htmlFor="kb-name">Name</Label><Input id="kb-name" name="name" defaultValue={knowledgeBase?.name} placeholder="Customer Support" required minLength={2} /></div><div className="space-y-2"><Label htmlFor="kb-department">Department</Label><Input id="kb-department" name="department" defaultValue={knowledgeBase?.department} placeholder="Support" required minLength={2} /></div><div className="space-y-2"><Label htmlFor="kb-description">Description</Label><Textarea id="kb-description" name="description" defaultValue={knowledgeBase?.description} placeholder="Policies, playbooks, and product guidance for the support team." required minLength={2} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" />}{pending ? "Saving…" : knowledgeBase ? "Save changes" : "Create knowledge base"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
