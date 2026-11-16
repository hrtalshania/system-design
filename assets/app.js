/* global COURSE, mermaid */
(() => {
  'use strict';

  const STORAGE_KEY = 'sdpath.progress.v1';
  const THEME_KEY = 'sdpath.theme.v1';

  const lessons = [];
  const modules = [];
  const parts = COURSE.parts || [];

  for (const part of parts) {
    for (const module of part.modules || []) {
      const fullId = `part-${part.number}-${module.id}`;
      modules.push({ ...module, part, fullId });
      for (const lesson of module.lessons || []) {
        lessons.push({ ...lesson, module, part });
      }
    }
  }

  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const moduleById = new Map(modules.map((module) => [module.fullId, module]));
  const availableLessons = lessons.filter((lesson) => lesson.hasContent);
  const firstAvailable = availableLessons[0] || lessons[0];
  const systemLabs = COURSE.systemLabs || [];
  const glossary = COURSE.glossary || [];
  const resources = COURSE.resources || [];

  const state = {
    progress: loadProgress(),
    theme: localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    currentLessonId: null,
    currentModuleId: null,
    currentLabId: null,
    searchOpen: false,
  };

  document.documentElement.dataset.theme = state.theme;

  document.body.innerHTML = `
    <header class="app-header">
      <button class="icon-btn menu-btn" id="menu-toggle" aria-label="Open navigation" aria-expanded="false">☰</button>
      <a class="brand" href="#/home" aria-label="Course home">
        <span class="brand-mark">SD</span>
        <span class="brand-text">System Design Path <em>free edition</em></span>
      </a>
      <div class="search-wrap">
        <input id="search" type="search" placeholder="Search lessons, topics, terms…" autocomplete="off" aria-label="Search the course">
        <div id="search-results" class="search-results" hidden></div>
      </div>
      <div class="header-actions">
        <span id="progress-pill" class="progress-pill">0 / 0</span>
        <button class="icon-btn" id="theme-toggle" aria-label="Toggle light and dark theme">◐</button>
        <button class="icon-btn" id="data-menu" aria-label="Progress and notes menu" aria-expanded="false">⋯</button>
      </div>
      <div class="data-popover" id="data-popover" hidden>
        <button type="button" data-action="export">Export progress &amp; notes</button>
        <button type="button" data-action="import">Import progress…</button>
        <button type="button" data-action="reset" class="danger">Reset progress</button>
      </div>
    </header>

    <div class="overlay" id="overlay"></div>
    <aside class="sidebar" id="sidebar" aria-label="Course navigation"></aside>
    <main class="main">
      <div class="main-inner" id="main"></div>
    </main>

    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <input type="file" id="import-file" accept=".json,application/json" hidden>

    <dialog id="diagram-dialog">
      <div class="dialog-head">
        <strong>Diagram</strong>
        <button class="icon-btn" id="dialog-close" aria-label="Close diagram">✕</button>
      </div>
      <div class="dialog-body" id="dialog-body"></div>
    </dialog>
  `;

  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const searchInput = document.getElementById('search');
  const searchResults = document.getElementById('search-results');
  const dataPopover = document.getElementById('data-popover');
  const dataMenuButton = document.getElementById('data-menu');
  const importFile = document.getElementById('import-file');
  const diagramDialog = document.getElementById('diagram-dialog');
  const dialogBody = document.getElementById('dialog-body');

  // ---------- Progress ----------

  function defaultProgress() {
    return {
      version: 1,
      lessons: {},
      lastLesson: null,
      createdAt: new Date().toISOString(),
    };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      const parsed = JSON.parse(raw);
      return {
        version: 1,
        lessons: parsed.lessons && typeof parsed.lessons === 'object' ? parsed.lessons : {},
        lastLesson: parsed.lastLesson || null,
        createdAt: parsed.createdAt || new Date().toISOString(),
      };
    } catch {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch {
      // Storage can be unavailable in private mode. The course still works.
    }
  }

  function progressFor(lessonId) {
    if (!state.progress.lessons[lessonId]) {
      state.progress.lessons[lessonId] = {};
    }
    return state.progress.lessons[lessonId];
  }

  function isComplete(lessonId) {
    return Boolean(state.progress.lessons[lessonId]?.completed);
  }

  function completedAvailableCount() {
    return availableLessons.filter((lesson) => isComplete(lesson.id)).length;
  }

  function updateHeaderProgress() {
    const pill = document.getElementById('progress-pill');
    if (pill) {
      pill.textContent = `${completedAvailableCount()} / ${availableLessons.length} lessons`;
    }
  }

  // ---------- Utilities ----------

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      textarea.remove();
      return ok;
    }
  }

  function parseHash() {
    const raw = window.location.hash.replace(/^#\/?/, '');
    if (!raw) return { route: 'home', rest: [] };
    const parts = raw.split('/').filter(Boolean);
    return { route: parts[0] || 'home', rest: parts.slice(1) };
  }

  function navigate(path) {
    if (window.location.hash === path) {
      render();
    } else {
      window.location.hash = path;
    }
  }

  function setDocumentTitle(subject) {
    document.title = subject
      ? `${subject} · System Design Path`
      : 'System Design Path — Free Interactive Edition';
  }

  // ---------- Sidebar ----------

  function renderSidebar() {
    const pathParts = parts.filter((part) => part.number !== 3);
    const underTheHood = parts.filter((part) => part.number === 3);

    const pathHtml = pathParts.map((part) => renderPartNav(part)).join('');
    const underHtml = underTheHood.map((part) => renderPartNav(part, true)).join('');

    sidebar.innerHTML = `
      <div class="sidebar-scroll">
        <div class="sidebar-top">
          <a href="#/home">Course home</a>
          <a href="#/map">Course map</a>
        </div>

        <section class="track">
          <h2>The Path</h2>
          <p class="track-note">Modules 1–18 · foundations to distributed systems</p>
          ${pathHtml}
        </section>

        <section class="track">
          <h2>Under the Hood</h2>
          <p class="track-note">Module 19 · algorithm simulations</p>
          ${underHtml}
        </section>

        <section class="track">
          <h2>System Labs</h2>
          <p class="track-note">Design the apps you use every day</p>
          ${systemLabs
            .map(
              (lab) => `
                <a class="lab-link ${lab.id === state.currentLabId ? 'active' : ''}" href="#/lab/${encodeURIComponent(lab.id)}">
                  ${escapeHtml(lab.title)}
                  <span>${escapeHtml(lab.category || '')}${lab.difficulty ? ` · ${escapeHtml(lab.difficulty)}` : ''}</span>
                </a>
              `,
            )
            .join('')}
        </section>

        <section class="track">
          <h2>Reference</h2>
          <a class="lab-link" href="#/glossary">Glossary <span>Terms used across the course</span></a>
          <a class="lab-link" href="#/resources">Free reading <span>Docs, papers and open guides</span></a>
        </section>
      </div>
    `;
  }

  function renderPartNav(part, forceOpen = false) {
    return (part.modules || [])
      .map((module) => {
        const open = forceOpen || module.number === 1;
        const ready = module.status === 'available';
        const fullId = `part-${part.number}-${module.id}`;
        const introLink = module.hasIntro
          ? `
            <li>
              <a class="lesson-link intro-link ${state.currentModuleId === fullId ? 'active' : ''}"
                 href="#/module/${encodeURIComponent(fullId)}"
                 title="Module overview">
                <span class="dot" aria-hidden="true"></span>
                <span>Module overview</span>
                <span class="lesson-min">${module.intro?.minutes || 3}m</span>
              </a>
            </li>
          `
          : '';
        const lessonLinks = (module.lessons || [])
          .map((lesson) => {
            const active = lesson.id === state.currentLessonId;
            const completed = isComplete(lesson.id);
            const planned = !lesson.hasContent;
            return `
              <li>
                <a class="lesson-link ${active ? 'active' : ''} ${completed ? 'completed' : ''} ${planned ? 'planned' : ''}"
                   href="#/lesson/${encodeURIComponent(lesson.id)}"
                   title="${escapeHtml(lesson.title)}${planned ? ' (planned)' : ''}">
                  <span class="dot" aria-hidden="true"></span>
                  <span>${escapeHtml(lesson.number)} ${escapeHtml(lesson.title)}</span>
                  <span class="lesson-min">${planned ? 'soon' : `${lesson.minutes}m`}</span>
                </a>
              </li>
            `;
          })
          .join('');

        return `
          <details class="module ${ready ? 'ready' : ''}" ${open ? 'open' : ''}>
            <summary>
              <span class="module-number">${String(module.number).padStart(2, '0')}</span>
              <span class="module-title">${escapeHtml(module.title)}</span>
              <span class="module-count">${module.lessons?.length || 0}</span>
            </summary>
            <ul class="lesson-list">${introLink}${lessonLinks}</ul>
          </details>
        `;
      })
      .join('');
  }

  // ---------- Routing / render ----------

  function render() {
    const { route, rest } = parseHash();
    state.currentLessonId = route === 'lesson' ? rest[0] : null;
    state.currentModuleId = route === 'module' ? rest[0] : null;
    state.currentLabId = route === 'lab' ? rest[0] : null;

    renderSidebar();
    updateHeaderProgress();

    if (route === 'lesson') {
      renderLesson(rest[0]);
    } else if (route === 'module') {
      renderModuleIntro(rest[0]);
    } else if (route === 'map') {
      renderMap();
    } else if (route === 'glossary') {
      renderGlossary();
    } else if (route === 'resources') {
      renderResources();
    } else if (route === 'lab') {
      renderSystemLab(rest[0]);
    } else {
      renderHome();
    }

    closeMobileSidebar();
    window.scrollTo(0, 0);
  }

  function renderHome() {
    setDocumentTitle('');
    const start = firstAvailable || lessons[0];
    const counts = COURSE.meta?.counts || {};
    const last = state.progress.lastLesson ? lessonById.get(state.progress.lastLesson) : null;
    const resume = last && last.hasContent ? last : start;

    main.innerHTML = `
      <section class="home-hero">
        <p class="eyebrow">Free interactive edition</p>
        <h1>Learn system design in the order <em>real systems need it.</em></h1>
        <p class="lead">
          A problem first, then the idea that solves it, then the tradeoff you pay for it.
          Start with one clinic, then follow the same system as it grows.
        </p>
        <div class="hero-actions">
          <a class="btn primary" href="#/lesson/${encodeURIComponent(resume?.id || '')}">
            ${last ? `Continue with ${escapeHtml(last.number)} ${escapeHtml(last.title)}` : `Start with ${escapeHtml(start?.number || '1.1')}`}
          </a>
          <a class="btn" href="#/map">See the full path</a>
        </div>
        <div class="stats-row">
          <div class="stat"><strong>${counts.modules || 19}</strong><span>modules</span></div>
          <div class="stat"><strong>${counts.pathUnits || 137}</strong><span>path units</span></div>
          <div class="stat"><strong>${counts.labs || 18}</strong><span>labs</span></div>
          <div class="stat"><strong>${counts.systemLabs || 16}</strong><span>system labs</span></div>
        </div>
        <p class="build-note">
          <strong>${counts.writtenLessons || 0} of ${counts.pathUnits || 137} path units are written.</strong>
          The course is being added module by module, in order. Any lesson that is not written yet opens as a planned
          page with its outline summary, so you can still see where it fits.
        </p>
      </section>

      <div class="track-grid">
        <article class="track-card">
          <h2>The Path</h2>
          <p>Foundations, caching, scaling, databases, queues, rate limits, replication and more.</p>
          <div class="count">Modules 1–18</div>
          <a href="#/map">Open the path →</a>
        </article>
        <article class="track-card">
          <h2>Under the Hood</h2>
          <p>Consistent hashing, Bloom filters, Raft, CRDTs and the algorithms under every big system.</p>
          <div class="count">Module 19 · 19 simulations</div>
          <a href="#/map">See simulations →</a>
        </article>
        <article class="track-card">
          <h2>System Labs</h2>
          <p>Design a URL shortener, a chat app, a payment system and other systems you use every day.</p>
          <div class="count">16 system labs</div>
          <a href="#/map">See system labs →</a>
        </article>
      </div>

      <h2 class="section-title">How to use this course</h2>
      <ul class="how-list">
        <li><strong>Read the problem first.</strong> Every lesson starts with a concrete situation, not a definition.</li>
        <li><strong>Predict before you reveal.</strong> Use the quizzes and discussions to commit to an answer.</li>
        <li><strong>Draw the tradeoff.</strong> If you cannot say what you gave up, the design is not finished.</li>
        <li><strong>Do the labs.</strong> The lab is where the ideas become your own.</li>
      </ul>

      <div class="source-note">
        This is an independent, free study edition. The public syllabus at
        <a href="https://sys0.in/path" target="_blank" rel="noreferrer">sys0.in/path</a>
        is used as a topic map only. All lesson text, diagrams, quizzes and exercises here are original.
        The site's locked lessons are not reproduced.
      </div>
    `;
  }

  function renderMap() {
    setDocumentTitle('Course map');
    const pathParts = parts.filter((part) => part.number !== 3);
    const underTheHood = parts.filter((part) => part.number === 3);

    const partHtml = (part) => `
      <section class="map-part">
        <h2>Part ${part.number} · ${escapeHtml(part.title)}</h2>
        ${(part.modules || [])
          .map((module) => {
            const fullId = `part-${part.number}-${module.id}`;
            const introItem = module.hasIntro
              ? `
                <li>
                  <span class="num">→</span>
                  <a href="#/module/${encodeURIComponent(fullId)}">Module overview</a>
                </li>
              `
              : '';
            return `
              <details class="map-module" ${module.number === 1 ? 'open' : ''}>
                <summary>
                  <span class="badge ${module.status === 'available' ? 'green' : ''}">${String(module.number).padStart(2, '0')}</span>
                  <h3>${escapeHtml(module.title)}</h3>
                  <span class="module-count">${module.lessons?.length || 0} lessons</span>
                </summary>
                <ul class="map-lessons">
                  ${introItem}
                  ${(module.lessons || [])
                    .map(
                      (lesson) => `
                        <li>
                          <span class="num">${escapeHtml(lesson.number)}</span>
                          <a href="#/lesson/${encodeURIComponent(lesson.id)}">${escapeHtml(lesson.title)}</a>
                          ${isComplete(lesson.id) ? '<span class="done">done</span>' : ''}
                        </li>
                      `,
                    )
                    .join('')}
                </ul>
              </details>
            `;
          })
          .join('')}
      </section>
    `;

    main.innerHTML = `
      <div class="lesson-header">
        <div class="lesson-kicker"><span class="badge accent">Course map</span></div>
        <h1>The whole path</h1>
        <p class="summary">${COURSE.meta?.counts?.pathUnits || 137} path units, ${COURSE.meta?.counts?.labs || 18} labs, ${COURSE.meta?.counts?.simulations || 19} simulations and ${systemLabs.length} system labs.</p>
      </div>
      ${pathParts.map(partHtml).join('')}
      ${underTheHood.map(partHtml).join('')}
      <section class="map-part">
        <h2>System Labs</h2>
        ${systemLabs
          .map(
            (lab) => `
              <details class="map-module">
                <summary>
                  <span class="badge">${escapeHtml(lab.difficulty || 'lab')}</span>
                  <h3>${escapeHtml(lab.title)}</h3>
                  <span class="module-count">${escapeHtml(lab.category || '')}</span>
                </summary>
                <div style="padding:0 14px 14px;color:var(--text-soft);font-size:13px">
                  ${escapeHtml(lab.summary || '')}
                  ${lab.steps ? `<div style="margin-top:6px;color:var(--muted);font-size:11px">${escapeHtml(lab.steps)}</div>` : ''}
                  <div style="margin-top:8px"><a href="#/lab/${encodeURIComponent(lab.id)}">Open lab →</a></div>
                </div>
              </details>
            `,
          )
          .join('')}
      </section>
    `;
  }

  function lessonNeighbours(lesson) {
    const moduleLessons = lesson.module.lessons || [];
    const position = moduleLessons.findIndex((item) => item.id === lesson.id);
    let prev = null;
    let next = null;

    if (position === 0) {
      if (lesson.module.hasIntro) {
        prev = {
          href: `#/module/${encodeURIComponent(`part-${lesson.part.number}-${lesson.module.id}`)}`,
          label: `Module overview · ${lesson.module.title}`,
        };
      }
    } else if (position > 0) {
      const item = moduleLessons[position - 1];
      prev = { href: `#/lesson/${encodeURIComponent(item.id)}`, label: `${item.number} ${item.title}` };
    }

    if (position >= 0 && position < moduleLessons.length - 1) {
      const item = moduleLessons[position + 1];
      next = { href: `#/lesson/${encodeURIComponent(item.id)}`, label: `${item.number} ${item.title}` };
    } else {
      const modulePosition = modules.findIndex((item) => item.id === lesson.module.id);
      const nextModule = modules[modulePosition + 1];
      if (nextModule?.hasIntro) {
        next = {
          href: `#/module/${encodeURIComponent(nextModule.fullId)}`,
          label: `Module ${nextModule.number} · ${nextModule.title}`,
        };
      }
    }

    return { prev, next };
  }

  function moduleNeighbours(module) {
    const position = modules.findIndex((item) => item.id === module.id);
    let prev = null;
    let next = null;

    for (let index = position - 1; index >= 0; index -= 1) {
      if (modules[index].hasIntro) {
        prev = {
          href: `#/module/${encodeURIComponent(modules[index].fullId)}`,
          label: `Module ${modules[index].number} · ${modules[index].title}`,
        };
        break;
      }
    }
    for (let index = position + 1; index < modules.length; index += 1) {
      if (modules[index].hasIntro) {
        next = {
          href: `#/module/${encodeURIComponent(modules[index].fullId)}`,
          label: `Module ${modules[index].number} · ${modules[index].title}`,
        };
        break;
      }
    }

    return { prev, next };
  }

  function renderModuleIntro(moduleId) {
    const module = moduleById.get(moduleId);
    if (!module || !module.hasIntro) {
      renderNotFound('Module overview');
      return;
    }

    setDocumentTitle(`Module ${module.number} · ${module.title}`);
    const intro = module.intro;
    const moduleLessons = module.lessons || [];
    const done = moduleLessons.filter((lesson) => isComplete(lesson.id)).length;
    const totalMinutes = moduleLessons.reduce((sum, lesson) => sum + (lesson.minutes || 0), 0);
    const percent = moduleLessons.length ? Math.round((done / moduleLessons.length) * 100) : 0;
    const nextUnit =
      moduleLessons.find((lesson) => lesson.hasContent && !isComplete(lesson.id)) ||
      moduleLessons.find((lesson) => lesson.hasContent) ||
      moduleLessons[0];
    const { prev, next } = moduleNeighbours(module);

    main.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="#/home">Home</a><span class="sep">/</span>
        <a href="#/map">Course map</a><span class="sep">/</span>
        <span>Module ${escapeHtml(String(module.number).padStart(2, '0'))}</span>
      </nav>

      <header class="lesson-header">
        <div class="lesson-kicker">
          <span class="badge accent">${escapeHtml(module.part.title)}</span>
          <span class="badge">Module ${escapeHtml(String(module.number).padStart(2, '0'))}</span>
          <span class="badge green">Overview</span>
          <span class="badge">${totalMinutes} min total</span>
        </div>
        <h1>${escapeHtml(module.title)}</h1>
        <p class="summary">${escapeHtml(module.summary || intro.summary || '')}</p>
        <div class="lesson-meta">
          <span>${moduleLessons.length} units</span>
          <span>${done} complete</span>
        </div>
      </header>

      <article class="lesson-content">${intro.html}</article>

      <section class="module-units" aria-labelledby="module-units-title">
        <div class="module-units-head">
          <h2 id="module-units-title">Lessons in this module</h2>
          <span>${done} of ${moduleLessons.length} complete</span>
        </div>
        <div class="module-progress" role="img" aria-label="${percent}% of the module complete">
          <span style="width:${percent}%"></span>
        </div>
        <ol class="module-unit-list">
          ${moduleLessons
            .map(
              (lesson) => `
                <li class="${isComplete(lesson.id) ? 'complete' : ''}">
                  <a href="#/lesson/${encodeURIComponent(lesson.id)}">
                    <span class="unit-num">${escapeHtml(lesson.number)}</span>
                    <span class="unit-main">
                      <strong>${escapeHtml(lesson.title)}</strong>
                      <span>${escapeHtml(lesson.summary || '')}</span>
                    </span>
                    <span class="unit-meta">
                      ${escapeHtml(lesson.kind)} · ${lesson.minutes}m${lesson.hasContent ? '' : ' · planned'}
                    </span>
                  </a>
                </li>
              `,
            )
            .join('')}
        </ol>
      </section>

      <footer class="lesson-footer">
        <div class="lesson-actions">
          ${
            nextUnit
              ? `<a class="btn primary" href="#/lesson/${encodeURIComponent(nextUnit.id)}">${
                  done ? `Continue with ${escapeHtml(nextUnit.number)}` : 'Start the module'
                }</a>`
              : ''
          }
          <span class="spacer"></span>
          <button class="btn ghost small" id="copy-link">Copy link</button>
        </div>

        <div class="prev-next">
          ${
            prev
              ? `<a href="${prev.href}"><span>Previous</span>${escapeHtml(prev.label)}</a>`
              : '<span></span>'
          }
          ${
            next
              ? `<a class="next" href="${next.href}"><span>Next</span>${escapeHtml(next.label)}</a>`
              : '<span></span>'
          }
        </div>
      </footer>
    `;

    const copyLink = document.getElementById('copy-link');
    copyLink?.addEventListener('click', async () => {
      const ok = await copyText(window.location.href);
      showToast(ok ? 'Link copied' : 'Could not copy the link');
    });

    setupCodeCopy(main);
    setupDiagramZoom(main);
    renderMermaid(main);
  }

  function renderLesson(lessonId) {
    const lesson = lessonById.get(lessonId);
    if (!lesson) {
      renderNotFound('Lesson');
      return;
    }

    setDocumentTitle(lesson.title);

    if (!lesson.hasContent) {
      renderPlanned(lesson);
      return;
    }

    state.progress.lastLesson = lesson.id;
    saveProgress();

    const p = progressFor(lesson.id);
    const quizScores = p.quiz || {};
    const { prev, next } = lessonNeighbours(lesson);

    main.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="#/home">Home</a><span class="sep">/</span>
        <a href="#/map">${escapeHtml(lesson.part.title)}</a><span class="sep">/</span>
        <span>${escapeHtml(lesson.module.number)} ${escapeHtml(lesson.module.title)}</span>
      </nav>

      <header class="lesson-header">
        <div class="lesson-kicker">
          <span class="badge accent">${escapeHtml(lesson.part.title)}</span>
          <span class="badge">${escapeHtml(lesson.module.number)}.${escapeHtml(lesson.number.split('.')[1] || '')}</span>
          <span class="badge ${lesson.kind === 'lab' ? 'amber' : 'green'}">${escapeHtml(lesson.kind)}</span>
          <span class="badge">${lesson.minutes} min</span>
        </div>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="summary">${escapeHtml(lesson.summary || '')}</p>
        <div class="lesson-meta">
          <span>Module ${escapeHtml(String(lesson.module.number).padStart(2, '0'))} · ${escapeHtml(lesson.module.title)}</span>
          <span>${isComplete(lesson.id) ? 'Completed' : 'In progress'}</span>
        </div>
      </header>

      <article class="lesson-content">${lesson.html}</article>

      <footer class="lesson-footer">
        <div class="lesson-actions">
          <button class="btn ${isComplete(lesson.id) ? 'green' : 'primary'}" id="mark-complete">
            ${isComplete(lesson.id) ? 'Completed ✓' : 'Mark complete'}
          </button>
          <span class="spacer"></span>
          <button class="btn ghost small" id="copy-link">Copy link</button>
        </div>

        <div class="notes-panel">
          <h3>Your notes</h3>
          <p>Write the assumptions you made, the tradeoff you chose, and what you would ask next. Saved only in this browser.</p>
          <textarea id="lesson-notes" placeholder="What did you notice? What would you change at 10× the users?">${escapeHtml(p.notes || '')}</textarea>
          <div class="notes-status" id="notes-status">${p.notes ? 'Saved locally' : 'Not saved yet'}</div>
        </div>

        <div class="prev-next">
          ${
            prev
              ? `<a href="${prev.href}"><span>Previous</span>${escapeHtml(prev.label)}</a>`
              : '<span></span>'
          }
          ${
            next
              ? `<a class="next" href="${next.href}"><span>Next</span>${escapeHtml(next.label)}</a>`
              : '<span></span>'
          }
        </div>
      </footer>
    `;

    attachLessonHandlers(lesson, quizScores);
    renderQuizzes(main, lesson);
    renderWidgets(main, lesson);
    setupCodeCopy(main);
    setupDiagramZoom(main);
    renderMermaid(main);
  }

  function renderPlanned(lesson) {
    setDocumentTitle(lesson.title);
    const index = lessons.findIndex((item) => item.id === lesson.id);
    const { prev, next } = lessonNeighbours(lesson);
    const nextAvailable = lessons.slice(index + 1).find((item) => item.hasContent);
    const target = nextAvailable || firstAvailable;

    main.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="#/home">Home</a><span class="sep">/</span>
        <a href="#/map">Course map</a><span class="sep">/</span>
        <span>${escapeHtml(lesson.module.number)} ${escapeHtml(lesson.module.title)}</span>
      </nav>
      <div class="lesson-header">
        <div class="lesson-kicker">
          <span class="badge amber">Planned</span>
          <span class="badge">${escapeHtml(lesson.number)}</span>
          <span class="badge">${lesson.minutes} min</span>
        </div>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="summary">${escapeHtml(lesson.summary || '')}</p>
      </div>
      <div class="planned-card">
        <h2>This lesson is in the outline, not written yet</h2>
        <p>
          The course map is complete, but this lesson body is still a draft slot. Lessons are being written
          one module at a time, in order. The unit you are on is outlined, not finished.
        </p>
        <p>
          You can still read the summary above, mark the lesson for later, or jump to the
          nearest written lesson.
        </p>
        <div class="hero-actions">
          ${
            target
              ? `<a class="btn primary" href="#/lesson/${encodeURIComponent(target.id)}">Go to ${escapeHtml(target.number)} ${escapeHtml(target.title)}</a>`
              : ''
          }
          <a class="btn" href="#/map">Back to the course map</a>
        </div>
      </div>
      <div class="prev-next">
        ${prev ? `<a href="${prev.href}"><span>Previous</span>${escapeHtml(prev.label)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="${next.href}"><span>Next</span>${escapeHtml(next.label)}</a>` : '<span></span>'}
      </div>
    `;
  }

  function renderSystemLab(labId) {
    setDocumentTitle('System lab');
    const lab = systemLabs.find((item) => item.id === labId || item.id === decodeURIComponent(labId));
    if (!lab) {
      renderNotFound('System lab');
      return;
    }
    setDocumentTitle(lab.title);

    main.innerHTML = `
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="#/home">Home</a><span class="sep">/</span>
        <a href="#/map">System Labs</a><span class="sep">/</span>
        <span>${escapeHtml(lab.title)}</span>
      </nav>
      <div class="lesson-header">
        <div class="lesson-kicker">
          <span class="badge amber">System lab</span>
          <span class="badge">${escapeHtml(lab.difficulty || '')}</span>
          ${lab.steps ? `<span class="badge">${escapeHtml(lab.steps)}</span>` : ''}
        </div>
        <h1>${escapeHtml(lab.title)}</h1>
        <p class="summary">${escapeHtml(lab.summary || '')}</p>
      </div>
      <div class="planned-card">
        <h2>${escapeHtml(lab.category || 'Design lab')}</h2>
        <p>
          This system lab is part of the full path. The interactive canvas, step-by-step
          checklist, load test and reference design will be added after the core path.
        </p>
        <p>
          For now, treat it as a design brief: write the requirements, estimate the load,
          sketch the API, and list the first three bottlenecks.
        </p>
        <div class="hero-actions">
          <a class="btn primary" href="#/lesson/${encodeURIComponent(firstAvailable?.id || '')}">Continue the path</a>
          <a class="btn" href="#/map">See all system labs</a>
        </div>
      </div>
    `;
  }

  function renderGlossary() {
    setDocumentTitle('Glossary');
    main.innerHTML = `
      <div class="lesson-header">
        <div class="lesson-kicker"><span class="badge accent">Reference</span></div>
        <h1>Glossary</h1>
        <p class="summary">The terms that keep coming back. Short definitions, with the lesson where each one matters.</p>
      </div>
      <dl>
        ${glossary
          .map(
            (item) => `
              <div class="glossary-item">
                <dt>${escapeHtml(item.term)}</dt>
                <dd>${escapeHtml(item.definition)}</dd>
              </div>
            `,
          )
          .join('')}
      </dl>
    `;
  }

  function renderResources() {
    setDocumentTitle('Free reading');
    main.innerHTML = `
      <div class="lesson-header">
        <div class="lesson-kicker"><span class="badge accent">Reference</span></div>
        <h1>Free reading</h1>
        <p class="summary">Open docs, papers and guides that go deeper than this course. No paywall links.</p>
      </div>
      <div class="resource-grid">
        ${resources
          .map(
            (item) => `
              <article class="resource-card">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open →</a>
              </article>
            `,
          )
          .join('')}
      </div>
    `;
  }

  function renderNotFound(what) {
    setDocumentTitle(`${what} not found`);
    main.innerHTML = `
      <div class="planned-card">
        <h2>${escapeHtml(what)} not found</h2>
        <p>The link may be outdated. Open the course map to find the lesson you want.</p>
        <a class="btn primary" href="#/map">Open the course map</a>
      </div>
    `;
  }

  // ---------- Lesson handlers ----------

  function attachLessonHandlers(lesson, quizScores) {
    const button = document.getElementById('mark-complete');
    if (button) {
      button.addEventListener('click', () => {
        const p = progressFor(lesson.id);
        p.completed = !p.completed;
        p.completedAt = p.completed ? new Date().toISOString() : null;
        saveProgress();
        render();
        showToast(p.completed ? 'Lesson marked complete' : 'Lesson marked incomplete');
      });
    }

    const copyLink = document.getElementById('copy-link');
    if (copyLink) {
      copyLink.addEventListener('click', async () => {
        const ok = await copyText(window.location.href);
        showToast(ok ? 'Link copied' : 'Could not copy the link');
      });
    }

    const notes = document.getElementById('lesson-notes');
    const status = document.getElementById('notes-status');
    if (notes) {
      notes.addEventListener('input', () => {
        const p = progressFor(lesson.id);
        p.notes = notes.value;
        status.textContent = 'Saving…';
        clearTimeout(state.notesTimer);
        state.notesTimer = setTimeout(() => {
          saveProgress();
          status.textContent = 'Saved locally';
        }, 450);
      });
    }

    // Discussion copy buttons.
    document.querySelectorAll('.copy-discussion').forEach((copyButton) => {
      copyButton.addEventListener('click', async () => {
        const discussion = copyButton.closest('.discussion');
        const text = discussion ? discussion.innerText.replace(/^Discuss\s*/i, '').trim() : '';
        const ok = await copyText(`Discussion prompt from “${lesson.title}”:\n\n${text}`);
        showToast(ok ? 'Discussion prompt copied' : 'Could not copy the prompt');
      });
    });
  }

  // ---------- Quizzes ----------

  function renderQuizzes(root, lesson) {
    root.querySelectorAll('.quiz-block').forEach((block) => {
      const quizId = block.dataset.quizId;
      const questions = COURSE.quizzes?.[quizId];
      if (!Array.isArray(questions) || !questions.length) {
        block.remove();
        return;
      }

      block.innerHTML = `
        <h3>Check yourself</h3>
        <p class="quiz-intro">Choose one answer per question. Explanations appear after you check your answers.</p>
        <div class="quiz-questions">
          ${questions
            .map(
              (question, qIndex) => `
                <div class="quiz-question" data-qindex="${qIndex}">
                  <p>${qIndex + 1}. ${escapeHtml(question.question)}</p>
                  <div class="quiz-options">
                    ${(question.options || [])
                      .map(
                        (option, oIndex) => `
                          <label class="quiz-option">
                            <input type="radio" name="quiz-${escapeHtml(quizId)}-q${qIndex}" value="${oIndex}">
                            <span>${escapeHtml(option)}</span>
                          </label>
                        `,
                      )
                      .join('')}
                  </div>
                  <p class="quiz-feedback" hidden></p>
                </div>
              `,
            )
            .join('')}
        </div>
        <div class="quiz-actions">
          <button class="btn primary quiz-submit" type="button">Check answers</button>
          <button class="btn quiz-retry" type="button" hidden>Try again</button>
          <span class="quiz-score"></span>
        </div>
      `;

      const submit = block.querySelector('.quiz-submit');
      const retry = block.querySelector('.quiz-retry');
      const score = block.querySelector('.quiz-score');
      const p = progressFor(lesson.id);
      const previous = p.quiz?.[quizId];
      if (previous) {
        score.textContent = `Previous score: ${previous.score}/${previous.total}`;
      }

      const clear = () => {
        block.querySelectorAll('.quiz-question').forEach((questionEl) => {
          questionEl.querySelectorAll('.quiz-option').forEach((optionEl) => {
            optionEl.classList.remove('correct', 'wrong');
            const input = optionEl.querySelector('input');
            if (input) input.checked = false;
          });
          const feedback = questionEl.querySelector('.quiz-feedback');
          feedback.hidden = true;
          feedback.textContent = '';
          feedback.className = 'quiz-feedback';
        });
        score.textContent = previous ? `Previous score: ${previous.score}/${previous.total}` : '';
        submit.hidden = false;
        retry.hidden = true;
      };

      submit.addEventListener('click', () => {
        let correctCount = 0;
        let answeredAll = true;

        questions.forEach((question, qIndex) => {
          const questionEl = block.querySelector(`.quiz-question[data-qindex="${qIndex}"]`);
          const selected = questionEl.querySelector('input:checked');
          const feedback = questionEl.querySelector('.quiz-feedback');

          if (!selected) {
            answeredAll = false;
            feedback.hidden = false;
            feedback.className = 'quiz-feedback wrong';
            feedback.textContent = 'Choose an answer first.';
            return;
          }

          const chosen = Number(selected.value);
          const isCorrect = chosen === question.answer;
          if (isCorrect) correctCount += 1;

          questionEl.querySelectorAll('.quiz-option').forEach((optionEl) => {
            const input = optionEl.querySelector('input');
            const value = Number(input.value);
            optionEl.classList.remove('correct', 'wrong');
            if (value === question.answer) optionEl.classList.add('correct');
            if (value === chosen && !isCorrect) optionEl.classList.add('wrong');
          });

          feedback.hidden = false;
          feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
          feedback.textContent = isCorrect
            ? `Correct. ${question.explanation || ''}`
            : `Not quite. The answer is ${question.options?.[question.answer] ?? ''}. ${question.explanation || ''}`;
        });

        if (!answeredAll) {
          score.textContent = 'Answer every question to get a score.';
          return;
        }

        score.textContent = `Score: ${correctCount}/${questions.length}`;
        p.quiz = p.quiz || {};
        p.quiz[quizId] = {
          score: correctCount,
          total: questions.length,
          at: new Date().toISOString(),
        };
        saveProgress();
        submit.hidden = true;
        retry.hidden = false;
      });

      retry.addEventListener('click', clear);
    });
  }

  // ---------- Widgets ----------

  const REQUIREMENTS = [
    { text: 'Patients can book an available appointment slot.', category: 'functional', why: 'It describes a behavior the system must perform.' },
    { text: 'The booking page responds in under 300 ms at p99.', category: 'non-functional', why: 'It describes a quality target, not a behavior.' },
    { text: 'Staff can block a doctor’s holiday.', category: 'functional', why: 'It describes a behavior the system must perform.' },
    { text: 'The system should be available 99.9% of the time.', category: 'non-functional', why: 'It describes a quality target, not a behavior.' },
    { text: 'Patients receive a reminder 24 hours before the visit.', category: 'functional', why: 'It describes a behavior the system must perform.' },
    { text: 'No slot can be double-booked.', category: 'non-functional', why: 'It describes a consistency and correctness requirement.' },
    { text: 'The clinic can see today’s appointments in one screen.', category: 'functional', why: 'It describes a behavior the system must perform.' },
    { text: 'The monthly infrastructure cost stays under $50.', category: 'non-functional', why: 'It describes a cost constraint, not a behavior.' },
    { text: 'A patient can cancel and free the slot.', category: 'functional', why: 'It describes a behavior the system must perform.' },
    { text: 'Patient phone numbers are encrypted at rest.', category: 'non-functional', why: 'It describes a security and privacy requirement.' },
  ];

  function renderWidgets(root, lesson) {
    root.querySelectorAll('.widget').forEach((el) => {
      const name = el.dataset.widget;
      if (name === 'requirements-sorter') renderRequirementsSorter(el);
      if (name === 'tradeoff-explorer') renderTradeoffExplorer(el);
      if (name === 'request-trace') renderRequestTrace(el);
      if (name === 'index-lab') renderIndexLab(el);
      if (name === 'db-picker') renderDatabasePicker(el);
      if (name === 'tail-latency') renderTailLatency(el);
      if (name === 'cache-hit-rate') renderCacheHitRate(el);
      if (name === 'cache-placement') renderCachePlacement(el);
      if (name === 'cache-patterns') renderCachePatterns(el);
      if (name === 'cache-staleness') renderCacheStaleness(el);
      if (name === 'cache-eviction') renderCacheEviction(el);
      if (name === 'cache-failure') renderCacheFailure(el);
      if (name === 'cache-cliff') renderCacheCliff(el);
      if (name === 'scale-vertical') renderScaleVertical(el);
      if (name === 'scale-horizontal') renderScaleHorizontal(el);
      if (name === 'lb-algorithms') renderLbAlgorithms(el);
      if (name === 'session-affinity') renderSessionAffinity(el);
      if (name === 'pool-math') renderPoolMath(el);
      if (name === 'upload-path') renderUploadPath(el);
      if (name === 'cdn-offload') renderCdnOffload(el);
      if (name === 'two-server-proof') renderTwoServerProof(el);
      if (name === 'replica-routing') renderReplicaRouting(el);
      if (name === 'replica-lag') renderReplicaLag(el);
      if (name === 'failover-timeline') renderFailoverTimeline(el);
      if (name === 'backup-restore') renderBackupRestore(el);
      if (name === 'replica-proof') renderReplicaProof(el);
      if (name === 'lab-checklist') renderLabChecklist(el, lesson);
    });
  }

  function renderRequirementsSorter(root) {
    let answered = 0;
    let correct = 0;

    root.innerHTML = `
      <div class="widget-card">
        <h3>Sort the requirements</h3>
        <p class="hint">Functional says what the system does. Non-functional says how well it must do it.</p>
        <div class="sorter-items">
          ${REQUIREMENTS.map(
            (item, index) => `
              <div class="sorter-item" data-index="${index}">
                <div class="sorter-text">${escapeHtml(item.text)}</div>
                <button class="btn small" type="button" data-choice="functional">Functional</button>
                <button class="btn small" type="button" data-choice="non-functional">Non-functional</button>
                <div class="why" hidden></div>
              </div>
            `,
          ).join('')}
        </div>
        <div class="sorter-score" aria-live="polite">0 of ${REQUIREMENTS.length} sorted</div>
        <button class="btn small ghost sorter-reset" type="button">Reset</button>
      </div>
    `;

    const score = root.querySelector('.sorter-score');

    const handleChoice = (event) => {
      const button = event.target.closest('button[data-choice]');
      if (!button) return;
      const itemEl = button.closest('.sorter-item');
      if (!itemEl || itemEl.dataset.done === '1') return;
      const item = REQUIREMENTS[Number(itemEl.dataset.index)];
      const choice = button.dataset.choice;
      const isCorrect = choice === item.category;
      itemEl.dataset.done = '1';
      itemEl.classList.add(isCorrect ? 'correct' : 'wrong');
      const why = itemEl.querySelector('.why');
      why.hidden = false;
      why.textContent = isCorrect
        ? `Correct. ${item.why}`
        : `Not quite. This is ${item.category}. ${item.why}`;
      answered += 1;
      if (isCorrect) correct += 1;
      score.textContent = `${answered} of ${REQUIREMENTS.length} sorted · ${correct} correct`;
    };

    root.addEventListener('click', handleChoice);
    root.querySelector('.sorter-reset').addEventListener('click', () => {
      root.querySelectorAll('.sorter-item').forEach((itemEl) => {
        itemEl.dataset.done = '';
        itemEl.classList.remove('correct', 'wrong');
        const why = itemEl.querySelector('.why');
        why.hidden = true;
        why.textContent = '';
      });
      answered = 0;
      correct = 0;
      score.textContent = `0 of ${REQUIREMENTS.length} sorted`;
    });
  }

  function renderTradeoffExplorer(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Choose your reminder tradeoff</h3>
        <p class="hint">Move the sliders. The recommendation changes with your priorities.</p>
        <div class="slider-row">
          <label for="tradeoff-cost">Cost sensitivity</label>
          <input id="tradeoff-cost" type="range" min="0" max="100" value="55">
          <output for="tradeoff-cost">55</output>
        </div>
        <div class="slider-row">
          <label for="tradeoff-reliability">Reliability</label>
          <input id="tradeoff-reliability" type="range" min="0" max="100" value="60">
          <output for="tradeoff-reliability">60</output>
        </div>
        <div class="slider-row">
          <label for="tradeoff-speed">Immediacy</label>
          <input id="tradeoff-speed" type="range" min="0" max="100" value="45">
          <output for="tradeoff-speed">45</output>
        </div>
        <div class="tradeoff-result" aria-live="polite">
          <strong></strong>
          <p></p>
        </div>
        <button class="btn small ghost tradeoff-reset" type="button">Reset</button>
      </div>
    `;

    const cost = root.querySelector('#tradeoff-cost');
    const reliability = root.querySelector('#tradeoff-reliability');
    const speed = root.querySelector('#tradeoff-speed');
    const resultTitle = root.querySelector('.tradeoff-result strong');
    const resultBody = root.querySelector('.tradeoff-result p');

    const update = () => {
      const costValue = Number(cost.value);
      const reliabilityValue = Number(reliability.value);
      const speedValue = Number(speed.value);

      root.querySelector('output[for="tradeoff-cost"]').textContent = costValue;
      root.querySelector('output[for="tradeoff-reliability"]').textContent = reliabilityValue;
      root.querySelector('output[for="tradeoff-speed"]').textContent = speedValue;

      let title;
      let body;

      if (reliabilityValue >= 70 && costValue <= 60) {
        title = 'SMS, with an email fallback';
        body = 'You are paying for reliability. SMS arrives on almost every phone, but each message costs money and delivery is not instant. Keep email as a free fallback for patients who opt in.';
      } else if (costValue >= 70 && reliabilityValue < 70) {
        title = 'Email only';
        body = 'You are optimizing for cost. Email is cheap and gives you a paper trail, but it is easier to miss and slower. Accept a higher no-show rate or add a staff phone call for high-risk appointments.';
      } else if (speedValue >= 70 && costValue < 70) {
        title = 'In-app push';
        body = 'You are optimizing for immediacy. Push is fast and effectively free at the margin, but it only works if the patient installs the app and keeps notifications on. It cannot be the only channel.';
      } else {
        title = 'Email first, SMS for high-risk appointments';
        body = 'You are balancing all three. Use cheap email by default, then spend SMS only where a no-show would be expensive: Monday morning, new patients, and people who have missed before.';
      }

      resultTitle.textContent = title;
      resultBody.textContent = body;
    };

    [cost, reliability, speed].forEach((input) => input.addEventListener('input', update));
    root.querySelector('.tradeoff-reset').addEventListener('click', () => {
      cost.value = 55;
      reliability.value = 60;
      speed.value = 45;
      update();
    });
    update();
  }

  const REQUEST_TRACES = {
    slots: {
      label: 'Patient checks tomorrow’s slots',
      summary: 'One screen, three reads. Nothing is changed yet.',
      requests: [
        { method: 'GET', path: '/doctors?clinic=rao-clinic', why: 'Which doctors work at this clinic?' },
        { method: 'GET', path: '/doctors/rao/slots?date=2026-11-17', why: 'Free slots for the chosen doctor and day.' },
        { method: 'GET', path: '/clinics/rao-clinic/hours', why: 'Opening hours, so the UI can grey out closed days.' },
      ],
    },
    book: {
      label: 'Patient books 10:00 with Dr. Rao',
      summary: 'One write, wrapped in a transaction, followed by an async side effect.',
      requests: [
        { method: 'POST', path: '/appointments', why: 'Create the booking only if the slot is still free.' },
        { method: 'GET', path: '/appointments/apt_8812', why: 'Read back the confirmed appointment for the screen.' },
        { method: 'QUEUE', path: 'reminders:send-24h', why: 'Hand the reminder to a worker instead of blocking the response.' },
      ],
    },
    cancel: {
      label: 'Patient cancels the appointment',
      summary: 'One write, then a refresh so the freed slot appears again.',
      requests: [
        { method: 'DELETE', path: '/appointments/apt_8812', why: 'Cancel the row and record who cancelled it.' },
        { method: 'GET', path: '/doctors/rao/slots?date=2026-11-17', why: 'Show the slot as free again.' },
      ],
    },
    staff: {
      label: 'Receptionist opens today’s list',
      summary: 'A read-heavy screen. Pagination and filters keep it small.',
      requests: [
        { method: 'GET', path: '/appointments?date=2026-11-17&status=booked&limit=50', why: 'Today’s bookings, one page at a time.' },
        { method: 'GET', path: '/patients?ids=…', why: 'Names and phone numbers for the visible appointments.' },
        { method: 'GET', path: '/doctors', why: 'Doctor names for the schedule columns.' },
      ],
    },
  };

  function renderRequestTrace(root) {
    const keys = Object.keys(REQUEST_TRACES);
    root.innerHTML = `
      <div class="widget-card">
        <h3>Trace one user action</h3>
        <p class="hint">A button press is not one request. Pick an action and see the work behind it.</p>
        <div class="trace-actions">
          ${keys
            .map(
              (key, index) =>
                `<button class="btn small${index === 0 ? ' primary' : ''}" type="button" data-trace="${key}">${escapeHtml(REQUEST_TRACES[key].label)}</button>`,
            )
            .join('')}
        </div>
        <div class="trace-summary" aria-live="polite"></div>
        <ol class="trace-list"></ol>
      </div>
    `;

    const summary = root.querySelector('.trace-summary');
    const list = root.querySelector('.trace-list');

    const show = (key) => {
      const trace = REQUEST_TRACES[key];
      if (!trace) return;
      root.querySelectorAll('button[data-trace]').forEach((button) => {
        button.classList.toggle('primary', button.dataset.trace === key);
      });
      summary.textContent = trace.summary;
      list.innerHTML = trace.requests
        .map(
          (request) => `
            <li>
              <span class="method ${request.method.toLowerCase()}">${request.method}</span>
              <code>${escapeHtml(request.path)}</code>
              <span class="trace-why">${escapeHtml(request.why)}</span>
            </li>
          `,
        )
        .join('');
    };

    root.querySelectorAll('button[data-trace]').forEach((button) => {
      button.addEventListener('click', () => show(button.dataset.trace));
    });
    show(keys[0]);
  }

  const INDEX_ROWS = [1_000, 10_000, 100_000, 500_000, 1_000_000, 5_000_000, 20_000_000];
  const INDEX_QUERIES = {
    unique: { label: 'WHERE phone = ?', matchCount: 1, indexable: true, note: 'A unique lookup returns one row.' },
    range: { label: 'WHERE created_at >= ?', matches: 0.02, indexable: true, note: 'A range scan reads only the matching slice.' },
    composite: { label: 'WHERE city = ? AND cuisine = ?', matches: 0.005, indexable: true, note: 'A composite index must match the column order.' },
    lowcard: { label: "WHERE status = 'active'", matches: 0.9, indexable: false, note: 'When most rows match, a scan is cheaper than an index.' },
    wildcard: { label: "WHERE name LIKE '%biryani%'", matches: 1, indexable: false, note: 'A leading wildcard prevents a normal B-tree index.' },
  };

  function formatRows(value) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
    return String(Math.round(value));
  }

  function renderIndexLab(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Feel what an index does</h3>
        <p class="hint">Turn the index on and off, change the table size, then change the query shape. Watch what the database must examine.</p>
        <div class="slider-row">
          <label for="index-rows">Table rows</label>
          <input id="index-rows" type="range" min="0" max="6" step="1" value="4">
          <output for="index-rows"></output>
        </div>
        <div class="slider-row">
          <label for="index-query">Query</label>
          <select id="index-query">
            ${Object.entries(INDEX_QUERIES)
              .map(([key, query]) => `<option value="${key}">${escapeHtml(query.label)}</option>`)
              .join('')}
          </select>
          <span></span>
        </div>
        <label class="check-row">
          <input id="index-toggle" type="checkbox" checked>
          <span>Index on the lookup column</span>
        </label>
        <div class="metric-grid">
          <div class="metric"><span>Rows examined</span><strong data-metric="rows"></strong></div>
          <div class="metric"><span>Estimated latency</span><strong data-metric="latency"></strong></div>
          <div class="metric"><span>Write overhead</span><strong data-metric="writes"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const rowsInput = root.querySelector('#index-rows');
    const queryInput = root.querySelector('#index-query');
    const toggle = root.querySelector('#index-toggle');
    const metricRows = root.querySelector('[data-metric="rows"]');
    const metricLatency = root.querySelector('[data-metric="latency"]');
    const metricWrites = root.querySelector('[data-metric="writes"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const rows = INDEX_ROWS[Number(rowsInput.value)];
      const query = INDEX_QUERIES[queryInput.value];
      const hasIndex = toggle.checked && query.indexable;
      const matched = query.matchCount != null ? query.matchCount : Math.max(1, Math.round(rows * query.matches));

      root.querySelector('output[for="index-rows"]').textContent = formatRows(rows);

      let examined;
      let latency;
      if (!toggle.checked) {
        examined = rows;
        latency = 2 + (rows / 1_000_000) * 90;
      } else if (!query.indexable) {
        examined = rows;
        latency = 2 + (rows / 1_000_000) * 90;
      } else {
        examined = matched;
        latency = 0.4 + Math.log2(rows) * 0.05 + matched * 0.01;
      }

      metricRows.textContent = formatRows(examined);
      metricLatency.textContent = latency < 10 ? `${latency.toFixed(1)} ms` : `${Math.round(latency)} ms`;
      metricWrites.textContent = toggle.checked ? 'on every write' : 'none';

      if (!toggle.checked) {
        verdict.textContent = `No index: the database reads ${formatRows(rows)} rows to find ${formatRows(matched)}. Fine at 1,000 rows, painful at 20 million.`;
      } else if (!query.indexable) {
        verdict.textContent = `The index exists, but this query cannot use it. ${query.note}`;
      } else if (examined > rows * 0.3) {
        verdict.textContent = `The index would touch most of the table, so the planner may ignore it. ${query.note}`;
      } else {
        verdict.textContent = `Index used: ${formatRows(examined)} rows examined instead of ${formatRows(rows)}. ${query.note} You pay on every insert and update.`;
      }
    };

    [rowsInput, queryInput, toggle].forEach((input) => input.addEventListener('input', update));
    update();
  }

  const DB_CHOICES = {
    transactions: {
      title: 'PostgreSQL or MySQL',
      body: 'Choose a relational database when the data has rules that must hold across rows: a slot cannot be booked twice, an order total must match its lines, money must not vanish. You get joins, constraints and transactions. You give up easy horizontal writes; plan to scale reads with replicas and writes with a bigger machine before you shard.',
    },
    documents: {
      title: 'A document store such as MongoDB',
      body: 'Choose a document store when one record is read and written as a whole: a product page, a user profile, a CMS article with nested blocks. You get a flexible shape and fast whole-document reads. You give up cheap joins and multi-document transactions; duplicated fields drift, and reporting gets harder.',
    },
    keyvalue: {
      title: 'A key-value store such as Redis or DynamoDB',
      body: 'Choose a key-value store for known keys and very high throughput: sessions, carts, feature flags, idempotency keys. You get predictable single-digit-millisecond reads at scale. You give up ad-hoc queries; if you need a new access pattern, you must build another index or another table.',
    },
    widecolumn: {
      title: 'A wide-column store such as Cassandra or ScyllaDB',
      body: 'Choose wide-column when writes are enormous and the query pattern is known in advance: chat messages, sensor readings, activity feeds. You get linear write scaling and multi-region availability. You give up joins, ad-hoc queries and strong multi-row transactions; the partition key decides everything.',
    },
    search: {
      title: 'A search engine such as Elasticsearch or OpenSearch',
      body: 'Choose a search engine for relevance: full-text search, fuzzy matching, facets and ranking. You get the query language users expect from a search box. You give up being the source of truth; keep the database authoritative and treat the index as a derived copy you can rebuild.',
    },
    graph: {
      title: 'A graph database such as Neo4j',
      body: 'Choose a graph database when relationships are the workload: friend-of-a-friend, fraud rings, permission inheritance, route planning. You get fast multi-hop traversal without recursive joins. You give up simple operational scaling and broad tooling; most teams only add one when traversal depth is the product.',
    },
    timeseries: {
      title: 'A time-series store such as TimescaleDB or ClickHouse',
      body: 'Choose a time-series store for append-only measurements: metrics, prices, sensor data, events. You get compression and fast time-window aggregation. You give up flexible updates and point lookups; correctness comes from the append-only model, not from editing old rows.',
    },
  };

  function renderDatabasePicker(root) {
    const keys = Object.keys(DB_CHOICES);
    root.innerHTML = `
      <div class="widget-card">
        <h3>Name the hardest part of the workload</h3>
        <p class="hint">There is no best database. There is a database whose tradeoffs match your access pattern.</p>
        <div class="choice-grid">
          ${keys
            .map(
              (key, index) => `
                <label class="choice">
                  <input type="radio" name="db-workload" value="${key}" ${index === 0 ? 'checked' : ''}>
                  <span>${escapeHtml(DB_CHOICES[key].title.split(' such as ')[0])}</span>
                </label>
              `,
            )
            .join('')}
        </div>
        <div class="slider-row">
          <label for="db-scale">Data size</label>
          <input id="db-scale" type="range" min="0" max="2" step="1" value="0">
          <output for="db-scale"></output>
        </div>
        <div class="tradeoff-result" aria-live="polite">
          <strong></strong>
          <p></p>
        </div>
      </div>
    `;

    const scaleLabels = ['small', 'large', 'global'];
    const scale = root.querySelector('#db-scale');
    const title = root.querySelector('.tradeoff-result strong');
    const body = root.querySelector('.tradeoff-result p');

    const update = () => {
      const selected = root.querySelector('input[name="db-workload"]:checked')?.value || keys[0];
      const choice = DB_CHOICES[selected];
      const scaleIndex = Number(scale.value);
      root.querySelector('output[for="db-scale"]').textContent = scaleLabels[scaleIndex];

      let extra = '';
      if (scaleIndex === 0) {
        extra = ' At this size the operational cost of a second database is usually higher than the performance you gain. Start with one relational database unless a specific requirement rules it out.';
      } else if (scaleIndex === 2) {
        extra = ' At multi-region size, ask how much inconsistency you can tolerate. Replication lag and conflict resolution become product decisions, not just database settings.';
      }

      title.textContent = choice.title;
      body.textContent = choice.body + extra;
    };

    root.querySelectorAll('input[name="db-workload"]').forEach((input) => input.addEventListener('change', update));
    scale.addEventListener('input', update);
    update();
  }

  function renderTailLatency(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Why the average hides the pain</h3>
        <p class="hint">Most requests are fast. A few are slow. Move the sliders and compare the average with the tail.</p>
        <div class="slider-row">
          <label for="tail-requests">Requests</label>
          <input id="tail-requests" type="range" min="100" max="10000" step="100" value="1000">
          <output for="tail-requests"></output>
        </div>
        <div class="slider-row">
          <label for="tail-slow">Slow requests</label>
          <input id="tail-slow" type="range" min="0.1" max="10" step="0.1" value="1">
          <output for="tail-slow"></output>
        </div>
        <div class="slider-row">
          <label for="tail-ms">Slow latency</label>
          <input id="tail-ms" type="range" min="500" max="5000" step="100" value="2000">
          <output for="tail-ms"></output>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Average</span><strong data-metric="avg"></strong></div>
          <div class="metric"><span>p50</span><strong data-metric="p50"></strong></div>
          <div class="metric"><span>p95</span><strong data-metric="p95"></strong></div>
          <div class="metric"><span>p99</span><strong data-metric="p99"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const requests = root.querySelector('#tail-requests');
    const slow = root.querySelector('#tail-slow');
    const slowMs = root.querySelector('#tail-ms');
    const avg = root.querySelector('[data-metric="avg"]');
    const p50 = root.querySelector('[data-metric="p50"]');
    const p95 = root.querySelector('[data-metric="p95"]');
    const p99 = root.querySelector('[data-metric="p99"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const total = Number(requests.value);
      const slowPct = Number(slow.value);
      const slowLatency = Number(slowMs.value);
      const fastLatency = 80;

      root.querySelector('output[for="tail-requests"]').textContent = total.toLocaleString();
      root.querySelector('output[for="tail-slow"]').textContent = `${slowPct.toFixed(1)}%`;
      root.querySelector('output[for="tail-ms"]').textContent = `${slowLatency} ms`;

      const percentile = (p) => (p < 100 - slowPct ? fastLatency : slowLatency);
      const average = Math.round(fastLatency * (1 - slowPct / 100) + slowLatency * (slowPct / 100));
      const slowCount = Math.round((total * slowPct) / 100);

      avg.textContent = `${average} ms`;
      p50.textContent = `${percentile(50)} ms`;
      p95.textContent = `${percentile(95)} ms`;
      p99.textContent = `${percentile(99)} ms`;

      if (slowPct >= 1) {
        verdict.textContent = `${slowCount.toLocaleString()} of ${total.toLocaleString()} requests hit the slow path. The average says ${average} ms, but p99 says ${slowLatency} ms. The unluckiest 1 in 100 users feel the number you did not put on the slide.`;
      } else {
        verdict.textContent = `${slowCount.toLocaleString()} slow requests are diluted by ${(total - slowCount).toLocaleString()} fast ones. The average looks healthy, yet p99 can still be ${percentile(99)} ms. Always report the tail you promised.`;
      }
    };

    [requests, slow, slowMs].forEach((input) => input.addEventListener('input', update));
    update();
  }

  function renderCacheHitRate(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Feel the hit rate</h3>
        <p class="hint">A cache read is 1 ms, a database read is slower. Move the sliders and watch which number does the work.</p>
        <div class="slider-row">
          <label for="hit-rate">Hit rate</label>
          <input id="hit-rate" type="range" min="0" max="99" step="1" value="95">
          <output for="hit-rate"></output>
        </div>
        <div class="slider-row">
          <label for="hit-traffic">Requests</label>
          <input id="hit-traffic" type="range" min="100" max="2000" step="100" value="1000">
          <output for="hit-traffic"></output>
        </div>
        <div class="slider-row">
          <label for="hit-db">Database read</label>
          <input id="hit-db" type="range" min="5" max="100" step="5" value="40">
          <output for="hit-db"></output>
        </div>
        <div class="split-bar" aria-hidden="true">
          <span class="split-hit"></span>
          <span class="split-miss"></span>
        </div>
        <div class="split-legend">
          <span><i class="legend-hit"></i> served by cache</span>
          <span><i class="legend-miss"></i> reaches the database</span>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Average</span><strong data-metric="avg"></strong></div>
          <div class="metric"><span>Miss latency</span><strong data-metric="p99"></strong></div>
          <div class="metric"><span>DB queries/s</span><strong data-metric="db"></strong></div>
          <div class="metric"><span>Saved per read</span><strong data-metric="saved"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const hitInput = root.querySelector('#hit-rate');
    const trafficInput = root.querySelector('#hit-traffic');
    const dbInput = root.querySelector('#hit-db');
    const barHit = root.querySelector('.split-hit');
    const barMiss = root.querySelector('.split-miss');
    const avg = root.querySelector('[data-metric="avg"]');
    const p99 = root.querySelector('[data-metric="p99"]');
    const dbQps = root.querySelector('[data-metric="db"]');
    const saved = root.querySelector('[data-metric="saved"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const hit = Number(hitInput.value);
      const miss = 100 - hit;
      const traffic = Number(trafficInput.value);
      const dbMs = Number(dbInput.value);

      root.querySelector('output[for="hit-rate"]').textContent = `${hit}%`;
      root.querySelector('output[for="hit-traffic"]').textContent = traffic.toLocaleString();
      root.querySelector('output[for="hit-db"]').textContent = `${dbMs} ms`;

      const average = (hit / 100) * 1 + (miss / 100) * (1 + dbMs);
      const misses = Math.round((traffic * miss) / 100);

      barHit.style.width = `${hit}%`;
      barMiss.style.width = `${miss}%`;

      avg.textContent = `${average.toFixed(1)} ms`;
      p99.textContent = `${dbMs + 1} ms`;
      dbQps.textContent = misses.toLocaleString();
      saved.textContent = `${Math.max(0, dbMs + 1 - average).toFixed(1)} ms`;

      if (hit >= 90) {
        verdict.textContent = `${traffic.toLocaleString()} requests per second, only ${misses.toLocaleString()} database reads. The database load follows the ${miss}% miss rate, not the total traffic.`;
      } else if (hit >= 50) {
        verdict.textContent = `Half the traffic still reaches the database. A cache that misses ${miss}% of the time is a speed bump, not a shield. The database must be sized for ${misses.toLocaleString()} reads per second.`;
      } else {
        verdict.textContent = `At a ${hit}% hit rate the cache barely helps. Every saved millisecond is paid for with memory, invalidation and a new failure mode — this copy has not earned its place.`;
      }
    };

    [hitInput, trafficInput, dbInput].forEach((input) => input.addEventListener('input', update));
    update();
  }

  const PLACEMENT_CASES = {
    doctors: {
      label: 'Public doctor list',
      shared: true,
      size: '2 KB',
      latency: '0.1 ms in-process, 1 ms Redis',
      body: 'Read constantly, edited weekly. With one API server, an in-process map with a TTL is enough and adds no service. As soon as a second server exists, each process has its own copy and a write clears only one of them; move it to a shared cache and invalidate on write.',
    },
    sessions: {
      label: 'Patient session',
      shared: true,
      size: '1 KB per user',
      latency: '1 ms Redis',
      body: 'Every authenticated request reads it, and the next request may land on any API server. Keep it in a shared cache with a TTL, not in process memory. If the cache is unreachable, fail closed and ask the user to sign in again rather than guessing.',
    },
    assets: {
      label: 'Logo and CSS',
      shared: false,
      size: '200 KB per file',
      latency: '0 ms if the browser has it',
      body: 'Public and identical for every user. Serve it from a CDN with a long TTL and a versioned filename, so a deploy changes the URL instead of purging a copy. This is the cheapest cache in the system because the request never reaches you.',
    },
    slots: {
      label: 'Free slot list',
      shared: false,
      size: '18 rows per doctor per day',
      latency: '2–5 s stale is acceptable for display',
      body: 'Looks cacheable and is not. The list changes on every booking and its whole value is being current. You may keep a 2–5 second in-process copy for the picker, but the booking request must re-check the slot in the database. A stale slot is a double booking.',
    },
    feed: {
      label: 'Per-user activity feed',
      shared: true,
      size: '10–40 KB per user',
      latency: '1 ms Redis, 30 ms rebuild',
      body: 'Private, read often and rebuilt from several tables. Key it by user and keep it in a shared cache with a short TTL. With one server an in-process copy works, but a per-user key in Redis survives deploys and keeps the work out of the request path.',
    },
  };

  function renderCachePlacement(root) {
    const keys = Object.keys(PLACEMENT_CASES);
    root.innerHTML = `
      <div class="widget-card">
        <h3>Place the copy</h3>
        <p class="hint">Pick what you are caching, then change the number of API servers. The right home changes with both.</p>
        <div class="slider-row">
          <label for="placement-data">Data</label>
          <select id="placement-data">
            ${keys.map((key) => `<option value="${key}">${escapeHtml(PLACEMENT_CASES[key].label)}</option>`).join('')}
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="placement-servers">API servers</label>
          <input id="placement-servers" type="range" min="1" max="12" step="1" value="1">
          <output for="placement-servers"></output>
        </div>
        <div class="tradeoff-result" aria-live="polite">
          <strong></strong>
          <p></p>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Placement</span><strong data-metric="where"></strong></div>
          <div class="metric"><span>Value size</span><strong data-metric="size"></strong></div>
          <div class="metric"><span>Typical hit</span><strong data-metric="latency"></strong></div>
          <div class="metric"><span>Copies</span><strong data-metric="copies"></strong></div>
        </div>
      </div>
    `;

    const dataInput = root.querySelector('#placement-data');
    const serversInput = root.querySelector('#placement-servers');
    const title = root.querySelector('.tradeoff-result strong');
    const body = root.querySelector('.tradeoff-result p');
    const where = root.querySelector('[data-metric="where"]');
    const size = root.querySelector('[data-metric="size"]');
    const latency = root.querySelector('[data-metric="latency"]');
    const copies = root.querySelector('[data-metric="copies"]');

    const update = () => {
      const key = dataInput.value;
      const item = PLACEMENT_CASES[key];
      const servers = Number(serversInput.value);
      root.querySelector('output[for="placement-servers"]').textContent = servers === 1 ? '1' : String(servers);

      let placement;
      let copyLabel;
      let extra;
      if (key === 'assets') {
        placement = 'CDN + browser';
        copyLabel = 'One per edge';
        extra = ' The versioned filename is the invalidation mechanism; do not rely on a purge reaching every cache.';
      } else if (key === 'slots') {
        placement = 'No shared cache';
        copyLabel = 'Per-process hint';
        extra = servers > 1 ? ' More servers do not make a stale slot safer. The write still checks the database.' : ' The single server changes nothing about correctness: the book transaction still checks the slot.';
      } else if (servers === 1 && (key === 'doctors' || key === 'feed')) {
        placement = 'In-process map';
        copyLabel = '1';
        extra = ' With one server there is nothing to disagree with. Add a TTL anyway, and move to Redis before the second server goes live.';
      } else {
        placement = 'Shared Redis';
        copyLabel = '1';
        extra = servers > 1 ? ` With ${servers} servers, a local copy would be ${servers} copies that can disagree. Redis gives them one answer and one key to delete.` : '';
      }

      title.textContent = placement;
      body.textContent = item.body + extra;
      where.textContent = placement;
      size.textContent = item.size;
      latency.textContent = item.latency.split(',')[0];
      copies.textContent = copyLabel;
    };

    dataInput.addEventListener('change', update);
    serversInput.addEventListener('input', update);
    update();
  }

  const CACHE_PATTERNS = {
    aside: {
      label: 'Cache-aside',
      read: 'App checks Redis; on a miss it reads PostgreSQL and writes the value back.',
      write: 'Commit to PostgreSQL, then delete the cache key.',
      crash: 'Reads fall through to PostgreSQL. The app must survive a cache outage.',
      giveUp: 'The app owns invalidation, and every write path must remember it.',
    },
    through: {
      label: 'Read-through',
      read: 'The cache client checks its store and fetches from PostgreSQL on a miss.',
      write: 'Usually the same as cache-aside: commit, then delete.',
      crash: 'The cache layer is now the read path. A slow database looks like a slow cache.',
      giveUp: 'Less duplicated fetch code, but the database work is hidden inside the cache client.',
    },
    writeThrough: {
      label: 'Write-through',
      read: 'Every read hits a warm cache, because writes keep it in sync.',
      write: 'Write PostgreSQL and the cache synchronously, then return.',
      crash: 'A cache timeout can fail the write, unless you catch it and continue.',
      giveUp: 'A second system on the write path, and memory spent on rows nobody reads.',
    },
    writeBehind: {
      label: 'Write-behind',
      read: 'Reads hit the cache; the cache is the immediate source of truth.',
      write: 'Write the cache, acknowledge, flush to PostgreSQL asynchronously.',
      crash: 'Acknowledged writes that were not flushed are lost.',
      giveUp: 'Durability, in exchange for very fast writes and collapsed updates.',
    },
    refresh: {
      label: 'Refresh-ahead',
      read: 'Hot keys are refreshed shortly before they expire, so readers hit a warm copy.',
      write: 'Commit to PostgreSQL, then delete or refresh the key.',
      crash: 'Falls back to the same miss path as cache-aside.',
      giveUp: 'Database work spent refreshing keys that may not be read again.',
    },
  };

  function renderCachePatterns(root) {
    const keys = Object.keys(CACHE_PATTERNS);
    root.innerHTML = `
      <div class="widget-card">
        <h3>Pick a read and write pattern</h3>
        <p class="hint">The pattern is a promise about where the truth lives and how long a copy may disagree.</p>
        <div class="slider-row">
          <label for="pattern-select">Pattern</label>
          <select id="pattern-select">
            ${keys.map((key) => `<option value="${key}">${escapeHtml(CACHE_PATTERNS[key].label)}</option>`).join('')}
          </select>
          <span></span>
        </div>
        <div class="state-table" role="table" aria-label="Pattern behaviour">
          <div role="row"><span role="cell">Read path</span><strong role="cell" data-state="read"></strong></div>
          <div role="row"><span role="cell">Write path</span><strong role="cell" data-state="write"></strong></div>
          <div role="row"><span role="cell">If the cache dies</span><strong role="cell" data-state="crash"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const select = root.querySelector('#pattern-select');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const pattern = CACHE_PATTERNS[select.value];
      root.querySelector('[data-state="read"]').textContent = pattern.read;
      root.querySelector('[data-state="write"]').textContent = pattern.write;
      root.querySelector('[data-state="crash"]').textContent = pattern.crash;
      verdict.textContent = `What you give up: ${pattern.giveUp}`;
    };

    select.addEventListener('change', update);
    update();
  }

  const STALENESS_CASES = {
    menu: { label: 'Public menu', interval: 3600, unit: 'an hour' },
    appointment: { label: 'Appointment status', interval: 60, unit: 'a minute' },
    slots: { label: 'Free slot count', interval: 10, unit: '10 seconds' },
  };

  function renderCacheStaleness(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Spend your staleness budget</h3>
        <p class="hint">Set a TTL and a change rate. The bar shows how much of the copy's life is spent out of date.</p>
        <div class="slider-row">
          <label for="stale-data">Data</label>
          <select id="stale-data">
            ${Object.entries(STALENESS_CASES)
              .map(([key, item]) => `<option value="${key}">${escapeHtml(item.label)}</option>`)
              .join('')}
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="stale-ttl">TTL</label>
          <input id="stale-ttl" type="range" min="1" max="900" step="1" value="120">
          <output for="stale-ttl"></output>
        </div>
        <label class="check-row">
          <input id="stale-invalidate" type="checkbox">
          <span>Delete the key on every write</span>
        </label>
        <div class="timeline" aria-hidden="true">
          <div class="timeline-track">
            <span class="timeline-stale"></span>
            <span class="timeline-marker" title="A write changes the source"></span>
          </div>
          <div class="timeline-labels"><span>copy written</span><span>TTL ends</span></div>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Stale reads</span><strong data-metric="fraction"></strong></div>
          <div class="metric"><span>Worst age</span><strong data-metric="age"></strong></div>
          <div class="metric"><span>Stale reads/s</span><strong data-metric="rate"></strong></div>
          <div class="metric"><span>Source changes</span><strong data-metric="change"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const dataInput = root.querySelector('#stale-data');
    const ttlInput = root.querySelector('#stale-ttl');
    const invalidate = root.querySelector('#stale-invalidate');
    const staleBar = root.querySelector('.timeline-stale');
    const marker = root.querySelector('.timeline-marker');
    const fraction = root.querySelector('[data-metric="fraction"]');
    const age = root.querySelector('[data-metric="age"]');
    const rate = root.querySelector('[data-metric="rate"]');
    const change = root.querySelector('[data-metric="change"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const item = STALENESS_CASES[dataInput.value];
      const ttl = Number(ttlInput.value);
      const interval = item.interval;

      root.querySelector('output[for="stale-ttl"]').textContent = ttl >= 60 ? `${Math.round(ttl / 60)} min` : `${ttl} s`;

      let staleFraction = 0;
      let worstAge = 0;

      if (invalidate.checked) {
        staleFraction = 0.02;
        worstAge = 0.5;
      } else if (ttl < interval) {
        staleFraction = ttl / (2 * interval);
        worstAge = ttl / 2;
      } else {
        staleFraction = 1 - interval / ttl;
        worstAge = ttl - interval;
      }

      staleFraction = Math.max(0, Math.min(1, staleFraction));
      const staleWidth = Math.max(2, staleFraction * 100);
      staleBar.style.width = `${staleWidth}%`;
      marker.style.left = `${Math.min(98, (interval / Math.max(ttl, interval)) * 100)}%`;

      fraction.textContent = `${Math.round(staleFraction * 100)}%`;
      age.textContent = worstAge < 1 ? '< 1 s' : `${Math.round(worstAge)} s`;
      rate.textContent = Math.round(400 * staleFraction).toLocaleString();
      change.textContent = `every ${item.unit}`;

      if (invalidate.checked) {
        verdict.textContent = `Invalidating on write drops the stale window to the time between commit and delete — roughly half a second. Keep the ${ttl >= 60 ? `${Math.round(ttl / 60)}-minute` : `${ttl}-second`} TTL as a backstop for writes that miss the path.`;
      } else if (ttl < interval) {
        verdict.textContent = `A ${ttl}-second TTL on data that changes every ${item.unit}: about ${Math.round(staleFraction * 100)}% of reads may see a copy up to ${Math.round(worstAge)} seconds old. That is the price of the hit rate.`;
      } else {
        verdict.textContent = `The TTL is longer than the change interval. The copy spends about ${Math.round(staleFraction * 100)}% of its life out of date, and the worst case is ${Math.round(worstAge)} seconds. You are caching history, not a current answer.`;
      }
    };

    [dataInput, ttlInput, invalidate].forEach((input) => input.addEventListener('input', update));
    dataInput.addEventListener('change', update);
    invalidate.addEventListener('change', update);
    update();
  }

  const EVICTION_SEQUENCE = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'E', 'A', 'B'];

  function renderCacheEviction(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Watch a cache fill and evict</h3>
        <p class="hint">Four slots, one key per access. Step through the sequence and see which policy throws away the key you need next.</p>
        <div class="slider-row">
          <label for="evict-policy">Policy</label>
          <select id="evict-policy">
            <option value="lru">LRU — least recently used</option>
            <option value="lfu">LFU — least frequently used</option>
            <option value="fifo">FIFO — first in, first out</option>
          </select>
          <span></span>
        </div>
        <div class="slot-grid" aria-live="polite"></div>
        <div class="access-log" aria-label="Access history"></div>
        <div class="widget-actions">
          <button class="btn small primary" type="button" data-evict="step">Next access</button>
          <button class="btn small ghost" type="button" data-evict="reset">Reset</button>
          <span class="sorter-score" data-evict-score></span>
        </div>
        <p class="trace-verdict"></p>
      </div>
    `;

    const policyInput = root.querySelector('#evict-policy');
    const slotGrid = root.querySelector('.slot-grid');
    const log = root.querySelector('.access-log');
    const score = root.querySelector('[data-evict-score]');
    const verdict = root.querySelector('.trace-verdict');

    let cache = [];
    let tick = 0;
    let position = 0;
    let hits = 0;
    let misses = 0;
    let lastKey = null;
    let lastHit = false;
    let history = [];

    const render = () => {
      const cells = [];
      for (let index = 0; index < 4; index += 1) {
        const entry = cache[index];
        cells.push(
          entry
            ? `<div class="cache-slot${entry.key === lastKey ? (lastHit ? ' just-hit' : ' just-added') : ''}">
                 <strong>${entry.key}</strong>
                 <span>used ${entry.lastUsed} · ${entry.freq}×</span>
               </div>`
            : '<div class="cache-slot empty"><strong>—</strong><span>free</span></div>',
        );
      }
      slotGrid.innerHTML = cells.join('');
      log.innerHTML = history
        .map((item) => `<span class="access-chip ${item.hit ? 'hit' : 'miss'}">${item.key}</span>`)
        .join('');
      score.textContent = position
        ? `${position} of ${EVICTION_SEQUENCE.length} accesses · ${hits} hits · ${misses} misses`
        : 'not started';
    };

    const step = () => {
      if (position >= EVICTION_SEQUENCE.length) {
        verdict.textContent = 'Sequence finished. Reset and try another policy — the same accesses produce a different hit rate.';
        return;
      }

      const key = EVICTION_SEQUENCE[position];
      tick += 1;
      const existing = cache.find((entry) => entry.key === key);

      if (existing) {
        hits += 1;
        lastHit = true;
        existing.lastUsed = tick;
        existing.freq += 1;
        verdict.textContent = `${key} is in the cache. A hit: recency and frequency update, nothing is evicted.`;
      } else {
        misses += 1;
        lastHit = false;
        if (cache.length >= 4) {
          let victim;
          if (policyInput.value === 'lru') {
            victim = cache.reduce((oldest, entry) => (entry.lastUsed < oldest.lastUsed ? entry : oldest), cache[0]);
          } else if (policyInput.value === 'lfu') {
            victim = cache.reduce((least, entry) => {
              if (entry.freq < least.freq) return entry;
              if (entry.freq === least.freq && entry.inserted < least.inserted) return entry;
              return least;
            }, cache[0]);
          } else {
            victim = cache.reduce((oldest, entry) => (entry.inserted < oldest.inserted ? entry : oldest), cache[0]);
          }
          cache = cache.filter((entry) => entry !== victim);
          verdict.textContent = `${key} misses. The cache is full, so ${victim.key} is evicted (${policyInput.value === 'lru' ? 'least recently used' : policyInput.value === 'lfu' ? 'least frequently used, earliest on a tie' : 'first in'}).`;
        } else {
          verdict.textContent = `${key} misses. There is a free slot, so it enters without evicting anything.`;
        }
        cache.push({ key, lastUsed: tick, freq: 1, inserted: tick });
      }

      lastKey = key;
      history.push({ key, hit: lastHit });
      position += 1;
      render();
      if (position === EVICTION_SEQUENCE.length) {
        verdict.textContent += ` Final: ${hits} hits, ${misses} misses. The same four slots can thrash or perform, depending on the policy and the order.`;
      }
    };

    const reset = () => {
      cache = [];
      tick = 0;
      position = 0;
      hits = 0;
      misses = 0;
      lastKey = null;
      lastHit = false;
      history = [];
      verdict.textContent = 'Press “Next access” to step through the sequence.';
      render();
    };

    root.querySelector('[data-evict="step"]').addEventListener('click', step);
    root.querySelector('[data-evict="reset"]').addEventListener('click', reset);
    policyInput.addEventListener('change', reset);
    reset();
  }

  const CACHE_FAILURES = {
    stampede: {
      label: 'Stampede',
      loadLabel: 'Database queries/s',
      base: [2400, '2,400'],
      fixed: [2, '2'],
      p99: ['2,400 ms', '45 ms'],
      errors: ['6%', '0%'],
      note: 'A hot key expires and thousands of requests rebuild it together.',
      fix: 'Coalesce misses (single-flight) so one request rebuilds and the rest wait.',
    },
    hotkey: {
      label: 'Hot key',
      loadLabel: 'Load on one shard',
      base: [80000, '80k ops/s'],
      fixed: [8000, '8k ops/s'],
      p99: ['900 ms', '25 ms'],
      errors: ['0.2%', '0%'],
      note: 'One key gets most of the traffic, so one cache node or shard saturates while the rest idle.',
      fix: 'Serve the key from a 1–5 second in-process copy, or replicate it across shards.',
    },
    penetration: {
      label: 'Penetration',
      loadLabel: 'Database queries/s',
      base: [5000, '5,000'],
      fixed: [5, '5'],
      p99: ['1,800 ms', '30 ms'],
      errors: ['4%', '0%'],
      note: 'Requests for IDs that do not exist always miss, so every lookup reaches the database.',
      fix: 'Cache the not-found result for 30–60 seconds, and validate IDs before the lookup.',
    },
    avalanche: {
      label: 'Avalanche',
      loadLabel: 'Misses in one second',
      base: [10000, '10,000'],
      fixed: [83, '83'],
      p99: ['3,000 ms', '35 ms'],
      errors: ['8%', '0%'],
      note: 'Thousands of keys were written with the same TTL and expire in the same second.',
      fix: 'Jitter each TTL by ±10% so expiries spread across a window.',
    },
    coldstart: {
      label: 'Cold start',
      loadLabel: 'Database read load',
      base: [400, '100% of traffic'],
      fixed: [20, '5% after warm-up'],
      p99: ['2,500 ms', '30 ms'],
      errors: ['5%', '0.5%'],
      note: 'The cache restarts empty, and the database sized for a 4% miss rate receives everything.',
      fix: 'Warm the hot keys before shifting traffic, and roll out in small steps.',
    },
  };

  function renderCacheFailure(root) {
    const keys = Object.keys(CACHE_FAILURES);
    root.innerHTML = `
      <div class="widget-card">
        <h3>Break the cache on purpose</h3>
        <p class="hint">Each failure is a miss storm. Pick one, then apply its fix and compare the load.</p>
        <div class="slider-row">
          <label for="failure-select">Failure</label>
          <select id="failure-select">
            ${keys.map((key) => `<option value="${key}">${escapeHtml(CACHE_FAILURES[key].label)}</option>`).join('')}
          </select>
          <span></span>
        </div>
        <label class="check-row">
          <input id="failure-fix" type="checkbox">
          <span data-fix-label></span>
        </label>
        <div class="metric-grid">
          <div class="metric"><span data-load-label>Load</span><strong data-metric="load"></strong></div>
          <div class="metric"><span>p99</span><strong data-metric="p99"></strong></div>
          <div class="metric"><span>Errors</span><strong data-metric="errors"></strong></div>
          <div class="metric"><span>State</span><strong data-metric="state"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const select = root.querySelector('#failure-select');
    const fix = root.querySelector('#failure-fix');
    const fixLabel = root.querySelector('[data-fix-label]');
    const loadLabel = root.querySelector('[data-load-label]');
    const load = root.querySelector('[data-metric="load"]');
    const p99 = root.querySelector('[data-metric="p99"]');
    const errors = root.querySelector('[data-metric="errors"]');
    const state = root.querySelector('[data-metric="state"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const failure = CACHE_FAILURES[select.value];
      fixLabel.textContent = `Apply the fix: ${failure.fix}`;
      loadLabel.textContent = failure.loadLabel;
      load.textContent = fix.checked ? failure.fixed[1] : failure.base[1];
      p99.textContent = fix.checked ? failure.p99[1] : failure.p99[0];
      errors.textContent = fix.checked ? failure.errors[1] : failure.errors[0];
      state.textContent = fix.checked ? 'recovering' : 'failing';
      state.style.color = fix.checked ? 'var(--green)' : 'var(--red)';
      verdict.textContent = fix.checked
        ? `${failure.note} With the fix: ${failure.fix.toLowerCase()} The database sees ${failure.fixed[1]} instead of ${failure.base[1]}.`
        : `${failure.note} Without a fix, the database sees ${failure.base[1]} and p99 reaches ${failure.p99[0]}.`;
    };

    select.addEventListener('change', update);
    fix.addEventListener('change', update);
    update();
  }

  function renderCacheCliff(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Flush the cache at peak</h3>
        <p class="hint">The cache is warm and healthy. Empty it, then watch database CPU over the next 30 seconds.</p>
        <div class="slider-row">
          <label for="cliff-traffic">Traffic</label>
          <input id="cliff-traffic" type="range" min="100" max="500" step="50" value="300">
          <output for="cliff-traffic"></output>
        </div>
        <label class="check-row">
          <input id="cliff-coalesce" type="checkbox">
          <span>Coalesce misses (one rebuild per key)</span>
        </label>
        <div class="bar-chart" aria-label="Database CPU after a cache flush"></div>
        <div class="chart-axis"><span>flush</span><span>15 s</span><span>30 s</span></div>
        <div class="metric-grid">
          <div class="metric"><span>Peak DB CPU</span><strong data-metric="peak"></strong></div>
          <div class="metric"><span>Recovery</span><strong data-metric="recovery"></strong></div>
          <div class="metric"><span>p99</span><strong data-metric="p99"></strong></div>
          <div class="metric"><span>Errors</span><strong data-metric="errors"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const traffic = root.querySelector('#cliff-traffic');
    const coalesce = root.querySelector('#cliff-coalesce');
    const chart = root.querySelector('.bar-chart');
    const peak = root.querySelector('[data-metric="peak"]');
    const recovery = root.querySelector('[data-metric="recovery"]');
    const p99 = root.querySelector('[data-metric="p99"]');
    const errors = root.querySelector('[data-metric="errors"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const rps = Number(traffic.value);
      const base = 8 + rps * 0.055;
      const useCoalescing = coalesce.checked;
      const start = useCoalescing ? Math.min(55, base + 26) : 99;
      const decay = useCoalescing ? 1.1 : 11;
      const series = [];
      let recoverAt = 30;

      for (let second = 0; second < 30; second += 1) {
        const cpu = Math.min(100, base + (start - base) * Math.exp(-second / decay));
        series.push(cpu);
        if (recoverAt === 30 && cpu < Math.min(95, base + 8)) recoverAt = second;
      }

      const peakValue = Math.max(...series);
      chart.innerHTML = series
        .map(
          (cpu, index) =>
            `<span class="bar${cpu > 90 ? ' danger' : cpu > 70 ? ' warning' : ''}" style="height:${Math.max(4, cpu)}%" title="t=${index}s: ${Math.round(cpu)}% CPU"></span>`,
        )
        .join('');
      chart.setAttribute(
        'aria-label',
        `Database CPU over 30 seconds after a flush at ${rps} requests per second: peak ${Math.round(peakValue)}%, recovery ${recoverAt} seconds.`,
      );

      root.querySelector('output[for="cliff-traffic"]').textContent = `${rps} rps`;
      peak.textContent = `${Math.round(peakValue)}%`;
      recovery.textContent = `${recoverAt}s`;
      p99.textContent = useCoalescing ? '90 ms' : '2,400 ms';
      errors.textContent = useCoalescing ? '0%' : '8%';

      if (useCoalescing) {
        verdict.textContent = `With coalescing, the first miss rebuilds the key and everyone else waits. The database sees ${Math.round(base)}–${Math.round(peakValue)}% CPU and the system is healthy within ${recoverAt} seconds.`;
      } else {
        verdict.textContent = `Without coalescing, ${Math.round(rps * 0.8)} menu misses per second all rebuild the same key. Database CPU pins at 99%, the pool queues, and recovery takes about 20–45 seconds with 8% errors.`;
      }
    };

    [traffic, coalesce].forEach((input) => input.addEventListener('input', update));
    coalesce.addEventListener('change', update);
    update();
  }

  const VERTICAL_SIZES = [
    { vcpu: 2, cost: 12, capacity: 330 },
    { vcpu: 4, cost: 24, capacity: 600 },
    { vcpu: 8, cost: 48, capacity: 1050 },
    { vcpu: 16, cost: 96, capacity: 1700 },
    { vcpu: 32, cost: 192, capacity: 2400 },
  ];

  function renderScaleVertical(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Buy a bigger box</h3>
        <p class="hint">Pick a machine and a traffic level. The bar shows how much of its capacity you are using.</p>
        <div class="slider-row">
          <label for="vertical-size">Machine</label>
          <select id="vertical-size">
            ${VERTICAL_SIZES.map(
              (item) => `<option value="${item.vcpu}"${item.vcpu === 4 ? ' selected' : ''}>${item.vcpu} vCPU · ${item.vcpu * 2} GB</option>`,
            ).join('')}
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="vertical-traffic">Traffic</label>
          <input id="vertical-traffic" type="range" min="200" max="2500" step="100" value="900">
          <output for="vertical-traffic"></output>
        </div>
        <div class="usage-track" aria-hidden="true"><span class="usage-fill"></span></div>
        <div class="usage-labels"><span>0</span><span data-usage-label></span><span data-capacity-label></span></div>
        <div class="metric-grid">
          <div class="metric"><span>Capacity</span><strong data-metric="capacity"></strong></div>
          <div class="metric"><span>Monthly cost</span><strong data-metric="cost"></strong></div>
          <div class="metric"><span>Cost / 100 rps</span><strong data-metric="unit"></strong></div>
          <div class="metric"><span>p99 estimate</span><strong data-metric="p99"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const sizeInput = root.querySelector('#vertical-size');
    const trafficInput = root.querySelector('#vertical-traffic');
    const fill = root.querySelector('.usage-fill');
    const usageLabel = root.querySelector('[data-usage-label]');
    const capacityLabel = root.querySelector('[data-capacity-label]');
    const capacityOut = root.querySelector('[data-metric="capacity"]');
    const costOut = root.querySelector('[data-metric="cost"]');
    const unitOut = root.querySelector('[data-metric="unit"]');
    const p99Out = root.querySelector('[data-metric="p99"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const size = VERTICAL_SIZES.find((item) => item.vcpu === Number(sizeInput.value)) || VERTICAL_SIZES[1];
      const traffic = Number(trafficInput.value);
      const util = traffic / size.capacity;

      let p99;
      if (util <= 0.6) p99 = 55 + util * 50;
      else if (util <= 0.9) p99 = 85 + ((util - 0.6) / 0.3) * 215;
      else p99 = 300 + (util - 0.9) * 3000;
      p99 = Math.min(3500, p99);

      root.querySelector('output[for="vertical-traffic"]').textContent = `${traffic.toLocaleString()} rps`;
      capacityOut.textContent = `${size.capacity.toLocaleString()} rps`;
      costOut.textContent = `$${size.cost}`;
      unitOut.textContent = `$${(size.cost / (size.capacity / 100)).toFixed(2)}`;
      p99Out.textContent = `${Math.round(p99).toLocaleString()} ms`;

      const width = Math.max(2, Math.min(100, util * 100));
      fill.style.width = `${width}%`;
      fill.className = `usage-fill${util > 1 ? ' danger' : util > 0.8 ? ' warning' : ''}`;
      usageLabel.textContent = `${Math.round(util * 100)}% used`;
      capacityLabel.textContent = `${size.capacity.toLocaleString()} rps`;

      if (util > 1) {
        verdict.textContent = `At ${traffic.toLocaleString()} rps this machine is ${Math.round(util * 100)}% of its capacity. Requests queue, p99 climbs to roughly ${Math.round(p99).toLocaleString()} ms, and adding cores is the only lever this shape offers.`;
      } else if (util > 0.8) {
        verdict.textContent = `The machine is at ${Math.round(util * 100)}% of capacity. It meets ${traffic.toLocaleString()} rps today, but one spike moves it into the knee. The database has its own ceiling, and this is still one failure domain.`;
      } else {
        verdict.textContent = `Comfortable at ${Math.round(util * 100)}% of capacity for $${size.cost} per month. It buys headroom, not redundancy: one host failure still takes the service down, and the database is unchanged.`;
      }
    };

    sizeInput.addEventListener('change', update);
    trafficInput.addEventListener('input', update);
    update();
  }

  const HORIZONTAL_EFFICIENCY = [0, 1, 0.97, 0.94, 0.9, 0.86, 0.81];

  function renderScaleHorizontal(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Add servers, find the shared limit</h3>
        <p class="hint">Each server adds API capacity until the database becomes the ceiling. One failure must leave enough capacity behind.</p>
        <div class="slider-row">
          <label for="horizontal-servers">API servers</label>
          <input id="horizontal-servers" type="range" min="1" max="6" step="1" value="2">
          <output for="horizontal-servers"></output>
        </div>
        <div class="slider-row">
          <label for="horizontal-traffic">Traffic</label>
          <input id="horizontal-traffic" type="range" min="200" max="2400" step="100" value="900">
          <output for="horizontal-traffic"></output>
        </div>
        <div class="usage-track" aria-hidden="true"><span class="usage-fill"></span></div>
        <div class="usage-labels"><span>0</span><span data-usage-label></span><span data-capacity-label></span></div>
        <div class="metric-grid">
          <div class="metric"><span>API capacity</span><strong data-metric="api"></strong></div>
          <div class="metric"><span>System capacity</span><strong data-metric="system"></strong></div>
          <div class="metric"><span>After one loss</span><strong data-metric="loss"></strong></div>
          <div class="metric"><span>DB clients</span><strong data-metric="clients"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const serversInput = root.querySelector('#horizontal-servers');
    const trafficInput = root.querySelector('#horizontal-traffic');
    const fill = root.querySelector('.usage-fill');
    const usageLabel = root.querySelector('[data-usage-label]');
    const capacityLabel = root.querySelector('[data-capacity-label]');
    const apiOut = root.querySelector('[data-metric="api"]');
    const systemOut = root.querySelector('[data-metric="system"]');
    const lossOut = root.querySelector('[data-metric="loss"]');
    const clientsOut = root.querySelector('[data-metric="clients"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const servers = Number(serversInput.value);
      const traffic = Number(trafficInput.value);
      const apiCapacity = Math.round(servers * 480 * HORIZONTAL_EFFICIENCY[servers]);
      const systemCapacity = Math.min(1100, apiCapacity);
      const lossCapacity = servers > 1 ? Math.round((servers - 1) * 480 * HORIZONTAL_EFFICIENCY[servers - 1]) : 0;
      const clients = servers * 12 + 25;
      const util = traffic / systemCapacity;

      root.querySelector('output[for="horizontal-servers"]').textContent = servers === 1 ? '1' : String(servers);
      root.querySelector('output[for="horizontal-traffic"]').textContent = `${traffic.toLocaleString()} rps`;
      apiOut.textContent = `${apiCapacity.toLocaleString()} rps`;
      systemOut.textContent = `${systemCapacity.toLocaleString()} rps`;
      lossOut.textContent = servers === 1 ? 'nothing' : `${lossCapacity.toLocaleString()} rps`;
      clientsOut.textContent = String(clients);

      const width = Math.max(2, Math.min(100, util * 100));
      fill.style.width = `${width}%`;
      fill.className = `usage-fill${util > 1 ? ' danger' : util > 0.85 ? ' warning' : ''}`;
      usageLabel.textContent = `${Math.round(util * 100)}% used`;
      capacityLabel.textContent = `${systemCapacity.toLocaleString()} rps`;

      if (traffic > 1100) {
        verdict.textContent = `The database caps the system near 1,100 rps. With ${servers} API server${servers === 1 ? '' : 's'}, ${traffic.toLocaleString()} rps still pins the database; the extra servers add ${clients} clients, not capacity.`;
      } else if (traffic > apiCapacity) {
        verdict.textContent = `${servers} server${servers === 1 ? '' : 's'} provide ${apiCapacity.toLocaleString()} rps of API capacity. At ${traffic.toLocaleString()} rps the fleet is short, and the queue sets the p99.`;
      } else if (servers > 1 && lossCapacity < traffic) {
        verdict.textContent = `The fleet meets ${traffic.toLocaleString()} rps today, but after one server dies it has ${lossCapacity.toLocaleString()} rps. You are one failure away from the knee: size for N+1, not N.`;
      } else if (servers === 1) {
        verdict.textContent = `One server meets ${traffic.toLocaleString()} rps with no redundancy. Any restart, deploy or host failure is an outage, and the database is still a separate single point.`;
      } else {
        verdict.textContent = `The fleet meets ${traffic.toLocaleString()} rps and still has ${lossCapacity.toLocaleString()} rps after one server dies. That is N+1. The database remains the shared limit at about 1,100 rps.`;
      }
    };

    serversInput.addEventListener('input', update);
    trafficInput.addEventListener('input', update);
    update();
  }

  const LB_SEQUENCE = ['c1', 'c1', 'c2', 'c3', 'c2', 'c1', 'c3', 'c1', 'c2', 'c3', 'c1', 'c2', 'c3', 'c1', 'c2'];
  const LB_COST = { c1: 8, c2: 3, c3: 1 };
  const LB_SERVER_NAMES = ['A', 'B', 'C'];
  const LB_CAPACITY_UNITS = 30;

  function renderLbAlgorithms(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Balance the requests, or the work?</h3>
        <p class="hint">Three servers, fifteen requests, and one client whose requests cost eight times the others. Pick an algorithm.</p>
        <div class="slider-row">
          <label for="lb-mode">Algorithm</label>
          <select id="lb-mode">
            <option value="round">Round robin</option>
            <option value="least">Least connections</option>
            <option value="hash">IP hash</option>
          </select>
          <span></span>
        </div>
        <div class="load-rows" aria-live="polite"></div>
        <div class="metric-grid">
          <div class="metric"><span>Busiest server</span><strong data-metric="busiest"></strong></div>
          <div class="metric"><span>Spread</span><strong data-metric="spread"></strong></div>
          <div class="metric"><span>Requests</span><strong data-metric="requests"></strong></div>
          <div class="metric"><span>Above capacity</span><strong data-metric="over"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const modeInput = root.querySelector('#lb-mode');
    const rows = root.querySelector('.load-rows');
    const busiest = root.querySelector('[data-metric="busiest"]');
    const spread = root.querySelector('[data-metric="spread"]');
    const requests = root.querySelector('[data-metric="requests"]');
    const over = root.querySelector('[data-metric="over"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const loads = [0, 0, 0];
      let assignments = [];

      if (modeInput.value === 'round') {
        assignments = LB_SEQUENCE.map((client, index) => index % 3);
      } else if (modeInput.value === 'least') {
        assignments = LB_SEQUENCE.map((client) => {
          let target = 0;
          for (let index = 1; index < 3; index += 1) {
            if (loads[index] < loads[target]) target = index;
          }
          loads[target] += LB_COST[client];
          return target;
        });
        loads.fill(0);
      } else {
        const mapping = { c1: 0, c2: 1, c3: 2 };
        assignments = LB_SEQUENCE.map((client) => mapping[client]);
      }

      assignments.forEach((serverIndex, index) => {
        loads[serverIndex] += LB_COST[LB_SEQUENCE[index]];
      });

      const total = loads.reduce((sum, value) => sum + value, 0);
      const maxLoad = Math.max(...loads);
      const average = total / 3;
      const overCount = loads.filter((value) => value > LB_CAPACITY_UNITS).length;

      rows.innerHTML = loads
        .map(
          (load, index) => `
            <div class="load-row">
              <span>Server ${LB_SERVER_NAMES[index]}</span>
              <div class="load-track"><span class="load-fill${load > LB_CAPACITY_UNITS ? ' danger' : ''}" style="width:${Math.min(100, (load / 48) * 100)}%"></span></div>
              <strong>${load} u</strong>
            </div>
          `,
        )
        .join('');

      busiest.textContent = `${LB_SERVER_NAMES[loads.indexOf(maxLoad)]} · ${maxLoad} u`;
      spread.textContent = `${(maxLoad / average).toFixed(2)}×`;
      requests.textContent = String(LB_SEQUENCE.length);
      over.textContent = overCount ? `${overCount} server${overCount === 1 ? '' : 's'}` : 'none';

      if (modeInput.value === 'round') {
        verdict.textContent = `Round robin gave each server five requests, but not the same work. Server ${LB_SERVER_NAMES[loads.indexOf(maxLoad)]} caught the heavy client and carries ${maxLoad} units, so it queues while the others idle.`;
      } else if (modeInput.value === 'least') {
        verdict.textContent = `Least connections tracked the accumulated work and kept every server at or below ${maxLoad} units. That is what “balanced” means when request costs differ. The catch: it must be able to see current load.`;
      } else {
        verdict.textContent = `IP hash kept client c1 on server ${LB_SERVER_NAMES[loads.indexOf(maxLoad)]} for all six of its requests: ${maxLoad} units on one machine. Affinity protects sessions and destroys balance when one client is heavy.`;
      }
    };

    modeInput.addEventListener('change', update);
    update();
  }

  const TOTAL_SESSIONS = 1200;
  const SESSIONS_PER_SERVER = 400;

  function renderSessionAffinity(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Where does the session live?</h3>
        <p class="hint">1,200 sessions across three servers. Change the design, then kill server 2 and count who has to sign in again.</p>
        <div class="slider-row">
          <label for="session-mode">Design</label>
          <select id="session-mode">
            <option value="shared">Session ID + Redis</option>
            <option value="sticky">Local memory + sticky routing</option>
            <option value="local">Local memory, no affinity</option>
          </select>
          <span></span>
        </div>
        <div class="server-grid" aria-live="polite"></div>
        <div class="widget-actions">
          <button class="btn small primary" type="button" data-session="kill">Kill server 2</button>
          <button class="btn small ghost" type="button" data-session="reset">Reset</button>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Sessions intact</span><strong data-metric="intact"></strong></div>
          <div class="metric"><span>Sign-ins needed</span><strong data-metric="logins"></strong></div>
          <div class="metric"><span>Store reads/s</span><strong data-metric="reads"></strong></div>
          <div class="metric"><span>Worst-server load</span><strong data-metric="skew"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const modeInput = root.querySelector('#session-mode');
    const grid = root.querySelector('.server-grid');
    const killButton = root.querySelector('[data-session="kill"]');
    const intactOut = root.querySelector('[data-metric="intact"]');
    const loginsOut = root.querySelector('[data-metric="logins"]');
    const readsOut = root.querySelector('[data-metric="reads"]');
    const skewOut = root.querySelector('[data-metric="skew"]');
    const verdict = root.querySelector('.trace-verdict');

    let killed = false;

    const update = () => {
      const mode = modeInput.value;
      let intact = TOTAL_SESSIONS;
      let logins = 0;
      let reads = 0;
      let skew = 1;
      let cards = '';

      if (mode === 'shared') {
        reads = 900;
        cards = LB_SERVER_NAMES.map(
          (name, index) => `
            <div class="server-card${killed && index === 1 ? ' dead' : ''}">
              <strong>API ${name}</strong>
              <span>${killed && index === 1 ? 'down' : 'no local sessions'}</span>
            </div>
          `,
        ).join('');
        cards += `<div class="server-card shared-card"><strong>Redis</strong><span>${intact.toLocaleString()} sessions · ${killed ? 'still serving' : '1,200 stored'}</span></div>`;
        verdict.textContent = killed
          ? 'Server 2 is gone. Every session was already in Redis, so the other two servers answer normally. The cost is 900 extra reads per second and one more service to keep alive.'
          : 'Every request reads the session from Redis. Any server can answer, and a deploy can drain one without logging anyone out.';
      } else if (mode === 'sticky') {
        intact = killed ? TOTAL_SESSIONS - SESSIONS_PER_SERVER : TOTAL_SESSIONS;
        logins = killed ? SESSIONS_PER_SERVER : 0;
        skew = killed ? 1.8 : 1.4;
        cards = LB_SERVER_NAMES.map(
          (name, index) => `
            <div class="server-card${killed && index === 1 ? ' dead' : ''}">
              <strong>API ${name}</strong>
              <span>${killed && index === 1 ? 'down · 400 sessions lost' : `${SESSIONS_PER_SERVER} sessions`}</span>
            </div>
          `,
        ).join('');
        verdict.textContent = killed
          ? 'Sticky routing kept the sessions on the server that created them, so killing server 2 logs out its 400 users. The survivors re-pin to the remaining two, which makes the load uneven.'
          : 'Sticky routing works until it does not: one heavy clinic location can pin most of its users to one server, and that server is now a single point of failure for them.';
      } else {
        intact = killed ? Math.round(TOTAL_SESSIONS * (2 / 3)) : Math.round(TOTAL_SESSIONS * (2 / 3));
        logins = killed ? TOTAL_SESSIONS - intact : TOTAL_SESSIONS - intact;
        skew = 1;
        cards = LB_SERVER_NAMES.map(
          (name, index) => `
            <div class="server-card${killed && index === 1 ? ' dead' : ''}">
              <strong>API ${name}</strong>
              <span>${killed && index === 1 ? 'down' : `${SESSIONS_PER_SERVER} sessions`}</span>
            </div>
          `,
        ).join('');
        verdict.textContent = killed
          ? `No affinity and no shared store: 400 sessions died with server 2, and the 800 survivors still lose one request in three when they land on the wrong server. About ${logins} sign-ins are needed.`
          : 'Without affinity or a shared store, two of every three requests land on the server that holds the session. The other third asks the user to sign in again — before any server has failed.';
      }

      grid.innerHTML = cards;
      intactOut.textContent = `${intact.toLocaleString()} / 1,200`;
      loginsOut.textContent = logins.toLocaleString();
      readsOut.textContent = reads.toLocaleString();
      skewOut.textContent = `${skew.toFixed(1)}×`;
      killButton.textContent = killed ? 'Revive server 2' : 'Kill server 2';
    };

    killButton.addEventListener('click', () => {
      killed = !killed;
      update();
    });
    root.querySelector('[data-session="reset"]').addEventListener('click', () => {
      killed = false;
      update();
    });
    modeInput.addEventListener('change', () => {
      killed = false;
      update();
    });
    update();
  }

  function renderPoolMath(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Multiply the pool by the fleet</h3>
        <p class="hint">Each process holds its own pool. The database only sees the total. Switch on PgBouncer to multiplex.</p>
        <div class="slider-row">
          <label for="pool-servers">API servers</label>
          <input id="pool-servers" type="range" min="1" max="10" step="1" value="4">
          <output for="pool-servers"></output>
        </div>
        <div class="slider-row">
          <label for="pool-size">Pool per process</label>
          <input id="pool-size" type="range" min="5" max="30" step="1" value="20">
          <output for="pool-size"></output>
        </div>
        <div class="slider-row">
          <label for="pool-max">DB max connections</label>
          <input id="pool-max" type="range" min="50" max="200" step="10" value="100">
          <output for="pool-max"></output>
        </div>
        <label class="check-row">
          <input id="pool-pgbouncer" type="checkbox">
          <span>Put PgBouncer in front (25 server connections)</span>
        </label>
        <div class="usage-track" aria-hidden="true"><span class="usage-fill"></span></div>
        <div class="usage-labels"><span>0</span><span data-usage-label></span><span data-max-label></span></div>
        <div class="metric-grid">
          <div class="metric"><span>App client connections</span><strong data-metric="clients"></strong></div>
          <div class="metric"><span>DB connections</span><strong data-metric="backends"></strong></div>
          <div class="metric"><span>Headroom</span><strong data-metric="headroom"></strong></div>
          <div class="metric"><span>State</span><strong data-metric="state"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const serversInput = root.querySelector('#pool-servers');
    const sizeInput = root.querySelector('#pool-size');
    const maxInput = root.querySelector('#pool-max');
    const bouncerInput = root.querySelector('#pool-pgbouncer');
    const fill = root.querySelector('.usage-fill');
    const usageLabel = root.querySelector('[data-usage-label]');
    const maxLabel = root.querySelector('[data-max-label]');
    const clientsOut = root.querySelector('[data-metric="clients"]');
    const backendsOut = root.querySelector('[data-metric="backends"]');
    const headroomOut = root.querySelector('[data-metric="headroom"]');
    const stateOut = root.querySelector('[data-metric="state"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const servers = Number(serversInput.value);
      const pool = Number(sizeInput.value);
      const max = Number(maxInput.value);
      const clients = servers * pool;
      const backends = bouncerInput.checked ? 25 : clients;
      const total = backends + 25;
      const headroom = max - total;
      const util = total / max;

      root.querySelector('output[for="pool-servers"]').textContent = String(servers);
      root.querySelector('output[for="pool-size"]').textContent = String(pool);
      root.querySelector('output[for="pool-max"]').textContent = String(max);
      clientsOut.textContent = String(clients);
      backendsOut.textContent = String(total);
      headroomOut.textContent = headroom >= 0 ? String(headroom) : `${Math.abs(headroom)} over`;
      stateOut.textContent = headroom < 0 ? 'refusing' : headroom < 10 ? 'no headroom' : 'stable';
      stateOut.style.color = headroom < 0 ? 'var(--red)' : headroom < 10 ? 'var(--amber)' : 'var(--green)';

      fill.style.width = `${Math.max(2, Math.min(100, util * 100))}%`;
      fill.className = `usage-fill${util > 1 ? ' danger' : util > 0.9 ? ' warning' : ''}`;
      usageLabel.textContent = `${total} / ${max}`;
      maxLabel.textContent = `${max} max`;

      if (headroom < 0) {
        verdict.textContent = `${servers} servers × ${pool} connections = ${clients} client connections. With ${total} total clients against max ${max}, the database refuses new connections and booking requests fail. The CPU may still be low.`;
      } else if (bouncerInput.checked) {
        verdict.textContent = `PgBouncer holds 25 server connections while the fleet keeps ${clients} client connections. The database sees ${total} backends and has ${headroom} slots spare, so one more API server no longer multiplies the backend count.`;
      } else if (headroom < 10) {
        verdict.textContent = `${total} clients against ${max} connections leaves ${headroom} slots. A deploy, a monitoring agent or one more server tips it into refusals. Shrink the pool or add a proxy before that happens.`;
      } else {
        verdict.textContent = `${servers} servers × ${pool} = ${clients} client connections, plus 25 background, for ${total} of ${max}. Stable today. Add one server and the arithmetic changes by ${pool}.`;
      }
    };

    [serversInput, sizeInput, maxInput].forEach((input) => input.addEventListener('input', update));
    bouncerInput.addEventListener('change', update);
    update();
  }

  function renderUploadPath(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Who carries the bytes?</h3>
        <p class="hint">Compare uploading through the API with a presigned URL that sends the browser straight to the bucket.</p>
        <div class="slider-row">
          <label for="upload-path">Path</label>
          <select id="upload-path">
            <option value="api">Through the API</option>
            <option value="direct">Presigned, direct to bucket</option>
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="upload-count">Photos</label>
          <input id="upload-count" type="range" min="10" max="500" step="10" value="200">
          <output for="upload-count"></output>
        </div>
        <div class="slider-row">
          <label for="upload-size">Size each</label>
          <input id="upload-size" type="range" min="1" max="10" step="1" value="4">
          <output for="upload-size"></output>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Bytes through API</span><strong data-metric="bytes"></strong></div>
          <div class="metric"><span>API transfer time</span><strong data-metric="time"></strong></div>
          <div class="metric"><span>Requests</span><strong data-metric="requests"></strong></div>
          <div class="metric"><span>Failure surface</span><strong data-metric="risk"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const pathInput = root.querySelector('#upload-path');
    const countInput = root.querySelector('#upload-count');
    const sizeInput = root.querySelector('#upload-size');
    const bytesOut = root.querySelector('[data-metric="bytes"]');
    const timeOut = root.querySelector('[data-metric="time"]');
    const requestsOut = root.querySelector('[data-metric="requests"]');
    const riskOut = root.querySelector('[data-metric="risk"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const count = Number(countInput.value);
      const size = Number(sizeInput.value);
      const totalMb = count * size;
      const direct = pathInput.value === 'direct';
      const apiMb = direct ? count * 0.001 : totalMb;
      const apiSeconds = direct ? count * 0.005 : totalMb / 50;

      root.querySelector('output[for="upload-count"]').textContent = String(count);
      root.querySelector('output[for="upload-size"]').textContent = `${size} MB`;
      bytesOut.textContent = apiMb < 1 ? `${Math.round(apiMb * 1000)} KB` : `${apiMb.toFixed(1)} MB`;
      timeOut.textContent = apiSeconds < 1 ? `${Math.round(apiSeconds * 1000)} ms` : `${apiSeconds.toFixed(1)} s`;
      requestsOut.textContent = String(count);
      riskOut.textContent = direct ? 'bucket policy' : 'API memory + timeouts';

      if (direct) {
        verdict.textContent = `The API signs ${count} short-lived URLs and handles about ${Math.round(apiMb * 1000)} KB. The bucket receives ${totalMb} MB directly, and the API process never holds a photo in memory.`;
      } else {
        verdict.textContent = `The API carries all ${totalMb} MB through its own process: about ${apiSeconds.toFixed(1)} seconds of pure transfer, plus memory per request. One photo is fine; ${count} at once is a self-inflicted denial of service.`;
      }
    };

    pathInput.addEventListener('change', update);
    countInput.addEventListener('input', update);
    sizeInput.addEventListener('input', update);
    update();
  }

  function renderCdnOffload(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Move the audience, not the origin</h3>
        <p class="hint">Set daily views and the edge hit ratio. The bar shows how much traffic the origin still carries.</p>
        <div class="slider-row">
          <label for="cdn-views">Views per day</label>
          <input id="cdn-views" type="range" min="10000" max="500000" step="10000" value="100000">
          <output for="cdn-views"></output>
        </div>
        <div class="slider-row">
          <label for="cdn-hit">Edge hit ratio</label>
          <input id="cdn-hit" type="range" min="50" max="99" step="1" value="97">
          <output for="cdn-hit"></output>
        </div>
        <div class="slider-row">
          <label for="cdn-size">Object size</label>
          <input id="cdn-size" type="range" min="1" max="5" step="1" value="2">
          <output for="cdn-size"></output>
        </div>
        <div class="split-bar" aria-hidden="true">
          <span class="split-hit"></span>
          <span class="split-miss"></span>
        </div>
        <div class="split-legend">
          <span><i class="legend-hit"></i> served by the edge</span>
          <span><i class="legend-miss"></i> reaches the origin</span>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Origin GB/day</span><strong data-metric="origin"></strong></div>
          <div class="metric"><span>Origin requests/day</span><strong data-metric="requests"></strong></div>
          <div class="metric"><span>p99 estimate</span><strong data-metric="p99"></strong></div>
          <div class="metric"><span>Origin egress/day</span><strong data-metric="cost"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const viewsInput = root.querySelector('#cdn-views');
    const hitInput = root.querySelector('#cdn-hit');
    const sizeInput = root.querySelector('#cdn-size');
    const hitBar = root.querySelector('.split-hit');
    const missBar = root.querySelector('.split-miss');
    const originOut = root.querySelector('[data-metric="origin"]');
    const requestsOut = root.querySelector('[data-metric="requests"]');
    const p99Out = root.querySelector('[data-metric="p99"]');
    const costOut = root.querySelector('[data-metric="cost"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const views = Number(viewsInput.value);
      const hit = Number(hitInput.value) / 100;
      const size = Number(sizeInput.value);
      const totalGb = (views * size) / 1024;
      const originGb = totalGb * (1 - hit);
      const originRequests = Math.round(views * (1 - hit));
      const p99 = 120 + (1 - hit) * 1200;
      const cost = originGb * 0.09;

      root.querySelector('output[for="cdn-views"]').textContent = views.toLocaleString();
      root.querySelector('output[for="cdn-hit"]').textContent = `${hitInput.value}%`;
      root.querySelector('output[for="cdn-size"]').textContent = `${size} MB`;

      hitBar.style.width = `${hitInput.value}%`;
      missBar.style.width = `${100 - hitInput.value}%`;
      originOut.textContent = `${originGb.toFixed(1)} GB`;
      requestsOut.textContent = originRequests.toLocaleString();
      p99Out.textContent = `${Math.round(p99)} ms`;
      costOut.textContent = `$${cost.toFixed(2)}`;

      if (hit >= 0.95) {
        verdict.textContent = `The edge absorbs ${Math.round(hit * 100)}% of ${views.toLocaleString()} daily views. The origin serves ${originRequests.toLocaleString()} requests and ${originGb.toFixed(1)} GB, and the p99 is set by the cached path, not the cross-country one.`;
      } else if (hit >= 0.8) {
        verdict.textContent = `At a ${Math.round(hit * 100)}% hit ratio the origin still handles ${originRequests.toLocaleString()} requests a day. That is ${originGb.toFixed(1)} GB of egress. Check the TTLs and cache keys before blaming the CDN.`;
      } else {
        verdict.textContent = `A ${Math.round(hit * 100)}% hit ratio means ${Math.round((1 - hit) * 100)}% of requests go home. The CDN is a detour with extra latency and a vendor bill; the origin is doing most of the work.`;
      }
    };

    [viewsInput, hitInput, sizeInput].forEach((input) => input.addEventListener('input', update));
    update();
  }

  const PROOF_EFFICIENCY = [0, 1, 0.97, 0.94];

  function proofModel(servers, load) {
    const kneeCapacity = servers * 480 * PROOF_EFFICIENCY[servers];
    const maxThroughput = Math.min(1100, servers * 540);
    const achieved = Math.min(load, maxThroughput);
    const apiRatio = achieved / kneeCapacity;
    const dbUtil = achieved / 1050;

    let p99;
    if (apiRatio <= 0.6) p99 = 70;
    else if (apiRatio <= 1) p99 = 70 + ((apiRatio - 0.6) / 0.4) * 190;
    else p99 = 260 + (apiRatio - 1) * 800;
    if (dbUtil > 0.9) p99 += (dbUtil - 0.9) * 12000;
    if (load > achieved) p99 *= Math.min(6, Math.pow(load / achieved, 2.5));
    p99 = Math.min(3500, p99);

    const dbCpu = Math.min(99, 4 + (achieved / 1050) * 95);
    const errors = load > achieved ? Math.min(8, ((load - achieved) / load) * 15) : 0;
    const clients = servers * 12 + 25;

    return { achieved, p99, dbCpu, errors, clients, kneeCapacity };
  }

  function renderTwoServerProof(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>What did the second server actually buy?</h3>
        <p class="hint">Choose a fleet size and an offered load. The bars show p99 across the test steps; the database tells you when more servers stop helping.</p>
        <div class="segmented" role="group" aria-label="API servers">
          <button type="button" data-proof-servers="1">1 server</button>
          <button type="button" data-proof-servers="2" class="active">2 servers</button>
          <button type="button" data-proof-servers="3">3 servers</button>
        </div>
        <div class="slider-row">
          <label for="proof-load">Offered load</label>
          <input id="proof-load" type="range" min="200" max="1400" step="100" value="900">
          <output for="proof-load"></output>
        </div>
        <div class="bar-chart" aria-label="p99 by offered load"></div>
        <div class="chart-axis"><span>200 rps</span><span>800 rps</span><span>1,400 rps</span></div>
        <div class="metric-grid">
          <div class="metric"><span>Achieved</span><strong data-metric="achieved"></strong></div>
          <div class="metric"><span>p99</span><strong data-metric="p99"></strong></div>
          <div class="metric"><span>DB CPU</span><strong data-metric="db"></strong></div>
          <div class="metric"><span>DB clients</span><strong data-metric="clients"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const loadInput = root.querySelector('#proof-load');
    const chart = root.querySelector('.bar-chart');
    const achievedOut = root.querySelector('[data-metric="achieved"]');
    const p99Out = root.querySelector('[data-metric="p99"]');
    const dbOut = root.querySelector('[data-metric="db"]');
    const clientsOut = root.querySelector('[data-metric="clients"]');
    const verdict = root.querySelector('.trace-verdict');
    let servers = 2;

    const update = () => {
      const load = Number(loadInput.value);
      const model = proofModel(servers, load);

      root.querySelector('output[for="proof-load"]').textContent = `${load.toLocaleString()} rps`;
      achievedOut.textContent = `${model.achieved.toLocaleString()} rps`;
      p99Out.textContent = `${Math.round(model.p99).toLocaleString()} ms`;
      dbOut.textContent = `${Math.round(model.dbCpu)}%`;
      clientsOut.textContent = String(model.clients);

      const steps = [];
      for (let offered = 200; offered <= 1400; offered += 100) {
        const point = proofModel(servers, offered);
        steps.push({ offered, p99: point.p99 });
      }
      chart.innerHTML = steps
        .map((point) => {
          const height = Math.max(3, Math.min(100, (point.p99 / 1600) * 100));
          const level = point.p99 > 400 ? ' danger' : point.p99 > 250 ? ' warning' : '';
          const current = point.offered === load ? ' current' : '';
          return `<span class="bar${level}${current}" style="height:${height}%" title="${point.offered} rps: p99 ${Math.round(point.p99)} ms"></span>`;
        })
        .join('');
      chart.setAttribute(
        'aria-label',
        `${servers} API servers: p99 across offered load from 200 to 1,400 requests per second. At ${load} offered, achieved ${model.achieved} and p99 ${Math.round(model.p99)} milliseconds.`,
      );

      if (servers === 3) {
        verdict.textContent = `Three servers raise API capacity, but the database still caps the system near 1,100 rps. At ${load.toLocaleString()} offered, the extra server adds ${model.clients - 49} database clients and almost no throughput.`;
      } else if (load > model.achieved) {
        verdict.textContent = `${load.toLocaleString()} offered but only ${model.achieved.toLocaleString()} achieved. The queue sets the p99 at ${Math.round(model.p99).toLocaleString()} ms and errors reach ${model.errors.toFixed(1)}%. The fleet is past its knee.`;
      } else if (servers === 2) {
        verdict.textContent = `Two servers meet ${load.toLocaleString()} rps with p99 ${Math.round(model.p99).toLocaleString()} ms. That is the gain: the knee moved from about 480 to about 930 rps. The database is at ${Math.round(model.dbCpu)}%.`;
      } else {
        verdict.textContent = `One server meets ${load.toLocaleString()} rps, but its knee is near 480. There is no redundancy: a deploy or a host failure is an outage.`;
      }
    };

    root.querySelectorAll('[data-proof-servers]').forEach((button) => {
      button.addEventListener('click', () => {
        servers = Number(button.dataset.proofServers);
        root.querySelectorAll('[data-proof-servers]').forEach((item) => item.classList.toggle('active', item === button));
        update();
      });
    });
    loadInput.addEventListener('input', update);
    update();
  }

  function renderReplicaRouting(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Where does the query go?</h3>
        <p class="hint">Set the read share and replica count. Writes stay on the primary; replicas only take reads. The knee is whichever ceiling arrives first.</p>
        <div class="segmented" role="group" aria-label="Read replicas">
          <button type="button" data-replica-count="1">1 replica</button>
          <button type="button" data-replica-count="2" class="active">2 replicas</button>
          <button type="button" data-replica-count="3">3 replicas</button>
        </div>
        <div class="slider-row">
          <label for="routing-load">Offered load</label>
          <input id="routing-load" type="range" min="600" max="2400" step="100" value="1800">
          <output for="routing-load"></output>
        </div>
        <div class="slider-row">
          <label for="routing-share">Read share</label>
          <input id="routing-share" type="range" min="60" max="95" step="1" value="80">
          <output for="routing-share"></output>
        </div>
        <div class="server-grid" data-routing-grid></div>
        <div class="metric-grid">
          <div class="metric"><span>Achieved</span><strong data-metric="achieved"></strong></div>
          <div class="metric"><span>System knee</span><strong data-metric="knee"></strong></div>
          <div class="metric"><span>Primary CPU</span><strong data-metric="primary"></strong></div>
          <div class="metric"><span>Replica CPU</span><strong data-metric="replica"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const loadInput = root.querySelector('#routing-load');
    const shareInput = root.querySelector('#routing-share');
    const grid = root.querySelector('[data-routing-grid]');
    const achievedOut = root.querySelector('[data-metric="achieved"]');
    const kneeOut = root.querySelector('[data-metric="knee"]');
    const primaryOut = root.querySelector('[data-metric="primary"]');
    const replicaOut = root.querySelector('[data-metric="replica"]');
    const verdict = root.querySelector('.trace-verdict');
    let replicas = 2;

    const update = () => {
      const load = Number(loadInput.value);
      const readShare = Number(shareInput.value) / 100;
      const writeShare = 1 - readShare;
      const writeKnee = Math.round(360 / writeShare);
      const readKnee = Math.round((replicas * 1200) / readShare);
      const knee = Math.min(writeKnee, readKnee);
      const achieved = Math.min(load, knee);
      const writes = achieved * writeShare;
      const reads = achieved * readShare;
      const primaryCpu = Math.min(99, (writes / 360) * 100);
      const replicaCpu = Math.min(100, reads / (replicas * 1200) * 100);
      const binding = writeKnee <= readKnee ? 'the primary write path' : 'the replica read tier';

      root.querySelector('output[for="routing-load"]').textContent = `${load.toLocaleString()} rps`;
      root.querySelector('output[for="routing-share"]').textContent = `${Math.round(readShare * 100)}%`;
      achievedOut.textContent = `${achieved.toLocaleString()} rps`;
      kneeOut.textContent = `${knee.toLocaleString()} rps`;
      primaryOut.textContent = `${Math.round(primaryCpu)}%`;
      replicaOut.textContent = `${Math.round(replicaCpu)}%`;

      grid.innerHTML = `
        <div class="server-card primary-card">
          <strong>Primary</strong>
          <span>${Math.round(writes).toLocaleString()} writes/s · ${Math.round(primaryCpu)}% CPU</span>
          <div class="load-track"><span class="load-fill${primaryCpu > 90 ? ' danger' : ''}" style="width:${Math.max(2, Math.min(100, primaryCpu))}%"></span></div>
        </div>
        ${Array.from({ length: replicas }, (_, index) => `
          <div class="server-card">
            <strong>Replica ${index + 1}</strong>
            <span>${Math.round(reads / replicas).toLocaleString()} reads/s · ${Math.round(replicaCpu)}% CPU</span>
            <div class="load-track"><span class="load-fill${replicaCpu > 90 ? ' danger' : ''}" style="width:${Math.max(2, Math.min(100, replicaCpu))}%"></span></div>
          </div>
        `).join('')}
      `;

      if (load > knee) {
        verdict.textContent = `${load.toLocaleString()} offered, ${achieved.toLocaleString()} achieved. The wall is ${binding}; the remaining ${(load - achieved).toLocaleString()} requests per second queue or fail.`;
      } else {
        verdict.textContent = `${load.toLocaleString()} offered: ${Math.round(writes).toLocaleString()} writes/s on the primary at ${Math.round(primaryCpu)}%, and ${Math.round(reads / replicas).toLocaleString()} reads/s on each replica at ${Math.round(replicaCpu)}%. The knee is ${knee.toLocaleString()} rps, set by ${binding}.`;
      }
    };

    root.querySelectorAll('[data-replica-count]').forEach((button) => {
      button.addEventListener('click', () => {
        replicas = Number(button.dataset.replicaCount);
        root.querySelectorAll('[data-replica-count]').forEach((item) => item.classList.toggle('active', item === button));
        update();
      });
    });
    loadInput.addEventListener('input', update);
    shareInput.addEventListener('input', update);
    update();
  }

  function renderReplicaLag(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Can Meera see her booking?</h3>
        <p class="hint">Move the lag slider and switch the read-your-writes rule. The confirmation screen is the moment that matters.</p>
        <div class="slider-row">
          <label for="lag-seconds">Replication lag</label>
          <input id="lag-seconds" type="range" min="0" max="5" step="0.1" value="1.4">
          <output for="lag-seconds"></output>
        </div>
        <label class="check-row">
          <input id="lag-pin" type="checkbox">
          <span>Read-your-writes: pin this user to the primary for 5 seconds after a write</span>
        </label>
        <div class="flow-chain">
          <div class="flow-step ok"><span>1</span><strong>Commit</strong><small>primary writes the booking</small></div>
          <div class="flow-step"><span>2</span><strong>WAL stream</strong><small id="lag-stream">1.4 s behind</small></div>
          <div class="flow-step" id="lag-final-step"><span>3</span><strong>Confirmation</strong><small id="lag-final">reads the replica</small></div>
        </div>
        <div class="metric-grid">
          <div class="metric"><span>Invisible writes</span><strong data-metric="invisible"></strong></div>
          <div class="metric"><span>Confirmation</span><strong data-metric="confirmation"></strong></div>
          <div class="metric"><span>Extra primary reads</span><strong data-metric="extra"></strong></div>
          <div class="metric"><span>Lag</span><strong data-metric="lag"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const lagInput = root.querySelector('#lag-seconds');
    const pinInput = root.querySelector('#lag-pin');
    const finalStep = root.querySelector('#lag-final-step');
    const finalText = root.querySelector('#lag-final');
    const streamText = root.querySelector('#lag-stream');
    const invisibleOut = root.querySelector('[data-metric="invisible"]');
    const confirmationOut = root.querySelector('[data-metric="confirmation"]');
    const extraOut = root.querySelector('[data-metric="extra"]');
    const lagOut = root.querySelector('[data-metric="lag"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const lag = Number(lagInput.value);
      const pinned = pinInput.checked;
      const invisible = Math.round(lag * 220);
      const visible = pinned || lag < 0.05;
      const extra = pinned ? 90 : 0;

      root.querySelector('output[for="lag-seconds"]').textContent = `${lag.toFixed(1)} s`;
      streamText.textContent = lag < 0.05 ? 'replica is current' : `${lag.toFixed(1)} s behind`;
      finalText.textContent = visible ? 'reads the primary' : 'reads the replica';
      finalStep.classList.toggle('ok', visible);
      finalStep.classList.toggle('bad', !visible);
      invisibleOut.textContent = invisible.toLocaleString();
      confirmationOut.textContent = visible ? 'visible' : 'missing';
      extraOut.textContent = `${extra}/s`;
      lagOut.textContent = `${lag.toFixed(1)} s`;

      if (pinned) {
        verdict.textContent = `The user's reads go to the primary for five seconds after the write. At 1,800 rps that adds about 90 reads per second, or 5% of the total. Meera sees her booking even while the replica is ${lag.toFixed(1)} seconds behind.`;
      } else if (lag < 0.05) {
        verdict.textContent = `The replica is current, so the confirmation is correct. This is the happy path; it is not a plan for the moment the replica falls behind.`;
      } else {
        verdict.textContent = `At ${lag.toFixed(1)} seconds of lag, about ${invisible.toLocaleString()} writes are invisible. Meera's booking committed, but the confirmation read misses it. She may book again and create a duplicate.`;
      }
    };

    lagInput.addEventListener('input', update);
    pinInput.addEventListener('change', update);
    update();
  }

  function renderFailoverTimeline(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>Time the failover</h3>
        <p class="hint">Choose who decides and how writes are replicated. The timeline and the monthly budget change with the answer.</p>
        <div class="segmented" role="group" aria-label="Failover mode">
          <button type="button" data-failover-mode="auto" class="active">Automatic + quorum</button>
          <button type="button" data-failover-mode="manual">Manual runbook</button>
        </div>
        <div class="segmented" role="group" aria-label="Replication mode">
          <button type="button" data-replication-mode="async" class="active">Async replication</button>
          <button type="button" data-replication-mode="sync">Sync replication</button>
        </div>
        <div class="slider-row">
          <label for="failover-lag">Lag at failure</label>
          <input id="failover-lag" type="range" min="0.2" max="5" step="0.2" value="1.8">
          <output for="failover-lag"></output>
        </div>
        <ul class="timeline" data-failover-timeline></ul>
        <div class="metric-grid">
          <div class="metric"><span>RTO</span><strong data-metric="rto"></strong></div>
          <div class="metric"><span>RPO</span><strong data-metric="rpo"></strong></div>
          <div class="metric"><span>Monthly budget</span><strong data-metric="budget"></strong></div>
          <div class="metric"><span>Mode</span><strong data-metric="mode"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const timeline = root.querySelector('[data-failover-timeline]');
    const lagInput = root.querySelector('#failover-lag');
    const rtoOut = root.querySelector('[data-metric="rto"]');
    const rpoOut = root.querySelector('[data-metric="rpo"]');
    const budgetOut = root.querySelector('[data-metric="budget"]');
    const modeOut = root.querySelector('[data-metric="mode"]');
    const verdict = root.querySelector('.trace-verdict');
    let mode = 'auto';
    let replication = 'async';

    const update = () => {
      const lag = Number(lagInput.value);
      const rtoSeconds = mode === 'auto' ? 45 : 720;
      const rpoWrites = replication === 'sync' ? 0 : Math.round(lag * 180);
      const budget = (rtoSeconds / 60 / 43.2) * 100;
      const steps = mode === 'auto'
        ? [
            ['00:00', 'Primary stops responding'],
            ['00:15', 'Health checks fail'],
            ['00:20', 'Quorum confirms the leader is gone'],
            ['00:25', 'Replica promoted; old primary fenced'],
            ['00:35', 'Service discovery updated'],
            ['00:45', 'First booking succeeds'],
          ]
        : [
            ['00:00', 'Primary stops responding'],
            ['01:00', 'On-call acknowledges the alert'],
            ['05:00', 'Engineer verifies the primary is down'],
            ['07:00', 'Engineer starts promotion'],
            ['08:00', 'Replica promoted; old primary fenced'],
            ['10:00', 'Service discovery updated'],
            ['12:00', 'First booking succeeds'],
          ];

      root.querySelector('output[for="failover-lag"]').textContent = replication === 'sync' ? 'n/a' : `${lag.toFixed(1)} s`;
      timeline.innerHTML = steps
        .map(([time, label]) => `<li><time>${time}</time><span>${label}</span></li>`)
        .join('');
      rtoOut.textContent = mode === 'auto' ? '45 s' : '12 min';
      rpoOut.textContent = `${rpoWrites.toLocaleString()} writes`;
      budgetOut.textContent = `${budget.toFixed(1)}%`;
      modeOut.textContent = mode === 'auto' ? 'automatic' : 'manual';

      if (replication === 'sync') {
        verdict.textContent = `Synchronous replication cuts RPO to zero, but every commit waits for the standby. If the standby is slow or unavailable, writes can block. The ${mode === 'auto' ? '45-second' : '12-minute'} RTO still applies, and fencing is still required.`;
      } else if (mode === 'auto') {
        verdict.textContent = `Automatic failover takes 45 seconds, about 1.7% of the 43.2-minute monthly budget. The 1.8-second lag puts up to ${rpoWrites.toLocaleString()} writes at risk; reconcile them after promotion.`;
      } else {
        verdict.textContent = `A manual failover takes 12 minutes, ${budget.toFixed(1)}% of the monthly three-nines budget. That is acceptable for a rare event, but two incidents would consume more than half the month. Rehearse the runbook.`;
      }
    };

    root.querySelectorAll('[data-failover-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        mode = button.dataset.failoverMode;
        root.querySelectorAll('[data-failover-mode]').forEach((item) => item.classList.toggle('active', item === button));
        update();
      });
    });
    root.querySelectorAll('[data-replication-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        replication = button.dataset.replicationMode;
        root.querySelectorAll('[data-replication-mode]').forEach((item) => item.classList.toggle('active', item === button));
        update();
      });
    });
    lagInput.addEventListener('input', update);
    update();
  }

  function renderBackupRestore(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>How much can you lose?</h3>
        <p class="hint">Choose a backup cadence, WAL archiving and restore source. RPO is data loss; RTO is time to recover.</p>
        <div class="slider-row">
          <label for="backup-cadence">Base backup</label>
          <select id="backup-cadence">
            <option value="24">Nightly (02:00)</option>
            <option value="6">Every 6 hours</option>
            <option value="1">Hourly</option>
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="backup-wal">WAL archive</label>
          <select id="backup-wal">
            <option value="0">Off</option>
            <option value="60" selected>Every 60 seconds</option>
            <option value="5">Every 5 seconds</option>
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="backup-source">Restore from</label>
          <select id="backup-source">
            <option value="snapshot" selected>Storage snapshot</option>
            <option value="base">Base backup files</option>
          </select>
          <span></span>
        </div>
        <div class="slider-row">
          <label for="backup-size">Database size</label>
          <input id="backup-size" type="range" min="100" max="1000" step="50" value="400">
          <output for="backup-size"></output>
        </div>
        <label class="check-row">
          <input id="backup-tested" type="checkbox">
          <span>We restored this backup in the last quarter</span>
        </label>
        <div class="metric-grid">
          <div class="metric"><span>RPO</span><strong data-metric="rpo"></strong></div>
          <div class="metric"><span>RTO</span><strong data-metric="rto"></strong></div>
          <div class="metric"><span>Meets 5 / 45</span><strong data-metric="meets"></strong></div>
          <div class="metric"><span>Confidence</span><strong data-metric="confidence"></strong></div>
        </div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const cadenceInput = root.querySelector('#backup-cadence');
    const walInput = root.querySelector('#backup-wal');
    const sourceInput = root.querySelector('#backup-source');
    const sizeInput = root.querySelector('#backup-size');
    const testedInput = root.querySelector('#backup-tested');
    const rpoOut = root.querySelector('[data-metric="rpo"]');
    const rtoOut = root.querySelector('[data-metric="rto"]');
    const meetsOut = root.querySelector('[data-metric="meets"]');
    const confidenceOut = root.querySelector('[data-metric="confidence"]');
    const verdict = root.querySelector('.trace-verdict');

    const update = () => {
      const cadenceHours = Number(cadenceInput.value);
      const walSeconds = Number(walInput.value);
      const sizeGb = Number(sizeInput.value);
      const source = sourceInput.value;
      const tested = testedInput.checked;
      const rpoMinutes = walSeconds ? walSeconds / 60 : cadenceHours * 60;
      const baseMinutes = source === 'snapshot' ? 18 : Math.round((sizeGb * 1000) / 200 / 60);
      const rtoMinutes = baseMinutes + (walSeconds ? 15 : 5);
      const meets = rpoMinutes <= 5 && rtoMinutes <= 45;

      root.querySelector('output[for="backup-size"]').textContent = `${sizeGb} GB`;
      rpoOut.textContent = rpoMinutes >= 60 ? `${Math.round(rpoMinutes / 60)} h` : `${Math.round(rpoMinutes)} min`;
      rtoOut.textContent = `${rtoMinutes} min`;
      meetsOut.textContent = meets ? 'yes' : 'no';
      confidenceOut.textContent = tested ? 'tested' : 'unproven';

      if (!tested) {
        verdict.textContent = `The arithmetic can look healthy while the restore path is unproven. Run the drill: restore to a target timestamp, validate rows, and book an appointment against the restored database.`;
      } else if (!meets) {
        verdict.textContent = `This design misses a target: RPO ${rpoOut.textContent} against 5 minutes, RTO ${rtoMinutes} minutes against 45. Add WAL archiving, use a faster restore source, or accept the larger loss explicitly.`;
      } else {
        verdict.textContent = `RPO ${rpoOut.textContent} and RTO ${rtoMinutes} minutes are inside the 5-minute and 45-minute targets. ${source === 'snapshot' ? 'The snapshot restore is the fast part; WAL replay and verification still take time.' : 'The base-backup restore grows with database size; measure it on production-sized data.'}`;
      }
    };

    [cadenceInput, walInput, sourceInput, sizeInput, testedInput].forEach((input) => {
      input.addEventListener('input', update);
      input.addEventListener('change', update);
    });
    update();
  }

  function renderReplicaProof(root) {
    root.innerHTML = `
      <div class="widget-card">
        <h3>What did the replicas buy?</h3>
        <p class="hint">Choose a replica count and an offered load. Then kill the primary and read the drill result.</p>
        <div class="segmented" role="group" aria-label="Read replicas">
          <button type="button" data-replica-proof="0">No replica</button>
          <button type="button" data-replica-proof="1">1 replica</button>
          <button type="button" data-replica-proof="2" class="active">2 replicas</button>
          <button type="button" data-replica-proof="3">3 replicas</button>
        </div>
        <div class="slider-row">
          <label for="replica-proof-load">Offered load</label>
          <input id="replica-proof-load" type="range" min="600" max="2400" step="100" value="1800">
          <output for="replica-proof-load"></output>
        </div>
        <div class="server-grid" data-replica-proof-grid></div>
        <div class="metric-grid">
          <div class="metric"><span>Achieved</span><strong data-metric="achieved"></strong></div>
          <div class="metric"><span>p99</span><strong data-metric="p99"></strong></div>
          <div class="metric"><span>Primary CPU</span><strong data-metric="primary"></strong></div>
          <div class="metric"><span>Replica CPU</span><strong data-metric="replica"></strong></div>
        </div>
        <button class="btn small ghost" id="replica-proof-kill" type="button">Kill the primary</button>
        <div class="drill-banner" data-drill hidden></div>
        <p class="trace-verdict" aria-live="polite"></p>
      </div>
    `;

    const loadInput = root.querySelector('#replica-proof-load');
    const grid = root.querySelector('[data-replica-proof-grid]');
    const achievedOut = root.querySelector('[data-metric="achieved"]');
    const p99Out = root.querySelector('[data-metric="p99"]');
    const primaryOut = root.querySelector('[data-metric="primary"]');
    const replicaOut = root.querySelector('[data-metric="replica"]');
    const killButton = root.querySelector('#replica-proof-kill');
    const drill = root.querySelector('[data-drill]');
    const verdict = root.querySelector('.trace-verdict');
    let replicas = 2;
    let failed = false;

    const update = () => {
      const load = Number(loadInput.value);
      const knees = [1100, 1500, 1800, 1800];
      const knee = knees[replicas];
      const achieved = Math.min(load, knee);
      const ratio = load / knee;
      let p99;
      if (ratio <= 0.5) p99 = 60 + ratio * 80;
      else if (ratio <= 0.8) p99 = 100 + (ratio - 0.5) * 200;
      else if (ratio <= 1) p99 = 220 + (ratio - 0.8) * 300;
      else p99 = 280 + (ratio - 1) * 6000;
      p99 = Math.min(3500, p99);
      const writes = achieved * 0.2;
      const reads = achieved * 0.8;
      const primaryCpu = replicas === 0 ? Math.min(99, (achieved / 1100) * 100) : Math.min(99, (writes / 360) * 100);
      const replicaCpu = replicas ? Math.min(99, reads / (replicas * 1200) * 100) : 0;

      root.querySelector('output[for="replica-proof-load"]').textContent = `${load.toLocaleString()} rps`;
      achievedOut.textContent = `${achieved.toLocaleString()} rps`;
      p99Out.textContent = `${Math.round(p99).toLocaleString()} ms`;
      primaryOut.textContent = `${Math.round(primaryCpu)}%`;
      replicaOut.textContent = replicas ? `${Math.round(replicaCpu)}%` : '—';

      grid.innerHTML = `
        <div class="server-card primary-card${failed ? ' dead' : ''}">
          <strong>Primary</strong>
          <span>${Math.round(writes).toLocaleString()} writes/s${replicas === 0 ? ` + ${Math.round(reads).toLocaleString()} reads/s` : ''} · ${Math.round(primaryCpu)}% CPU</span>
          <div class="load-track"><span class="load-fill${primaryCpu > 90 ? ' danger' : ''}" style="width:${Math.max(2, Math.min(100, primaryCpu))}%"></span></div>
        </div>
        ${Array.from({ length: replicas }, (_, index) => `
          <div class="server-card">
            <strong>Replica ${index + 1}</strong>
            <span>${Math.round(reads / replicas).toLocaleString()} reads/s · ${Math.round(replicaCpu)}% CPU</span>
            <div class="load-track"><span class="load-fill${replicaCpu > 90 ? ' danger' : ''}" style="width:${Math.max(2, Math.min(100, replicaCpu))}%"></span></div>
          </div>
        `).join('')}
      `;

      if (replicas === 0) {
        verdict.textContent = `One primary does every read and write. Its knee is about 1,100 rps; at ${load.toLocaleString()} offered it achieves ${achieved.toLocaleString()} and the rest queues.`;
      } else if (load > knee) {
        verdict.textContent = `${load.toLocaleString()} offered but ${achieved.toLocaleString()} achieved. The primary's write path is saturated; more replicas add read capacity, not write throughput.`;
      } else if (replicas === 3) {
        verdict.textContent = `The third replica lowers read CPU to ${Math.round(replicaCpu)}% but the knee stays at 1,800 rps. The primary still commits every write.`;
      } else {
        verdict.textContent = `At ${load.toLocaleString()} rps, p99 is ${Math.round(p99).toLocaleString()} ms. The knee is ${knee.toLocaleString()} rps, ${replicas === 1 ? 'limited by the replica read tier' : 'limited by the primary write path'}.`;
      }
    };

    root.querySelectorAll('[data-replica-proof]').forEach((button) => {
      button.addEventListener('click', () => {
        replicas = Number(button.dataset.replicaProof);
        root.querySelectorAll('[data-replica-proof]').forEach((item) => item.classList.toggle('active', item === button));
        update();
      });
    });
    loadInput.addEventListener('input', update);
    killButton.addEventListener('click', () => {
      failed = !failed;
      drill.hidden = !failed;
      killButton.textContent = failed ? 'Reset drill' : 'Kill the primary';
      if (failed) {
        drill.textContent = 'Reference drill at 1,500 rps: automatic failover took 45 s, lag was 1.6 s, and 480 writes were at risk. Twelve bookings needed human reconciliation. The old primary stayed fenced.';
      }
      update();
    });
    update();
  }

  const LAB_ITEMS_BY_LESSON = {
    'part-1-m01-l05': [
      'Five clarifying questions for Dr. Rao',
      '8–10 functional requirements',
      '5 measurable non-functional requirements',
      '5–8 API endpoints with request and response shapes',
      'A data model with tables, keys and relationships',
      'A simple architecture diagram',
      'Three tradeoff decisions with what you gave up',
      'A v2 deferral list',
    ],
    'part-1-m02-l09': [
      'A journey-to-request table for booking and cancelling',
      'An API contract for slots, appointments and patients',
      'Tables with primary keys, foreign keys and constraints',
      'A double-booking constraint you can explain',
      'At least three indexes, each tied to a real query',
      'One query plan checked with EXPLAIN',
      'A short note on what you would cache and what you never would',
      'A v2 deferral list with reasons',
    ],
    'part-1-m03-l08': [
      'A ten-read inventory with rates, sizes and harm analysis',
      'A cache decision table with keys, placement and TTLs',
      'One key designed end to end: read, write, concurrency, expiry',
      'A staleness budget per cached screen',
      'A failure plan for stampede, hot key, penetration, avalanche, cold start and cache-down',
      'A three-phase load-test plan with a stated pass condition',
      'A one-page topology showing Redis, in-process caches and the database',
      'A written defense of why the free-slot list is not shared-cached',
    ],
    'part-1-m04-l09': [
      'A baseline table with the gap to every SLO',
      'A capacity model for database and API work per second',
      'An options table with cost, capacity, redundancy and ops burden',
      'A decision rule with metric, threshold, window and review trigger',
      'A quantified failure test for losing the API server',
      'A rollout and rollback sequence',
      'A one-page memo to Dr. Rao in plain language',
      'A written answer to the $6 budget question',
    ],
    'part-1-m05-l06': [
      'A baseline table with the gap to every SLO',
      'A workload routing table with freshness requirements',
      'A topology showing primary, replica, router and pooler',
      'A capacity model at 620 and 900 rps',
      'A read-your-writes rule and lag alert thresholds',
      'A failover runbook with RTO, RPO and reconciliation',
      'A backup and PITR plan with a restore drill',
      'A cost table at or under $220 per month',
      'A one-page memo to Dr. Rao',
    ],
  };

  function renderLabChecklist(root, lesson) {
    const items = LAB_ITEMS_BY_LESSON[lesson.id] || LAB_ITEMS_BY_LESSON['part-1-m01-l05'];
    const p = progressFor(lesson.id);
    p.labChecks = p.labChecks && typeof p.labChecks === 'object' ? p.labChecks : {};

    root.innerHTML = `
      <div class="widget-card">
        <h3>Lab checklist</h3>
        <p class="hint">Tick each deliverable as you finish it. Saved in this browser.</p>
        <ul class="lab-list">
          ${items.map(
            (item, index) => `
              <li>
                <label>
                  <input type="checkbox" data-lab-index="${index}" ${p.labChecks[index] ? 'checked' : ''}>
                  <span>${escapeHtml(item)}</span>
                </label>
              </li>
            `,
          ).join('')}
        </ul>
        <div class="sorter-score lab-score" aria-live="polite"></div>
        <button class="btn small ghost lab-reset" type="button">Reset checklist</button>
      </div>
    `;

    const score = root.querySelector('.lab-score');
    const updateScore = () => {
      const checked = root.querySelectorAll('input[data-lab-index]:checked').length;
      score.textContent = `${checked} of ${items.length} deliverables complete`;
    };

    root.querySelectorAll('input[data-lab-index]').forEach((input) => {
      input.addEventListener('change', () => {
        p.labChecks[input.dataset.labIndex] = input.checked;
        saveProgress();
        updateScore();
      });
    });

    root.querySelector('.lab-reset').addEventListener('click', () => {
      p.labChecks = {};
      saveProgress();
      root.querySelectorAll('input[data-lab-index]').forEach((input) => {
        input.checked = false;
      });
      updateScore();
    });

    updateScore();
  }

  // ---------- Code copy, diagrams, Mermaid ----------

  function setupCodeCopy(root) {
    root.querySelectorAll('pre.code-block').forEach((pre) => {
      if (pre.querySelector('.copy-code')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code';
      button.textContent = 'Copy';
      button.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const ok = await copyText(code ? code.textContent : pre.textContent);
        showToast(ok ? 'Code copied' : 'Could not copy the code');
      });
      pre.appendChild(button);
    });
  }

  function setupDiagramZoom(root) {
    root.querySelectorAll('.mermaid-wrap').forEach((wrap) => {
      wrap.addEventListener('click', () => {
        const svg = wrap.querySelector('svg');
        if (!svg) return;
        dialogBody.innerHTML = '';
        dialogBody.appendChild(svg.cloneNode(true));
        if (typeof diagramDialog.showModal === 'function') {
          diagramDialog.showModal();
        }
      });
    });
  }

  let mermaidQueue = Promise.resolve();

  function renderMermaid(root, force = false) {
    if (!window.mermaid) return;
    const nodes = [...root.querySelectorAll('.mermaid')];
    if (!nodes.length) return;

    const dark = document.documentElement.dataset.theme === 'dark';
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        deterministicIds: true,
        theme: 'base',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        themeVariables: dark
          ? {
              background: '#121824',
              primaryColor: '#1d2a42',
              primaryTextColor: '#e8edf6',
              primaryBorderColor: '#4a6288',
              lineColor: '#8fa6c4',
              secondaryColor: '#182130',
              tertiaryColor: '#0c1017',
              noteBkgColor: '#33250f',
              noteTextColor: '#f1b45c',
              noteBorderColor: '#6b4a1f',
              actorBkg: '#1d2a42',
              actorBorder: '#4a6288',
              actorTextColor: '#e8edf6',
              signalColor: '#b1bccb',
              signalTextColor: '#e8edf6',
              labelBoxBkgColor: '#182130',
              labelBoxBorderColor: '#35445c',
              labelTextColor: '#e8edf6',
              loopTextColor: '#e8edf6',
              activationBkgColor: '#2457d6',
              activationBorderColor: '#7aa2ff',
            }
          : {
              background: '#ffffff',
              primaryColor: '#eef3ff',
              primaryTextColor: '#151922',
              primaryBorderColor: '#9ab0df',
              lineColor: '#5c6f8f',
              secondaryColor: '#f5f7fa',
              tertiaryColor: '#ffffff',
              noteBkgColor: '#fff2df',
              noteTextColor: '#6b3b05',
              noteBorderColor: '#e2bd85',
              actorBkg: '#eef3ff',
              actorBorder: '#9ab0df',
              actorTextColor: '#151922',
              signalColor: '#4d5665',
              signalTextColor: '#151922',
              labelBoxBkgColor: '#f5f7fa',
              labelBoxBorderColor: '#c3ccd8',
              labelTextColor: '#151922',
              loopTextColor: '#151922',
              activationBkgColor: '#2457d6',
              activationBorderColor: '#2457d6',
            },
      });
    } catch {
      return;
    }

    const candidates = force ? nodes : nodes.filter((node) => !node.dataset.rendered);
    if (!candidates.length) return;

    // Rebuild each diagram from its source. Reusing a node that already contains
    // an SVG lets two async renders race and stack diagrams on top of each other.
    const freshNodes = candidates.map((node) => {
      const source = node.dataset.src || node.textContent || '';
      const fresh = document.createElement('pre');
      fresh.className = 'mermaid';
      fresh.dataset.src = source;
      fresh.dataset.rendered = '1';
      fresh.textContent = source;
      node.replaceWith(fresh);
      return fresh;
    });

    mermaidQueue = mermaidQueue
      .then(() => window.mermaid.run({ nodes: freshNodes, suppressErrors: true }))
      .then(() => {
        // Mermaid's ER renderer can emit style="undefined;;;undefined" on edges.
        // Remove those empty declarations so the SVG stays clean.
        freshNodes.forEach((node) => {
          node.querySelectorAll('[style]').forEach((el) => {
            const style = el.getAttribute('style');
            if (!style || !style.includes('undefined')) return;
            const cleaned = style
              .split(';')
              .filter((part) => part.trim() && !part.includes('undefined'))
              .join(';');
            if (cleaned) el.setAttribute('style', cleaned);
            else el.removeAttribute('style');
          });
        });
      })
      .catch(() => {
        // If Mermaid fails, leave the source visible rather than showing a blank box.
      });
  }

  // ---------- Search ----------

  const searchIndex = (COURSE.search || []).map((item) => ({
    ...item,
    haystack: `${item.title} ${item.summary} ${item.text} ${item.module} ${item.part} ${(item.tags || []).join(' ')}`.toLowerCase(),
  }));

  function showSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.hidden = true;
      state.searchOpen = false;
      return;
    }

    const matches = searchIndex
      .filter((item) => item.haystack.includes(q))
      .slice(0, 12);

    if (!matches.length) {
      searchResults.innerHTML = '<div class="search-empty">No matches. Try “requirements”, “p99”, “cache” or “replica”.</div>';
    } else {
      searchResults.innerHTML = matches
        .map(
          (item) => `
            <button type="button" class="search-result" data-route="${escapeHtml(item.route || `#/lesson/${item.id}`)}" data-lesson="${escapeHtml(item.id)}">
              <strong>${escapeHtml(item.number)} ${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.part)} · ${escapeHtml(item.module)}${item.hasContent ? '' : ' · planned'}</span>
            </button>
          `,
        )
        .join('');
    }

    searchResults.hidden = false;
    state.searchOpen = true;
  }

  function setupSearch() {
    searchInput.addEventListener('input', () => showSearch(searchInput.value));
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) showSearch(searchInput.value);
    });

    searchResults.addEventListener('click', (event) => {
      const button = event.target.closest('.search-result');
      if (!button) return;
      navigate(button.dataset.route || `#/lesson/${encodeURIComponent(button.dataset.lesson)}`);
      searchInput.value = '';
      searchResults.hidden = true;
      searchInput.blur();
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-wrap')) {
        searchResults.hidden = true;
      }
      if (!event.target.closest('#data-popover') && !event.target.closest('#data-menu')) {
        dataPopover.hidden = true;
        dataMenuButton.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (event.key === '/' && !typing) {
        event.preventDefault();
        searchInput.focus();
      } else if (event.key === 'Escape') {
        searchResults.hidden = true;
        dataPopover.hidden = true;
        closeMobileSidebar();
      }
    });
  }

  // ---------- Theme, mobile, data menu ----------

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem(THEME_KEY, state.theme);
    const button = document.getElementById('theme-toggle');
    if (button) button.textContent = state.theme === 'dark' ? '☀' : '◐';
    renderMermaid(main, true);
  }

  function openMobileSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'true');
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function setupDataMenu() {
    dataMenuButton.addEventListener('click', () => {
      const isHidden = dataPopover.hidden;
      dataPopover.hidden = !isHidden;
      dataMenuButton.setAttribute('aria-expanded', String(isHidden));
    });

    dataPopover.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      dataPopover.hidden = true;
      dataMenuButton.setAttribute('aria-expanded', 'false');

      if (action === 'export') exportProgress();
      if (action === 'import') importFile.click();
      if (action === 'reset') resetProgress();
    });

    importFile.addEventListener('change', () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!parsed.lessons || typeof parsed.lessons !== 'object') {
            throw new Error('Invalid progress file');
          }
          state.progress = {
            version: 1,
            lessons: parsed.lessons,
            lastLesson: parsed.lastLesson || null,
            createdAt: parsed.createdAt || new Date().toISOString(),
          };
          saveProgress();
          render();
          showToast('Progress imported');
        } catch {
          showToast('That file is not a valid progress export');
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });
  }

  function exportProgress() {
    const payload = {
      course: COURSE.meta?.title || 'System Design Path',
      exportedAt: new Date().toISOString(),
      ...state.progress,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `system-design-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('Progress exported');
  }

  function resetProgress() {
    if (!window.confirm('Reset all lesson progress, quiz scores and notes in this browser?')) return;
    state.progress = defaultProgress();
    saveProgress();
    render();
    showToast('Progress reset');
  }

  // ---------- Init ----------

  function init() {
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/home');
    }

    applyTheme();
    setupSearch();
    setupDataMenu();

    document.getElementById('theme-toggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
    });

    document.getElementById('menu-toggle').addEventListener('click', () => {
      if (sidebar.classList.contains('open')) closeMobileSidebar();
      else openMobileSidebar();
    });

    overlay.addEventListener('click', closeMobileSidebar);

    document.getElementById('dialog-close').addEventListener('click', () => diagramDialog.close());
    diagramDialog.addEventListener('click', (event) => {
      if (event.target === diagramDialog) diagramDialog.close();
    });

    window.addEventListener('hashchange', render);
    render();
  }

  init();
})();
