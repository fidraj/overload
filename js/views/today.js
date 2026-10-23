// Workout tab when no workout is running: today's generated plan, its options, exercise
// details and saved workouts.

import { SPLITS, GOALS } from '../data.js';
import { state, save, getEx, fmtW, unit } from '../store.js';
import {
  ensureDraft, recovery, suggestion, lastSession, working, defaultItem, estimateMinutes,
  startWorkout, saveTemplate, isTimed,
} from '../engine.js';
import { bodyMap } from '../art.js';
import {
  h, raw, icon, app, choiceSheet, confirmSheet, promptSheet, toast, dateLong, rangeText,
  muscleName, ago, listText, setShort,
} from '../ui.js';
import { thumb, muscleStrip } from '../components.js';
import { pickExercise, pickMuscles } from '../picker.js';

const DURATIONS = [20, 30, 45, 60, 75, 90, 120];
export const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export function restLabel(sec) {
  if (!sec) return 'off';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s} sec`;
}

// "4 sets, 6–10 reps, 60 kg"
export function doseText(it, ex, kg) {
  const parts = [`${it.sets} ${it.sets === 1 ? 'set' : 'sets'}`, `${rangeText(it.min, it.max)} ${isTimed(ex) ? 'sec' : 'reps'}`];
  if (kg) parts.push(`${fmtW(kg)} ${unit()}`);
  return parts.join(', ');
}

const topOf = (exId) => {
  const last = lastSession(exId);
  return last ? Math.max(0, ...working(last.e.sets).map((s) => s.w || 0)) : 0;
};

export function renderToday(el) {
  const d = ensureDraft();
  const rec = recovery();
  const s = state.settings;
  const sets = d.items.reduce((a, it) => a + it.sets, 0);
  const splitLabel = s.split === 'smart' ? `Smart: ${SPLITS[d.resolved]?.name || 'Custom'}` : s.split === 'custom' ? 'Custom muscles' : SPLITS[s.split].name;

  el.innerHTML = String(h`
    <header class="hero">
      <p class="hero-date">${dateLong(Date.now())}</p>
      <h1 class="display">${d.title}</h1>
    </header>

    ${d.targets.length ? muscleStrip(d.targets, rec, { edit: true }) : h`
      <button class="btn small" data-act="muscles">${icon('edit')} Pick muscles</button>`}

    <div class="chip-scroll options-row" role="group" aria-label="Workout options">
      <button class="chip opt-chip" data-act="duration">${icon('timer')} ${s.duration} min ${icon('chevron')}</button>
      <button class="chip opt-chip" data-act="split">${splitLabel} ${icon('chevron')}</button>
      <button class="chip opt-chip" data-act="goal">${GOALS[s.goal].name} ${icon('chevron')}</button>
      <button class="chip opt-chip accent" data-act="regen">${icon('shuffle')} New mix</button>
    </div>

    <section aria-labelledby="plan-title">
      <div class="sec-head">
        <h2 class="section-title" id="plan-title">${d.items.length} exercises</h2>
        <span class="sec-meta">${sets} sets, about ${estimateMinutes(d.items)} min</span>
      </div>
      ${d.items.length ? h`<ul class="ex-list">${d.items.map(planRow)}</ul>` : h`
        <p class="empty-note">Nothing fits these options. Pick other muscles or add equipment in Settings.</p>`}
      <button class="add-row" data-act="add">${icon('plus')} Add exercise</button>
    </section>

    <div class="cta-bar">
      <button class="btn primary big" data-act="start" ${d.items.length ? '' : 'disabled'}>${icon('play')} Start workout</button>
      <button class="btn big icon-only" data-act="save" aria-label="Save as a workout template" title="Save as template">${icon('bookmark')}</button>
    </div>

    <section aria-labelledby="saved-title">
      <h2 class="section-title" id="saved-title">Saved workouts</h2>
      ${state.templates.length ? h`<ul class="tpl-list">${state.templates.map((t) => h`
        <li><button class="tpl" data-act="tpl" data-id="${t.id}">
          <span class="tpl-thumbs">${t.items.slice(0, 3).map((it) => thumb(getEx(it.exId), 'small'))}</span>
          <span class="tpl-text">
            <span class="tpl-name">${t.name}</span>
            <span class="tpl-sub">${t.items.length} exercises${t.lastUsed ? `, last done ${ago(t.lastUsed)}` : ''}</span>
          </span>
          ${icon('next')}
        </button></li>`)}</ul>` : h`
        <p class="empty-note">Tap the bookmark next to Start to save a workout you like. It shows up here, ready to repeat.</p>`}
      <button class="btn wide" data-act="empty">${icon('plus')} Start an empty workout</button>
    </section>`);

  el.onclick = (e) => {
    const b = e.target.closest('[data-act]');
    if (b) actions[b.dataset.act]?.(Number(b.dataset.i), b.dataset.id);
  };
}

function planRow(it, i) {
  const ex = getEx(it.exId);
  const sug = suggestion(it.exId, it.max);
  return h`<li class="ex-item">
    <a class="ex-link" href="#/plan/${i}">
      ${thumb(ex)}
      <span class="ex-text">
        <span class="ex-title">${ex.name}</span>
        <span class="ex-meta">${doseText(it, ex, topOf(it.exId))}</span>
        ${sug?.kind === 'up' ? h`<span class="up-note">${icon('up')} Ready for ${fmtW(sug.w)} ${unit()}</span>` : ''}
      </span>
    </a>
    <button class="icon-btn" data-act="more" data-i="${i}" aria-label="Options for ${ex.name}">${icon('more')}</button>
  </li>`;
}

function regenerate() {
  ensureDraft(true);
  app.refresh();
}

function edited() {
  state.draft.edited = true;
  save('draft');
  app.refresh();
}

async function swapItem(i) {
  const items = state.draft.items;
  const id = await pickExercise({ title: 'Swap exercise', swapFor: items[i].exId, exclude: items.map((it) => it.exId) });
  if (!id) return false;
  items[i] = defaultItem(id, state.draft.goal);
  edited();
  return true;
}

async function itemMenu(i) {
  const items = state.draft.items;
  const ex = getEx(items[i].exId);
  const fav = !!state.prefs.fav[ex.id];
  const v = await choiceSheet({
    title: ex.name,
    options: [
      { value: 'swap', label: 'Swap for another exercise', icon: 'swap' },
      ...(i > 0 ? [{ value: 'upm', label: 'Move up', icon: 'up' }] : []),
      ...(i < items.length - 1 ? [{ value: 'downm', label: 'Move down', icon: 'down' }] : []),
      { value: 'fav', label: fav ? 'Stop recommending more often' : 'Recommend more often', icon: 'star' },
      { value: 'excl', label: "Don't recommend again", desc: 'Removes it and keeps it out of future workouts.', icon: 'block' },
      { value: 'remove', label: 'Remove from this workout', icon: 'trash', danger: true },
    ],
  });
  if (!v) return null;
  if (v === 'swap') {
    await swapItem(i);
    return v;
  }
  if (v === 'fav') {
    if (fav) delete state.prefs.fav[ex.id]; else state.prefs.fav[ex.id] = true;
    save('prefs');
    toast(fav ? `${ex.name} is back to normal priority` : `${ex.name} will show up more often`);
    app.refresh();
    return v;
  }
  if (v === 'excl') {
    state.prefs.excl[ex.id] = true;
    save('prefs');
    toast(`${ex.name} won't be recommended again`);
  }
  if (v === 'remove' || v === 'excl') items.splice(i, 1);
  if (v === 'upm') items.splice(i - 1, 0, ...items.splice(i, 1));
  if (v === 'downm') items.splice(i + 1, 0, ...items.splice(i, 1));
  edited();
  return v;
}

const actions = {
  async split() {
    const s = state.settings;
    const v = await choiceSheet({
      title: 'Split',
      value: s.split,
      options: [
        { value: 'smart', label: 'Smart', desc: 'Rotates push, pull and legs, picking whichever muscles are most rested.' },
        ...Object.entries(SPLITS).map(([k, sp]) => ({ value: k, label: sp.name, desc: listText(Object.keys(sp.muscles).slice(0, 4).map(muscleName)) })),
        { value: 'custom', label: 'Custom', desc: 'Choose the muscles yourself.' },
      ],
    });
    if (!v) return;
    if (v === 'custom') return actions.muscles();
    s.split = v;
    save('settings');
    regenerate();
  },

  async muscles() {
    const s = state.settings;
    const sel = await pickMuscles({ selected: s.split === 'custom' ? s.customMuscles : state.draft.targets });
    if (!sel) return;
    s.split = 'custom';
    s.customMuscles = sel;
    save('settings');
    regenerate();
  },

  async duration() {
    const v = await choiceSheet({
      title: 'Workout length',
      value: state.settings.duration,
      options: DURATIONS.map((m) => ({ value: m, label: `${m} minutes` })),
    });
    if (!v) return;
    state.settings.duration = v;
    save('settings');
    regenerate();
  },

  async goal() {
    const v = await choiceSheet({
      title: 'Goal',
      value: state.settings.goal,
      options: Object.entries(GOALS).map(([k, g]) => ({ value: k, label: g.name, desc: g.desc })),
    });
    if (!v) return;
    state.settings.goal = v;
    save('settings');
    regenerate();
  },

  regen: regenerate,
  more: itemMenu,

  async add() {
    const items = state.draft.items;
    const id = await pickExercise({ exclude: items.map((it) => it.exId) });
    if (!id) return;
    items.push(defaultItem(id, state.draft.goal));
    edited();
  },

  start() {
    const d = state.draft;
    startWorkout(d.items, { name: d.title, split: d.split === 'smart' || SPLITS[d.split] ? d.resolved : null });
    state.draft = null;
    save('draft');
    window.scrollTo(0, 0);
    app.refresh();
  },

  async save() {
    const d = state.draft;
    if (!d.items.length) return;
    const name = await promptSheet({ title: 'Save workout', label: 'Name', value: d.title, ok: 'Save workout' });
    if (!name) return;
    saveTemplate(name, d.items);
    toast(`Saved "${name}"`);
    app.refresh();
  },

  async tpl(_, id) {
    const t = state.templates.find((x) => x.id === id);
    if (!t) return;
    const v = await choiceSheet({
      title: t.name,
      options: [
        { value: 'start', label: 'Start this workout', icon: 'play' },
        { value: 'load', label: 'Edit before starting', desc: 'Loads it in place of the generated workout.', icon: 'edit' },
        { value: 'rename', label: 'Rename', icon: 'edit' },
        { value: 'delete', label: 'Delete', icon: 'trash', danger: true },
      ],
    });
    if (v === 'start') {
      t.lastUsed = Date.now();
      save('templates');
      startWorkout(t.items, { name: t.name });
      window.scrollTo(0, 0);
      app.refresh();
    } else if (v === 'load') {
      Object.assign(state.draft, { title: t.name, resolved: null, items: t.items.map((it) => ({ ...it })), targets: [], edited: true });
      save('draft');
      window.scrollTo(0, 0);
      app.refresh();
    } else if (v === 'rename') {
      const name = await promptSheet({ title: 'Rename workout', label: 'Name', value: t.name });
      if (!name) return;
      t.name = name;
      save('templates');
      app.refresh();
    } else if (v === 'delete') {
      if (!(await confirmSheet({ title: 'Delete saved workout?', text: `"${t.name}" will be removed. Your history stays.`, ok: 'Delete', danger: true }))) return;
      state.templates = state.templates.filter((x) => x.id !== id);
      save('templates');
      app.refresh();
    }
  },

  empty() {
    startWorkout([], { name: 'Workout' });
    window.scrollTo(0, 0);
    app.refresh();
  },
};

// ---- Planned exercise detail ----------------------------------------------------------

export function renderPlanItem(el, idx) {
  const d = ensureDraft();
  const i = Number(idx);
  const it = d.items[i];
  if (!it) {
    location.replace('#/');
    return;
  }
  const ex = getEx(it.exId);
  const last = lastSession(it.exId);
  const sug = suggestion(it.exId, it.max);
  const timed = isTimed(ex);

  el.innerHTML = String(h`
    <a class="back" href="#/">${icon('back')} ${d.title}</a>
    <header class="ex-hero">
      ${thumb(ex, 'large')}
      <div class="ex-hero-text">
        <p class="eyebrow-num">Exercise ${i + 1} of ${d.items.length}</p>
        <h1 class="page-title">${ex.name}</h1>
        <p class="muted">${listText([...ex.primary, ...ex.secondary].map((m) => muscleName(m).toLowerCase()))}</p>
      </div>
    </header>

    <section class="card">
      <h2 class="card-title">In today's workout</h2>
      <div class="dose-grid">
        <div class="dose-cell">
          <span class="field-label">Sets</span>
          <div class="stepper">
            <button class="btn" data-act="sets" data-d="-1" aria-label="One set fewer">−</button>
            <output>${it.sets}</output>
            <button class="btn" data-act="sets" data-d="1" aria-label="One set more">+</button>
          </div>
        </div>
        <label class="dose-cell"><span class="field-label">${timed ? 'Seconds' : 'Reps'} from</span>
          <input class="text-in num" data-f="min" type="number" inputmode="numeric" min="1" value="${it.min}"></label>
        <label class="dose-cell"><span class="field-label">to</span>
          <input class="text-in num" data-f="max" type="number" inputmode="numeric" min="1" value="${it.max}"></label>
        <label class="dose-cell"><span class="field-label">Rest</span>
          <select class="text-in" data-f="rest">${REST_OPTIONS.map((r) => h`<option value="${r}" ${r === it.rest ? 'selected' : ''}>${restLabel(r)}</option>`)}</select></label>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Last time</h2>
      ${last ? h`
        <p class="last-date">${ago(last.w.startedAt)}, ${last.w.name}</p>
        <p class="last-sets">${working(last.e.sets).map((s) => setShort(s, ex)).join(',  ')}</p>
        ${sug?.kind === 'up' ? h`<p class="up-note big">${icon('up')} You hit the top of the range on every set. Try ${fmtW(sug.w)} ${unit()} today.</p>`
          : sug?.kind === 'hold' ? h`<p class="hint">Stay at ${fmtW(sug.w)} ${unit()} until you reach ${it.max} reps on every set.</p>` : ''}`
        : h`<p class="hint">First time doing this one. Start light, find a weight you can lift for ${it.max} clean reps, and it'll be remembered.</p>`}
    </section>

    <figure class="card map-card">
      <div class="map-wrap">${raw(bodyMap({ primary: ex.primary, secondary: ex.secondary, label: `Muscles worked: ${listText(ex.primary.map(muscleName))}` }))}</div>
      <figcaption class="map-legend"><span class="key pri"></span>Main muscles <span class="key sec"></span>Also worked</figcaption>
    </figure>

    <div class="btn-row">
      <button class="btn" data-act="swap">${icon('swap')} Swap</button>
      <a class="btn" href="#/exercise/${ex.id}">${icon('history')} Progress</a>
      <a class="btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise form`)}" target="_blank" rel="noopener">${icon('external')} How to</a>
      <button class="btn ghost-danger" data-act="remove">${icon('trash')} Remove</button>
    </div>`);

  el.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'sets') {
      it.sets = Math.min(12, Math.max(1, it.sets + Number(b.dataset.d)));
      edited();
    } else if (act === 'swap') {
      await swapItem(i);
    } else if (act === 'remove') {
      d.items.splice(i, 1);
      state.draft.edited = true;
      save('draft');
      location.hash = '#/';
    }
  };
  el.onchange = (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    const v = Math.round(Number(e.target.value));
    if (f === 'rest') it.rest = v;
    else if (v > 0) it[f] = v;
    if (it.max < it.min) [it.min, it.max] = [it.max, it.min];
    state.draft.edited = true;
    save('draft');
  };
}
