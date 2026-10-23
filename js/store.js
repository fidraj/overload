// App state, persistence (localStorage) and unit helpers.
// Weights are always stored in kilograms and converted for display.

import { EXERCISES, EQUIPMENT } from './data.js';

const NS = 'overload.';
const LB_PER_KG = 2.20462262185;

export const DEFAULT_SETTINGS = {
  unit: 'kg',
  theme: 'auto',
  goal: 'hypertrophy',
  duration: 60,
  split: 'smart',
  customMuscles: ['chest', 'biceps'],
  equipment: Object.keys(EQUIPMENT),
  inc: { kg: { barbell: 2.5, dumbbell: 2, machine: 5 }, lb: { barbell: 5, dumbbell: 5, machine: 10 } },
  autoRest: true,
  sound: true,
  vibrate: true,
  wakeLock: true,
};

export const state = {
  settings: null,
  history: [], // finished workouts, newest first
  templates: [],
  custom: [], // user-created exercises
  prefs: { fav: {}, excl: {} },
  active: null, // workout in progress
  draft: null, // generated plan shown on the Workout tab
};

export const hooks = { onSaveError: () => {} };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function load() {
  const s = read('settings', {});
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...s,
    inc: {
      kg: { ...DEFAULT_SETTINGS.inc.kg, ...s.inc?.kg },
      lb: { ...DEFAULT_SETTINGS.inc.lb, ...s.inc?.lb },
    },
  };
  state.history = read('history', []);
  state.templates = read('templates', []);
  state.custom = read('custom', []);
  state.prefs = { fav: {}, excl: {}, ...read('prefs', {}) };
  state.active = read('active', null);
  state.draft = read('draft', null);
  sortHistory();
  rebuildExercises();
}

const dirty = new Set();
let timer = null;

export function save(...keys) {
  for (const k of keys) {
    dirty.add(k);
    if (k === 'history') historyIdx = null;
    if (k === 'custom') rebuildExercises();
  }
  clearTimeout(timer);
  timer = setTimeout(flush, 200);
}

export function flush() {
  clearTimeout(timer);
  for (const k of dirty) {
    try {
      localStorage.setItem(NS + k, JSON.stringify(state[k]));
    } catch (err) {
      hooks.onSaveError(err);
    }
  }
  dirty.clear();
}

export function replaceAll(data) {
  for (const k of ['settings', 'history', 'templates', 'custom', 'prefs']) {
    if (data[k] !== undefined) localStorage.setItem(NS + k, JSON.stringify(data[k]));
  }
  localStorage.removeItem(NS + 'draft');
  load();
}

export function eraseAll() {
  for (const k of Object.keys(state)) localStorage.removeItem(NS + k);
  load();
}

export function exportData() {
  const { settings, history, templates, custom, prefs } = state;
  return { app: 'overload', version: 1, exportedAt: new Date().toISOString(), settings, history, templates, custom, prefs };
}

export function sortHistory() {
  state.history.sort((a, b) => b.startedAt - a.startedAt);
  historyIdx = null;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---- Exercises -------------------------------------------------------------

let exMap = new Map();

function rebuildExercises() {
  exMap = new Map([...EXERCISES, ...state.custom].map((e) => [e.id, e]));
}

export const allExercises = () => [...exMap.values()];

export function getEx(id, fallbackName) {
  return exMap.get(id) || {
    id, name: fallbackName || 'Deleted exercise', primary: [], secondary: [], equipment: [],
    kind: 'i', track: 'wr', tier: 0, missing: true,
  };
}

export const isCustom = (id) => state.custom.some((e) => e.id === id);

export function hasEquipment(ex, equipment = state.settings.equipment) {
  return ex.equipment.every((e) => equipment.includes(e));
}

// ---- History index: exercise id -> [{ w: workout, e: entry }] newest first ----

let historyIdx = null;

export function historyIndex() {
  if (!historyIdx) {
    historyIdx = new Map();
    for (const w of state.history) {
      for (const e of w.exercises) {
        if (!historyIdx.has(e.exId)) historyIdx.set(e.exId, []);
        historyIdx.get(e.exId).push({ w, e });
      }
    }
  }
  return historyIdx;
}

// ---- Units -----------------------------------------------------------------

export const unit = () => state.settings.unit;

export function toDisp(kg) {
  if (kg == null) return null;
  return unit() === 'lb' ? kg * LB_PER_KG : kg;
}

export function fromDisp(v) {
  if (v == null) return null;
  return unit() === 'lb' ? v / LB_PER_KG : v;
}

export function round(v, dp = 2) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

// Weight as a plain number string in the display unit ("62.5").
export const fmtW = (kg) => (kg == null ? '' : String(round(toDisp(kg), 2)));

// Smallest sensible jump for this exercise, in the display unit.
export function increment(ex) {
  const inc = state.settings.inc[unit()];
  const eq = ex.equipment;
  if (['barbell', 'smith', 'ezbar', 'trapbar'].some((e) => eq.includes(e))) return inc.barbell;
  if (['dumbbell', 'kettlebell'].some((e) => eq.includes(e))) return inc.dumbbell;
  if (!eq.length) return inc.dumbbell;
  return inc.machine;
}
