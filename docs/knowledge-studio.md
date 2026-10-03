# Knowledge Studio

## Scope

Knowledge Studio is an enterprise document-management foundation. It stores original files and governed metadata; it does not read, transform, index, summarize, chunk, or otherwise process document contents.

## Permissions

| Role | Read | Create/upload | Edit/archive | Delete |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |
| Trainer | Yes | Yes | Yes | Yes |
| Manager | Yes | No | No | No |
| Learner | Yes | No | No | No |

The Express API enforces these rules independently of the UI. Supabase Storage policies apply the same organization membership and role checks to private files.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/knowledge-bases/dashboard` | Knowledge Studio totals and recent knowledge bases |
| GET | `/api/knowledge-bases` | List and filter knowledge bases |
| POST | `/api/knowledge-bases` | Create a knowledge base |
| GET | `/api/knowledge-bases/:id` | Read knowledge base metadata |
| PUT | `/api/knowledge-bases/:id` | Edit, archive, or restore a knowledge base |
| DELETE | `/api/knowledge-bases/:id` | Delete a knowledge base and its stored files |
| GET | `/api/documents` | List and filter documents |
| POST | `/api/documents` | Register uploaded file metadata and version 1 |
| GET | `/api/documents/:id` | Read document metadata and version history |
| PUT | `/api/documents/:id` | Update document metadata or status |
| DELETE | `/api/documents/:id` | Delete metadata and every stored version |
| GET | `/api/documents/:id/versions` | List version metadata |
| POST | `/api/documents/:id/versions` | Register a replacement as the next version |
| GET | `/api/knowledge-search?q=...` | Search file, knowledge-base, and department metadata |

## Upload lifecycle

1. The web app validates the extension and 50 MB size limit.
2. The authenticated browser uploads directly to the private `knowledge-documents` bucket and reports byte progress.
3. The API validates the file metadata and organization/knowledge-base storage path.
4. Prisma creates the document and immutable version record.
5. The API queues the document for the Knowledge Processing Engine.
6. When processing completes, active chunks become available to retrieval consumers such as Ask Sophia.
7. If metadata creation fails, the browser attempts to remove the uploaded object.

API-driven deletion uses the server-only Supabase service-role key to remove every version before deleting database metadata.

## Ask Sophia grounding

Processed documents can be queried through Ask Sophia. A user can search all active knowledge bases, selected knowledge bases, or open a processed document and choose **Ask Sophia** to lock retrieval to that exact document.

ASK mode answers from retrieved active evidence only. If the document or knowledge base does not contain enough evidence, Sophia returns an insufficient-information response instead of inventing an answer. Citations are generated from machine-controlled document/version/location metadata.

Supported upload formats are:

- PDF with an extractable text layer
- DOCX
- PPTX text content
- XLSX cell content

Legacy Word `.doc` files are not accepted. Image-only/scanned PDFs require OCR before upload or a future OCR adapter; the current PDF extractor does not perform OCR.
