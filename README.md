# System Design Path — free interactive study edition

An independent, offline, interactive study edition of the public **Complete System Design Path** syllabus. It ships as **one self-contained HTML file** with no CDN, no server and no runtime network calls.

This is a personal study project. The public syllabus at [sys0.in/path](https://sys0.in/path) and [sys0.in/labs](https://sys0.in/labs) is used as a **topic map only**. Every lesson body, diagram, quiz, exercise, lab and widget in this edition is original writing. Locked lesson text is not reproduced, paraphrased line by line, or bypassed.

**Written so far: Modules 1–5 — 37 path units, 5 module overview pages, 37 quizzes.**

---

## 1. The idea

Most system design courses give you a list of topics and a pile of diagrams. This edition tries to do something narrower and more useful: take one small system — a clinic that keeps growing — and follow it through every decision until the reader can explain not just *what* to use, but *why*, *what it costs*, and *how it fails*.

The course is built around four ideas:

1. **One running system.** The same clinic, the same patients, the same budget, from Module 1 to Module 18. Numbers introduced in Module 2 are still the baseline in Module 5.
2. **Decisions, not definitions.** A lesson is finished when the reader can make a tradeoff and defend it, not when they can recite a term.
3. **Proof by load test.** Every major claim is followed by numbers: throughput, p99, CPU, cost. The reader sees where the knee is and which resource moved it.
4. **Offline and free.** One HTML file, readable on a train, hostable on any static site, with progress stored only in the browser.

The course is written module by module, in order. Later modules assume the vocabulary and numbers of earlier ones, so a gap-free prefix matters more than a fast backlog.

---

## 2. What is inside

| Track | Content | Canonical count |
|---|---|---:|
| **The Path** | Modules 1–18: foundations, scaling, databases, messaging, distributed systems | 137 path units |
| **Under the Hood** | Module 19: classic algorithms in action | 19 simulations |
| **System Labs** | 16 “design your own X” case studies | 16 system labs |
| **Reference** | Glossary and free external reading | 90 terms, 16 resources |

Each written module opens with a **module intro** page: why the module exists, what you will be able to do, what to know before starting, and how the units fit together.

The **course map** has two views: a readable list of every module and unit, and a visual progress map of module cards, unit chips and completion marks. The navigation sidebar collapses on desktop and becomes a slide-in drawer on narrow screens.

### Current status

- **Modules 1–5 are written** — 37 path units.
- Module 1: what system design is, the design process, requirements, tradeoffs, clinic lab.
- Module 2: requirements to requests, data modelling, indexes, API, database choice, reverse proxy, metrics, load test, clinic API lab.
- Module 3: caching — what and why, placement, read/write patterns, invalidation, eviction, failure modes, proof, clinic cache lab.
- Module 4: vertical and horizontal scaling, load balancers, stateless servers, connection pools, object storage, CDNs, two-server proof, second-server lab.
- Module 5: read replicas, replication lag, failover, backups and PITR, one-primary/two-replica proof, replica lab.
- **Next:** Module 6, then Modules 7–19 in order.

Every written unit has its own addressable page, even though the whole course is one file. The hash router gives each unit a URL such as `#/lesson/part-1-m05-l02`.

---

## 3. Quick start

Requirements: Node.js 20+ and npm.

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

The built file is `dist/system-design-course.html`, currently about **5.2 MB**. Open it directly from disk; it does not need a server or an internet connection.

### Hosting it

Upload `dist/system-design-course.html` to any static host. For a root URL, copy or rename it to `index.html` first. There is no runtime build step, database or API.

---

## 4. How the course is organised

```text
Track
└── Module            e.g. Module 5: When one database isn't enough
    ├── Module intro  why it exists, outcomes, prerequisites
    └── Units         5.1 Read replicas
                      5.2 Replication lag
                      5.3 When the primary dies
                      5.4 Backups and recovery
                      5.5 Proof: one primary, two replicas
                      5.6 Lab: Add read replicas to the clinic
```

Each unit is one Markdown file and one page. A unit may be a **lesson**, an **experiment** (a proof run with real numbers), or a **lab** (a decision with deliverables and a rubric).

### The clinic

The running example is a small clinic: Dr. Rao (doctor and owner), Meera (patient), Arjun (receptionist), and a growing set of locations, doctors and appointments. It is small enough to reason about and rich enough to expose real constraints: a $50 starting budget, a 51-query reception screen, a Monday rush that grows from 100 to 900 requests per second, and a database that saturates before the API.

### The shape of a page

Every lesson follows the same rhythm. Optional blocks may be dropped; the required ones may not.

| Order | Block | Purpose |
|---|---|---|
| 1 | Frontmatter | ID, title, summary, kind, minutes, tags |
| 2 | Mental model | One sentence to remember |
| 3 | Opening scene | A named person, a concrete moment, real stakes |
| 4 | Body | 3–6 sections: why it exists → how it works → what breaks |
| 5 | Mermaid diagram | A mechanism, not decoration |
| 6 | Worked example | Real numbers traced end to end |
| 7 | Widget | Only where a mechanism is easier to feel than to read |
| 8 | Failure mode | What goes wrong in production and how to fix it |
| 9 | Quiz | 3–5 application questions |
| 10 | Exercise | A concrete deliverable |
| 11 | Discussion | 2–3 open questions |
| 12 | Takeaways | 5–7 bullets, no new material |
| 13 | References | 3–4 free, authoritative links |

Labs replace the exercise with numbered deliverables and add a rubric. Experiments keep the exercise and report a reference run.

---

## 5. How the build works

The source is deliberately plain: Markdown, a small runtime, and a Node build script.

```text
content/**/*.md ──────────────┐
assets/app.js ────────────────┤
assets/styles.css ────────────┼── build/build.mjs ──► dist/system-design-course.html
assets/glossary.json ─────────┤                         (one self-contained file)
assets/resources.json ────────┤
outline/course.json ──────────┤
node_modules/mermaid/mermaid.min.js ─┘
```

1. `build/build.mjs` reads the canonical outline in `outline/course.json`.
2. It finds each Markdown file, parses frontmatter with `gray-matter`, and renders the body with `markdown-it`.
3. Custom blocks (`:::note`, `:::quiz`, `:::widget`, etc.) are converted into HTML by a fence-aware parser, so Markdown inside a block still works.
4. Mermaid fences are preserved as source; the Mermaid runtime is inlined into the HTML.
5. CSS, the SPA runtime, glossary, resources and course data are inlined too.
6. The result is written to `dist/system-design-course.html`.

At runtime, `assets/app.js` reads the embedded course object, renders the sidebar, routes hash URLs, runs quizzes, stores progress in `localStorage`, and mounts widgets. There is no framework and no external request.

### Why one file?

- It works offline and from a USB stick.
- There is no deployment drift between content and runtime.
- Search, progress and notes work without a backend.
- A single file is easy to archive and easy to host.

The tradeoff is size and build coupling: the Mermaid runtime and all lesson HTML live in one document. At 5 MB for five modules, the approach still works comfortably.

---

## 6. Adding content

### 6.1 Create the file

One file per unit:

```text
content/part-1-foundations/05-when-one-database-isnt-enough/02-replication-lag.md
```

The folder order and file prefix are for humans. The **frontmatter ID** is what binds the file to the canonical outline.

```yaml
---
id: part-1-m05-l02
title: Replication lag
summary: "Copies fall behind the primary. Why a customer can't find the order they just placed, and how to read your own writes."
kind: lesson
minutes: 12
tags: [databases, replication, consistency, latency]
---
```

Rules:

- `id` must exist in `outline/course.json` and must be unique.
- `kind` is `lesson`, `experiment`, `lab` or `intro`.
- The page header renders the title, so **do not start the body with an `# H1`**.
- Use `##`, `###` and `####` for the body outline.
- Quote any frontmatter string containing a colon.

### 6.2 Write the page

Use the page anatomy in section 4. The rulebook in `docs/content-rules.md` is the full authoring contract; `content-rules.json` holds the machine-enforced thresholds.

Minimum expectations:

- 800 words for a lesson or lab (the target is 1,400–1,800).
- One mental model, one Mermaid diagram, one quiz, one discussion.
- An `## Exercise` section for lessons and experiments.
- `## Rubric`, `## Discussion`, `## Key takeaways`, `## Free references` for labs.
- 3–5 quiz questions with explanations.
- HTTPS references that are real, free and stable.

### 6.3 Custom blocks

````markdown
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

:::widget replica-lag
:::
````

### 6.4 Widgets

Widgets are declared by hand. To add one:

1. Put `:::widget my-widget` in the lesson.
2. Add `if (name === 'my-widget') renderMyWidget(el);` to `renderWidgets` in `assets/app.js`.
3. Write `renderMyWidget(root)` and attach its event listeners.
4. Add styles to `assets/styles.css` only if existing classes do not fit.
5. Add the lesson-to-widget mapping in `build/validate.mjs`.
6. Add an interaction check in `build/test-interactions.mjs`.
7. Add the route to `build/smoke.mjs`.
8. Update the widget list in this README.

Available widgets:

```text
requirements-sorter   tradeoff-explorer     request-trace
index-lab             db-picker             tail-latency
cache-hit-rate        cache-placement       cache-patterns
cache-staleness       cache-eviction        cache-failure
cache-cliff           scale-vertical        scale-horizontal
lb-algorithms         session-affinity      pool-math
upload-path           cdn-offload           two-server-proof
replica-routing       replica-lag           failover-timeline
backup-restore        replica-proof         lab-checklist
```

Widgets must work with keyboard and pointer input, expose an `aria-live` verdict or metric, and store nothing except through the existing progress helpers.

### 6.5 Add a module

1. Mark the module and its units in `outline/course.json` if the outline changed. **Do not run `npm run outline`** unless you intend to regenerate the outline; it overwrites manual completion marks in `outline/course-map.md`.
2. Write `00-module-intro.md` with the three required sections: `## Why this module exists`, `## What you'll be able to do`, `## Before you start`.
3. Write every unit in order. A module is not available until every unit has a file.
4. Add the module's widgets and lab checklist items.
5. Add any new glossary terms to `assets/glossary.json`.
6. Update `build/validate.mjs`: expected IDs, module statuses, widget map, glossary count.
7. Update `build/test-interactions.mjs` and `build/smoke.mjs`.
8. Mark the units complete in `outline/course-map.md`.
9. Update the status in this README and the meta description in `build/build.mjs`.
10. Run `npm run check`, do a visual pass, rebuild, and commit `dist/`.

---

## 7. Commands

| Command | What it does |
|---|---|
| `npm run outline` | Re-parse the archived source outline into `outline/course.json` (destructive to manual status marks) |
| `npm run build` | Build `dist/system-design-course.html` |
| `npm run validate` | Check counts, IDs, quizzes, headings, links, offline guarantees and word limits |
| `npm test` | Run jsdom interaction tests against the built file |
| `npm run smoke` | Open every route in headless Chrome and check rendered DOM |
| `npm run check` | Build → validate → test → smoke |
| `npm start` | Build and serve at <http://localhost:4173/> |

---

## 8. Quality gates

The project uses three layers because they catch different failures:

1. **Validation** checks the shape of the course: 19 modules, 137 path units, expected IDs, one intro per written module, one quiz per unit, required headings, Mermaid blocks, internal links, glossary counts, HTTPS references, no external scripts, no CDN, no placeholder text.
2. **Interaction tests** run the real runtime in jsdom: routing, quiz answers, widget state, lab checklists, search, notes, progress export/import, reset, map view switching and the mobile navigation drawer.
3. **Smoke tests** open every route in headless Chrome and assert rendered text, widget markers, quiz counts and Mermaid SVG output.

Structural violations fail the build. Style issues — such as a page over 1,800 words — warn only. The thresholds live in `content-rules.json`; the reasoning lives in `docs/content-rules.md`.

Current reference state:

```text
37 written lessons
5 module intros
37 quizzes
1,997 validation checks
177 interaction checks
50 smoke routes
13 length warnings (Modules 2–4; no structural failures)
```

---

## 9. Progress, notes and privacy

- Progress, quiz scores, lab checklists and notes are stored in `localStorage` on the current browser.
- Keys: `sdpath.progress.v1`, `sdpath.theme.v1`, `sdpath.sidebar.v1` and `sdpath.mapview.v1`.
- The ⋯ menu exports and imports progress as JSON and resets it.
- Nothing is sent anywhere. The course makes no network requests at runtime.
- Search is local and runs against the embedded search index.

---

## 10. Project layout

```text
assets/                 Runtime CSS, app JS, glossary and reading list
build/
  parse-outline.mjs     Raw syllabus -> outline/course.json
  build.mjs             Markdown -> single self-contained HTML
  validate.mjs          Structural and content checks
  test-interactions.mjs jsdom test of quizzes, notes, search and progress
  smoke.mjs             Headless Chrome route and rendering test
  serve.mjs             Small local preview server
content/                One Markdown file per topic, grouped by part and module
docs/content-rules.md   Authoring contract and definition of done
content-rules.json      Machine-enforced thresholds
outline/course.json     Canonical 19-module / 137-unit data
outline/course-map.md   Human-readable map with completion marks
outline/source-notes.md Source discrepancies and content policy notes
reference/              Archived original outline and source notes
dist/                   Generated deliverable (committed)
```

---

## 11. Source and legal policy

- The public syllabus is a **topic map only**.
- Topic titles and summaries stay close to the public outline. Lesson bodies are original writing.
- No locked lesson text is reproduced, paraphrased line by line, or bypassed.
- No invented citations. Every reference must be real, free to read, and stable enough to keep working.
- When the source is ambiguous or contradictory, record it in `outline/source-notes.md` rather than guessing in a lesson.
- The course is not affiliated with or endorsed by the source site.

---

## 12. Status and roadmap

- **Done:** Modules 1–5, 37 path units, all widgets, glossary (90 terms), reading list (16 entries), offline single-file build, validation and test suite.
- **Next:** Module 6 — Live updates (polling, SSE, WebSockets, push, fan-out across servers).
- **Later:** Modules 7–18 in order, Module 19 algorithm simulations, and the 16 system-lab canvases.
- **Deferred:** sub-page splitting for any single unit that grows past a comfortable reading length. Every unit is already its own addressable page.

The build is intentionally boring: plain Markdown in, one HTML file out, with enough automated checks that adding Module 6 does not quietly break Module 2. If a future change cannot explain itself in a lesson, a test, or this README, it is probably not ready to ship.
