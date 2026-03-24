# CSS Battle Targets

A React + Vite app that loads CSSBattle battle and daily targets from Supabase with lazy loading, cache-aware refresh, and responsive browsing.

## Features

- Browse `battle` and `daily` targets from Supabase.
- Lazy loading with automatic scroll-triggered page fetches.
- Cache-aware refresh that prepends newly published targets.
- Light, dark, and system theme modes.
- Header version label sourced from `package.json`.

## Tech Stack

- React 18
- Vite 5
- Supabase JavaScript client
- ESLint 9 (flat config)

## Requirements

- Node.js `>=24 <25`
- npm

## Setup (Windows / PowerShell)

```powershell
Copy-Item .env.example .env
# Then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
npm install
npm run dev
```

## Scripts

```powershell
npm run dev      # Start development server
npm start        # Alias for development server
npm run lint     # Run ESLint
npm run build    # Create production build in dist/
npm run preview  # Preview production build locally
```

## Data Source and Caching

- Source tables: `battle_targets`, `daily_targets`
- UI mode switch: Battle / Daily
- Cache strategy: localStorage (per mode)
- Revalidation windows (UTC): `01:00` and `18:00`

## Release Process

- Follow repository rules in `AGENTS.md`.
- Keep `CHANGELOG.md`, `package.json`, and `package-lock.json` aligned before release.
- Create release tags in format `v*.*.*` (example: `v2.1.0`).

## CI/CD

- `CI` workflow runs lint and production build on pushes/PRs to `main`.
- `Release` workflow runs on `v*.*.*` tags, generates release notes, publishes GitHub Releases, and deploys via FTP.
- In GitHub Actions, Vite build values are injected via repository secrets:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Local development continues to use `.env`.

## Reusable Release Actions

The release workflow is composed from reusable actions under `.github/actions`:

- `build-react-app`
- `generate-release-notes`
- `notify-discord-release`
- `deploy-ftp`

Manual FTP deploy is available via **Actions -> Release -> Run workflow** and optional `ref` input.

## Security Notes

- Use only the Supabase anon key in frontend apps.
- Never expose the Supabase service role key in this project.
