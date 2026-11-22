# Your Garden Knows (v1)

The live web app for the DDES9017 handoff in `../your-garden-knows/HANDOFF.md`. Vite + React + TypeScript, everything stored in the browser (IndexedDB via Dexie).

## Run it

Node 22 lives in `~/.local/node`. Add it to the path for the session:

```bash
export PATH=$HOME/.local/node/bin:$PATH
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run build` writes static files to `dist/` and copies `index.html` to `404.html`, so deep links such as `/garden/thumb` work on GitHub Pages.

## Deploy to GitHub Pages

1. Put this folder in a GitHub repository and push to `main`.
2. In the repository: Settings → Pages → Source: **GitHub Actions**.
3. `.github/workflows/pages.yml` runs the tests, builds with `BASE_PATH=/<repo-name>/` and publishes.

## Where things are

| Area | Files |
| --- | --- |
| The game (Wayfinder redesign, `/` and `play.html`) | `src/game/` · `content.ts` (the 12 buzzes), `state.ts` (logic, uses the real engine), `Game.tsx`, `Street.tsx`, `game.css` · tests in `state.test.ts` |
| Metric engine (section 5) | `src/engine/metrics.ts`, `stories.ts`, `meta.ts` · tests in `metrics.test.ts` |
| Garden renderer (port of `drawGarden`) | `src/garden/draw.ts`, `Garden.tsx` |
| Export parsers (section 6) | `src/parsers/whatsapp.ts`, `video.ts` · tests in `parsers.test.ts` |
| Storage | `src/data/db.ts`, `store.tsx`; read-only example garden in `demo.tsx` |
| Screens 1–15 (tracker, now at `/tracker`, Wayfinder theme at the end of `styles.css`) | `src/screens/` |
| Cul-de-sac client (section 9) | `src/street/api.ts` |

## The cul-de-sac service

There is no live sync service yet. `src/street/api.ts` has two clients with the same contract:

- **Local mock (default).** A street lives only in this browser and comes with five sample neighbours, and the street screen says so. Good for demos and the onboarding test round, but not for test round 2 (a real group on one street).
- **HTTP client.** Set `VITE_STREET_API_URL=https://…` at build time and the app calls the section 9 endpoints with a bearer token per membership. Only six integer levels (0–10), the garden name, the last check-in date and the visible flag are ever sent.

## Research mode

Open `/settings?research=1` to switch it on. Check-ins and receipt views are logged locally; "Copy study log as CSV" copies them for the participant to send.
