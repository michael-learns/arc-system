# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- convex-ai-start -->
When working on Convex code, **always read `src/convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.
<!-- convex-ai-end -->

## Commands

```bash
bun run dev          # start dev server (also run `bunx convex dev` in parallel for backend)
bun run build        # production build
bun run preview      # preview production build
bun run check        # type-check with svelte-check
bun run check:watch  # type-check in watch mode
```

**Package manager:** Bun exclusively (`engine-strict=true` in `.npmrc`). Never use npm/pnpm/yarn.

**Adding shadcn-svelte components:**
```bash
bunx shadcn-svelte@latest add <component> --yes
```

**Convex backend:** Run `bunx convex dev` alongside the dev server. Convex functions live in `src/convex/` and auto-deploy on save.

## Architecture

### Stack
- **SvelteKit** (Svelte 5) — frontend framework with file-based routing
- **Convex** — real-time backend (database + serverless functions), deployment: `exuberant-crow-603`
- **convex-svelte** — Svelte-specific Convex client bindings
- **shadcn-svelte** — component library (zinc base color, Tailwind v4)
- **Tailwind CSS v4** — styling via `@tailwindcss/vite` plugin (no `tailwind.config.js`)

### Key conventions

**Convex functions** go in `src/convex/` (configured via `convex.json`). The `_generated/` subdirectory is auto-generated — never edit it. Import the typed API via `import { api } from '../convex/_generated/api.js'`.

**Convex client in Svelte** — `setupConvex(PUBLIC_CONVEX_URL)` is called once in `src/routes/+layout.svelte`. Descendants use `useQuery(api.module.fn, args)` and `useConvexClient()` for mutations. Both return reactive Svelte 5 state objects with `.isLoading`, `.data`, and `.error` properties.

**UI components** are added via the shadcn-svelte CLI and land in `src/lib/components/ui/`. Import from `$lib/components/ui/<name>/index.js`. Use the `cn()` utility from `$lib/utils` to merge Tailwind classes.

**Global styles** live in `src/routes/layout.css` (imported by `+layout.svelte`). Contains: Tailwind imports, shadcn `@theme inline` color mappings, `@custom-variant` blocks for bits-ui data attributes, and zinc light/dark CSS variable tokens. Toggle `.dark` class on an ancestor element to switch to dark mode.

**Routing** follows SvelteKit conventions: `src/routes/+page.svelte` for pages, `+layout.svelte` for shared layout, `+page.server.ts` for server-only load functions.

### Environment variables
- `PUBLIC_CONVEX_URL` — Convex deployment URL, written automatically by `bunx convex dev` to `.env.local`
- `CONVEX_DEPLOYMENT` — deployment identifier, also written by `bunx convex dev`
