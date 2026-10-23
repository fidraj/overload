// Workout tab while a workout is running: an overview of the exercises, and a focused
// screen per exercise for logging sets.

import { TRACKS } from '../data.js';
import { state, save, getEx, fmtW, fromDisp, unit } from '../store.js';
import {
  lastSession, suggestion, working, finishWorkout, saveTemplate, itemFromEntry, entryFromItem,
  defaultItem, isTimed,
} from '../engine.js';
import { bodyMap } from '../art.js';
import {
  h, raw, icon, app, choiceSheet, confirmSheet, actionSheet, promptSheet, toast, clock, setShort, rangeText,
  muscleName, listText, ago,
} from '../ui.js';
import { thumb } from '../components.js';
import { pickExercise } from '../picker.js';
import { startRest, unlockAudio, renderDock } from '../timer.js';
import { restLabel, REST_OPTIONS } from './today.js';

const LABELS = { w: () => unit(), r: () => 'Reps', s: () => 'Sec' };

const doneCount = (e) => e.sets.filter((s) => s.done).length;
const isComplete = (e) => e.sets.length > 0 && e.sets.every((s) => s.done);

// ---- Overview ------------------------------------------------------------------------

export function renderWorkout(el) {
  const w = state.active;
  const all = w.exercises.flatMap((e) => e.sets);
  const done = all.filter((s) => s.done).length;
  const next = w.exercises.find((e) => !isComplete(e));

  el.innerHTML = String(h`
    ${header(w)}
    <div class="wk-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${all.length}" aria-valuenow="${done}" aria-label="Sets done">
      <div class="wk-bar"><i style="width:${all.length ? (done / all.length) * 100 : 0}%"></i></div>
      <span><b>${done}</b> of ${all.length} sets done</span>
    </div>

    ${w.exercises.length ? h`<ul class="ex-list">${w.exercises.map((e, i) => {
      const ex = getEx(e.exId, e.name);
      const n = doneCount(e);
      const complete = isComplete(e);
      const lastDone = [...e.sets].reverse().find((s) => s.done);
      return h`<li class="ex-item ${complete ? 'complete' : ''}">
        <a class="ex-link" href="#/workout/${e.uid}">
          <span class="thumb-wrap">${thumb(ex)}${complete ? h`<span class="thumb-check">${icon('check')}</span>` : ''}</span>
          <span class="ex-text">
            <span class="ex-title">${ex.name}</span>
            <span class="ex-meta">${complete ? `All ${e.sets.length} sets done` : n ? `${n} of ${e.sets.length} sets done` : `${e.sets.length} sets, ${rangeText(e.min, e.max)} ${isTimed(ex) ? 'sec' : 'reps'}`}</span>
            ${lastDone ? h`<span class="ex-meta strong">Last set ${setShort(lastDone, ex)}</span>` : ''}
          </span>
        </a>
        <button class="icon-btn" data-act="exmenu" data-uid="${e.uid}" data-i="${i}" aria-label="Options for ${ex.name}">${icon('more')}</button>
      </li>`;
    })}</ul>` : h`<p class="empty-note">Add an exercise to start logging.</p>`}
    <button class="add-row" data-act="add">${icon('plus')} Add exercise</button>

    <div class="cta-bar">
      ${next ? h`<a class="btn primary big" href="#/workout/${next.uid}">${icon('play')} ${doneCount(next) || w.exercises.indexOf(next) ? 'Continue' : 'Begin'}: ${getEx(next.exId, next.name).name}</a>`
        : h`<button class="btn primary big" data-act="finish">${icon('check')} Finish workout</button>`}
    </div>
    <button class="btn wide ghost-danger" data-act="discard">End without saving</button>`);

  el.onclick = async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'exmenu') {
      const entry = w.exercises.find((x) => x.uid === b.dataset.uid);
      if (await exerciseMenu(entry)) app.refresh();
    } else commonActions(act);
  };
}

function header(w, back = false) {
  return h`<header class="wk-head">
    ${back ? h`<a class="icon-btn" href="#/" aria-label="Back to workout overview">${icon('back')}</a>` : ''}
    <div class="wk-title">
      ${back ? h`<a class="wk-name small" href="#/">${w.name}</a>` : h`<button class="wk-name" data-act="rename" aria-label="Rename workout">${w.name}</button>`}
      <span class="wk-clock" data-elapsed>${clock(Date.now() - w.startedAt)}</span>
    </div>
    ${back ? '' : h`<button class="icon-btn" data-act="menu" aria-label="Workout options">${icon('more')}</button>`}
    <button class="btn primary" data-act="finish">Finish</button>
  </header>`;
}

async function commonActions(act) {
  const a = state.active;
  if (act === 'finish') return finish();
  if (act === 'discard') return discard();
  if (act === 'menu') return workoutMenu();
  if (act === 'rename') {
    const name = await promptSheet({ title: 'Rename workout', label: 'Name', value: a.name });
    if (name) { a.name = name; save('active'); app.refresh(); }
  }
  if (act === 'add') {
    const id = await pickExercise({ exclude: a.exercises.map((x) => x.exId) });
    if (!id) return;
    const entry = entryFromItem(defaultItem(id));
    a.exercises.push(entry);
    save('active');
    location.hash = `#/workout/${entry.uid}`;
  }
}

// Returns true if something changed. Navigates away when the exercise is removed.
async function exerciseMenu(entry) {
  const a = state.active;
  const i = a.exercises.indexOf(entry);
  const ex = getEx(entry.exId, entry.name);
  const v = await choiceSheet({
    title: ex.name,
    options: [
      { value: 'swap', label: 'Swap for another exercise', icon: 'swap' },
      { value: 'rest', label: `Rest between sets: ${restLabel(entry.rest)}`, icon: 'timer' },
      ...(i > 0 ? [{ value: 'upm', label: 'Move up', icon: 'up' }] : []),
      ...(i < a.exercises.length - 1 ? [{ value: 'downm', label: 'Move down', icon: 'down' }] : []),
      { value: 'remove', label: 'Remove from workout', icon: 'trash', danger: true },
    ],
  });
  if (v === 'swap') {
    if (entry.sets.some((s) => s.done) && !(await confirmSheet({ title: 'Swap exercise?', text: 'Sets you already logged for this exercise will be cleared.', ok: 'Swap' }))) return false;
    const id = await pickExercise({ title: 'Swap exercise', swapFor: entry.exId, exclude: a.exercises.map((x) => x.exId) });
    if (!id) return false;
    a.exercises[i] = { ...entryFromItem(defaultItem(id)), uid: entry.uid };
  } else if (v === 'rest') {
    const r = await choiceSheet({ title: 'Rest between sets', value: entry.rest, options: REST_OPTIONS.map((x) => ({ value: x, label: restLabel(x) })) });
    if (r == null) return false;
    entry.rest = r;
  } else if (v === 'upm') a.exercises.splice(i - 1, 0, ...a.exercises.splice(i, 1));
  else if (v === 'downm') a.exercises.splice(i + 1, 0, ...a.exercises.splice(i, 1));
  else if (v === 'remove') {
    if (entry.sets.some((s) => s.done) && !(await confirmSheet({ title: 'Remove exercise?', text: 'Its logged sets will be discarded.', ok: 'Remove', danger: true }))) return false;
    a.exercises.splice(i, 1);
    save('active');
    if (location.hash !== '#/') location.hash = '#/';
    return true;
  } else return false;
  save('active');
  return true;
}

// ---- Logging one exercise --------------------------------------------------------------

export function renderLogExercise(el, uid) {
  const w = state.active;
  const i = w?.exercises.findIndex((x) => x.uid === uid) ?? -1;
  if (i < 0) {
    location.replace('#/');
    return;
  }
  const e = w.exercises[i];
  const ex = getEx(e.exId, e.name);
  const fields = TRACKS[ex.track].fields;
  const last = lastSession(e.exId);
  const prev = last ? working(last.e.sets) : [];
  const sug = suggestion(e.exId, e.max);
  const ph = placeholders(e, prev);
  const prevEntry = w.exercises[i - 1];
  const nextEntry = w.exercises[i + 1];
  let n = 0;

  el.innerHTML = String(h`
    ${header(w, true)}
    <header class="ex-hero">
      ${thumb(ex, 'large')}
      <div class="ex-hero-text">
        <p class="eyebrow-num">${i + 1} of ${w.exercises.length}</p>
        <h1 class="page-title">${ex.name}</h1>
        <p class="muted">${listText([...ex.primary, ...ex.secondary].slice(0, 3).map((m) => muscleName(m).toLowerCase()))}</p>
      </div>
    </header>

    <div class="target-row">
      <span><b>${e.sets.filter((s) => !s.wu).length}</b> sets</span>
      <span><b>${rangeText(e.min, e.max)}</b> ${isTimed(ex) ? 'sec' : 'reps'}</span>
      <button class="chip" data-act="rest">${icon('timer')} Rest ${restLabel(e.rest)}</button>
    </div>

    ${last ? h`<div class="last-card">
      <p class="last-date">Last time, ${ago(last.w.startedAt)}</p>
      <p class="last-sets">${prev.map((s) => setShort(s, ex)).join(',  ')}</p>
      ${sug?.kind === 'up' ? h`<button class="up-chip" data-act="apply">${icon('up')} Try ${fmtW(sug.w)} ${unit()}</button>
        <span class="hint">You hit the top of the range on every set.</span>` : ''}
    </div>` : h`<p class="hint first-time">First time doing this one. Pick a weight you can lift for ${e.max} clean reps.</p>`}

    <div class="sets log" role="table" aria-label="${ex.name} sets">
      <div class="set-row head f${fields.length}" role="row">
        <span role="columnheader">Set</span><span role="columnheader">Previous</span>
        ${fields.map((f) => h`<span role="columnheader">${f === 'w' && ex.track === 'bw' ? `+${unit()}` : LABELS[f]()}</span>`)}
        <span role="columnheader"><span class="sr-only">Done</span></span>
      </div>
      ${e.sets.map((s, si) => {
        const label = s.wu ? 'W' : String(++n);
        const p = s.wu ? null : prev[n - 1];
        return h`<div class="set-row f${fields.length} ${s.done ? 'done' : ''} ${s.wu ? 'warm' : ''}" role="row" data-si="${si}">
          <button class="set-no" data-act="set" aria-label="Set ${label} options">${label}</button>
          <span class="set-prev">${p ? setShort(p, ex) : '–'}</span>
          ${fields.map((f) => input(f, s, ph[si], ex, label))}
          <button class="set-check" data-act="check" aria-pressed="${s.done}" aria-label="Mark set ${label} done">${icon('check')}</button>
        </div>`;
      })}
    </div>
    <button class="add-row" data-act="addset">${icon('plus')} Add set</button>

    <div class="btn-row">
      <button class="btn" data-act="exmenu">${icon('swap')} Swap or remove</button>
      <a class="btn" href="#/exercise/${ex.id}">${icon('history')} Progress</a>
      <a class="btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise form`)}" target="_blank" rel="noopener">${icon('external')} How to</a>
    </div>

    <figure class="card map-card">
      <div class="map-wrap">${raw(bodyMap({ primary: ex.primary, secondary: ex.secondary, label: `Muscles worked: ${listText(ex.primary.map(muscleName))}` }))}</div>
      <figcaption class="map-legend"><span class="key pri"></span>Main muscles <span class="key sec"></span>Also worked</figcaption>
    </figure>

    <nav class="cta-bar log-nav" aria-label="Exercises">
      ${prevEntry ? h`<a class="btn big icon-only" href="#/workout/${prevEntry.uid}" aria-label="Previous exercise: ${getEx(prevEntry.exId, prevEntry.name).name}">${icon('back')}</a>` : ''}
      ${nextEntry ? h`<a class="btn big ${isComplete(e) ? 'primary' : ''} next-btn" href="#/workout/${nextEntry.uid}" data-next>
          <span class="next-k">Next</span><span class="next-v">${getEx(nextEntry.exId, nextEntry.name).name}</span>${icon('next')}</a>`
        : h`<a class="btn big ${isComplete(e) ? 'primary' : ''} next-btn" href="#/" data-next><span class="next-v">Back to overview</span>${icon('next')}</a>`}
    </nav>`);

  el.onclick = (ev) => onLogClick(ev, e);
  el.oninput = (ev) => onInput(ev, e);
  el.onfocusin = (ev) => {
    if (ev.target.matches('.set-in')) setTimeout(() => ev.target.select(), 0);
  };
  el.onkeydown = (ev) => {
    if (ev.key === 'Enter' && ev.target.matches('.set-in')) {
      ev.preventDefault();
      const ins = [...el.querySelectorAll('.set-in')];
      const nx = ins[ins.indexOf(ev.target) + 1];
      if (nx) nx.focus(); else ev.target.blur();
    }
  };
}

function input(f, s, ph, ex, label) {
  const val = s[f] == null ? '' : f === 'w' ? fmtW(s[f]) : String(s[f]);
  const phVal = ph[f];
  const phText = phVal == null ? (f === 'w' && ex.track === 'bw' ? '0' : '') : f === 'w' ? fmtW(phVal) : String(phVal);
  const name = f === 'w' ? `Weight in ${unit()}` : f === 'r' ? 'Reps' : 'Seconds';
  return h`<input class="set-in" data-f="${f}" data-ph="${phVal ?? ''}" inputmode="${f === 'w' ? 'decimal' : 'numeric'}" enterkeyhint="next"
    autocomplete="off" placeholder="${phText}" value="${val}" aria-label="${name}, set ${label}">`;
}

// What each empty input shows: last session's matching set, then the value above it,
// then the bottom of the target range.
function placeholders(e, prev) {
  let carry = { w: null, r: null, s: null };
  let i = 0;
  return e.sets.map((set) => {
    if (set.wu) return { w: null, r: null, s: null };
    const p = prev[i++];
    const ph = {
      w: p?.w ?? carry.w ?? prev.at(-1)?.w ?? null,
      r: p?.r ?? carry.r ?? e.min ?? null,
      s: p?.s ?? carry.s ?? e.min ?? null,
    };
    carry = { w: set.w ?? ph.w, r: set.r ?? ph.r, s: set.s ?? ph.s };
    return ph;
  });
}

function onInput(ev, entry) {
  const inp = ev.target.closest('.set-in');
  if (!inp) return;
  const set = entry.sets[Number(inp.closest('[data-si]').dataset.si)];
  const f = inp.dataset.f;
  const text = inp.value.replace(',', '.').trim();
  const v = text === '' ? null : Number(text);
  if (v != null && !Number.isFinite(v)) return;
  set[f] = v == null ? null : f === 'w' ? fromDisp(v) : Math.round(v);
  save('active');
  refreshPlaceholders(ev.currentTarget, entry);
}

// Keep later rows' placeholders in step with what was just typed.
function refreshPlaceholders(root, entry) {
  const last = lastSession(entry.exId);
  const ph = placeholders(entry, last ? working(last.e.sets) : []);
  for (const inp of root.querySelectorAll('.set-in')) {
    const v = ph[Number(inp.closest('[data-si]').dataset.si)][inp.dataset.f];
    inp.dataset.ph = v ?? '';
    if (v != null) inp.placeholder = inp.dataset.f === 'w' ? fmtW(v) : String(v);
  }
}

function toggleCheck(btn, entry) {
  const row = btn.closest('.set-row');
  const set = entry.sets[Number(row.dataset.si)];
  const ex = getEx(entry.exId, entry.name);
  if (set.done) {
    set.done = false;
    row.classList.remove('done');
    btn.setAttribute('aria-pressed', 'false');
    save('active');
    updateNext(entry);
    return;
  }
  unlockAudio();
  for (const inp of row.querySelectorAll('.set-in')) {
    const f = inp.dataset.f;
    if (set[f] != null) continue;
    if (inp.dataset.ph !== '') {
      set[f] = Number(inp.dataset.ph);
      inp.value = f === 'w' ? fmtW(set[f]) : String(set[f]);
    } else if (f === 'w' && ex.track === 'bw') {
      set.w = 0;
    } else {
      inp.focus();
      toast(f === 'w' ? 'Enter the weight first' : f === 'r' ? 'Enter your reps first' : 'Enter the time first');
      return;
    }
  }
  set.done = true;
  row.classList.add('done');
  btn.setAttribute('aria-pressed', 'true');
  save('active');
  updateNext(entry);
  const a = state.active;
  const workoutDone = a.exercises.every(isComplete);
  if (state.settings.autoRest && !workoutDone) startRest(entry.rest);
  if (isComplete(entry)) toast(workoutDone ? 'All sets done. Tap Finish to save the workout.' : 'Exercise done. Rest, then move on to the next one.');
}

function updateNext(entry) {
  document.querySelector('[data-next]')?.classList.toggle('primary', isComplete(entry));
}

async function onLogClick(ev, entry) {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'check') return toggleCheck(b, entry);
  if (['finish', 'discard', 'menu', 'rename'].includes(act)) return commonActions(act);
  if (act === 'exmenu') {
    if (await exerciseMenu(entry)) app.refresh();
    return;
  }
  if (act === 'rest') {
    const r = await choiceSheet({ title: 'Rest between sets', value: entry.rest, options: REST_OPTIONS.map((x) => ({ value: x, label: restLabel(x) })) });
    if (r == null) return;
    entry.rest = r;
  } else if (act === 'addset') {
    entry.sets.push({ w: null, r: null, s: null, done: false, wu: false });
  } else if (act === 'apply') {
    const sug = suggestion(entry.exId, entry.max);
    if (!sug) return;
    entry.sets.forEach((s) => { if (!s.done && !s.wu) s.w = sug.w; });
    toast(`Set to ${fmtW(sug.w)} ${unit()}. Change any set if it's too heavy.`);
  } else if (act === 'set') {
    const set = entry.sets[Number(b.closest('[data-si]').dataset.si)];
    const v = await choiceSheet({
      title: 'Set options',
      options: [
        { value: 'wu', label: set.wu ? 'Make it a working set' : 'Mark as warm-up', desc: 'Warm-up sets are not counted for progress or records.' },
        { value: 'del', label: 'Delete set', icon: 'trash', danger: true },
      ],
    });
    if (v === 'wu') set.wu = !set.wu;
    else if (v === 'del') entry.sets.splice(entry.sets.indexOf(set), 1);
    else return;
  } else return;
  save('active');
  app.refresh();
}

// ---- Workout-level actions --------------------------------------------------------------

async function workoutMenu() {
  const a = state.active;
  const v = await choiceSheet({
    title: a.name,
    options: [
      { value: 'rename', label: 'Rename', icon: 'edit' },
      { value: 'save', label: 'Save as workout template', icon: 'bookmark' },
      { value: 'share', label: 'Share as link', icon: 'share' },
      { value: 'discard', label: 'End without saving', icon: 'trash', danger: true },
    ],
  });
  if (v === 'rename') return commonActions('rename');
  if (v === 'save') {
    if (!a.exercises.length) return toast('Add an exercise first');
    const name = await promptSheet({ title: 'Save workout', label: 'Name', value: a.name, ok: 'Save workout' });
    if (!name) return;
    saveTemplate(name, a.exercises.map(itemFromEntry));
    toast(`Saved "${name}"`);
  }
  if (v === 'share') {
    if (!a.exercises.length) return toast('Add an exercise first');
    shareWorkout(a.name, a.exercises.map(itemFromEntry));
  }
  if (v === 'discard') discard();
}

async function discard() {
  if (!(await confirmSheet({ title: 'End without saving?', text: 'The workout closes and none of its sets go into your history.', ok: 'End without saving', danger: true }))) return;
  endWithoutSaving();
}

function endWithoutSaving() {
  state.active = null;
  save('active');
  renderDock();
  location.hash = '#/';
  app.refresh();
}

// A set counts if it's ticked, or if every number it needs has been typed in.
function isFilled(s, ex) {
  return TRACKS[ex.track].fields.every((f) => s[f] != null || (f === 'w' && ex.track === 'bw'));
}

async function finish() {
  const a = state.active;
  let ticked = 0;
  let filled = 0;
  let empty = 0;
  for (const e of a.exercises) {
    const ex = getEx(e.exId, e.name);
    for (const s of e.sets) {
      if (s.done) ticked++;
      else if (isFilled(s, ex)) filled++;
      else empty++;
    }
  }

  if (!ticked && !filled) {
    const v = await actionSheet({
      title: 'Nothing logged yet',
      text: 'Enter the weight and reps for each set and tick it off as you go. Then Finish saves the workout to your history.',
      actions: [
        { value: 'keep', label: 'Keep going', kind: 'primary' },
        { value: 'end', label: 'End without saving', kind: 'danger' },
      ],
    });
    if (v === 'end') endWithoutSaving();
    return;
  }

  const total = ticked + filled;
  const parts = [`${total} ${total === 1 ? 'set' : 'sets'} will be saved to your history.`];
  if (filled) parts.push(`That includes ${filled} you filled in but didn't tick.`);
  if (empty) parts.push(`${empty} empty ${empty === 1 ? 'set is' : 'sets are'} left out.`);
  const v = await actionSheet({
    title: 'Finish workout?',
    text: parts.join(' '),
    actions: [
      { value: 'save', label: 'Finish and save', kind: 'primary' },
      { value: 'keep', label: 'Keep going' },
    ],
  });
  if (v !== 'save') return;
  for (const e of a.exercises) {
    const ex = getEx(e.exId, e.name);
    for (const s of e.sets) {
      if (!s.done && isFilled(s, ex)) {
        if (s.w == null && ex.track === 'bw') s.w = 0;
        s.done = true;
      }
    }
  }
  const record = finishWorkout();
  renderDock();
  location.hash = record ? `#/history/${record.id}/done` : '#/';
}
