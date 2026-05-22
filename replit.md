# DocuBOT

A full-stack RAG (Retrieval-Augmented Generation) application where users upload PDF documents and chat with them using AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/docubot run dev` — run the frontend (port 22247)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `GEMINI_API_KEY` — your Gemini API key (used for embeddings + chat)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server)
- Frontend: React + Vite + Tailwind CSS (artifacts/docubot)
- AI: Gemini `gemini-embedding-001` for embeddings, `gemini-2.5-flash` for chat (via `@google/genai`)
- PDF parsing: pdfjs-dist (legacy build, text extraction only, no canvas)
- Vector search: in-memory cosine similarity (no external vector DB needed)
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod validation schemas
- `artifacts/api-server/src/lib/` — RAG pipeline modules (vectorStore, chunker, geminiClient)
- `artifacts/api-server/src/routes/` — API route handlers (upload, chat, documents)
- `artifacts/docubot/src/` — React frontend

## Architecture decisions

- **In-memory vector store**: Document embeddings stored in Node.js memory using cosine similarity search. No external DB needed, but documents are lost on server restart.
- **pdfjs-dist for parsing**: Uses the `legacy` build for Node.js compatibility. Text extraction only — no canvas/rendering needed.
- **pdfjs-dist Node.js setup**: Three things are required for server-side pdfjs-dist to work:
  1. **DOMMatrix polyfill** injected via esbuild banner (canvas.js references it at module load time)
  2. **Worker file** (`pdf.worker.min.mjs`) copied to `dist/` by `build.mjs` and referenced via `new URL("./pdf.worker.min.mjs", import.meta.url).href`
  3. **Standard fonts** directory copied to `dist/standard_fonts/` and passed as `standardFontDataUrl` to `getDocument()`
- **Contract-first API**: OpenAPI spec → Orval codegen → typed React Query hooks on frontend, Zod schemas on backend.
- **Chunking with overlap**: Text split with 800-char chunks and 100-char overlap to preserve context across chunk boundaries.
- **GEMINI_API_KEY for both embeddings and chat**: Replit's managed AI integration doesn't support Gemini embeddings, so the user's own key handles both.
- **Gemini REST API response shape**: The embedding endpoint returns `{ "embedding": { "values": [...] } }` (singular `embedding`, not `embeddings[]`).

## Product

Users upload PDF files (up to 10MB) via a drag-and-drop interface. The app extracts text, splits it into overlapping chunks, and generates Gemini embeddings stored in memory. When the user asks a question, the query is embedded, the top-4 most similar chunks are retrieved via cosine similarity, and Gemini answers using only that context. Source excerpts are shown in a collapsible section under each AI response.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/upload | Upload a PDF (multipart/form-data) |
| POST | /api/chat | Chat with a document (`{ docId, message }`) |
| GET | /api/documents | List all loaded document IDs |
| DELETE | /api/documents/:docId | Remove a document from memory |
| GET | /api/healthz | Health check |

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Documents are stored **in memory only** — they are lost if the API server restarts. This is by design for simplicity.
- **Do NOT use pdf2json** — v4 fails on modern PDFs with cross-reference streams (`Invalid XRef stream header`). Use pdfjs-dist instead.
- **Do NOT use `pdfjs-dist` without the DOMMatrix polyfill** — canvas.js references `DOMMatrix` at module load time and crashes Node.js.
- **Do NOT set `GlobalWorkerOptions.workerSrc = ""`** — pdfjs-dist v5 rejects empty strings; you must copy and reference the actual worker file.
- The chat route expects `{ docId, message }` — NOT `question`.
- Run `pnpm --filter @workspace/db run push` is NOT needed — this app doesn't use a database.
- After spec changes, always re-run codegen before using new types.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
