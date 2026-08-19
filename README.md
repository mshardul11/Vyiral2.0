# Resume Builder

A resume builder where Claude does the writing. Answer guided questions, upload an
existing resume, or paste a job posting to tailor against — then export to PDF, DOCX,
or a shareable link.

## Layout

| Package | What it is |
| --- | --- |
| `packages/shared` | Zod schemas and inferred types. The contract between client, server, and model. |
| `packages/server` | Hono API. Owns the Anthropic key and every model call. |
| `packages/web` | Vite + React SPA. Editor, live preview, exports. |

The resume shape is defined once, in `packages/shared/src/resume.ts`. The server
validates against it, the client types its state from it, and it is handed to Claude
as the structured-output format — so the model physically cannot return a shape the
app doesn't understand.

## Running it

```sh
npm install
cp packages/server/.env.example packages/server/.env   # add your ANTHROPIC_API_KEY
npm run build --workspace=@resume/shared               # shared is consumed as built output
npm run dev                                            # API on :8787, web on :5173
```

The Vite dev server proxies `/api` to the API, so there is no CORS setup and no API
base URL to configure while developing.

Without an `ANTHROPIC_API_KEY` the app still runs — the editor, both exports, and share
links all work. Only the AI routes return 503.

## Where the API key lives

`ANTHROPIC_API_KEY` belongs in `packages/server/.env` and nowhere else. Never give it a
`VITE_` prefix: Vite inlines every `VITE_*` variable into the client bundle, which would
publish the key to anyone who opens devtools. All model calls go through the server.

## Share links

Publishing writes a JSON file per share under `packages/server/data/shares/` and
returns a 12-character slug. The link is the only credential — there is no password
— so the share dialog says exactly that. Shares are deleted after 90 days by a sweep
that runs when the server starts.

`/r/:slug` is a client-side route, so a production deploy needs the usual SPA
fallback (serve `index.html` for unmatched paths). The Vite dev server already does
this.

## Limits and checks

The AI routes are rate limited per IP (20/min, burst 8) because every call costs
money; publishing a share is limited more loosely. The buckets are in-memory, which
is right for a single process and becomes per-instance behind a load balancer —
swap in a shared store at that point.

```sh
npm run check      --workspace=@resume/web   # PDF + DOCX output, unit tests
npm run check:keys --workspace=@resume/web   # after a build: no secrets in the bundle
npm run check:ai   --workspace=@resume/server # needs a key and a running server
```

## Checking the PDF

```sh
npm run check:pdf --workspace=@resume/web
```

Renders the fixture resume to a PDF outside the browser and prints its text layer. If
text comes out, the document is real vector text rather than an image — which is what
makes it readable by applicant tracking systems. Run it after any change to the
template.
