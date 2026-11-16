import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist', 'system-design-course.html');
const CONTENT_DIR = path.join(ROOT, 'content');
const RULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'content-rules.json'), 'utf8'));
const sourceFiles = fs.existsSync(CONTENT_DIR)
  ? fs.readdirSync(CONTENT_DIR, { recursive: true }).filter((file) => String(file).endsWith('.md'))
  : [];

const problems = [];
const warnings = [];
const passed = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed.push(name);
  } else {
    problems.push(detail ? `${name}: ${detail}` : name);
  }
}

function warn(name, detail = '') {
  warnings.push(detail ? `${name}: ${detail}` : name);
}

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

check('dist file exists', fs.existsSync(DIST), DIST);
if (!fs.existsSync(DIST)) {
  report();
}

const html = fs.readFileSync(DIST, 'utf8');
const courseMatch = html.match(/<script>window\.COURSE = ([\s\S]*?);<\/script>/);
check('course data is embedded', Boolean(courseMatch));

if (!courseMatch) {
  report();
}

const course = JSON.parse(courseMatch[1]);
const parts = course.parts || [];
const modules = parts.flatMap((part) => part.modules || []);
const lessons = modules.flatMap((module) => module.lessons || []);
const lessonIds = new Set(lessons.map((lesson) => lesson.id));
const labIds = new Set((course.systemLabs || []).map((lab) => lab.id));
const written = lessons.filter((lesson) => lesson.hasContent);

// ---------- Canonical outline ----------

const counts = course.meta?.counts || {};
check('19 modules', counts.modules === 19 && modules.length === 19, `meta=${counts.modules} actual=${modules.length}`);
check('137 path units', counts.pathUnits === 137 && lessons.length === 137, `meta=${counts.pathUnits} actual=${lessons.length}`);
check('18 labs', counts.labs === 18, `meta=${counts.labs}`);
check('19 simulations', counts.simulations === 19, `meta=${counts.simulations}`);
check('16 system labs', counts.systemLabs === 16 && (course.systemLabs || []).length === 16, `meta=${counts.systemLabs}`);
check('3 parts', parts.length === 3, `actual=${parts.length}`);
check('module numbers are 1..19', modules.every((module, index) => module.number === index + 1));

const lessonIdPattern = /^part-\d+-m\d{2}-l\d{2}$/;
check('lesson ids follow part-N-mNN-lNN', lessons.every((lesson) => lessonIdPattern.test(lesson.id)));
check('lesson ids are unique', lessonIds.size === lessons.length, `${lessons.length - lessonIds.size} duplicate(s)`);

const numbers = lessons.map((lesson) => lesson.number);
check('lesson numbers are unique', new Set(numbers).size === numbers.length);
check('every lesson has a title', lessons.every((lesson) => typeof lesson.title === 'string' && lesson.title.trim()));
check('every lesson has a summary', lessons.every((lesson) => typeof lesson.summary === 'string' && lesson.summary.trim()));
check(
  'every lesson has a positive duration',
  lessons.every((lesson) => Number.isInteger(lesson.minutes) && lesson.minutes > 0),
);

const labUnits = lessons.filter((lesson) => lesson.kind === 'lab');
const simUnits = lessons.filter((lesson) => lesson.kind === 'simulation');
check('18 lab units', labUnits.length === 18, `actual=${labUnits.length}`);
check('19 simulation units', simUnits.length === 19, `actual=${simUnits.length}`);

// ---------- Written content ----------

const introModules = modules.filter((module) => module.hasIntro);
const sourceLessonFiles = sourceFiles.filter((file) => !String(file).includes('module-intro'));
const sourceIntroFiles = sourceFiles.filter((file) => String(file).includes('module-intro'));

check('written lessons match lesson files', written.length === sourceLessonFiles.length, `written=${written.length} files=${sourceLessonFiles.length}`);
check('module intros match intro files', introModules.length === sourceIntroFiles.length, `intros=${introModules.length} files=${sourceIntroFiles.length}`);
const expectedIds = [
  'part-1-m01-l01',
  'part-1-m01-l02',
  'part-1-m01-l03',
  'part-1-m01-l04',
  'part-1-m01-l05',
  'part-1-m02-l01',
  'part-1-m02-l02',
  'part-1-m02-l03',
  'part-1-m02-l04',
  'part-1-m02-l05',
  'part-1-m02-l06',
  'part-1-m02-l07',
  'part-1-m02-l08',
  'part-1-m02-l09',
  'part-1-m03-l01',
  'part-1-m03-l02',
  'part-1-m03-l03',
  'part-1-m03-l04',
  'part-1-m03-l05',
  'part-1-m03-l06',
  'part-1-m03-l07',
  'part-1-m03-l08',
  'part-1-m04-l01',
  'part-1-m04-l02',
  'part-1-m04-l03',
  'part-1-m04-l04',
  'part-1-m04-l05',
  'part-1-m04-l06',
  'part-1-m04-l07',
  'part-1-m04-l08',
  'part-1-m04-l09',
];
check('Modules 1–4 are written', expectedIds.every((id) => written.some((lesson) => lesson.id === id)));

for (const lesson of written) {
  const rules = lesson.kind === 'lab' ? RULES.lab : RULES.lesson;
  const words = wordCount(lesson.searchText);
  check(`${lesson.id}: html is substantial`, typeof lesson.html === 'string' && lesson.html.length > 4000, `length=${lesson.html?.length || 0}`);
  check(`${lesson.id}: has at least one h2`, /<h2[ >]/.test(lesson.html));
  check(`${lesson.id}: body has no duplicate h1`, !/<h1[ >]/.test(lesson.html));
  check(`${lesson.id}: has a Mermaid diagram`, lesson.html.includes('class="mermaid"'));
  check(`${lesson.id}: has a quiz`, lesson.html.includes('class="quiz-block"'));
  check(`${lesson.id}: quizCount >= 1`, lesson.quizCount >= 1, `actual=${lesson.quizCount}`);
  check(`${lesson.id}: searchText is useful`, typeof lesson.searchText === 'string' && lesson.searchText.length > 400, `length=${lesson.searchText?.length || 0}`);
  check(`${lesson.id}: no [object Object]`, !lesson.html.includes('[object Object]'));
  check(`${lesson.id}: no undefined`, !lesson.html.includes('undefined'));
  check(`${lesson.id}: no placeholder text`, !/lorem ipsum|TODO|TBD/i.test(lesson.html));

  for (const marker of rules.requiredMarkers) {
    check(`${lesson.id}: has ${marker}`, lesson.html.includes(marker));
  }
  for (const heading of rules.requiredHeadings) {
    check(`${lesson.id}: has #${heading}`, lesson.html.includes(`id="${heading}"`));
  }
  if (lesson.kind !== 'lab') {
    check(`${lesson.id}: has an exercise section`, /id="exercise/.test(lesson.html));
  }
  for (const marker of rules.forbiddenMarkers) {
    check(`${lesson.id}: does not contain “${marker}”`, !lesson.html.toLowerCase().includes(marker.toLowerCase()));
  }
  check(
    `${lesson.id}: word count is ${rules.minWords}–${rules.maxWords}`,
    words >= rules.minWords && words <= rules.maxWords,
    `words=${words}`,
  );
  if (words > rules.warnWords) {
    warn(`${lesson.id}: long page`, `${words} words (warn above ${rules.warnWords})`);
  }
  for (const phrase of RULES.warnings?.phrases || []) {
    if (new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(lesson.searchText)) {
      warn(`${lesson.id}: filler phrase “${phrase}”`);
    }
  }
}

check('module 1 is available', modules[0].status === 'available', `status=${modules[0].status}`);
check('module 2 is available', modules[1].status === 'available', `status=${modules[1].status}`);
check('module 3 is available', modules[2].status === 'available', `status=${modules[2].status}`);
check('module 4 is available', modules[3].status === 'available', `status=${modules[3].status}`);
check('modules 5–19 are planned', modules.slice(4).every((module) => module.status === 'planned'));
check('part 1 is in progress', parts[0].status === 'in-progress', `status=${parts[0].status}`);

const writtenModuleNumbers = modules.filter((module) => module.writtenCount > 0).map((module) => module.number);
check(
  'written modules form a gap-free prefix',
  writtenModuleNumbers.every((number, index) => number === index + 1),
  writtenModuleNumbers.join(','),
);
check(
  'every written module has an intro',
  modules.filter((module) => module.writtenCount > 0).every((module) => module.hasIntro),
  modules.filter((module) => module.writtenCount > 0 && !module.hasIntro).map((module) => module.number).join(','),
);

// ---------- Module intros ----------

for (const module of introModules) {
  const intro = module.intro;
  const words = wordCount(intro.searchText);
  const rules = RULES.moduleIntro;
  check(`${intro.id}: id matches its module`, /^part-\d+-m\d{2}-intro$/.test(intro.id) && intro.id.endsWith(`-${module.id}-intro`), intro.id);
  check(`${intro.id}: html is substantial`, typeof intro.html === 'string' && intro.html.length > 400, `length=${intro.html?.length || 0}`);
  check(`${intro.id}: body has no duplicate h1`, !/<h1[ >]/.test(intro.html));
  check(`${intro.id}: has no quiz`, !intro.html.includes('quiz-block'));
  check(`${intro.id}: no [object Object]`, !intro.html.includes('[object Object]'));
  check(`${intro.id}: no undefined`, !intro.html.includes('undefined'));
  for (const heading of rules.requiredHeadings) {
    check(`${intro.id}: has #${heading}`, intro.html.includes(`id="${heading}"`));
  }
  check(
    `${intro.id}: word count is ${rules.minWords}–${rules.maxWords}`,
    words >= rules.minWords && words <= rules.maxWords,
    `words=${words}`,
  );
  if (words > rules.warnWords) {
    warn(`${intro.id}: long intro`, `${words} words (warn above ${rules.warnWords})`);
  }
}

// Every written module must ship its interactive pieces, not just prose.
const moduleWidgets = {
  'part-1-m01-l03': 'requirements-sorter',
  'part-1-m01-l04': 'tradeoff-explorer',
  'part-1-m01-l05': 'lab-checklist',
  'part-1-m02-l01': 'request-trace',
  'part-1-m02-l03': 'index-lab',
  'part-1-m02-l05': 'db-picker',
  'part-1-m02-l07': 'tail-latency',
  'part-1-m02-l09': 'lab-checklist',
  'part-1-m03-l01': 'cache-hit-rate',
  'part-1-m03-l02': 'cache-placement',
  'part-1-m03-l03': 'cache-patterns',
  'part-1-m03-l04': 'cache-staleness',
  'part-1-m03-l05': 'cache-eviction',
  'part-1-m03-l06': 'cache-failure',
  'part-1-m03-l07': 'cache-cliff',
  'part-1-m03-l08': 'lab-checklist',
  'part-1-m04-l01': 'scale-vertical',
  'part-1-m04-l02': 'scale-horizontal',
  'part-1-m04-l03': 'lb-algorithms',
  'part-1-m04-l04': 'session-affinity',
  'part-1-m04-l05': 'pool-math',
  'part-1-m04-l06': 'upload-path',
  'part-1-m04-l07': 'cdn-offload',
  'part-1-m04-l08': 'two-server-proof',
  'part-1-m04-l09': 'lab-checklist',
};
for (const [lessonId, widget] of Object.entries(moduleWidgets)) {
  const lesson = written.find((item) => item.id === lessonId);
  check(`${lessonId}: has the ${widget} widget`, Boolean(lesson?.html.includes(`data-widget="${widget}"`)));
}
check('no literal :::widget markers in rendered lessons', !written.some((lesson) => lesson.html.includes(':::widget')));
check('no literal :::quiz markers in rendered lessons', !written.some((lesson) => lesson.html.includes(':::quiz')));

// ---------- Quizzes ----------

const quizzes = course.quizzes || {};
const quizIds = Object.keys(quizzes);
check('one quiz block per written lesson', quizIds.length === written.length, `quizzes=${quizIds.length} lessons=${written.length}`);

let questionCount = 0;
const seenQuestions = new Map();
for (const [quizId, questions] of Object.entries(quizzes)) {
  const lessonId = quizId.replace(/-q\d+$/, '');
  check(`${quizId}: belongs to a written lesson`, lessonIds.has(lessonId), `lesson=${lessonId}`);
  check(`${quizId}: is a non-empty array`, Array.isArray(questions) && questions.length > 0);
  if (!Array.isArray(questions)) continue;

  for (const [index, question] of questions.entries()) {
    questionCount += 1;
    const label = `${quizId} q${index + 1}`;
    check(`${label}: has question text`, typeof question.question === 'string' && question.question.trim().length > 10);
    check(`${label}: has 2+ options`, Array.isArray(question.options) && question.options.length >= 2);
    check(
      `${label}: answer index is valid`,
      Number.isInteger(question.answer) && question.answer >= 0 && question.answer < (question.options?.length || 0),
      `answer=${question.answer} options=${question.options?.length}`,
    );
    check(`${label}: has an explanation`, typeof question.explanation === 'string' && question.explanation.trim().length > 20);
    check(
      `${label}: options are unique`,
      Array.isArray(question.options) && new Set(question.options).size === question.options.length,
    );
    const key = String(question.question || '').trim().toLowerCase();
    check(`${label}: question is unique across the course`, !seenQuestions.has(key), seenQuestions.get(key));
    if (!seenQuestions.has(key)) seenQuestions.set(key, label);
  }
}

for (const lesson of written) {
  const rules = lesson.kind === 'lab' ? RULES.lab : RULES.lesson;
  const ids = quizIds.filter((id) => id.startsWith(`${lesson.id}-q`));
  const lessonQuestions = ids.reduce((sum, id) => sum + (quizzes[id]?.length || 0), 0);
  check(`${lesson.id}: has exactly one quiz block`, ids.length === 1, `actual=${ids.length}`);
  check(
    `${lesson.id}: quiz has ${rules.minQuizQuestions}–${rules.maxQuizQuestions} questions`,
    lessonQuestions >= rules.minQuizQuestions && lessonQuestions <= rules.maxQuizQuestions,
    `actual=${lessonQuestions}`,
  );
}

check('quiz question total is plausible', questionCount >= written.length * 3, `questions=${questionCount} lessons=${written.length}`);

const htmlQuizIds = [...html.matchAll(/class="quiz-block" data-quiz-id="([^"]+)"/g)].map((match) => match[1]);
check('every rendered quiz block resolves to quiz data', htmlQuizIds.every((id) => quizIds.includes(id)), htmlQuizIds.filter((id) => !quizIds.includes(id)).join(', '));

// ---------- Search ----------

const search = course.search || [];
check('search index covers every lesson and intro', search.length === lessons.length + introModules.length, `search=${search.length} lessons=${lessons.length} intros=${introModules.length}`);
check(
  'written lessons have search text',
  written.every((lesson) => {
    const item = search.find((entry) => entry.id === lesson.id);
    return item && item.hasContent && item.text.length > 400;
  }),
);
check(
  'module intros have search text',
  introModules.every((module) => {
    const item = search.find((entry) => entry.id === module.intro.id);
    return item && item.hasContent && item.text.length > 150 && /^#\/module\/part-\d+-m\d{2}$/.test(item.route);
  }),
);
check('search entries have titles', search.every((item) => item.title && item.number));

// ---------- Glossary and resources ----------

check('glossary has 82 terms', (course.glossary || []).length === 82, `actual=${(course.glossary || []).length}`);
check('every glossary term has a definition', (course.glossary || []).every((item) => item.term && item.definition));
check('resources has 16 entries', (course.resources || []).length === 16, `actual=${(course.resources || []).length}`);
check('every resource has an https URL', (course.resources || []).every((item) => /^https:\/\//.test(item.url)));

// ---------- Internal links ----------

const validStaticRoutes = new Set(['home', 'map', 'glossary', 'resources']);
const moduleIds = new Set();
for (const part of parts) {
  for (const module of part.modules || []) {
    moduleIds.add(`part-${part.number}-${module.id}`);
  }
}
const badLinks = [];
const externalLinks = [];

const pagesToScan = [
  ...written.map((lesson) => ({ id: lesson.id, html: lesson.html })),
  ...introModules.map((module) => ({ id: module.intro.id, html: module.intro.html })),
];

for (const page of pagesToScan) {
  for (const match of page.html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith('#/')) {
      const [route, ...rest] = href.slice(2).split('/');
      const target = decodeURIComponent(rest.join('/'));
      if (validStaticRoutes.has(route)) continue;
      if (route === 'lesson' && lessonIds.has(target)) continue;
      if (route === 'module' && moduleIds.has(target)) continue;
      if (route === 'lab' && labIds.has(target)) continue;
      badLinks.push(`${page.id}: ${href}`);
    } else if (/^https?:/i.test(href)) {
      externalLinks.push(href);
    }
  }
}

check('no broken internal links in lesson content', badLinks.length === 0, badLinks.slice(0, 8).join(', '));
check('external lesson links use https', externalLinks.every((href) => href.startsWith('https://')), externalLinks.filter((href) => !href.startsWith('https://')).join(', '));
check('no javascript: links', !pagesToScan.some((page) => /href="javascript:/i.test(page.html)));

// ---------- Offline and cleanliness ----------

const withoutScripts = html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '');

check('no external script tags', !/<script[^>]+src=/i.test(html));
check('no external stylesheets', !/<link[^>]+rel=["']?stylesheet/i.test(html));
check('no stylesheet imports', !/@import\s+url/i.test(html));
check('no iframes in static markup', !/<iframe/i.test(withoutScripts));
check('no CDN references', !/cdn\.jsdelivr|cdnjs\.cloudflare|unpkg\.com|fonts\.googleapis/i.test(html));
check('no [object Object] in course data', !JSON.stringify(course).includes('[object Object]'));
check('no [object Object] in static markup', !withoutScripts.includes('[object Object]'));
check('inline Mermaid runtime is present', html.includes('mermaid') && html.includes('Mermaid'));
check('inline app runtime is present', html.includes("const STORAGE_KEY = 'sdpath.progress.v1'"));

const sizeMb = Buffer.byteLength(html) / (1024 * 1024);
check('deliverable is a plausible single file size', sizeMb > 3 && sizeMb < 6, `${sizeMb.toFixed(2)} MB`);

// ---------- Source files ----------

check('lesson source files match written lessons', written.length === sourceLessonFiles.length, `files=${sourceLessonFiles.length} written=${written.length}`);
check('intro source files match module intros', introModules.length === sourceIntroFiles.length, `files=${sourceIntroFiles.length} intros=${introModules.length}`);
check('original outline is archived', fs.existsSync(path.join(ROOT, 'reference', 'original-outline.md')));
check('course map exists', fs.existsSync(path.join(ROOT, 'outline', 'course-map.md')));
check('source notes exist', fs.existsSync(path.join(ROOT, 'outline', 'source-notes.md')));

// ---------- Report ----------

function report() {
  console.log(`${passed.length} checks passed`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exit(1);
  }
  console.log('All validation checks passed.');
  process.exit(0);
}

report();
