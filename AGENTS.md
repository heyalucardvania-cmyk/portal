# OpenCode Portal — Project Guide for AI Agents

## Overview

**OpenCode Portal** is a mobile-first, responsive web UI for [OpenCode](https://opencode.ai), the AI coding agent. It provides a browser-based chat interface to interact with OpenCode sessions, with support for Codex and Claude as alternative backend providers.

## Monorepo Structure

```
portal/
  apps/
    web/    — React SPA + Nitro server (main web app)
    docs/   — Nextra docs site
  packages/
    cli/    — openportal CLI (launches backend + UI)
```

## Root Config

| Item        | Value                      |
|-------------|----------------------------|
| Monorepo    | Turborepo v2.9.10          |
| Package mgr | Bun (>=1.3.13)             |
| Node engine | >=20.19.0                  |
| Workspaces  | `apps/*`, `packages/*`     |

## Key Scripts (root)

| Command             | Action                           |
|---------------------|----------------------------------|
| `bun run dev`       | Start all apps in dev mode       |
| `bun run build`     | Build all apps/packages          |
| `bun run lint`      | Lint all apps/packages           |
| `bun run check-types` | Type-check all apps/packages    |
| `bun run format`    | Format with Prettier             |

## apps/web — Main Web App

**Stack:** React 19, TanStack Router (file-based), Vite 8, Nitro 3, Tailwind CSS 4, Zustand 5, SWR 2, IntentUI (React Aria Components), Lucide React

**Key dirs:**
- `src/routes/` — TanStack file-based routes
- `src/components/ui/` — IntentUI primitives (~29 files)
- `src/components/icons/` — Custom icon components
- `src/stores/` — Zustand stores (instance, agent, model)
- `src/hooks/` — SWR hooks + SSE event handling
- `src/server/` — Nitro/H3 backend (API proxy to providers)
- `src/lib/` — Shared utilities
- `src/contexts/` — React contexts (breadcrumbs)

**Server endpoints:** `src/server/` uses Nitro file-based routing. All provider calls are proxied through `/api/{opencode,codex,claude}/:port/...`. SSE events at `/events`.

**Build output:** `apps/web/.output/` (Nitro server), `apps/web/dist/` (Vite client)

## apps/docs — Documentation Site

**Stack:** Next.js 16, Nextra 4, Tailwind CSS 4, MDX

**Purpose:** Setup guides, feature docs, contact form (Resend).

## packages/cli — openportal CLI

**Stack:** TypeScript, Bun, `get-port-please`

**Binary:** `openportal` (published to npm)

**Commands:** `openportal` (default — start all), `run`, `stop`, `list/ls`, `clean`

**Source:** Single file `src/index.ts` (~878 lines). Manages process spawning, config, and instance discovery via `~/.portal.json`.

## Architecture

```
Browser → apps/web (Vite + Nitro) → Backend Providers (OpenCode/Codex/Claude)
```

The Nitro server proxies/translates provider APIs into a unified OpenCode-compatible interface. Real-time updates via SSE. The CLI spawns backend servers + the pre-built Nitro web server.

## Development Workflow

```bash
bun install        # Install all dependencies (root)
bun run dev        # Start web + docs in dev mode
bun run build      # Full build (turbo topological order)
```

- Use `bun run dev` from root for local development.
- The web app dev server (Vite) auto-reloads on file changes.
- Server-side (Nitro) changes may need a restart.
- All deps are managed at the workspace level; install with `bun add <pkg> --cwd apps/web`.

## Important Conventions

- TypeScript throughout (strict mode).
- Tailwind CSS 4 with `tw-animate-css` for animations.
- React Aria Components for accessible UI primitives.
- Zustand for client state, SWR for server state.
- TanStack Router for file-based routing (route tree auto-generated).
- No React Router — TanStack Router only.
- All provider APIs normalized to OpenCode format.
- Claude integration via `@anthropic-ai/claude-agent-sdk`.
- Codex integration via WebSocket RPC.
- Server uses Zod for input validation.
