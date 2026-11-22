# Your Garden Knows (v1)

The live web app for the DDES9017 handoff in `../your-garden-knows/HANDOFF.md`. Vite + React + TypeScript, everything stored in the browser (IndexedDB via Dexie).

The site holds two experiments:

| Experiment | Route | Look | Question |
| --- | --- | --- | --- |
| The app: your real garden | `/` and everything under it, plus the sample walkthrough at `/walkthrough` | Poster stage | Does seeing your own habits as a garden, over weeks, change how you share and scroll? |
| E: Play a day | `/play` | Wayfinder | Can an absurd, made-up day get the idea across to anyone in three minutes, with no data? |

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

`npm run build` writes static files to `dist/` and copies `index.html` to `404.html`, so deep links such as `/garden/thumb` and `/play` work on GitHub Pages. The standalone game build ships as `play-standalone.html` (renamed so it doesn't capture `/play`).

## Deploy to GitHub Pages

1. Put this folder in a GitHub repository and push to `main`.
2. In the repository: Settings → Pages → Source: **GitHub Actions**.
3. `.github/workflows/pages.yml` runs the tests, builds with `BASE_PATH=/<repo-name>/` and publishes.

## Where things are

| Area | Files |
| --- | --- |
| The game (experiment E, `/play`; standalone `play.html`) | `src/game/` · `content.ts` (the 12 buzzes), `state.ts` (logic, uses the real engine), `Game.tsx`, `Street.tsx`, `game.css` · tests in `state.test.ts` |
| Sample walkthrough: Mia's month (`/walkthrough/:step`) | `src/screens/Walkthrough.tsx`; sample data in `src/data/walkthrough.ts` · tier test in `walkthrough.test.ts` |
| Garden mural (flat shapes driven by levels) | `src/ui/Mural.tsx` · tests in `Mural.test.ts` |
| Poster-stage look (tokens, type, components) | `src/styles.css`; top bars in `App.tsx` and `src/ui/topbar.tsx`; receipt rows in `src/ui/receipts.tsx` |
| Metric engine (section 5) | `src/engine/metrics.ts`, `stories.ts`, `meta.ts` · tests in `metrics.test.ts` |
| Garden renderer (port of `drawGarden`) | `src/garden/draw.ts`, `Garden.tsx` |
| Export parsers (section 6) | `src/parsers/whatsapp.ts`, `video.ts` · tests in `parsers.test.ts` |
| Storage | `src/data/db.ts`, `store.tsx`; read-only example garden in `demo.tsx` |
| Screens 1–15 (welcome at `/`; `/tracker` redirects there) | `src/screens/` |
| Cul-de-sac client (section 9) | `src/street/api.ts` |

## The cul-de-sac service

There is no live sync service yet. `src/street/api.ts` has two clients with the same contract:

- **Local mock (default).** A street lives only in this browser and comes with five sample neighbours, and the street screen says so. Good for demos and the onboarding test round, but not for test round 2 (a real group on one street).
- **HTTP client.** Set `VITE_STREET_API_URL=https://…` at build time and the app calls the section 9 endpoints with a bearer token per membership. Only six integer levels (0–10), the garden name, the last check-in date and the visible flag are ever sent.

## Evaluation

`EVALUATION.md` has the scores, evidence and contrast checks for the poster-stage redesign.

## Research mode

Open `/settings?research=1` to switch it on. Check-ins and receipt views are logged locally; "Copy study log as CSV" copies them for the participant to send.
