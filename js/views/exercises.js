// Exercises tab: library, exercise progress detail and custom exercises.

import { MUSCLES, EQUIPMENT, TRACKS } from '../data.js';
import { state, save, allExercises, getEx, isCustom, historyIndex, fmtW, toDisp, unit, uid, round } from '../store.js';
import { working, e1rm, bests, hasWeight, lastSession } from '../engine.js';
import {
  h, raw, icon, app, confirmSheet, toast, musclesText, muscleName, setText, dateShort, ago, numFmt, listText,
} from '../ui.js';
import { mountChart } from '../chart.js';
import { bodyMap, muscleIcon } from '../art.js';
import { thumb } from '../components.js';

// ---- Library -------------------------------------------------------------------------

const lib = { q: '', filter: 'all' };

export function renderExercises(el) {
  el.innerHTML = String(h`
    <header class="page-head">
      <h1 class="page-title">Exercises</h1>
      <a class="btn small" href="#/exercise-new">${icon('plus')} New exercise</a>
    </header>
    <div class="lib-tools">
      <label class="search">${icon('search')}<input type="search" data-q value="${lib.q}" placeholder="Search ${allExercises().length} exercises" aria-label="Search exercises" autocomplete="off"></label>
      <div class="chip-scroll" role="group" aria-label="Filter">
        ${[['all', 'All'], ['done', 'Done before'], ['fav', 'Favorites'], ['hidden', 'Not recommended'], ...Object.entries(MUSCLES).map(([k, v]) => [k, v.name])].map(([k, name]) => h`
          <button class="chip ${MUSCLES[k] ? 'with-icon' : ''} ${lib.filter === k ? 'on' : ''}" data-filter="${k}" aria-pressed="${lib.filter === k}">${MUSCLES[k] ? h`<span class="chip-icon">${raw(muscleIcon(k))}</span>` : ''}${name}</button>`)}
      </div>
    </div>
    <div data-list></div>`);

  const list = el.querySelector('[data-list]');
  const draw = () => { list.innerHTML = String(libraryList()); };
  draw();

  el.onclick = (e) => {
    const f = e.target.closest('[data-filter]');
    if (!f) return;
    lib.filter = f.dataset.filter;
    for (const c of el.querySelectorAll('[data-filter]')) {
      c.classList.toggle('on', c === f);
      c.setAttribute('aria-pressed', c === f);
    }
    draw();
  };
  el.oninput = (e) => {
    if (!e.target.matches('[data-q]')) return;
    lib.q = e.target.value;
    draw();
  };
}

function libraryList() {
  const words = lib.q.toLowerCase().split(/\s+/).filter(Boolean);
  const idx = historyIndex();
  const f = lib.filter;
  const items = allExercises()
    .filter((e) => words.every((w) => e.name.toLowerCase().includes(w)))
    .filter((e) => f === 'all'
      || (f === 'done' && idx.has(e.id))
      || (f === 'fav' && state.prefs.fav[e.id])
      || (f === 'hidden' && state.prefs.excl[e.id])
      || e.primary.includes(f))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!items.length) {
    const msg = f === 'fav' ? 'No favorites yet. Open an exercise and tap "Recommend more often".'
      : f === 'hidden' ? 'Nothing hidden. Exercises you mark "Don\'t recommend" land here.'
        : f === 'done' ? 'Exercises you log show up here.'
          : 'No exercises match that search.';
    return h`<p class="empty-note">${msg}</p>`;
  }

  const row = (e) => {
    const last = lastSession(e.id);
    const top = last ? Math.max(0, ...working(last.e.sets).map((s) => s.w || 0)) : 0;
    return h`<li><a class="lib-row" href="#/exercise/${e.id}">
      ${thumb(e, 'small')}
      <span class="lr-main">
        <span class="lr-name">${e.name}${state.prefs.fav[e.id] ? icon('star', 'fav') : ''}${state.prefs.excl[e.id] ? icon('block', 'hidden-i') : ''}</span>
        <span class="lr-sub">${musclesText(e)}</span>
      </span>
      <span class="lr-side">${last ? (top ? `${fmtW(top)} ${unit()}` : ago(last.w.startedAt)) : ''}</span>
    </a></li>`;
  };

  // Group by main muscle when browsing everything; flat list otherwise.
  if (f === 'all' && !words.length) {
    return h`${Object.keys(MUSCLES).map((m) => {
      const group = items.filter((e) => e.primary[0] === m);
      return group.length ? h`<h2 class="section-title with-icon"><span class="title-icon">${raw(muscleIcon(m))}</span>${muscleName(m)}</h2><ul class="lib-list">${group.map(row)}</ul>` : '';
    })}`;
  }
  return h`<ul class="lib-list">${items.map(row)}</ul>`;
}

// ---- Detail -------------------------------------------------------------------------

const METRICS = {
  e1rm: { name: 'Est. 1-rep max', of: (sets) => Math.max(0, ...sets.map((s) => e1rm(s.w, s.r))), weight: true },
  weight: { name: 'Heaviest set', of: (sets) => Math.max(0, ...sets.map((s) => s.w || 0)), weight: true },
  volume: { name: 'Volume', of: (sets) => sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), weight: true },
  reps: { name: 'Most reps', of: (sets) => Math.max(0, ...sets.map((s) => s.r || 0)) },
  time: { name: 'Longest set', of: (sets) => Math.max(0, ...sets.map((s) => s.s || 0)), suffix: ' sec' },
};

function metricsFor(ex, sessions) {
  const anyWeight = sessions.some(({ e }) => working(e.sets).some((s) => s.w > 0));
  switch (ex.track) {
    case 'wr': return ['e1rm', 'weight', 'volume'];
    case 'bw': return anyWeight ? ['reps', 'weight'] : ['reps'];
    case 'r': return ['reps'];
    case 't': return ['time'];
    case 'wt': return ['weight', 'time'];
    default: return ['reps'];
  }
}

const metricChoice = {};

export function renderExerciseDetail(el, id) {
  const ex = getEx(id);
  if (ex.missing) {
    el.innerHTML = String(h`<a class="back" href="#/exercises">${icon('back')} Exercises</a><p class="empty-note">This exercise was deleted.</p>`);
    return;
  }
  const sessions = (historyIndex().get(id) || []).filter(({ e }) => working(e.sets).length);
  const metrics = metricsFor(ex, sessions);
  const metric = metrics.includes(metricChoice[id]) ? metricChoice[id] : metrics[0];
  const b = bests(id);
  const fav = !!state.prefs.fav[id];
  const hidden = !!state.prefs.excl[id];
  const u = unit();

  const bestSet = (() => {
    let best = null;
    for (const { e } of sessions) {
      for (const s of working(e.sets)) {
        const score = hasWeight(ex) ? (s.w || 0) * 1000 + (s.r || s.s || 0) : (s.r || s.s || 0);
        if (!best || score > best.score) best = { s, score };
      }
    }
    return best?.s;
  })();

  el.innerHTML = String(h`
    <button class="back" data-act="back">${icon('back')} Back</button>
    <header class="ex-hero">
      ${thumb(ex, 'large')}
      <div class="ex-hero-text">
      <h1 class="page-title">${ex.name}</h1>
      <p class="muted">Works ${listText(ex.primary.map((m) => muscleName(m).toLowerCase()))}${ex.secondary.length ? `, plus ${listText(ex.secondary.map((m) => muscleName(m).toLowerCase()))}` : ''}.</p>
      <p class="muted">${ex.equipment.length ? `Needs ${listText(ex.equipment.map((e) => (EQUIPMENT[e] || e).toLowerCase()))}.` : 'No equipment needed.'}</p>
      </div>
    </header>


    <div class="toggle-row">
      <button class="btn small ${fav ? 'on' : ''}" data-act="fav" aria-pressed="${fav}">${icon('star')} Recommend more often</button>
      <button class="btn small ${hidden ? 'on' : ''}" data-act="hide" aria-pressed="${hidden}">${icon('block')} Don't recommend</button>
      <a class="btn small" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise form`)}" target="_blank" rel="noopener">${icon('external')} How to do it</a>
    </div>

    ${sessions.length ? h`
      <div class="stat-row">
        ${ex.track === 'wr' ? h`<div class="stat"><b>${round(toDisp(b.e1), 1)}</b><span>est. 1RM, ${u}</span></div>` : ''}
        ${bestSet ? h`<div class="stat"><b>${setText(bestSet, ex)}</b><span>best set</span></div>` : ''}
        <div class="stat"><b>${sessions.length}</b><span>${sessions.length === 1 ? 'session' : 'sessions'}</span></div>
      </div>

      <section class="chart-card">
        <div class="chart-head">
          <h2 class="section-title">Progress</h2>
          ${metrics.length > 1 ? h`<div class="seg" role="group" aria-label="Chart metric">${metrics.map((k) => h`
            <button class="seg-btn ${k === metric ? 'on' : ''}" data-metric="${k}" aria-pressed="${k === metric}">${METRICS[k].name}</button>`)}</div>` : ''}
        </div>
        ${sessions.length > 1 ? h`<div class="chart" data-chart></div>` : h`<p class="empty-note">Log this exercise once more to see a trend line.</p>`}
      </section>

    <figure class="card map-card">
        <div class="map-wrap">${raw(bodyMap({ primary: ex.primary, secondary: ex.secondary, label: `Muscles worked: ${listText(ex.primary.map(muscleName))}` }))}</div>
        <figcaption class="map-legend"><span class="key pri"></span>Main muscles <span class="key sec"></span>Also worked</figcaption>
      </figure>

      <h2 class="section-title">Sessions</h2>
      <ul class="sess-list">${sessions.map(({ w, e }) => h`<li>
        <a class="sess" href="#/history/${w.id}">
          <span class="sess-date">${dateShort(w.startedAt)}</span>
          <span class="sess-sets">${e.sets.map((s) => (s.wu ? `W ${setText(s, ex)}` : setText(s, ex))).join(', ')}</span>
        </a></li>`)}</ul>` : h`
      <p class="empty-note">No sessions yet. Once you log ${ex.name}, your best sets and a progress chart appear here.</p>
      <figure class="card map-card">
        <div class="map-wrap">${raw(bodyMap({ primary: ex.primary, secondary: ex.secondary, label: `Muscles worked: ${listText(ex.primary.map(muscleName))}` }))}</div>
        <figcaption class="map-legend"><span class="key pri"></span>Main muscles <span class="key sec"></span>Also worked</figcaption>
      </figure>`}

    ${isCustom(id) ? h`<div class="detail-actions">
      <a class="btn" href="#/exercise-edit/${id}">${icon('edit')} Edit exercise</a>
      <button class="btn ghost-danger" data-act="delete">${icon('trash')} Delete exercise</button>
    </div>` : ''}`);

  const chartBox = el.querySelector('[data-chart]');
  if (chartBox) {
    const m = METRICS[metric];
    const points = sessions
      .map(({ w, e }) => ({ t: w.startedAt, v: m.of(working(e.sets)) }))
      .filter((p) => p.v > 0)
      .reverse()
      .map((p) => ({ t: p.t, v: m.weight ? toDisp(p.v) : p.v }));
    const num = (v) => (Math.abs(v) >= 1000 ? numFmt(v) : String(round(v, 1)));
    const suffix = m.weight ? ` ${u}` : m.suffix || ' reps';
    const fmt = (v, tick) => `${num(v)}${tick ? '' : suffix}`;
    if (points.length > 1) mountChart(chartBox, points, { fmt, label: `${ex.name}, ${m.name}` });
    else chartBox.outerHTML = String(h`<p class="empty-note">Not enough data for this chart yet.</p>`);
  }

  el.onclick = async (e) => {
    const mb = e.target.closest('[data-metric]');
    if (mb) {
      metricChoice[id] = mb.dataset.metric;
      app.refresh();
      return;
    }
    const b2 = e.target.closest('[data-act]');
    if (!b2) return;
    const act = b2.dataset.act;
    if (act === 'back') {
      if (history.length > 1) history.back(); else location.hash = '#/exercises';
    } else if (act === 'fav') {
      if (fav) delete state.prefs.fav[id]; else { state.prefs.fav[id] = true; delete state.prefs.excl[id]; }
      save('prefs');
      app.refresh();
    } else if (act === 'hide') {
      if (hidden) delete state.prefs.excl[id]; else { state.prefs.excl[id] = true; delete state.prefs.fav[id]; }
      save('prefs');
      toast(hidden ? `${ex.name} can be recommended again` : `${ex.name} won't be recommended`);
      app.refresh();
    } else if (act === 'delete') {
      if (!(await confirmSheet({ title: 'Delete exercise?', text: 'Logged sets stay in your history under its old name.', ok: 'Delete', danger: true }))) return;
      state.custom = state.custom.filter((c) => c.id !== id);
      save('custom');
      location.hash = '#/exercises';
    }
  };
}

// ---- Custom exercise form -------------------------------------------------------------

export function renderExerciseForm(el, id) {
  const existing = id ? state.custom.find((c) => c.id === id) : null;
  const ex = existing || { name: '', primary: ['chest'], secondary: [], equipment: [], kind: 'c', track: 'wr' };
  const sec = new Set(ex.secondary);
  const eq = new Set(ex.equipment);

  el.innerHTML = String(h`
    <a class="back" href="${existing ? `#/exercise/${id}` : '#/exercises'}">${icon('back')} ${existing ? ex.name : 'Exercises'}</a>
    <h1 class="page-title">${existing ? 'Edit exercise' : 'New exercise'}</h1>
    <form class="form" novalidate>
      <label class="field"><span class="field-label">Name</span>
        <input class="text-in" name="name" value="${ex.name}" maxlength="60" required autocomplete="off" placeholder="e.g. Landmine Press"></label>
      <label class="field"><span class="field-label">Main muscle</span>
        <select class="text-in" name="primary">${Object.entries(MUSCLES).map(([k, m]) => h`<option value="${k}" ${ex.primary[0] === k ? 'selected' : ''}>${m.name}</option>`)}</select></label>
      <fieldset class="field"><legend class="field-label">Also works</legend>
        <div class="chip-wrap">${Object.entries(MUSCLES).map(([k, m]) => h`
          <button type="button" class="chip ${sec.has(k) ? 'on' : ''}" data-sec="${k}" aria-pressed="${sec.has(k)}">${m.name}</button>`)}</div></fieldset>
      <fieldset class="field"><legend class="field-label">Equipment needed</legend>
        <div class="chip-wrap">${Object.entries(EQUIPMENT).map(([k, name]) => h`
          <button type="button" class="chip ${eq.has(k) ? 'on' : ''}" data-eq="${k}" aria-pressed="${eq.has(k)}">${name}</button>`)}</div>
        <span class="field-hint">Leave empty for bodyweight exercises.</span></fieldset>
      <label class="field"><span class="field-label">What you log</span>
        <select class="text-in" name="track">${Object.entries(TRACKS).map(([k, t]) => h`<option value="${k}" ${ex.track === k ? 'selected' : ''}>${t.name}</option>`)}</select></label>
      <label class="field"><span class="field-label">Type</span>
        <select class="text-in" name="kind">
          <option value="c" ${ex.kind === 'c' ? 'selected' : ''}>Compound (several joints, goes first)</option>
          <option value="i" ${ex.kind === 'i' ? 'selected' : ''}>Isolation (one muscle)</option>
        </select></label>
      <button class="btn primary big">${existing ? 'Save changes' : 'Create exercise'}</button>
    </form>`);

  el.onclick = (e) => {
    const c = e.target.closest('[data-sec],[data-eq]');
    if (!c) return;
    const set = c.dataset.sec ? sec : eq;
    const k = c.dataset.sec || c.dataset.eq;
    if (set.has(k)) set.delete(k); else set.add(k);
    c.classList.toggle('on', set.has(k));
    c.setAttribute('aria-pressed', set.has(k));
  };

  el.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    if (!name) { f.name.focus(); toast('Give the exercise a name'); return; }
    const primary = f.primary.value;
    const data = {
      name,
      primary: [primary],
      secondary: [...sec].filter((m) => m !== primary),
      equipment: [...eq],
      kind: f.kind.value,
      track: f.track.value,
      tier: 2,
    };
    if (existing) Object.assign(existing, data);
    else state.custom.push({ id: `c_${uid()}`, ...data });
    save('custom');
    const newId = existing ? id : state.custom.at(-1).id;
    toast(existing ? 'Exercise updated' : `${name} added`);
    location.hash = `#/exercise/${newId}`;
  };
}

