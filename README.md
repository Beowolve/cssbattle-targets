# CSS Battle Targets

A modern React + Vite app that loads CSSBattle battle and daily targets from Supabase, with a responsive grid, theme switch, and client-side cache.

## Tech Stack

- React 18
- Vite 5
- Supabase JavaScript client
- ESLint 9 (flat config)

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Setup (Windows / PowerShell)

```powershell
Copy-Item .env.example .env
# then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Scripts

```powershell
npm run dev      # start development server
npm run build    # create production build in dist/
npm run preview  # preview the production build locally
npm run lint     # run ESLint
```

## Data Source and Caching

- Source tables: `battle_targets`, `daily_targets`
- Mode switch in UI: Battle / Daily
- Cache strategy: localStorage per mode
- Revalidation windows (UTC): `01:00` and `18:00`

## Security Notes

- Use only the Supabase anon key in frontend apps.
- Never expose the Supabase service role key in this project.