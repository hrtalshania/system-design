import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'file:///C:/Users/User/source/repos/system%20Design/dist/system-design-course.html';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sdpath-smoke-'));

const routes = [
  {
    hash: '#/home',
    name: 'home',
    checks: ['Learn system design in the order', 'Start with 1.1', 'path units', 'System Labs'],
  },
  {
    hash: '#/map',
    name: 'map',
    checks: ['The whole path', 'Part 1 · Foundations', 'Part 3 · Under the hood', 'System Labs', 'Rate limiting'],
  },
  {
    hash: '#/lesson/part-1-m01-l01',
    name: 'lesson-1.1',
    checks: ['What system design means', 'quiz-question', '<svg', 'Mark complete', 'Copy link'],
    counts: { 'quiz-question': 3, '<svg': 2 },
  },
  {
    hash: '#/lesson/part-1-m01-l02',
    name: 'lesson-1.2',
    checks: ['The design process', 'erDiagram', 'quiz-question', 'Mark complete'],
    counts: { 'quiz-question': 4, '<svg': 2 },
  },
  {
    hash: '#/lesson/part-1-m01-l03',
    name: 'lesson-1.3',
    checks: ['Functional vs non-functional requirements', 'requirements-sorter', 'sorter-item', 'p99'],
    counts: { 'sorter-item': 10, 'quiz-question': 4 },
  },
  {
    hash: '#/lesson/part-1-m01-l04',
    name: 'lesson-1.4',
    checks: ['Everything is a tradeoff', 'tradeoff-explorer', 'Email first, SMS for high-risk appointments'],
    counts: { 'quiz-question': 4 },
  },
  {
    hash: '#/lesson/part-1-m01-l05',
    name: 'lesson-1.5',
    checks: ['Lab: Design system for a clinic', 'Lab checklist', 'Rubric', 'v2 deferral'],
    counts: { 'data-lab-index': 8, 'quiz-question': 3 },
  },
  {
    hash: '#/lesson/part-1-m02-l01',
    name: 'lesson-2.1',
    checks: ['From requirements to requests', 'request-trace', 'Trace one user action', 'quiz-question', 'Mark complete'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l02',
    name: 'lesson-2.2',
    checks: ['Data modeling', 'erDiagram', 'quiz-question', 'one_active_booking_per_slot'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l03',
    name: 'lesson-2.3',
    checks: ['Indexes', 'index-lab', 'Feel what an index does', 'EXPLAIN', 'quiz-question'],
    counts: { 'quiz-question': 5, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l04',
    name: 'lesson-2.4',
    checks: ['Designing the API', 'Idempotency-Key', '409 Conflict', 'quiz-question'],
    counts: { 'quiz-question': 5, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l05',
    name: 'lesson-2.5',
    checks: ['Choosing a database', 'db-picker', 'Name the hardest part', 'quiz-question'],
    counts: { 'quiz-question': 5, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l06',
    name: 'lesson-2.6',
    checks: ['Reverse proxy', 'X-Forwarded-For', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 2 },
  },
  {
    hash: '#/lesson/part-1-m02-l07',
    name: 'lesson-2.7',
    checks: ['How do you know it', 'tail-latency', 'Why the average hides the pain', 'quiz-question'],
    counts: { 'quiz-question': 5, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l08',
    name: 'lesson-2.8',
    checks: ['Proof: load testing one server', 'Reference results', 'coordinated omission', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m02-l09',
    name: 'lesson-2.9',
    checks: ['Lab: Design the clinic', 'Lab checklist', 'Rubric', 'v2 deferral'],
    counts: { 'data-lab-index': 8, 'quiz-question': 3, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l01',
    name: 'lesson-3.1',
    checks: ['Why cache, and what', 'cache-hit-rate', 'Feel the hit rate', 'quiz-question', 'Mark complete'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l02',
    name: 'lesson-3.2',
    checks: ['Where the cache lives', 'cache-placement', 'Place the copy', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l03',
    name: 'lesson-3.3',
    checks: ['Reading and writing with a cache', 'cache-patterns', 'Pick a read and write pattern', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l04',
    name: 'lesson-3.4',
    checks: ['Cache invalidation', 'cache-staleness', 'Spend your staleness budget', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l05',
    name: 'lesson-3.5',
    checks: ['When the cache is full', 'cache-eviction', 'Watch a cache fill', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l06',
    name: 'lesson-3.6',
    checks: ['When caching makes things worse', 'cache-failure', 'Break the cache on purpose', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l07',
    name: 'lesson-3.7',
    checks: ['Proof: the menu page with a cache', 'cache-cliff', 'Flush the cache at peak', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m03-l08',
    name: 'lesson-3.8',
    checks: ['Lab: What can the clinic cache', 'Lab checklist', 'Rubric', 'Never the free slots'],
    counts: { 'data-lab-index': 8, 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l01',
    name: 'lesson-4.1',
    checks: ['Vertical scaling', 'scale-vertical', 'Buy a bigger box', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l02',
    name: 'lesson-4.2',
    checks: ['Horizontal scaling', 'scale-horizontal', 'Add servers, find the shared limit', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l03',
    name: 'lesson-4.3',
    checks: ['Load balancers', 'lb-algorithms', 'Balance the requests, or the work', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l04',
    name: 'lesson-4.4',
    checks: ['Stateless servers', 'session-affinity', 'Where does the session live', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l05',
    name: 'lesson-4.5',
    checks: ['Connection pooling', 'pool-math', 'Multiply the pool by the fleet', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l06',
    name: 'lesson-4.6',
    checks: ['Object storage', 'upload-path', 'Who carries the bytes', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l07',
    name: 'lesson-4.7',
    checks: ['CDN: a cache near the user', 'cdn-offload', 'Move the audience, not the origin', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l08',
    name: 'lesson-4.8',
    checks: ['Proof: two servers behind a load balancer', 'two-server-proof', 'What did the second server actually buy', 'quiz-question'],
    counts: { 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/lesson/part-1-m04-l09',
    name: 'lesson-4.9',
    checks: ['Lab: Does the clinic need a second server', 'Lab checklist', 'Rubric', 'budget exception'],
    counts: { 'data-lab-index': 8, 'quiz-question': 4, '<svg': 1 },
  },
  {
    hash: '#/module/part-1-m01',
    name: 'module-intro-1',
    checks: ['Module 1', 'Why this module exists', 'able to do', 'Before you start', 'Start the module'],
    counts: { 'module-unit-list': 1 },
  },
  {
    hash: '#/module/part-1-m02',
    name: 'module-intro-2',
    checks: ['Module 2', 'Why this module exists', 'Start the module'],
    counts: { 'module-unit-list': 1 },
  },
  {
    hash: '#/module/part-1-m03',
    name: 'module-intro-3',
    checks: ['Module 3', 'Caching', 'Why this module exists', 'Start the module'],
    counts: { 'module-unit-list': 1 },
  },
  {
    hash: '#/module/part-1-m04',
    name: 'module-intro-4',
    checks: ['Module 4', 'one server', 'Why this module exists', 'Start the module'],
    counts: { 'module-unit-list': 1 },
  },
  {
    hash: '#/lesson/part-1-m05-l01',
    name: 'planned',
    checks: ['This lesson is in the outline', 'Go to 1.1', 'Planned'],
  },
  {
    hash: '#/glossary',
    name: 'glossary',
    checks: ['Glossary', 'Consistent hashing', 'Idempotency key', 'Cache stampede', 'Vertical scaling'],
    counts: { 'glossary-item': 82 },
  },
  {
    hash: '#/resources',
    name: 'resources',
    checks: ['Free reading', 'The System Design Primer', 'Raft Consensus Algorithm'],
    counts: { 'resource-card': 16 },
  },
  {
    hash: '#/lab/lab-bitly',
    name: 'system-lab',
    checks: ['Design your own Bitly', 'System lab', 'URL shortener'],
  },
  {
    hash: '#/lesson/does-not-exist',
    name: 'not-found',
    checks: ['Lesson not found', 'Open the course map'],
  },
];

let failures = 0;

for (const route of routes) {
  const url = `${BASE}${route.hash}`;
  let dom;
  try {
    dom = execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--allow-file-access-from-files',
        `--user-data-dir=${profile}`,
        '--virtual-time-budget=12000',
        '--dump-dom',
        url,
      ],
      { encoding: 'utf8', timeout: 90000, maxBuffer: 80 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${route.name}: chrome error ${error.message.split('\n')[0]}`);
    continue;
  }

  const problems = [];
  const content = dom
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  for (const check of route.checks) {
    if (!content.includes(check)) problems.push(`missing "${check}"`);
  }
  for (const [needle, expected] of Object.entries(route.counts || {})) {
    const actual = content.split(needle).length - 1;
    if (actual < expected) problems.push(`${needle} ${actual} < ${expected}`);
  }

  // A rendered page should never contain these.
  for (const bad of ['[object Object]', 'class="mermaid-error"', 'data-quiz-id=""', 'undefined']) {
    if (content.includes(bad)) problems.push(`contains "${bad}"`);
  }
  if (/<script[^>]+src=/i.test(dom)) problems.push('has an external script tag');

  if (problems.length) {
    failures += 1;
    console.log(`FAIL ${route.name}: ${problems.join('; ')}`);
  } else {
    console.log(`ok   ${route.name} (${Math.round(dom.length / 1024)} KB DOM)`);
  }
}

fs.rmSync(profile, { recursive: true, force: true });

// ---------- Theme toggle regression ----------
// Re-rendering Mermaid is where duplicate IDs and stacked diagrams used to appear.
// Toggle the theme in an iframe and verify that each card still owns exactly one SVG.

function themeToggleCheck() {
  const distUrl = `file:///${path
    .resolve('dist', 'system-design-course.html')
    .replace(/\\/g, '/')
    .replace(/ /g, '%20')}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdpath-theme-'));
  const file = path.join(dir, 'theme.html');
  const wrapper = `<!doctype html>
<html><body>
<pre id="out">waiting</pre>
<iframe id="frame" style="width:1200px;height:900px;border:0"></iframe>
<script>
const frame = document.getElementById('frame');
frame.src = ${JSON.stringify(`${distUrl}#/lesson/part-1-m01-l02`)};
frame.addEventListener('load', () => {
  setTimeout(() => {
    const doc = frame.contentDocument;
    doc.getElementById('theme-toggle').click();
    setTimeout(() => {
      const wraps = [...doc.querySelectorAll('.mermaid-wrap')];
      const data = wraps.map((wrap) => {
        const svg = wrap.querySelector('svg');
        return {
          sources: (wrap.querySelector('.mermaid')?.getAttribute('data-src') || '').split('\\n')[0],
          svgs: wrap.querySelectorAll('svg').length,
          id: svg ? svg.id : null,
          text: svg ? svg.textContent : '',
        };
      });
      document.getElementById('out').textContent = JSON.stringify({
        theme: doc.documentElement.dataset.theme,
        wraps: data,
      });
    }, 3000);
  }, 3000);
});
</script>
</body></html>`;
  fs.writeFileSync(file, wrapper);

  try {
    const dom = execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--allow-file-access-from-files',
        '--virtual-time-budget=22000',
        '--dump-dom',
        `file:///${file.replace(/\\/g, '/').replace(/ /g, '%20')}`,
      ],
      { encoding: 'utf8', timeout: 120000, maxBuffer: 40 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const match = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
    if (!match) throw new Error('no diagnostic output');
    const parsed = JSON.parse(
      match[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#039;/g, "'"),
    );

    const problems = [];
    if (parsed.theme !== 'light') problems.push(`theme=${parsed.theme}`);
    if (parsed.wraps.length !== 3) problems.push(`wraps=${parsed.wraps.length}`);
    if (parsed.wraps.some((wrap) => wrap.svgs !== 1)) problems.push('a card has more than one SVG');
    const ids = parsed.wraps.map((wrap) => wrap.id);
    if (new Set(ids).size !== ids.length) problems.push(`duplicate SVG ids: ${ids.join(', ')}`);
    const [process, er, architecture] = parsed.wraps;
    if (!process?.text.includes('Sentence') || process.text.includes('DOCTOR')) problems.push('process diagram is contaminated');
    if (!er?.text.includes('DOCTOR') || er.text.includes('Sentence')) problems.push('ER diagram is contaminated');
    if (!architecture?.text.includes('Patient')) problems.push('architecture diagram is missing');

    if (problems.length) {
      failures += 1;
      console.log(`FAIL theme-toggle: ${problems.join('; ')}`);
    } else {
      console.log('ok   theme-toggle (3 diagrams, unique ids, no stacking)');
    }
  } catch (error) {
    failures += 1;
    console.log(`FAIL theme-toggle: ${error.message.split('\n')[0]}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

themeToggleCheck();

console.log(failures ? `\n${failures} route(s) failed` : '\nAll routes passed');
process.exit(failures ? 1 : 0);
