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
5. If metadata creation fails, the browser attempts to remove the uploaded object.

API-driven deletion uses the server-only Supabase service-role key to remove every version before deleting database metadata.
