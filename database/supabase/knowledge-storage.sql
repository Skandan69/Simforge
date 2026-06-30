-- Run after the Prisma Sprint 2 migration. Supabase-specific RLS stays outside
-- Prisma migrations so shadow databases do not require the Supabase auth schema.
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KnowledgeBase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DocumentVersion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own memberships"
ON public."Membership"
FOR SELECT
TO authenticated
USING ("userId" = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Organization members can read knowledge documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-documents'
  AND EXISTS (
    SELECT 1 FROM public."Membership" membership
    WHERE membership."organizationId" = ((storage.foldername(name))[1])::uuid
      AND membership."userId" = (SELECT auth.uid())
  )
);

CREATE POLICY "Knowledge editors can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-documents'
  AND EXISTS (
    SELECT 1 FROM public."Membership" membership
    WHERE membership."organizationId" = ((storage.foldername(name))[1])::uuid
      AND membership."userId" = (SELECT auth.uid())
      AND membership."role"::text = ANY (ARRAY['Owner', 'Admin', 'Trainer'])
  )
);

CREATE POLICY "Knowledge editors can remove documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-documents'
  AND EXISTS (
    SELECT 1 FROM public."Membership" membership
    WHERE membership."organizationId" = ((storage.foldername(name))[1])::uuid
      AND membership."userId" = (SELECT auth.uid())
      AND membership."role"::text = ANY (ARRAY['Owner', 'Admin', 'Trainer'])
  )
);
