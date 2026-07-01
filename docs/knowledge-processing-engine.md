# Knowledge Processing Engine

The engine is an API-owned boundary between raw knowledge and future consumers. Knowledge Studio manages uploads and displays state; it does not parse files.

## Workflow

`Uploaded → Queued → Processing → Completed | Failed | Cancelled`

The in-process worker atomically claims queued PostgreSQL jobs. Each adapter validates the source and extracts plain text. The engine then computes metadata, creates ordered chunks, and stores logs and duration. Cancellation is cooperative between pipeline stages. Failed jobs retain their error and may be retried up to the configured maximum; reprocessing creates a new job and replaces prior chunks only after extraction succeeds.

## Extension contract

Format adapters implement `SourceExtractor`. New website, media, OCR, SharePoint, Confluence, and API adapters can be registered without changing queue or persistence logic. Downstream modules consume completed `KnowledgeChunk` records through the API and never access raw Storage objects.

No AI model, embedding, vector store, semantic retrieval, summary, or generated content is part of this engine.
