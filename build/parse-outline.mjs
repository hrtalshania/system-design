import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RAW_PATH = path.join(ROOT, 'reference', 'original-outline.md');
const OUTLINE_DIR = path.join(ROOT, 'outline');

const raw = fs.readFileSync(RAW_PATH, 'utf8').replace(/\r\n/g, '\n');
const lines = raw.split('\n').map((line) => line.trim());

let cursor = 0;

function peek() {
  let i = cursor;
  while (i < lines.length && lines[i] === '') i += 1;
  return i < lines.length ? lines[i] : null;
}

function take() {
  while (cursor < lines.length && lines[cursor] === '') cursor += 1;
  if (cursor >= lines.length) return null;
  return lines[cursor++];
}

function isType(line) {
  return line === 'Read' || line === 'Lab' || line === 'Simulate';
}

function isStatus(line) {
  if (!line) return false;
  return /free lesson/i.test(line) || /coming/i.test(line) || /rest coming/i.test(line);
}

function kindFor(title, type) {
  if (/^proof:/i.test(title)) return 'experiment';
  if (type === 'Lab') return 'lab';
  if (type === 'Simulate') return 'simulation';
  return 'lesson';
}

function minutesFor(line) {
  const match = line && line.match(/^(\d+)m$/);
  return match ? Number(match[1]) : 0;
}

function cleanTitle(title) {
  return title.replace(/Free$/, '').trim();
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const parts = [];
let currentPart = null;
let currentModule = null;
let inPath = true;

while (cursor < lines.length) {
  const line = peek();
  if (line === null) break;

  if (line.startsWith('Part ')) {
    const match = line.match(/^Part\s+(\d+)\s*·\s*(.+)$/);
    if (match) {
      currentPart = {
        id: `part-${match[1]}`,
        number: Number(match[1]),
        title: match[2].trim(),
        modules: [],
      };
      parts.push(currentPart);
      currentModule = null;
    }
    take();
    continue;
  }

  if (line === 'Design the apps you use every day.') {
    inPath = false;
    break;
  }

  if (!inPath) break;

  // Module number: exactly two digits.
  if (/^\d{2}$/.test(line)) {
    const moduleNumber = Number(line);
    take();
    const title = take();
    if (!title) break;

    let sourceStatus = '';
    let summary = '';
    const maybeStatus = take();

    if (isStatus(maybeStatus)) {
      sourceStatus = maybeStatus;
      summary = take() || '';
    } else {
      summary = maybeStatus || '';
    }

    currentModule = {
      id: `m${String(moduleNumber).padStart(2, '0')}`,
      number: moduleNumber,
      title,
      summary,
      sourceStatus,
      status: 'planned',
      lessons: [],
    };

    if (!currentPart) {
      currentPart = {
        id: 'part-1',
        number: 1,
        title: 'Foundations',
        modules: [],
      };
      parts.push(currentPart);
    }

    currentPart.modules.push(currentModule);
    continue;
  }

  // Lesson number: e.g. 1.1, 12.10.
  if (currentModule && /^\d+\.\d+$/.test(line)) {
    const lessonNumber = take();
    const title = cleanTitle(take() || 'Untitled lesson');

    let summary = '';
    let type = 'Read';
    const next = take();

    if (isType(next)) {
      type = next;
    } else {
      summary = next || '';
      const typeLine = take();
      if (isType(typeLine)) {
        type = typeLine;
      } else if (typeLine && /^(\d+)m$/.test(typeLine)) {
        // Defensive fallback: no explicit type, only duration.
        type = 'Read';
        const kind = kindFor(title, type);
        const id = `${currentPart.id}-${currentModule.id}-l${String(currentModule.lessons.length + 1).padStart(2, '0')}`;
        currentModule.lessons.push({
          id,
          number: lessonNumber,
          title,
          summary,
          type,
          kind,
          minutes: minutesFor(typeLine),
          status: 'planned',
          contentPath: null,
        });
        continue;
      }
    }

    const durationLine = take();
    const kind = kindFor(title, type);
    const id = `${currentPart.id}-${currentModule.id}-l${String(currentModule.lessons.length + 1).padStart(2, '0')}`;

    currentModule.lessons.push({
      id,
      number: lessonNumber,
      title,
      summary,
      type,
      kind,
      minutes: minutesFor(durationLine),
      status: 'planned',
      contentPath: null,
    });
    continue;
  }

  // Unknown line in path mode. Skip it.
  cursor += 1;
}

// ---- System labs ----
const systemLabs = [];
while (cursor < lines.length) {
  const line = peek();
  if (line === null) break;
  if (/^Each system is modelled/i.test(line)) break;
  if (!line) {
    cursor += 1;
    continue;
  }

  // Availability is Free or Soon.
  if (line !== 'Free' && line !== 'Soon') {
    cursor += 1;
    continue;
  }

  const availability = take();
  if (peek() === '→') take();
  const title = take();
  if (!title) break;
  const category = take() || '';
  const summary = take() || '';
  const difficulty = take() || '';
  let steps = '';
  const maybeSteps = peek();
  if (maybeSteps && /^\d+\s+steps/.test(maybeSteps)) {
    steps = take();
  }

  systemLabs.push({
    id: `lab-${slug(title.replace(/^Design (your own|a)\s+/i, ''))}`,
    title,
    category,
    summary,
    difficulty,
    availability,
    steps,
    status: availability === 'Free' ? 'free' : 'planned',
  });
}

// ---- Counts ----
const modules = parts.flatMap((part) => part.modules);
const pathUnits = modules.reduce((total, module) => total + module.lessons.length, 0);
const labs = modules.reduce(
  (total, module) => total + module.lessons.filter((lesson) => lesson.kind === 'lab').length,
  0,
);
const simulations = modules.reduce(
  (total, module) => total + module.lessons.filter((lesson) => lesson.kind === 'simulation').length,
  0,
);

const course = {
  meta: {
    title: 'The Complete System Design Path — Free Interactive Edition',
    subtitle: 'An independent, offline study edition inspired by the public sys0 syllabus.',
    source: 'https://sys0.in/path',
    sourceLabs: 'https://sys0.in/labs',
    generatedAt: new Date().toISOString(),
    counts: {
      parts: parts.length,
      modules: modules.length,
      pathUnits,
      labs,
      simulations,
      systemLabs: systemLabs.length,
    },
  },
  parts,
  systemLabs,
};

fs.mkdirSync(OUTLINE_DIR, { recursive: true });
fs.writeFileSync(path.join(OUTLINE_DIR, 'course.json'), `${JSON.stringify(course, null, 2)}\n`);

// ---- Human-readable course map ----
const mapLines = [];
mapLines.push('# Course map');
mapLines.push('');
mapLines.push(
  `> ${modules.length} modules · ${pathUnits} path units · ${labs} labs · ${simulations} simulations · ${systemLabs.length} system labs`,
);
mapLines.push('');

for (const part of parts) {
  mapLines.push(`## Part ${part.number} · ${part.title}`);
  mapLines.push('');
  for (const module of part.modules) {
    mapLines.push(
      `### ${String(module.number).padStart(2, '0')} · ${module.title}`,
    );
    mapLines.push('');
    if (module.summary) {
      mapLines.push(`> ${module.summary}`);
      mapLines.push('');
    }
    for (const lesson of module.lessons) {
      const kind = lesson.kind === 'lab' ? ' · Lab' : lesson.kind === 'simulation' ? ' · Simulation' : '';
      mapLines.push(`- [ ] **${lesson.number}** ${lesson.title}${kind} · ${lesson.minutes}m`);
    }
    mapLines.push('');
  }
}

mapLines.push('## System labs');
mapLines.push('');
for (const lab of systemLabs) {
  mapLines.push(`- [ ] **${lab.title}** · ${lab.category} · ${lab.difficulty}${lab.steps ? ` · ${lab.steps}` : ''}`);
}
mapLines.push('');

fs.writeFileSync(path.join(OUTLINE_DIR, 'course-map.md'), `${mapLines.join('\n')}\n`);

const sourceNotes = `# Source notes

Source pages:
- ${course.meta.source}
- ${course.meta.sourceLabs}

## Verified public metadata

- ${modules.length} modules
- ${pathUnits} path units
- ${labs} labs
- ${simulations} simulations
- ${systemLabs.length} system labs

## Source discrepancies

- The Markdown file contains a second copy of Module 8 at the bottom. It is merged into the canonical Module 8 and ignored by the parser.
- The Markdown file adds the source URL at the bottom. It is recorded here, not rendered as lesson content.
- The live site labels lessons 1.1 and 1.2 as free, but their pages currently redirect to a login screen. This edition does not bypass that.
- The live site labels the Bitly and Udemy-like database system labs as free, but their pages also redirect to a login screen.
- The site's "Coming ..." dates are stale relative to the build date. This edition drops those dates and uses its own draft/available statuses.

## Content policy

All lesson bodies, diagrams, quizzes, and exercises in this edition are original. The public syllabus is used only as a topic map. No locked lesson text is reproduced.
`;

fs.writeFileSync(path.join(OUTLINE_DIR, 'source-notes.md'), sourceNotes);

console.log(
  `Parsed ${modules.length} modules, ${pathUnits} path units, ${labs} labs, ${simulations} simulations, ${systemLabs.length} system labs.`,
);
console.log(`Wrote outline/course.json, outline/course-map.md, outline/source-notes.md`);
