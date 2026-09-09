# Arthix-Prototype-Final

Explainable industrial approvals and compliance workspace for Maharashtra, helping applicants understand requirements, prepare dossiers, and coordinate next steps. Built with Next.js (Pages Router), TypeScript, Tailwind CSS and React Flow.

## Quick start

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. Local development uses browser workspace storage and an in-memory case adapter when `DATABASE_URL` is not configured — no external services required.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build (standalone output) |
| `npm run start` | Run the standalone production server |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | TypeScript, strict mode, no emit |
| `npm test` | Node.js built-in test runner (`lib/*.test.ts`) |
| `npm run db:migrate` | Apply SQL migrations in `db/` (requires `DATABASE_URL`) |

## Configuration

Copy `.env.example` (or `.env.pilot.example` for the Docker pilot stack) to `.env.local` and fill in the values you need. Everything is optional for local development; production prerequisites are listed in [DEPLOYMENT.md](./DEPLOYMENT.md). Never commit `.env` files.

### Compliance Assistant LLM

The Compliance Assistant grounds every answer in indexed rules **and live official government pages** (allowlisted `.gov.in` / `.nic.in` domains only, fetched server-side and cached for 10 minutes). Connect any OpenAI-compatible LLM to have it explain the retrieved sources — it is forced to cite the allowed sources and falls back to deterministic retrieval otherwise:

```ini
# Groq free tier
OPENAI_API_KEY=gsk_...
OPENAI_MODEL=llama-3.3-70b-versatile
OPENAI_BASE_URL=https://api.groq.com/openai/v1/chat/completions

# or local Ollama (no key needed)
OPENAI_MODEL=llama3.1
OPENAI_BASE_URL=http://127.0.0.1:11434/v1/chat/completions
```

## Continuous integration

`.github/workflows/ci.yml` runs lint, typecheck, tests and the production build on every push to `main` and on all pull requests.

## Scope and disclaimer

Arthix is decision-support software. It does not issue approvals, verify identities or replace statutory authorities. Requirements, timelines and eligibility must always be confirmed with the responsible department.
