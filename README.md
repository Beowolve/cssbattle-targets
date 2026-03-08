# CSS Battle Targets

A modern React + Vite app for browsing CSSBattle targets with a responsive card grid, branded header, and theme switch.

## Tech Stack

- React 18
- Vite 5
- ESLint 9 (flat config)

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Quick Start (Windows / PowerShell)

```powershell
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`).

## Scripts

```powershell
npm run dev      # start development server
npm run build    # create production build in dist/
npm run preview  # preview the production build locally
npm run lint     # run ESLint
```

## Project Structure

```text
.
├─ public/
│  └─ logo-square.png
├─ src/
│  ├─ hooks/
│  │  └─ useTheme.js
│  ├─ App.jsx
│  ├─ Target.jsx
│  ├─ Target.css
│  ├─ levels.js
│  ├─ main.jsx
│  └─ styles.css
├─ .gitignore
├─ eslint.config.js
├─ index.html
├─ package.json
└─ vite.config.js
```

## Notes

- `public/logo-square.png` is used in the header and as favicon.
- Theme preference is saved in `localStorage`.
- The target dataset is stored in `src/levels.js`.
- Clicking a card opens the related CSSBattle challenge in a new tab.