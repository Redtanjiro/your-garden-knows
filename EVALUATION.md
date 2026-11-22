# Evaluation: poster stage redesign (branch `app-poster`)

Final loop, run after milestone 8. The Assessment 2 rubric wasn't in the project, so criteria 1 and 2 are the handoff's own.

## How it was checked

- `npm test`: 45 tests pass (engine, parsers, game, mural, walkthrough). `npm run build` passes.
- **Screens:** I viewed every changed route in the in-app browser at 1440 × 900 and 390 × 844. Playwright isn't installed in this project, so the screenshots weren't saved as files. Evidence below names the route and width.
- **Horizontal scroll:** a script visited 22 routes at 390 px and measured `scrollWidth`. All are 390 (the timeline step was 440; fixed).
- **Touch targets:** the same script found no control under 44 × 44 px, except visually hidden file inputs inside their 44 px drop zones and the 32 px avatar, which has a 44 px hit area.
- **Game parity:** I fingerprinted 22 computed properties on every element of `/play` (title, How to play steps 1 and 3, info screen) before and after the change. There were 0 differences across 224 elements.
- **Walkthrough is read-only:** I planted a real garden, snapshotted all IndexedDB stores, visited all 12 steps, swapped a receipt and played the timeline, then snapshotted again. The stores were identical.
- **Keyboard:** onboarding by keyboard; walkthrough ← → and Esc, with focus moving to the step heading; receipt Esc returns focus to the prop or row; public menu Esc returns to the Menu button.
- **Reduced motion:** a global `prefers-reduced-motion` rule turns off every animation and transition: mural easing, band fade-ups, prop pops, the receipt slide and the game. The timeline doesn't animate props under reduced motion. Checked in code; the browser pane can't emulate the media query.
- **Copy scan:** `grep -rniE "\b(fake|lie|lies|misinformation)\b|nothing leaves"` plus quoted "false" across `src/` finds no UI strings. The only hits are code booleans. The only `text-transform: uppercase` is the game's existing title.

## Contrast (WCAG ratio, 4.5:1 needed)

| Pair | Ratio |
| --- | --- |
| Ink on emerald | 9.0:1 |
| Ink on yellow | 15.3:1 |
| Ink on lavender | 10.0:1 |
| Ink on orange | 6.7:1 |
| Ink on mint | 16.7:1 |
| Paper on indigo | 5.7:1 |
| Paper on maroon | 9.3:1 |
| Muted on paper | 6.7:1 |
| Muted on mint | 5.8:1 |
| Grey #bdbdbd on obsidian | 11.2:1 |
| Error red on paper | 6.5:1 |
| Bubble sender / time on bubble | 5.9:1 / 6.2:1 |
| Disabled text on warm | 4.8:1 |

## Scores

| # | Criterion | Score | Evidence | Fixes made in the loop |
| --- | --- | --- | --- | --- |
| 1 | Responds to the brief | 88 | `/` at 1440 and 390: the hero line, the six measures and the privacy band say the problem and the response on the first scroll. Both experiments are live (`/`, `/play`) and band 6 frames them as two ways in. The walkthrough is 12 steps in about 2 minutes. | Added a "Walk through a sample" link to the example garden banner. |
| 2 | Critical, speculative stance | 87 | The humour stays in the prop names and the receipts. You-versus-you appears on the welcome page, in onboarding and on every receipt ("Normal · Maximum mess at"). The privacy band sits at the same level as the content. The street shows no numbers and is ordered by join date. | Street tile colours rotate by join order, never by tier. |
| 3 | Brief rules | 92 | The grep above. Exact privacy sentence in onboarding, Settings, the street consent panel and the welcome band. Every prop opens a receipt. Sentence case, and the eyebrows are gone (report story labels now sit at the bottom as ordinary text). | Removed the 🔒 "stay on this device" wording from Settings. |
| 4 | Poster-stage fidelity | 86 | Black top bar and stages, carved Inter Tight display, monochrome controls, 0 radius (except the WhatsApp bubble), no shadows, hairlines, mono figures, metric tiles, and a mural that follows real levels on the welcome page, the app strip, the reveal and walkthrough step 1. | The mural anchors to the ground (`xMidYMax`) so the 72 px strip shows grass, not empty sky. Tile icons are flat silhouettes. |
| 5 | Ease of use for first-timers | 86 | One filled primary per screen. Onboarding finished in 4 clicks plus the name at 1440. Welcome → walkthrough → play → example has no dead ends, and Exit or the last step leads on. | The walkthrough's last step offers "Plant my garden" and "Explore the example garden". |
| 6 | Accessibility | 85 | Keyboard pass above, visible 2 px focus everywhere (Paper on dark), `aria-current` in nav and walkthrough tabs, garden summaries kept, mural `aria-hidden`, all text pairs ≥ 4.5:1. Not done: a VoiceOver pass. | Avatar hit area raised to 44 px. The duplicate street-ring label was removed. |
| 7 | Craft at both sizes | 85 | No overflow at 390 on 22 routes. Content sits in the 1200 column with 48 / 32 / 20 px gutters. Checked: welcome bands, garden home, receipt, check-in, tidy-up, settings, street, the reveal and walkthrough steps 1, 8, 10, 11 and 12. | Receipts column widened to 520 px. The receipt and timeline steps were re-gridded and stack on phones. |
| 8 | Both experiments live and linked | 95 | `/play` is computed-style identical to before. The welcome page links to it (hero, top bar, band 6), and the game's "Grow your real garden" goes to `/`. `/tracker` redirects to `/`. | `/play` was being served by the standalone `play.html` (dev server, and GitHub Pages' extensionless lookup). It now routes into the app, and the standalone build ships as `play-standalone.html`. |

Every score is 85 or more.

## Recorded deviations

- **Filled primary on Paper:** the reference uses outlined buttons only. A filled Ink primary is kept so the main action stands out without colour (handoff 3.3).
- **Game parity rules:** the old tracker theme leaked three rules into the game: heading weights, a heading letter-spacing, and turning off the How to play spotlight's dimmed backdrop. They're kept, scoped to `.wf`, so the game is unchanged. Removing the `.wf .wf-spot` line would bring the dimmed backdrop back.
- **404 copy:** the copy to `404.html` already happens in `npm run build`, which the Pages workflow runs, so the workflow file didn't change.
- **Report story colours:** the engine's stories don't carry their metric. The report works out which metric grew or shrank most, using the same level comparison, without changing the engine.
- **Untested:** a VoiceOver pass, real phones, and the share PNG on a device.
