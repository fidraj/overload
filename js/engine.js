// Training logic: muscle recovery, workout generation, progression hints and records.

import { MUSCLES, SPLITS } from './data.js';
import {
  state, save, uid, getEx, allExercises, hasEquipment, historyIndex,
  toDisp, fromDisp, round, increment,
} from './store.js';

const HOUR = 36e5;
const DAY = 24 * HOUR;

export const isTimed = (ex) => ex.track === 't' || ex.track === 'wt';
export const hasWeight = (ex) => ex.track === 'wr' || ex.track === 'bw' || ex.track === 'wt';
export const working = (sets) => sets.filter((s) => !s.wu);
export const e1rm = (w, r) => (w > 0 && r > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0);

// ---- Recovery ----------------------------------------------------------------
// Each working set adds fatigue to its primary muscles (full) and secondary muscles (half).
// Fatigue fades linearly over the muscle's recovery window (36–72 h).

const FATIGUE_PER_SET = 8;

export function recovery(now = Date.now()) {
  const load = {};
  for (const m in MUSCLES) load[m] = 0;
  for (const w of state.history) {
    const hrs = (now - (w.finishedAt || w.startedAt)) / HOUR;
    if (hrs > 72) break; // history is newest first
    for (const e of w.exercises) {
      const ex = getEx(e.exId);
      const n = working(e.sets).length;
      const add = (m, factor) => {
        const left = MUSCLES[m] ? 1 - hrs / MUSCLES[m].hours : 0;
        if (left > 0) load[m] += n * factor * left;
      };
      ex.primary.forEach((m) => add(m, 1));
      ex.secondary.forEach((m) => add(m, 0.5));
    }
  }
  const pct = {};
  for (const m in MUSCLES) pct[m] = Math.max(0, Math.round(100 - load[m] * FATIGUE_PER_SET));
  return pct;
}

// ---- Set and rep schemes -----------------------------------------------------

// [sets, min, max, rest seconds]; min/max are reps, or seconds for timed exercises.
const SCHEMES = {
  strength: { c: [5, 3, 5, 180], i: [3, 6, 8, 120], bw: [4, 5, 8, 120], r: [3, 8, 12, 90], t: [3, 20, 40, 90] },
  hypertrophy: { c: [4, 6, 10, 120], i: [3, 10, 15, 75], bw: [3, 8, 15, 90], r: [3, 12, 15, 60], t: [3, 30, 60, 60] },
  endurance: { c: [3, 12, 15, 60], i: [3, 15, 20, 45], bw: [3, 15, 25, 45], r: [3, 15, 25, 45], t: [3, 45, 90, 45] },
};

export function defaultItem(exId, goal = state.settings.goal) {
  const ex = getEx(exId);
  const s = SCHEMES[goal] || SCHEMES.hypertrophy;
  const key = isTimed(ex) ? 't' : ex.track === 'r' ? 'r' : ex.track === 'bw' ? 'bw' : ex.kind;
  const [sets, min, max, rest] = s[key];
  return { exId, sets, min, max, rest };
}

export function estimateSec(item) {
  const ex = getEx(item.exId);
  const work = isTimed(ex) ? item.max : 45;
  return item.sets * work + Math.max(0, item.sets - 1) * item.rest + 120;
}

export const estimateMinutes = (items) => Math.round(items.reduce((a, it) => a + estimateSec(it), 0) / 60);

// ---- History lookups -----------------------------------------------------------

export function lastSession(exId, before = Infinity) {
  const list = historyIndex().get(exId);
  if (!list) return null;
  return list.find(({ w, e }) => w.startedAt < before && working(e.sets).length) || null;
}

function sessionCount(exId, sinceMs) {
  const list = historyIndex().get(exId) || [];
  return list.filter(({ w }) => w.startedAt >= sinceMs).length;
}

// Progressive overload hint: if every set at last session's top weight reached the top of
// the rep range, suggest one increment more. Otherwise stay and chase the reps.
export function suggestion(exId, max) {
  const ex = getEx(exId);
  if (!hasWeight(ex)) return null;
  const last = lastSession(exId);
  if (!last) return null;
  const sets = working(last.e.sets);
  const top = Math.max(...sets.map((s) => s.w || 0));
  if (top <= 0) return null;
  const field = ex.track === 'wt' ? 's' : 'r';
  const hit = sets.filter((s) => (s.w || 0) === top).every((s) => (s[field] || 0) >= max);
  if (!hit) return { kind: 'hold', w: top };
  return { kind: 'up', w: fromDisp(round(toDisp(top) + increment(ex), 2)), from: top };
}

// Best values across all logged sessions before a timestamp.
export function bests(exId, before = Infinity) {
  const out = { e1: 0, w: 0, r: 0, s: 0, n: 0 };
  for (const { w, e } of historyIndex().get(exId) || []) {
    if (w.startedAt >= before) continue;
    out.n++;
    for (const s of working(e.sets)) {
      out.e1 = Math.max(out.e1, e1rm(s.w, s.r));
      out.w = Math.max(out.w, s.w || 0);
      out.r = Math.max(out.r, s.r || 0);
      out.s = Math.max(out.s, s.s || 0);
    }
  }
  return out;
}

export function detectRecords(workout) {
  const records = [];
  for (const e of workout.exercises) {
    const prev = bests(e.exId, workout.startedAt);
    if (!prev.n) continue;
    const ex = getEx(e.exId);
    const sets = working(e.sets);
    const max = (f) => Math.max(0, ...sets.map(f));
    const cur = { e1: max((s) => e1rm(s.w, s.r)), w: max((s) => s.w || 0), r: max((s) => s.r || 0), s: max((s) => s.s || 0) };
    const eps = 1e-6;
    if (hasWeight(ex) && cur.w > prev.w + eps) records.push({ exId: e.exId, type: 'weight', value: cur.w });
    else if (ex.track === 'wr' && cur.e1 > prev.e1 + eps) records.push({ exId: e.exId, type: 'e1rm', value: cur.e1 });
    else if (isTimed(ex) && cur.s > prev.s) records.push({ exId: e.exId, type: 'time', value: cur.s });
    else if ((ex.track === 'r' || ex.track === 'bw') && cur.r > prev.r) records.push({ exId: e.exId, type: 'reps', value: cur.r });
  }
  return records;
}

export function workoutStats(w) {
  let volume = 0;
  let sets = 0;
  for (const e of w.exercises) {
    for (const s of working(e.sets)) {
      sets++;
      if (s.w > 0 && s.r > 0) volume += s.w * s.r;
    }
  }
  return { volume, sets, duration: (w.finishedAt || Date.now()) - w.startedAt };
}

// ---- Generation ------------------------------------------------------------------

export function availablePool() {
  return allExercises().filter((e) => hasEquipment(e) && !state.prefs.excl[e.id] && e.primary.length);
}

// Higher is better. Staples, compounds first, favourites and exercises you've been doing
// recently score higher so the same lifts come back and you can progress on them.
function scoreFor(ex, muscle, slot, goal, ctx, noise = true) {
  let s = ex.tier;
  if (ex.primary[0] === muscle) s += 1;
  s += slot === 0 ? (ex.kind === 'c' ? 3 : 0) : (ex.kind === 'i' ? 2 : 0.5);
  const barbell = ex.kind === 'c' && ['barbell', 'trapbar'].some((e) => ex.equipment.includes(e));
  if (goal === 'strength' && ex.kind === 'c') s += barbell ? 2.5 : 1;
  if ((ex.track === 'bw' || ex.track === 'r') && ctx.loaded && ex.tier < 3) s -= 1.5;
  if (state.prefs.fav[ex.id]) s += 4;
  s += 4 * Math.min(1, sessionCount(ex.id, ctx.now - 60 * DAY) / 3);
  if (noise) s += Math.random() * 1.5;
  return s;
}

function context() {
  const eq = state.settings.equipment;
  return { now: Date.now(), loaded: ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'smith'].some((e) => eq.includes(e)) };
}

function pickFor(muscle, slot, pool, used, goal, ctx) {
  let cands = pool.filter((e) => e.primary.includes(muscle) && !used.has(e.id));
  if (!cands.length && slot === 0) cands = pool.filter((e) => e.secondary.includes(muscle) && e.kind === 'c' && !used.has(e.id));
  let best = null;
  let bestScore = -Infinity;
  for (const ex of cands) {
    const s = scoreFor(ex, muscle, slot, goal, ctx);
    if (s > bestScore) { bestScore = s; best = ex; }
  }
  return best;
}

// Alternatives for swapping, best first.
export function alternatives(exId, goal = state.settings.goal) {
  const ex = getEx(exId);
  const muscle = ex.primary[0];
  const ctx = context();
  return availablePool()
    .filter((e) => e.id !== exId && e.primary.includes(muscle))
    .map((e) => ({ e, s: scoreFor(e, muscle, ex.kind === 'c' ? 0 : 1, goal, ctx, false) + (e.kind === ex.kind ? 2 : 0) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e);
}

// Smart split: rotate push / pull / legs, picking whichever has the most rested muscles.
function chooseSmartSplit(rec) {
  const lastDone = {};
  for (const w of state.history) if (w.split && !(w.split in lastDone)) lastDone[w.split] = w.startedAt;
  let best = null;
  for (const key of ['push', 'pull', 'legs']) {
    const major = Object.entries(SPLITS[key].muscles).filter(([, wt]) => wt >= 2);
    const avg = major.reduce((a, [m]) => a + rec[m], 0) / major.length;
    const since = lastDone[key] ? (Date.now() - lastDone[key]) / HOUR : 1e9;
    const score = avg + (Math.min(since, 168) / 168) * 10;
    if (!best || score > best.score) best = { key, score };
  }
  return best.key;
}

export function generate({ split = 'smart', goal = 'hypertrophy', duration = 60, muscles = [] } = {}) {
  const rec = recovery();
  const resolved = split === 'smart' ? chooseSmartSplit(rec) : split;
  const base = resolved === 'custom'
    ? Object.fromEntries((muscles.length ? muscles : ['chest']).map((m) => [m, MUSCLES[m].size + 1]))
    : { ...SPLITS[resolved].muscles };

  // Muscles that are still recovering get a smaller share of the workout.
  const weights = {};
  for (const [m, wt] of Object.entries(base)) {
    const r = rec[m];
    weights[m] = wt * (split === 'smart' ? (r >= 85 ? 1 : r >= 60 ? 0.6 : r >= 35 ? 0.3 : 0) : 0.4 + (0.6 * r) / 100);
  }
  if (Object.values(weights).every((w) => w <= 0)) Object.assign(weights, base);

  const ctx = context();
  const pool = availablePool();
  const used = new Set();
  const assigned = {};
  const slots = {};
  const exhausted = new Set();
  const chosen = [];
  const budget = duration * 60 * 1.05;
  let total = 0;

  // Hand out exercises one at a time to the muscle with the most unmet weight.
  while (chosen.length < 12) {
    let muscle = null;
    let q = 0;
    for (const [m, wt] of Object.entries(weights)) {
      if (exhausted.has(m) || wt <= 0 || (slots[m] || 0) >= 4) continue;
      const qq = wt / ((assigned[m] || 0) + 1);
      if (qq > q) { q = qq; muscle = m; }
    }
    if (!muscle) break;
    const slot = slots[muscle] || 0;
    const ex = pickFor(muscle, slot, pool, used, goal, ctx);
    if (!ex) { exhausted.add(muscle); continue; }
    const item = defaultItem(ex.id, goal);
    const t = estimateSec(item);
    if (chosen.length >= 2 && total + t > budget) { exhausted.add(muscle); continue; }
    chosen.push({ item, ex, muscle, order: chosen.length });
    used.add(ex.id);
    total += t;
    slots[muscle] = slot + 1;
    ex.primary.forEach((p) => { assigned[p] = (assigned[p] || 0) + (p === muscle ? 1 : 0.5); });
    ex.secondary.forEach((p) => { assigned[p] = (assigned[p] || 0) + 0.25; });
  }

  // Big compound lifts first, then isolation work, core and timed holds last.
  const rank = (c) => (c.ex.kind === 'c' && !isTimed(c.ex) ? 0 : isTimed(c.ex) || ['abs', 'obliques'].includes(c.muscle) ? 2 : 1);
  chosen.sort((a, b) => rank(a) - rank(b) || a.order - b.order);

  return {
    v: 2,
    split,
    resolved,
    goal,
    duration,
    title: resolved === 'custom' ? 'Custom workout' : SPLITS[resolved].title,
    targets: Object.keys(base).filter((m) => slots[m]),
    items: chosen.map((c) => c.item),
    histLen: state.history.length,
    createdAt: Date.now(),
    edited: false,
  };
}

export function ensureDraft(force = false) {
  const s = state.settings;
  const d = state.draft;
  const stale = !d || d.v !== 2 || d.histLen !== state.history.length || (!d.edited && Date.now() - d.createdAt > 6 * HOUR);
  if (force || stale) {
    state.draft = generate({ split: s.split, goal: s.goal, duration: s.duration, muscles: s.customMuscles });
    save('draft');
  }
  return state.draft;
}

// ---- Workouts ---------------------------------------------------------------------

export function entryFromItem(it) {
  return {
    uid: uid(),
    exId: it.exId,
    name: getEx(it.exId).name,
    min: it.min,
    max: it.max,
    rest: it.rest,
    sets: Array.from({ length: it.sets }, () => ({ w: null, r: null, s: null, done: false, wu: false })),
  };
}

export function itemFromEntry(e) {
  return { exId: e.exId, sets: Math.max(1, working(e.sets).length), min: e.min, max: e.max, rest: e.rest };
}

export function startWorkout(items, meta = {}) {
  state.active = {
    id: uid(),
    name: meta.name || 'Workout',
    split: meta.split || null,
    startedAt: Date.now(),
    rest: null,
    exercises: items.map(entryFromItem),
  };
  save('active');
}

// Moves the active workout into history. Returns the saved record, or null if nothing was logged.
export function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((e) => ({
      exId: e.exId,
      name: e.name,
      min: e.min,
      max: e.max,
      rest: e.rest,
      sets: e.sets.filter((s) => s.done).map(({ w, r, s, wu }) => ({ w, r, s, wu })),
    }))
    .filter((e) => e.sets.length);
  state.active = null;
  save('active');
  if (!exercises.length) return null;
  const record = { id: a.id, name: a.name, split: a.split, startedAt: a.startedAt, finishedAt: Date.now(), exercises };
  record.records = detectRecords(record);
  state.history.push(record);
  state.history.sort((x, y) => y.startedAt - x.startedAt);
  save('history');
  return record;
}

export function saveTemplate(name, items) {
  const tpl = { id: uid(), name, createdAt: Date.now(), items: items.map((it) => ({ ...it })) };
  state.templates.unshift(tpl);
  save('templates');
  return tpl;
}
