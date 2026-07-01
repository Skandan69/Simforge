-- Processing data is API-only. The service role bypasses RLS; browser clients receive no direct table access.
alter table public."KnowledgeSource" enable row level security;
alter table public."ProcessingJob" enable row level security;
alter table public."KnowledgeChunk" enable row level security;
alter table public."ProcessingLog" enable row level security;
