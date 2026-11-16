import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const ROOT = process.cwd();
const OUTLINE_PATH = path.join(ROOT, 'outline', 'course.json');
const CONTENT_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DIST_DIR = path.join(ROOT, 'dist');
const DIST_PATH = path.join(DIST_DIR, 'system-design-course.html');

const course = JSON.parse(fs.readFileSync(OUTLINE_PATH, 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'glossary.json'), 'utf8'));
const resources = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, 'resources.json'), 'utf8'));
const css = fs.readFileSync(path.join(ASSETS_DIR, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(ASSETS_DIR, 'app.js'), 'utf8');
const mermaidJs = fs.readFileSync(path.join(ROOT, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'), 'utf8');

const lessonIndex = new Map();
const moduleIndex = new Map();
for (const part of course.parts) {
  for (const module of part.modules) {
    const fullId = `part-${part.number}-${module.id}`;
    if (moduleIndex.has(fullId)) {
      throw new Error(`Duplicate module id in outline: ${fullId}`);
    }
    moduleIndex.set(fullId, { module, part, fullId });
    for (const lesson of module.lessons) {
      if (lessonIndex.has(lesson.id)) {
        throw new Error(`Duplicate lesson id in outline: ${lesson.id}`);
      }
      lessonIndex.set(lesson.id, { lesson, module, part });
    }
  }
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// Keep a stable anchor for every heading.
md.renderer.rules.heading_open = (tokens, idx) => {
  const token = tokens[idx];
  const inline = tokens[idx + 1];
  const text = inline?.content || '';
  const id = anchorId(text);
  return `<${token.tag} id="${id}">`;
};

// Make wide tables scrollable instead of breaking the page.
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
md.renderer.rules.table_close = () => '</table></div>';

// External links open safely in a new tab.
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') || '';
  if (/^https?:\/\//i.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noreferrer');
  }
  return self.renderToken(tokens, idx, options);
};

// Mermaid blocks are kept as source and rendered by the inlined runtime.
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = token.info.trim().split(/\s+/)[0];
  const content = token.content;

  if (info === 'mermaid') {
    return `<div class="mermaid-wrap"><pre class="mermaid" data-src="${escapeHtml(content)}">${escapeHtml(content)}</pre></div>`;
  }

  const language = info ? ` language-${escapeHtml(info)}` : '';
  return `<pre class="code-block"><code class="${language.trim()}">${escapeHtml(content)}</code></pre>`;
};

const CALLOUT_LABELS = {
  note: 'Note',
  warning: 'Watch out',
  'mental-model': 'Mental model',
  interview: 'Interview lens',
  'reality-check': 'Reality check',
  checkpoint: 'Checkpoint',
};

function anchorId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateQuiz(quizId, questions, lessonId) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new Error(`${lessonId}/${quizId}: quiz must be a non-empty array.`);
  }
  for (const [index, question] of questions.entries()) {
    if (typeof question.question !== 'string' || !question.question.trim()) {
      throw new Error(`${lessonId}/${quizId}: question ${index + 1} has no question text.`);
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`${lessonId}/${quizId}: question ${index + 1} needs at least two options.`);
    }
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) {
      throw new Error(`${lessonId}/${quizId}: question ${index + 1} has an invalid answer index.`);
    }
  }
}

function renderCustomBlocks(text, lessonId, quizzes) {
  const lines = text.split(/\r?\n/);
  const output = [];
  let fenceChar = null;
  let fenceLength = 0;

  const renderBlock = (kind, argument, body) => {
    const trimmedBody = body.trim();

    if (kind === 'quiz') {
      let questions;
      try {
        questions = JSON.parse(trimmedBody);
      } catch (error) {
        throw new Error(`${lessonId}: quiz JSON is invalid: ${error.message}`);
      }
      const quizId = `${lessonId}-q${Object.keys(quizzes).length + 1}`;
      validateQuiz(quizId, questions, lessonId);
      quizzes[quizId] = questions;
      return `\n\n<div class="quiz-block" data-quiz-id="${quizId}"></div>\n\n`;
    }

    if (kind === 'widget') {
      const name = argument.trim();
      if (!/^[a-z0-9-]+$/.test(name)) {
        throw new Error(`${lessonId}: widget block needs a widget name.`);
      }
      return `\n\n<div class="widget" data-widget="${name}"></div>\n\n`;
    }

    if (kind === 'discussion') {
      return `\n\n<div class="discussion"><div class="discussion-head"><span>Discuss</span><button class="copy-discussion" type="button">Copy prompt</button></div>${md.render(trimmedBody)}</div>\n\n`;
    }

    if (kind === 'deep-dive') {
      const title = argument.trim() || 'Deep dive';
      return `\n\n<details class="deep-dive"><summary>${escapeHtml(title)}</summary><div>${md.render(trimmedBody)}</div></details>\n\n`;
    }

    if (CALLOUT_LABELS[kind]) {
      return `\n\n<div class="callout callout-${kind}"><span class="callout-title">${escapeHtml(CALLOUT_LABELS[kind])}</span>${md.render(trimmedBody)}</div>\n\n`;
    }

    throw new Error(`${lessonId}: unknown custom block ":::${kind}".`);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    // Track fenced code blocks so a literal ::: inside code is left untouched.
    const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (!fenceChar) {
        fenceChar = fence[1][0];
        fenceLength = fence[1].length;
        output.push(line);
        continue;
      }
      if (fence[1][0] === fenceChar && fence[1].length >= fenceLength && !fence[2].trim()) {
        fenceChar = null;
        fenceLength = 0;
      }
      output.push(line);
      continue;
    }

    if (fenceChar) {
      output.push(line);
      continue;
    }

    const opening = line.match(/^:::([a-z][a-z0-9-]*)(?:[ \t]+(.*))?[ \t]*$/);
    if (!opening) {
      output.push(line);
      continue;
    }

    const kind = opening[1];
    const argument = opening[2] || '';
    const bodyLines = [];
    let closingIndex = index + 1;

    for (; closingIndex < lines.length; closingIndex += 1) {
      if (/^:::[ \t]*$/.test(lines[closingIndex])) break;
      bodyLines.push(lines[closingIndex]);
    }

    if (closingIndex >= lines.length) {
      throw new Error(`${lessonId}: unclosed custom block ":::${kind}".`);
    }

    output.push(renderBlock(kind, argument, bodyLines.join('\n')));
    index = closingIndex;
  }

  return output.join('\n');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const contentFiles = walk(CONTENT_DIR).filter((file) => file.endsWith('.md'));
const allQuizzes = {};
const writtenLessons = [];
const writtenIntros = [];

for (const file of contentFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const frontmatter = parsed.data;
  const lessonId = frontmatter.id;

  if (!lessonId) {
    throw new Error(`${path.relative(ROOT, file)}: missing "id" in frontmatter.`);
  }

  // Module introductions are pages, but they are not path units. They get
  // attached to their module instead of being counted in the 137 lessons.
  if (frontmatter.kind === 'intro' || /-intro$/.test(lessonId)) {
    if (frontmatter.kind !== 'intro') {
      throw new Error(`${path.relative(ROOT, file)}: id ends in "-intro" but kind is "${frontmatter.kind}".`);
    }
    const moduleId = lessonId.replace(/-intro$/, '');
    const target = moduleIndex.get(moduleId);
    if (!target) {
      throw new Error(`${path.relative(ROOT, file)}: no module matches intro id "${lessonId}".`);
    }
    if (target.module.hasIntro) {
      throw new Error(`${path.relative(ROOT, file)}: duplicate intro for ${moduleId}.`);
    }

    const introQuizzes = {};
    const introBlocks = renderCustomBlocks(parsed.content, lessonId, introQuizzes);
    if (Object.keys(introQuizzes).length) {
      throw new Error(`${path.relative(ROOT, file)}: module intros must not contain a quiz.`);
    }
    const renderedIntro = md.render(introBlocks);
    const introHtml = renderedIntro.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, '');
    const introText = stripHtml(introHtml).slice(0, 8000);

    target.module.hasIntro = true;
    target.module.introPath = path.relative(ROOT, file).replace(/\\/g, '/');
    target.module.intro = {
      id: lessonId,
      title: typeof frontmatter.title === 'string' && frontmatter.title.trim()
        ? frontmatter.title.trim()
        : `Module ${target.module.number} · ${target.module.title}`,
      summary: typeof frontmatter.summary === 'string' && frontmatter.summary.trim()
        ? frontmatter.summary.trim()
        : target.module.summary,
      minutes: Number(frontmatter.minutes) || 3,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      html: introHtml,
      searchText: introText,
    };
    writtenIntros.push(target.module);
    continue;
  }

  const entry = lessonIndex.get(lessonId);
  if (!entry) {
    throw new Error(`${path.relative(ROOT, file)}: id "${lessonId}" is not in the outline.`);
  }

  if (entry.lesson.hasContent) {
    throw new Error(`${path.relative(ROOT, file)}: duplicate content for ${lessonId}.`);
  }

  const quizzes = {};
  const withBlocks = renderCustomBlocks(parsed.content, lessonId, quizzes);
  const rendered = md.render(withBlocks);
  // The page header already renders the lesson title, so drop a leading H1
  // from the body to avoid a duplicate heading and a broken outline.
  const html = rendered.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, '');
  const searchText = stripHtml(html).slice(0, 16000);

  entry.lesson.html = html;
  entry.lesson.hasContent = true;
  entry.lesson.status = 'available';
  entry.lesson.contentPath = path.relative(ROOT, file).replace(/\\/g, '/');
  if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
    entry.lesson.title = frontmatter.title.trim();
  }
  if (typeof frontmatter.summary === 'string' && frontmatter.summary.trim()) {
    entry.lesson.summary = frontmatter.summary.trim();
  }
  entry.lesson.tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  entry.lesson.searchText = searchText;
  entry.lesson.quizCount = Object.keys(quizzes).length;
  entry.lesson.updatedAt = fs.statSync(file).mtime.toISOString();

  for (const [quizId, questions] of Object.entries(quizzes)) {
    allQuizzes[quizId] = questions;
  }

  writtenLessons.push(entry.lesson);
}

// Update module and part status from what actually exists on disk.
for (const part of course.parts) {
  const partLessons = part.modules.flatMap((module) => module.lessons);
  part.writtenCount = partLessons.filter((lesson) => lesson.hasContent).length;
  part.status =
    part.writtenCount === 0
      ? 'planned'
      : part.writtenCount === partLessons.length
        ? 'available'
        : 'in-progress';

  for (const module of part.modules) {
    const written = module.lessons.filter((lesson) => lesson.hasContent).length;
    module.writtenCount = written;
    module.status =
      written === 0 ? 'planned' : written === module.lessons.length ? 'available' : 'in-progress';
  }
}

course.meta.counts.writtenLessons = writtenLessons.length;
course.meta.counts.writtenIntros = writtenIntros.length;
course.meta.counts.writtenModules = course.parts
  .flatMap((part) => part.modules)
  .filter((module) => module.writtenCount > 0).length;
course.meta.builtAt = new Date().toISOString();
course.quizzes = allQuizzes;
course.glossary = glossary;
course.resources = resources;

course.search = course.parts.flatMap((part) =>
  part.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      id: lesson.id,
      number: lesson.number,
      title: lesson.title,
      summary: lesson.summary || '',
      part: part.title,
      module: `Module ${module.number} · ${module.title}`,
      tags: lesson.tags || [],
      hasContent: Boolean(lesson.hasContent),
      route: `#/lesson/${lesson.id}`,
      text: lesson.searchText || lesson.summary || '',
    })),
  ),
);

for (const part of course.parts) {
  for (const module of part.modules) {
    if (!module.hasIntro) continue;
    const fullId = `part-${part.number}-${module.id}`;
    course.search.push({
      id: module.intro.id,
      number: `Module ${module.number}`,
      title: `${module.title} — module overview`,
      summary: module.intro.summary || module.summary || '',
      part: part.title,
      module: `Module ${module.number} · ${module.title}`,
      tags: module.intro.tags || [],
      hasContent: true,
      route: `#/module/${fullId}`,
      text: module.intro.searchText || '',
    });
  }
}

// A tiny sanity check before writing a single file that is hard to inspect by hand.
for (const lesson of writtenLessons) {
  if (!lesson.html || lesson.html.length < 500) {
    throw new Error(`${lesson.id}: content looks too short to be a real lesson.`);
  }
  if (/undefined|\[object Object\]/.test(lesson.html)) {
    throw new Error(`${lesson.id}: generated HTML contains undefined or [object Object].`);
  }
}

for (const module of writtenIntros) {
  const intro = module.intro;
  if (!intro.html || intro.html.length < 400) {
    throw new Error(`${intro.id}: module intro looks too short to be a real page.`);
  }
  if (/undefined|\[object Object\]/.test(intro.html)) {
    throw new Error(`${intro.id}: generated HTML contains undefined or [object Object].`);
  }
}

const courseJson = JSON.stringify(course).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#2457d6">
  <meta name="description" content="An independent, free, offline interactive edition of the Complete System Design Path. Modules 1–5 are written; the rest is being added in order.">
  <title>System Design Path — Free Interactive Edition</title>
  <style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head>
<body>
  <noscript>
    <div style="max-width:720px;margin:80px auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.6">
      <h1>System Design Path</h1>
      <p>This course needs JavaScript because the lessons, quizzes, diagrams and progress tracking are rendered in the browser.</p>
    </div>
  </noscript>
  <script>window.COURSE = ${courseJson};</script>
  <script>${mermaidJs.replace(/<\/script/gi, '<\\/script')}</script>
  <script>${appJs.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;

fs.mkdirSync(DIST_DIR, { recursive: true });
fs.writeFileSync(DIST_PATH, html, 'utf8');

const sizeMb = (Buffer.byteLength(html) / (1024 * 1024)).toFixed(2);
console.log(`Built ${path.relative(ROOT, DIST_PATH)}`);
console.log(`  ${writtenLessons.length} written lessons, ${writtenIntros.length} module intros, ${Object.keys(allQuizzes).length} quizzes, ${sizeMb} MB`);
console.log(`  ${course.meta.counts.modules} modules, ${course.meta.counts.pathUnits} path units, ${course.meta.counts.labs} labs, ${course.meta.counts.simulations} simulations, ${course.meta.counts.systemLabs} system labs`);
