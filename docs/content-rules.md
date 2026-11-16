# Content rules

This is the authoring contract for **System Design Path — free interactive edition**. It exists so every module is written to the same standard: deep enough to teach, short enough to finish, and consistent enough that a reader never has to relearn how the course works.

Read this before writing a unit. Check it before marking a module available.

The rulebook is internal. Learners see the short “How to use this course” note on the home page, not this document.

---

## 1. Mission and audience

- One independent, free, offline study edition. No login, no paywall, no network calls at runtime.
- The reader can write code but has never designed a system that survives real traffic.
- Success is not “can name the tool.” Success is “can explain the decision, the tradeoff, and the failure mode.”
- The running example is a small clinic that grows. It gives every module a shared memory: same people, same data, same constraints.

## 2. Source and legal policy

- The public syllabus is a **topic map only**.
- Topic titles and summaries stay close to the public outline. Lesson bodies are original writing.
- No locked lesson text is reproduced, paraphrased line by line, or bypassed.
- No invented citations. Every reference must be real, free to read, and stable enough to keep working.
- When the source is ambiguous or contradictory, record it in `outline/source-notes.md` rather than guessing in a lesson.

## 3. Build order

- Modules are written **strictly in order**, 1 → 19.
- A module may not be marked available until every unit in it is written.
- No skipping ahead to a more interesting module. Later modules assume earlier vocabulary and numbers.
- Written modules must form a gap-free prefix: if Module 5 is written, Modules 1–4 are written too.

## 4. Page anatomy

Every lesson, experiment and lab uses this shape. Optional blocks may be dropped; required blocks may not.

| Order | Block | Rule |
|---|---|---|
| 1 | Frontmatter | `id` matches the outline exactly; `title`, `summary`, `kind`, `minutes`, `tags` present |
| 2 | Mental model | Exactly one `:::mental-model`, one sentence, the thing to remember |
| 3 | Opening scene | A named person, a concrete moment, real stakes. No definition-first openings. |
| 4 | Body | 3–6 sections. Each explains **why it exists → how it works → what breaks**. |
| 5 | Diagram | At least one Mermaid diagram that teaches a mechanism. Not decoration. |
| 6 | Worked example | Real numbers, traced end to end, with the result stated plainly |
| 7 | Widget | Only where a mechanism is easier to feel than to read |
| 8 | Failure mode | What goes wrong in production, and the fix |
| 9 | Quiz | 3–5 questions, application not recall |
| 10 | Exercise | A concrete deliverable, not “think about it” |
| 11 | Discussion | 2–3 open questions with no single answer |
| 12 | Takeaways | 5–7 bullets, no new material |
| 13 | References | 3–4 free, authoritative links |

A lab may replace the exercise with numbered deliverables, but it must still end with a rubric, a discussion, takeaways and references.

## 5. Depth test

Every major concept must answer all six questions:

1. What is it, in plain words?
2. Why does it exist — what pain does it remove?
3. How does it work, step by step?
4. What does it look like with real numbers?
5. What breaks when it fails?
6. When should you **not** use it?

A section that only defines a term is not finished. A section that lists five tools without saying what each one gives up is not finished either.

## 6. Language and voice

- Short sentences. Second person. Active voice.
- Define a term on first use, then use that term consistently.
- Prose first. Tables for comparison. Bullets for genuine lists. Never a page of bullets.
- Ban filler: “simply”, “obviously”, “in today’s fast-paced world”, “game changer”, “at the end of the day”.
- Use absolute words (“always”, “never”) only when they are literally true.
- Distinguish **must**, **usually**, and **depends**. Most design answers are “depends”, and the lesson must say what they depend on.
- Prefer concrete nouns and numbers to abstractions: “18 rows instead of 40,000”, not “much faster”.

## 7. Examples

- Keep the clinic cast consistent: Dr. Rao (doctor and owner), Meera (patient), Arjun (receptionist).
- Add one outside analogue per lesson: food delivery, banking, chat, railway booking, DNS, a library, a supermarket queue.
- Numbers must be plausible and consistent with earlier modules. If a reference run changes a figure, say so.
- Show user impact, not only server metrics: “Meera lost the slot”, not “p99 rose”.
- Label measured results as reference runs on named hardware. Never present them as guarantees.

## 8. Length and splitting

- Target **900–1,800 words** for a 10–15 minute lesson.
- Hard ceiling: **2,400 words**. Labs may reach 2,600 because they contain deliverables.
- Over the target: move optional depth into `:::deep-dive` first. If the core path is still too long, split the unit into part 1 and part 2 pages.
- One unit is one addressable page. Sub-pages are earned, not assumed.
- A page that needs more than seven screens of scrolling is a candidate for splitting.

## 9. Interactive rules

- A widget must demonstrate a mechanism the prose cannot show as well.
- No decorative widgets, no external data, no network calls, no randomness that changes the lesson between visits.
- Keyboard accessible. Every control has a label. Changing verdicts use `aria-live="polite"`.
- Numbers shown by a widget must be explained in the surrounding prose. The widget is evidence, not the lesson.
- Every widget gets an interaction test and a smoke-route check.
- Lab checklists are per lesson, never shared.

## 10. Quiz rules

- 3–5 questions per unit.
- At least two questions are scenario or application questions, not definition recall.
- Distractors come from real misconceptions, not random wrong words.
- Every explanation says why the right answer is right **and** why the tempting wrong answer is wrong.
- No “all of the above”, no trick wording, no answer-index errors.
- Questions must be answerable from the lesson, not from outside trivia.

## 11. Module introduction pages

Every module opens with one introduction page, not a lesson.

- File: `content/<part>/<module>/00-module-intro.md`
- ID: `<module-id>-intro` (for example `part-1-m03-intro`)
- Kind: `intro`
- Length: 180–700 words. No quiz, no exercise, no new concepts.
- Required sections: **Why this module exists**, **What you'll be able to do**, **Before you start**.
- The lesson list and time budget are generated by the app, not written by hand.
- The page ends with a **Start the module** button that opens the first unit.

## 12. Definition of done

### Per unit

- [ ] Frontmatter matches the outline: id, title, kind, minutes
- [ ] Mental model, opening scene, diagram, worked example, failure mode
- [ ] Quiz with 3–5 questions, exercise or deliverables, discussion, takeaways, references
- [ ] Word count inside bounds
- [ ] No external runtime assets, no network calls
- [ ] New terms added to `assets/glossary.json`
- [ ] Build, validation, interaction and smoke checks pass
- [ ] Desktop and 390 px visual check
- [ ] Callback to the previous module where continuity helps

### Per module

- [ ] Introduction page written
- [ ] Every unit written, in order
- [ ] Module status flips to available automatically
- [ ] Course map and README updated
- [ ] One cross-module continuity pass
- [ ] Full `npm run check` green
- [ ] Light, dark and mobile visual pass
- [ ] Deferral list stated

## 13. Review checklist

Use this when reviewing a module, whether it is your own or someone else's.

| Area | What to look for |
|---|---|
| Accuracy | A claim that is wrong, outdated, or overstated |
| Depth | A section that defines but does not explain why, how, or what breaks |
| Examples | Abstract explanation with no named system and no numbers |
| Length | A page that feels like two lessons stapled together |
| Diagrams | A diagram that could be deleted without losing meaning |
| Quizzes | A question answerable by matching a word instead of reasoning |
| Widgets | A widget that looks interactive but teaches nothing |
| Wording | Jargon used before definition; filler; inconsistent terms |
| Continuity | Clinic facts or numbers that contradict an earlier module |
| Mobile | Tables, code blocks or widgets that break at 390 px |

## 14. How the build enforces this

- `content-rules.json` holds the machine-readable thresholds.
- `build/validate.mjs` fails on structural violations: missing required blocks, body H1, quiz bounds, broken internal links, module gaps, intro mismatches.
- Style issues are warnings, not failures: overlong pages, filler phrases, long paragraphs.
- `build/test-interactions.mjs` must cover every widget.
- `build/smoke.mjs` must open every written unit and every module intro.

When a rule is wrong, change the rulebook first, then the check, then the content. Never let the check disagree with the document.
