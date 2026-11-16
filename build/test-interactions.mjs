import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist', 'system-design-course.html');
const html = fs.readFileSync(DIST, 'utf8');

const courseScript = html.match(/<script>window\.COURSE = [\s\S]*?;<\/script>/);
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const style = html.match(/<style>([\s\S]*?)<\/style>/);
if (!courseScript || scripts.length < 2 || !style) {
  throw new Error('Could not extract the course, app or styles from the built file.');
}

const appScript = scripts.at(-1)[1];
const testHtml = `<!doctype html>
<html lang="en" data-theme="light">
<head><meta charset="utf-8"><style>${style[1]}</style></head>
<body>
${courseScript[0]}
<script>${appScript}</script>
</body>
</html>`;

const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => {
  const message = String(error.message || error);
  if (/Could not parse CSS|Not implemented/i.test(message)) return;
  runtimeErrors.push(message);
});
virtualConsole.on('error', (message) => runtimeErrors.push(String(message)));

const dom = new JSDOM(testHtml, {
  runScripts: 'dangerously',
  url: 'https://example.test/',
  pretendToBeVisual: true,
  virtualConsole,
  beforeParse(window) {
    window.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
    window.scrollTo = () => {};
    window.confirm = () => true;
  },
});

const { window } = dom;
const { document } = window;

const problems = [];
const passed = [];

function check(name, condition, detail = '') {
  if (condition) passed.push(name);
  else problems.push(detail ? `${name}: ${detail}` : name);
}

const tick = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));
const writtenCount = window.COURSE.meta.counts.writtenLessons;

async function go(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  await tick(60);
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

await tick(120);

// ---------- Home ----------

check('home renders', Boolean($('.home-hero')));
check('home sets the document title', document.title === 'System Design Path — Free Interactive Edition', document.title);
check('home starts at 1.1', /Start with 1\.1/.test($('.hero-actions .btn.primary')?.textContent || ''), $('.hero-actions .btn.primary')?.textContent);
check('home shows canonical stats', $$('.stat strong').map((el) => el.textContent).join(',') === '19,137,18,16', $$('.stat strong').map((el) => el.textContent).join(','));
check('sidebar renders 19 modules', $$('.sidebar .module').length === 19, `actual=${$$('.sidebar .module').length}`);
check('sidebar lists 16 system labs', $$('.sidebar .lab-link[href^="#/lab/"]').length === 16, `actual=${$$('.sidebar .lab-link[href^="#/lab/"]').length}`);

// ---------- Lesson render ----------

await go('#/lesson/part-1-m01-l01');
check('lesson 1.1 renders', $('.lesson-header h1')?.textContent === 'What system design means');
check('lesson 1.1 sets the document title', document.title.includes('What system design means'), document.title);
check('lesson 1.1 has a quiz', $$('.quiz-question').length === 3, `actual=${$$('.quiz-question').length}`);
check('lesson 1.1 has a mermaid source', $$('.mermaid').length === 2, `actual=${$$('.mermaid').length}`);
check('lesson 1.1 has a next link', $$('.prev-next a.next').length === 1);
check('lesson 1.1 notes box exists', Boolean($('#lesson-notes')));

// Quiz: submit without answering.
const quizBlock = $('.quiz-block');
const quizId = quizBlock?.dataset.quizId;
const quizData = window.COURSE.quizzes[quizId];
$('.quiz-submit', quizBlock).click();
await tick(30);
check('quiz refuses empty submit', /Answer every question/.test($('.quiz-score', quizBlock)?.textContent || ''), $('.quiz-score', quizBlock)?.textContent);

// Quiz: answer every question correctly.
$$('.quiz-question', quizBlock).forEach((questionEl, index) => {
  const answer = quizData[index].answer;
  const input = questionEl.querySelector(`input[value="${answer}"]`);
  if (input) input.checked = true;
});
$('.quiz-submit', quizBlock).click();
await tick(30);
check('quiz scores 3/3', /Score: 3\/3/.test($('.quiz-score', quizBlock)?.textContent || ''), $('.quiz-score', quizBlock)?.textContent);
check('quiz marks correct options', $$('.quiz-option.correct', quizBlock).length === 3, `actual=${$$('.quiz-option.correct', quizBlock).length}`);
check('quiz shows explanations', $$('.quiz-feedback.correct', quizBlock).length === 3, `actual=${$$('.quiz-feedback.correct', quizBlock).length}`);

const stored = JSON.parse(window.localStorage.getItem('sdpath.progress.v1'));
check('quiz score is persisted', stored.lessons['part-1-m01-l01'].quiz[quizId].score === 3);

// Quiz retry.
$('.quiz-retry', quizBlock).click();
await tick(30);
check('quiz retry clears answers', $$('.quiz-option.correct', quizBlock).length === 0 && !$('.quiz-submit', quizBlock).hidden);

// Mark complete.
$('#mark-complete').click();
await tick(60);
check('mark complete updates the button', /Completed/.test($('#mark-complete')?.textContent || ''));
check('mark complete updates the header', $('#progress-pill')?.textContent === `1 / ${writtenCount} lessons`, $('#progress-pill')?.textContent);

// ---------- Theme ----------

$('#theme-toggle').click();
await tick(30);
check('theme toggles to dark', document.documentElement.dataset.theme === 'dark');
check('theme is persisted', window.localStorage.getItem('sdpath.theme.v1') === 'dark');
$('#theme-toggle').click();
await tick(30);
check('theme toggles back to light', document.documentElement.dataset.theme === 'light');

// ---------- Search ----------

const searchInput = $('#search');
searchInput.value = 'p99';
searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(30);
const results = $$('.search-result');
check('search finds lessons', results.length >= 1, `actual=${results.length}`);
check('search finds p99 lesson', results.some((button) => button.dataset.lesson === 'part-1-m01-l03'));
results.find((button) => button.dataset.lesson === 'part-1-m01-l03')?.click();
await tick(80);
check('search navigates to the lesson', $('.lesson-header h1')?.textContent === 'Functional vs non-functional requirements', $('.lesson-header h1')?.textContent);
check('search clears after navigation', $('#search').value === '');

// ---------- Widgets ----------

check('requirements sorter renders 10 items', $$('.sorter-item').length === 10, `actual=${$$('.sorter-item').length}`);
const sorterItem = $('.sorter-item');
sorterItem.querySelector('button[data-choice="functional"]').click();
await tick(20);
check('sorter marks an answer', sorterItem.classList.contains('correct') || sorterItem.classList.contains('wrong'));
check('sorter shows feedback', !sorterItem.querySelector('.why').hidden);

await go('#/lesson/part-1-m01-l04');
const tradeoffTitle = $('.tradeoff-result strong')?.textContent;
check('tradeoff widget renders a recommendation', Boolean(tradeoffTitle && tradeoffTitle.length > 5), tradeoffTitle);
check('tradeoff widget has three sliders', $$('input[type="range"]').length === 3);
$('#tradeoff-cost').value = '90';
$('#tradeoff-cost').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(20);
check('tradeoff recommendation responds to sliders', $('.tradeoff-result strong')?.textContent !== tradeoffTitle, $('.tradeoff-result strong')?.textContent);

await go('#/lesson/part-1-m01-l05');
check('lab checklist renders 8 items', $$('input[data-lab-index]').length === 8, `actual=${$$('input[data-lab-index]').length}`);
const firstLab = $('input[data-lab-index="0"]');
firstLab.checked = true;
firstLab.dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(30);
check('lab checklist persists a tick', JSON.parse(window.localStorage.getItem('sdpath.progress.v1')).lessons['part-1-m01-l05'].labChecks[0] === true);

// ---------- Notes ----------

await go('#/lesson/part-1-m01-l02');
const notes = $('#lesson-notes');
notes.value = 'I would put the no-double-booking rule in the database.';
notes.dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(650);
const saved = JSON.parse(window.localStorage.getItem('sdpath.progress.v1'));
check('notes are saved locally', saved.lessons['part-1-m01-l02'].notes.includes('no-double-booking'));
check('notes status updates', /Saved locally/.test($('#notes-status')?.textContent || ''), $('#notes-status')?.textContent);

// ---------- Prev/next ----------

check('prev link points to 1.1', /1\.1/.test($('.prev-next a')?.textContent || ''), $('.prev-next a')?.textContent);
check('next link points to 1.3', /1\.3/.test($('.prev-next a.next')?.textContent || ''), $('.prev-next a.next')?.textContent);

// ---------- Home resume ----------

await go('#/home');
check('home resumes at the last lesson', /Continue with 1\.2/.test($('.hero-actions .btn.primary')?.textContent || ''), $('.hero-actions .btn.primary')?.textContent);

// ---------- Module 2 widgets ----------

await go('#/lesson/part-1-m02-l01');
check('2.1 renders the request tracer', $$('button[data-trace]').length === 4, `actual=${$$('button[data-trace]').length}`);
$('button[data-trace="book"]').click();
await tick(20);
check('2.1 trace shows a POST', Boolean($('.trace-list .method.post')));
check('2.1 trace lists three requests', $$('.trace-list li').length === 3, `actual=${$$('.trace-list li').length}`);

await go('#/lesson/part-1-m02-l03');
check('2.3 renders the index lab', Boolean($('#index-toggle')));
const indexedRows = $('[data-metric="rows"]').textContent;
$('#index-toggle').checked = false;
$('#index-toggle').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(20);
check('2.3 removing the index scans more rows', $('[data-metric="rows"]').textContent !== indexedRows, `${indexedRows} -> ${$('[data-metric="rows"]').textContent}`);
check('2.3 removing the index removes write overhead', /none/.test($('[data-metric="writes"]').textContent || ''), $('[data-metric="writes"]').textContent);

await go('#/lesson/part-1-m02-l05');
check('2.5 renders the database picker', $$('input[name="db-workload"]').length === 7, `actual=${$$('input[name="db-workload"]').length}`);
const graphRadio = $('input[name="db-workload"][value="graph"]');
$$('input[name="db-workload"]').forEach((radio) => { radio.checked = false; });
graphRadio.checked = true;
graphRadio.dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('2.5 recommendation follows the workload', /Neo4j/.test($('.tradeoff-result strong')?.textContent || ''), $('.tradeoff-result strong')?.textContent);

await go('#/lesson/part-1-m02-l07');
check('2.7 renders the tail latency widget', Boolean($('#tail-ms')));
const p99Before = $('[data-metric="p99"]').textContent;
$('#tail-ms').value = '3500';
$('#tail-ms').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(20);
check('2.7 p99 follows the slow latency', $('[data-metric="p99"]').textContent === '3500 ms' && p99Before !== '3500 ms', `${p99Before} -> ${$('[data-metric="p99"]').textContent}`);

await go('#/lesson/part-1-m02-l09');
check('2.9 lab checklist has 8 items', $$('input[data-lab-index]').length === 8, `actual=${$$('input[data-lab-index]').length}`);
const moduleTwoLabItem = $('input[data-lab-index="0"]');
moduleTwoLabItem.checked = true;
moduleTwoLabItem.dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(30);
check('2.9 checklist persists', JSON.parse(window.localStorage.getItem('sdpath.progress.v1')).lessons['part-1-m02-l09'].labChecks[0] === true);

// ---------- Module 3 widgets ----------

await go('#/lesson/part-1-m03-l01');
check('3.1 renders the hit-rate widget', Boolean($('#hit-rate')));
const dbBefore = $('[data-metric="db"]').textContent;
$('#hit-rate').value = '50';
$('#hit-rate').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(20);
check('3.1 lowering the hit rate raises database load', $('[data-metric="db"]').textContent !== dbBefore, `${dbBefore} -> ${
  $('[data-metric="db"]').textContent
}`);

await go('#/lesson/part-1-m03-l02');
check('3.2 renders the placement widget', Boolean($('#placement-servers')));
check('3.2 starts with in-process placement', /In-process/.test($('[data-metric="where"]').textContent || ''), $('[data-metric="where"]').textContent);
$('#placement-servers').value = '3';
$('#placement-servers').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(20);
check('3.2 three servers move the copy to Redis', /Shared Redis/.test($('[data-metric="where"]').textContent || ''), $('[data-metric="where"]').textContent);
$('#placement-data').value = 'slots';
$('#placement-data').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('3.2 slots are never shared-cached', /No shared cache/.test($('[data-metric="where"]').textContent || ''), $('[data-metric="where"]').textContent);

await go('#/lesson/part-1-m03-l03');
check('3.3 renders the pattern widget', Boolean($('#pattern-select')));
$('#pattern-select').value = 'writeBehind';
$('#pattern-select').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('3.3 write-behind names the immediate source of truth', /immediate source of truth/.test($('[data-state="read"]').textContent || ''), $('[data-state="read"]').textContent);
check('3.3 write-behind names data loss', /lost/.test($('[data-state="crash"]').textContent || ''), $('[data-state="crash"]').textContent);

await go('#/lesson/part-1-m03-l04');
check('3.4 renders the staleness widget', Boolean($('#stale-ttl')));
const staleBefore = $('[data-metric="fraction"]').textContent;
$('#stale-ttl').value = '600';
$('#stale-ttl').dispatchEvent(new window.Event('input', { bubbles: true }));
await tick(20);
check('3.4 a longer TTL changes the stale fraction', $('[data-metric="fraction"]').textContent !== staleBefore, `${staleBefore} -> ${
  $('[data-metric="fraction"]').textContent
}`);
$('#stale-invalidate').checked = true;
$('#stale-invalidate').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('3.4 invalidating on write drops stale reads to 2%', $('[data-metric="fraction"]').textContent === '2%', $('[data-metric="fraction"]').textContent);

await go('#/lesson/part-1-m03-l05');
check('3.5 renders the eviction widget', $$('.cache-slot').length === 4);
for (let index = 0; index < 5; index += 1) {
  $('button[data-evict="step"]').click();
}
await tick(20);
check('3.5 stepping fills the cache', $$('.cache-slot:not(.empty)').length === 4, `actual=${$$('.cache-slot:not(.empty)').length}`);
check('3.5 the score tracks accesses', /5 of 12/.test($('[data-evict-score]').textContent || ''), $('[data-evict-score]').textContent);

await go('#/lesson/part-1-m03-l06');
check('3.6 renders the failure widget', Boolean($('#failure-select')));
$('#failure-select').value = 'avalanche';
$('#failure-select').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('3.6 avalanche shows ten thousand misses', /10,000/.test($('[data-metric="load"]').textContent || ''), $('[data-metric="load"]').textContent);
$('#failure-fix').checked = true;
$('#failure-fix').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('3.6 jitter cuts the avalanche load', /83/.test($('[data-metric="load"]').textContent || ''), $('[data-metric="load"]').textContent);

await go('#/lesson/part-1-m03-l07');
check('3.7 renders the cliff widget', $$('.bar-chart .bar').length === 30, `actual=${$$('.bar-chart .bar').length}`);
$('#cliff-coalesce').checked = true;
$('#cliff-coalesce').dispatchEvent(new window.Event('change', { bubbles: true }));
await tick(20);
check('3.7 coalescing improves p99', $('[data-metric="p99"]').textContent === '90 ms', $('[data-metric="p99"]').textContent);

await go('#/lesson/part-1-m03-l08');
check('3.8 lab checklist has 8 items', $$('input[data-lab-index]').length === 8, `actual=${$$('input[data-lab-index]').length}`);

// ---------- Module intros ----------

await go('#/module/part-1-m01');
check('module 1 intro renders', $('.lesson-header h1')?.textContent === 'What is system design?', $('.lesson-header h1')?.textContent);
check('module 1 intro has five units', $$('.module-unit-list li').length === 5, `actual=${$$('.module-unit-list li').length}`);
check('module 1 intro offers a start button', /Start the module|Continue with/.test($('.lesson-actions .btn.primary')?.textContent || ''), $('.lesson-actions .btn.primary')?.textContent);
check('module 1 intro has the required sections', Boolean($('#why-this-module-exists') && $('#what-youll-be-able-to-do') && $('#before-you-start')));
check('sidebar lists three module overviews', $$('.sidebar .intro-link').length === 3, `actual=${$$('.sidebar .intro-link').length}`);

// ---------- Map, glossary, resources, system lab ----------

await go('#/map');
check('map renders all modules', $$('.map-module').length === 19 + 16, `actual=${$$('.map-module').length}`);
check('map sets the document title', document.title.includes('Course map'), document.title);
check('map marks module 1 available', Boolean($('.map-module .badge.green')));
check('map links written lessons', $$('.map-lessons a[href="#/lesson/part-1-m01-l01"]').length === 1);

await go('#/glossary');
check('glossary renders 75 terms', $$('.glossary-item').length === 75, `actual=${$$('.glossary-item').length}`);

await go('#/resources');
check('resources renders 16 cards', $$('.resource-card').length === 16, `actual=${$$('.resource-card').length}`);

await go('#/lab/lab-bitly');
check('system lab page renders', /Bitly/.test($('.lesson-header h1')?.textContent || ''));

await go('#/lesson/does-not-exist');
check('unknown lesson shows not found', /not found/i.test($('.planned-card h2')?.textContent || ''), $('.planned-card h2')?.textContent);

await go('#/lesson/part-1-m03-l01');
check('3.1 lesson renders', /Why cache/.test($('.lesson-header h1')?.textContent || ''), $('.lesson-header h1')?.textContent);
check('3.1 has four quiz questions', $$('.quiz-question').length === 4, `actual=${$$('.quiz-question').length}`);

await go('#/lesson/part-1-m04-l01');
check('planned lesson page renders', /in the outline/.test($('.planned-card h2')?.textContent || ''), $('.planned-card h2')?.textContent);

// ---------- Data menu and reset ----------

$('#data-menu').click();
await tick(20);
check('data menu opens', !$('#data-popover').hidden);
document.body.click();
await tick(20);
check('data menu closes on outside click', $('#data-popover').hidden);

$('#data-menu').click();
await tick(20);
$('#data-popover button[data-action="reset"]').click();
await tick(60);
const afterReset = JSON.parse(window.localStorage.getItem('sdpath.progress.v1'));
check('reset clears lessons', Object.keys(afterReset.lessons).length === 0, `actual=${Object.keys(afterReset.lessons).length}`);
check('reset clears the header count', $('#progress-pill')?.textContent === `0 / ${writtenCount} lessons`, $('#progress-pill')?.textContent);

// ---------- Mobile sidebar ----------

$('#menu-toggle').click();
await tick(20);
check('mobile sidebar opens', $('#sidebar').classList.contains('open') && $('#overlay').classList.contains('show'));
$('#overlay').click();
await tick(20);
check('mobile sidebar closes', !$('#sidebar').classList.contains('open') && !$('#overlay').classList.contains('show'));

// ---------- Runtime errors ----------

check('no runtime errors', runtimeErrors.length === 0, runtimeErrors.slice(0, 3).join(' | '));

console.log(`${passed.length} interaction checks passed`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}
console.log('All interaction checks passed.');
