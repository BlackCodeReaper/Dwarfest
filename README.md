# Dwarfest Companion

Dwarfest Companion is a Vue 3 + TypeScript app to track Dwarfest rounds, phases, player stats, checkpoints, and exports.

## Current Status

Implemented:
- Single-phone pass-around game flow
- Setup screen with validation and template quick-start
- Phase/round/player progression with checkpoint history
- Undo to latest or selected checkpoint
- JSON export of game session
- Beer throw helper (physical and mini-game)
- Local persistence with corruption fallback warnings
- PWA scaffold (manifest + service worker registration)
- Unit tests for turn progression logic
- Supabase multiplayer sync scaffold with safe fallback when unconfigured
- Host and participant role logic (participant is read-only)
- Reconnect queue for host updates while offline
- Participant presence and action audit writes (Supabase tables)
- Participant retry sync action when initial room hydrate fails
- Versioned service worker caches (static/runtime split)
- Checked-in `.env.example` template for required Supabase vars

Planned next:
- Conflict resolution hardening (currently snapshot-based)
- Expanded test coverage for state and UI flows

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Vitest

## Scripts

- `npm run dev` starts local development server
- `npm run test` runs unit tests once
- `npm run build` runs type-check + production build
- `npm run preview` serves the built app locally

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Run tests:

```bash
npm run test
```

4. Build for production:

```bash
npm run build
```

## Project Structure

- `src/App.vue`: App shell and screen composition
- `src/useGameState.ts`: local session state, checkpoints, template storage
- `src/services/gameFlow.ts`: pure turn/phase progression logic
- `src/services/supabase.ts`: Supabase client bootstrap and env checks
- `src/services/realtimeSync.ts`: realtime sync adapter for multiplayer mode
- `src/components/`: setup/gameplay UI panels
- `public/manifest.json`: PWA manifest
- `public/sw.js`: service worker
- `supabase/schema.sql`: tables and policies for games, participants, and action audit
- `.env.example`: required frontend env vars

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the project in [vercel.com](https://vercel.com) — it auto-detects Vite.
3. **Add environment variables in Vercel project settings → Environment Variables:**
   ```
   VITE_SUPABASE_URL       = https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY  = your-anon-key
   ```
   These are baked into the build at compile time by Vite. The deployment **must be re-triggered** after adding or changing them.
4. Deploy. The included `vercel.json` handles SPA routing, static asset caching, and security headers automatically.

> Without the env vars set in Vercel, multiplayer mode will be visible in the UI but will run in offline/unconfigured fallback mode — no Supabase connection will be attempted.

## Multiplayer Setup (Supabase)

1. Create a Supabase project.
2. In Supabase SQL editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill values:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Restart dev server after adding env vars.

Without these env vars, multiplayer mode stays available in UI but runs in unconfigured fallback mode.
Placeholder/example values are treated as unconfigured to avoid false-positive setup states.

## Notes

- Multiplayer sync is implemented with Supabase realtime and snapshot upserts.
- Host devices publish authoritative game state; participant devices subscribe and stay read-only.
- Host updates made while offline are queued and flushed when connectivity returns.
- Service worker caching is intentionally minimal and can be hardened in later phases.
