# System Design Path — free interactive study edition

An independent, offline, interactive study edition of the public **Complete System Design Path** syllabus. It is built as one self-contained HTML file with no CDN, no server, and no external runtime assets.

This is a personal study project. The public syllabus at [sys0.in/path](https://sys0.in/path) and [sys0.in/labs](https://sys0.in/labs) is used as a **topic map only**. Every lesson body, diagram, quiz, exercise and lab in this edition is original writing. Locked lesson text is not reproduced or bypassed.

## What is included

- **The Path** — 19 modules and 137 path units (lessons, labs and simulations).
- **Under the Hood** — Module 19 algorithm simulations.
- **System Labs** — 16 “design your own X” case studies.
- **Reference** — glossary and free external reading.
- Written so far: **Modules 1–4** (31 path units). Module 1 covers the foundations of design; Module 2 takes the clinic from requirements to requests, data models, indexes, an API, a database choice, a reverse proxy, metrics and a load test; Module 3 covers what to cache, where the copy lives, read/write patterns, invalidation, eviction, cache failure modes and a cache load test; Module 4 covers vertical and horizontal scaling, load balancers, stateless servers, connection pools, object storage, CDNs and a two-server proof.
- Next: **Module 5**, then the remaining modules in order.
- Every written module opens with a short overview page (why the module exists, what you'll be able to do, what to know before starting).

The course map, outline, quiz data, progress tracking, notes, search, dark mode and all interactivity work offline in a single HTML file.

## Quick start

```powershell
npm install
npm run build
Start-Process dist\system-design-course.html
```

Or serve it locally:

```powershell
npm start
```

Then open <http://localhost:4173/>.

## Project layout

```
assets/                 Runtime CSS, app JS, glossary and reading list
build/parse-outline.mjs Raw syllabus -> outline/course.json
build/build.mjs         Markdown -> single self-contained HTML
build/validate.mjs      Structural and content checks
build/test-interactions.mjs  jsdom test of quizzes, notes, search and progress
build/smoke.mjs         Headless Chrome route and rendering test
build/serve.mjs         Small local preview server
content/                One Markdown file per topic
outline/                Canonical course data and a human-readable map
reference/              Archived original outline and source notes
dist/                   Generated deliverable
```

## Commands

| Command | What it does |
|---|---|
| `npm run outline` | Re-parse `reference/original-outline.md` into `outline/course.json` |
| `npm run build` | Rebuild `dist/system-design-course.html` |
| `npm run validate` | Check counts, IDs, quizzes, links, offline guarantees |
| `npm test` | Run interaction tests against the built file with jsdom |
| `npm run smoke` | Open routes in headless Chrome and check rendered DOM |
| `npm run check` | Build, validate, test and smoke-test in one go |
| `npm start` | Build and serve at <http://localhost:4173/> |

## Writing a lesson

Create `content/<part>/<module>/<NN>-<slug>.md` with frontmatter that matches an outline ID:

```yaml
---
id: part-1-m01-l01
title: What system design means
summary: "One sentence shown under the title. Quote it if it contains a colon."
kind: lesson
minutes: 3
tags: [foundations, mental-model]
---
```

Conventions:

- The page header renders the lesson title, so the Markdown body must **not** start with an `# H1`.
- Use ` ## `, `### ` and `#### ` for the body outline.
- Use fenced ` ```mermaid ` blocks for diagrams.
- Use custom blocks for the interactive pieces.

### Custom blocks

```markdown
:::note
A short aside.
:::

:::warning
Something that bites in production.
:::

:::mental-model
The one sentence to remember.
:::

:::interview
How this appears in an interview.
:::

:::reality-check
Where the clean diagram meets real operations.
:::

:::checkpoint
A pause-and-check prompt.
:::

:::deep-dive Optional title
Collapsed longer explanation.
:::

:::discussion
- A question to think about.
- Another question.
:::

:::quiz
[
  {
    "question": "Question text?",
    "options": ["A", "B", "C"],
    "answer": 1,
    "explanation": "Why B is right."
  }
]
:::

:::widget requirements-sorter
:::
```

Available widgets: `requirements-sorter`, `tradeoff-explorer`, `request-trace`, `index-lab`, `db-picker`, `tail-latency`, `cache-hit-rate`, `cache-placement`, `cache-patterns`, `cache-staleness`, `cache-eviction`, `cache-failure`, `cache-cliff`, `scale-vertical`, `scale-horizontal`, `lb-algorithms`, `session-affinity`, `pool-math`, `upload-path`, `cdn-offload`, `two-server-proof`, `lab-checklist`.

Widget names are declared by hand in `assets/app.js`; adding a new one means adding a render function there.

## Progress and privacy

- Progress, quiz scores, lab checklists and notes are stored in `localStorage` on the current browser.
- Keys: `sdpath.progress.v1` and `sdpath.theme.v1`.
- The ⋯ menu exports and imports progress as JSON and resets it.
- Nothing is sent anywhere. The course makes no network requests at runtime.

## Status and source notes

See `outline/course-map.md` for the full map and `outline/source-notes.md` for source discrepancies and the content policy.

Current deliberately deferred pieces:

- Module 5 onward, in order.
- The OTP flood simulator (Module 8).
- Full system lab canvases.
- Sub-page splitting for a single unit that grows past a comfortable reading length. Every unit is already its own addressable page.

The authoring contract lives in `docs/content-rules.md`; machine-enforced thresholds live in `content-rules.json`. Structural violations fail `npm run check`; style issues (such as a page over 1,800 words) warn only.
