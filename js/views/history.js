// History tab: past workouts, workout detail with editing.

import { TRACKS } from '../data.js';
import { state, save, getEx, fmtW, fromDisp, unit, toDisp, sortHistory } from '../store.js';
import { workoutStats, itemFromEntry, startWorkout, saveTemplate } from '../engine.js';
import {
  h, icon, app, confirmSheet, promptSheet, toast, setText, dateTime, durationText, numFmt, startOfDay,
} from '../ui.js';
import { thumb } from '../components.js';

const WEEKS = 12;

export function renderHistory(el) {
  const hist = state.history;
  const now = Date.now();
  const weekStart = mondayOf(now);
  const thisWeek = hist.filter((w) => w.startedAt >= weekStart).length;
  const last30 = hist.filter((w) => w.startedAt >= now - 30 * 864e5).length;

  el.innerHTML = String(h`
    <header class="page-head"><h1 class="page-title">History</h1></header>
    ${hist.length ? h`
      <div class="stat-row">
        <div class="stat"><b>${thisWeek}</b><span>this week</span></div>
        <div class="stat"><b>${last30}</b><span>last 30 days</span></div>
        <div class="stat"><b>${hist.length}</b><span>all time</span></div>
      </div>
      ${calendar(hist)}
      ${groupByMonth(hist).map(([month, list]) => h`
        <h2 class="section-title">${month}</h2>
        <ul class="hist-list">${list.map(histItem)}</ul>`)}` : h`
      <div class="empty">
        <p>Finished workouts show up here, with every set you logged.</p>
        <a class="btn primary" href="#/">Go to today's workout</a>
      </div>`}`);
  el.onclick = null;
}

function mondayOf(ts) {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

// One square per day for the last 12 weeks, filled on days with a workout.
function calendar(hist) {
  const start = mondayOf(Date.now()) - (WEEKS - 1) * 7 * 864e5;
  const byDay = new Map();
  for (const w of hist) {
    const k = startOfDay(w.startedAt);
    if (k >= start) byDay.set(k, [...(byDay.get(k) || []), w.name]);
  }
  const today = startOfDay(Date.now());
  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const k = d.getTime();
    const names = byDay.get(k);
    const label = `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${names ? names.join(', ') : 'rest day'}`;
    cells.push(h`<span class="cal-day ${names ? 'on' : ''} ${k === today ? 'today' : ''} ${k > today ? 'future' : ''}" title="${label}"></span>`);
  }
  const days = byDay.size;
  return h`<figure class="cal">
    <div class="cal-grid" role="img" aria-label="Training days over the last ${WEEKS} weeks: ${days} days">${cells}</div>
    <figcaption>${days} training ${days === 1 ? 'day' : 'days'} in the last ${WEEKS} weeks</figcaption>
  </figure>`;
}

function groupByMonth(hist) {
  const groups = new Map();
  for (const w of hist) {
    const k = new Date(w.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(w);
  }
  return [...groups];
}

function histItem(w) {
  const st = workoutStats(w);
  const d = new Date(w.startedAt);
  const names = w.exercises.map((e) => getEx(e.exId, e.name).name);
  return h`<li><a class="hist-item" href="#/history/${w.id}">
    <span class="hi-date"><span class="hi-dow">${d.toLocaleDateString(undefined, { weekday: 'short' })}</span><span class="hi-day">${d.getDate()}</span></span>
    <span class="hi-body">
      <span class="hi-name">${w.name}</span>
      <span class="hi-ex">${names.slice(0, 3).join(', ')}${names.length > 3 ? `, +${names.length - 3} more` : ''}</span>
      <span class="hi-stats">
        <span>${durationText(st.duration)}</span>
        <span>${st.sets} sets</span>
        ${st.volume ? h`<span>${numFmt(toDisp(st.volume))} ${unit()}</span>` : ''}
        ${w.records?.length ? h`<span class="hi-rec">${icon('trophy')} ${w.records.length}</span>` : ''}
      </span>
    </span>
  </a></li>`;
}

// ---- Detail ----------------------------------------------------------------------

let editing = null;

export function renderHistoryDetail(el, id, flag) {
  const w = state.history.find((x) => x.id === id);
  if (!w) {
    el.innerHTML = String(h`<a class="back" href="#/history">${icon('back')} History</a><p class="empty-note">This workout doesn't exist anymore.</p>`);
    return;
  }
  const isEditing = editing === id;
  const st = workoutStats(w);
  const recs = new Map((w.records || []).map((r) => [r.exId, r]));

  el.innerHTML = String(h`
    <a class="back" href="#/history">${icon('back')} History</a>
    ${flag === 'done' ? h`<div class="done-banner" role="status">
      <b>Workout saved.</b> ${recs.size ? `${recs.size} new ${recs.size === 1 ? 'record' : 'records'}.` : 'Next time, try to beat these numbers.'}
    </div>` : ''}
    <header class="detail-head">
      <h1 class="page-title">${w.name}</h1>
      <p class="muted">${dateTime(w.startedAt)}</p>
    </header>
    <div class="stat-row">
      <div class="stat"><b>${durationText(st.duration)}</b><span>duration</span></div>
      <div class="stat"><b>${st.sets}</b><span>sets</span></div>
      <div class="stat"><b>${numFmt(toDisp(st.volume))}</b><span>${unit()} lifted</span></div>
    </div>
    ${w.exercises.map((e, ei) => {
      const ex = getEx(e.exId, e.name);
      const rec = recs.get(e.exId);
      let n = 0;
      return h`<section class="hd-ex">
        <a class="hd-head" href="#/exercise/${ex.id}">${thumb(ex, 'small')}
          <span class="hd-head-text"><span class="hd-name">${ex.name}</span>
          ${rec ? h`<span class="rec-badge">${icon('trophy')} ${recordText(rec)}</span>` : ''}</span></a>
        <ol class="hd-sets">${e.sets.map((s, si) => {
          const label = s.wu ? 'W' : String(++n);
          return isEditing ? editRow(ex, s, ei, si, label) : h`<li><span class="hd-n">${label}</span>${setText(s, ex)}</li>`;
        })}</ol>
      </section>`;
    })}
    <div class="detail-actions">
      ${isEditing ? h`<button class="btn primary" data-act="done-edit">Done editing</button>
        <button class="btn" data-act="rename">${icon('edit')} Rename</button>` : h`
        <button class="btn primary" data-act="repeat">${icon('play')} Repeat workout</button>
        <button class="btn" data-act="template">${icon('bookmark')} Save as template</button>
        <button class="btn" data-act="edit">${icon('edit')} Edit</button>
        <button class="btn ghost-danger" data-act="delete">${icon('trash')} Delete</button>`}
    </div>`);

  el.onclick = async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'repeat') {
      if (state.active) return toast('Finish or discard your current workout first');
      startWorkout(w.exercises.map(itemFromEntry), { name: w.name, split: w.split });
      location.hash = '#/';
    } else if (act === 'template') {
      const name = await promptSheet({ title: 'Save workout', label: 'Name', value: w.name, ok: 'Save workout' });
      if (!name) return;
      saveTemplate(name, w.exercises.map(itemFromEntry));
      toast(`Saved "${name}"`);
    } else if (act === 'edit') {
      editing = id;
      app.refresh();
    } else if (act === 'done-edit') {
      editing = null;
      w.exercises = w.exercises.filter((e) => e.sets.length);
      if (!w.exercises.length) state.history = state.history.filter((x) => x !== w);
      save('history');
      app.refresh();
    } else if (act === 'rename') {
      const name = await promptSheet({ title: 'Rename workout', label: 'Name', value: w.name });
      if (name) { w.name = name; save('history'); app.refresh(); }
    } else if (act === 'del-set') {
      const e = w.exercises[Number(b.dataset.ei)];
      e.sets.splice(Number(b.dataset.si), 1);
      save('history');
      app.refresh();
    } else if (act === 'delete') {
      if (!(await confirmSheet({ title: 'Delete workout?', text: 'It will be removed from your history and progress charts.', ok: 'Delete', danger: true }))) return;
      state.history = state.history.filter((x) => x !== w);
      sortHistory();
      save('history');
      location.hash = '#/history';
    }
  };

  el.onchange = (ev) => {
    const inp = ev.target.closest('[data-f]');
    if (!inp) return;
    const s = w.exercises[Number(inp.dataset.ei)].sets[Number(inp.dataset.si)];
    const f = inp.dataset.f;
    const text = inp.value.replace(',', '.').trim();
    const v = text === '' ? null : Number(text);
    if (v != null && !Number.isFinite(v)) return;
    s[f] = v == null ? null : f === 'w' ? fromDisp(v) : Math.round(v);
    save('history');
  };
}

function editRow(ex, s, ei, si, label) {
  return h`<li class="edit-row">
    <span class="hd-n">${label}</span>
    ${TRACKS[ex.track].fields.map((f) => h`<label class="edit-field">
      <input class="set-in" data-f="${f}" data-ei="${ei}" data-si="${si}" inputmode="${f === 'w' ? 'decimal' : 'numeric'}"
        value="${s[f] == null ? '' : f === 'w' ? fmtW(s[f]) : s[f]}" aria-label="${f === 'w' ? `Weight in ${unit()}` : f === 'r' ? 'Reps' : 'Seconds'}, set ${label}">
      <span>${f === 'w' ? unit() : f === 'r' ? 'reps' : 'sec'}</span></label>`)}
    <button class="icon-btn" data-act="del-set" data-ei="${ei}" data-si="${si}" aria-label="Delete set ${label}">${icon('trash')}</button>
  </li>`;
}

export function recordText(r) {
  switch (r.type) {
    case 'weight': return `Heaviest: ${fmtW(r.value)} ${unit()}`;
    case 'e1rm': return `Best set: est. 1RM ${fmtW(r.value)} ${unit()}`;
    case 'time': return `Longest: ${r.value} sec`;
    default: return `Most reps: ${r.value}`;
  }
}

