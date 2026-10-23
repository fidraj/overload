// Shared UI helpers: safe templating, icons, bottom sheets, toasts and formatting.

import { MUSCLES, EQUIPMENT } from './data.js';
import { unit, fmtW } from './store.js';

// Set by app.js. Views call app.refresh() to re-render the current route in place.
export const app = { refresh: () => {} };

// ---- Templating -------------------------------------------------------------------

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export const raw = (s) => new Raw(String(s));

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function fmt(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(fmt).join('');
  return esc(v);
}

// Tagged template: interpolations are escaped unless wrapped in raw() or another h``.
export function h(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += fmt(v) + strings[i + 1]; });
  return new Raw(out);
}

// ---- Icons --------------------------------------------------------------------------

const ICONS = {
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4h4M12 7.5V12l3 2"/>',
  library: '<path d="M5 4.5h3.5v15H5zM10.5 4.5H14v15h-3.5zM16 5.3l3.3-.8 3 14.6-3.3.8z"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  swap: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  share: '<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  shuffle: '<path d="M3 7h3c2 0 3.2 1 4.3 2.7l2.4 4.6c1.1 1.7 2.3 2.7 4.3 2.7h4M3 17h3c1.5 0 2.5-.6 3.4-1.6M14.1 8.6c.9-1 1.9-1.6 3.4-1.6H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  bookmark: '<path d="M6.5 4h11v16L12 16l-5.5 4z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5M9.5 2.5h5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  block: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
};

export function icon(name, cls = '') {
  return raw(`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`);
}

// ---- Sheets --------------------------------------------------------------------------

let openSheets = 0;

export function sheet({ title, body, onMount, onClose, tall = false }) {
  const root = document.getElementById('sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = String(h`
    <div class="sheet-backdrop"></div>
    <div class="sheet ${tall ? 'tall' : ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title-${openSheets}">
      <header class="sheet-head">
        <h2 id="sheet-title-${openSheets}">${title}</h2>
        <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
      </header>
      <div class="sheet-body">${body}</div>
    </div>`);
  root.append(wrap);
  openSheets++;
  document.body.classList.add('sheet-open');
  const prevFocus = document.activeElement;
  let closed = false;

  const onKey = (e) => {
    if (e.key === 'Escape' && wrap === root.lastElementChild) close();
  };
  function close(value) {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    wrap.classList.remove('open');
    openSheets--;
    if (!openSheets) document.body.classList.remove('sheet-open');
    setTimeout(() => wrap.remove(), 200);
    if (prevFocus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    onClose?.(value);
  }

  document.addEventListener('keydown', onKey);
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => close());
  wrap.querySelector('[data-close]').addEventListener('click', () => close());
  const bodyEl = wrap.querySelector('.sheet-body');
  onMount?.(bodyEl, close);
  requestAnimationFrame(() => {
    wrap.classList.add('open');
    const first = bodyEl.querySelector('[autofocus]') || wrap.querySelector('.sheet');
    first.focus({ preventScroll: true });
  });
  return close;
}

// options: [{ value, label, desc?, danger?, icon? }]
export function choiceSheet({ title, options, value }) {
  return new Promise((resolve) => {
    sheet({
      title,
      body: h`<div class="choices">${options.map((o, i) => h`
        <button class="choice ${o.danger ? 'danger' : ''} ${o.value === value ? 'selected' : ''}" data-i="${i}" ${o.value === value ? raw('aria-current="true"') : ''}>
          ${o.icon ? icon(o.icon) : ''}
          <span class="choice-text"><span class="choice-label">${o.label}</span>${o.desc ? h`<span class="choice-desc">${o.desc}</span>` : ''}</span>
          ${o.value === value ? icon('check', 'choice-check') : ''}
        </button>`)}</div>`,
      onMount(body, close) {
        body.addEventListener('click', (e) => {
          const b = e.target.closest('[data-i]');
          if (b) close(options[Number(b.dataset.i)].value);
        });
      },
      onClose: (v) => resolve(v === undefined ? null : v),
    });
  });
}

export function confirmSheet({ title, text, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    sheet({
      title,
      body: h`<p class="sheet-text">${text}</p>
        <div class="sheet-actions">
          <button class="btn" data-no>Cancel</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-yes autofocus>${ok}</button>
        </div>`,
      onMount(body, close) {
        body.querySelector('[data-yes]').addEventListener('click', () => close(true));
        body.querySelector('[data-no]').addEventListener('click', () => close(false));
      },
      onClose: (v) => resolve(v === true),
    });
  });
}

// Stacked buttons, first one is the main action. actions: [{ value, label, kind?: 'primary' | 'danger' }]
// Resolves with the chosen value, or null if dismissed.
export function actionSheet({ title, text, actions }) {
  return new Promise((resolve) => {
    sheet({
      title,
      body: h`${text ? h`<p class="sheet-text">${text}</p>` : ''}
        <div class="sheet-stack">${actions.map((a, i) => h`
          <button class="btn big ${a.kind === 'primary' ? 'primary' : a.kind === 'danger' ? 'ghost-danger' : ''}" data-i="${i}" ${i === 0 ? raw('autofocus') : ''}>${a.label}</button>`)}
        </div>`,
      onMount(body, close) {
        body.addEventListener('click', (e) => {
          const b = e.target.closest('[data-i]');
          if (b) close(actions[Number(b.dataset.i)].value);
        });
      },
      onClose: (v) => resolve(v ?? null),
    });
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function promptSheet({ title, label, value = '', ok = 'Save', maxlength = 60, placeholder = '' }) {
  return new Promise((resolve) => {
    sheet({
      title,
      body: h`<form class="prompt-form">
          <label class="field"><span class="field-label">${label}</span>
          <input class="text-in" name="v" value="${value}" maxlength="${maxlength}" placeholder="${placeholder}" autocomplete="off" autofocus required></label>
          <div class="sheet-actions">
            <button type="button" class="btn" data-no>Cancel</button>
            <button class="btn primary">${ok}</button>
          </div>
        </form>`,
      onMount(body, close) {
        const form = body.querySelector('form');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const v = form.v.value.trim();
          if (v) close(v);
        });
        body.querySelector('[data-no]').addEventListener('click', () => close(null));
        setTimeout(() => form.v.select(), 50);
      },
      onClose: (v) => resolve(v || null),
    });
  });
}

// ---- Toast -----------------------------------------------------------------------------

let toastTimer;
export function toast(msg) {
  const root = document.getElementById('toast-root');
  root.innerHTML = String(h`<div class="toast" role="status">${msg}</div>`);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, 2800);
}

// ---- Formatting -------------------------------------------------------------------------

export const muscleName = (m) => MUSCLES[m]?.name || m;

export function musclesText(ex) {
  const names = [...ex.primary, ...ex.secondary].slice(0, 3).map(muscleName);
  return names.join(', ');
}

export function equipmentText(ex) {
  if (!ex.equipment.length) return 'No equipment';
  return ex.equipment.map((e) => EQUIPMENT[e] || e).join(', ');
}

export const dateLong = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
export const dateShort = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const dateTime = (ts) => new Date(ts).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function clock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

export function durationText(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function ago(ts) {
  const days = Math.floor((startOfDay(Date.now()) - startOfDay(ts)) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return dateShort(ts);
}

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const numFmt = (n) => Math.round(n).toLocaleString();

export function listText(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

export function rangeText(min, max) {
  return min === max ? String(min) : `${min}–${max}`;
}

// Full description of one logged set, e.g. "60 kg × 10".
export function setText(s, ex) {
  const u = unit();
  switch (ex.track) {
    case 'bw': return s.w > 0 ? `+${fmtW(s.w)} ${u} × ${s.r ?? 0}` : `${s.r ?? 0} reps`;
    case 'r': return `${s.r ?? 0} reps`;
    case 't': return `${s.s ?? 0} sec`;
    case 'wt': return `${fmtW(s.w || 0)} ${u} × ${s.s ?? 0} sec`;
    default: return `${fmtW(s.w || 0)} ${u} × ${s.r ?? 0}`;
  }
}

// Compact form for the "previous" column in the logger.
export function setShort(s, ex) {
  if (!s) return '–';
  switch (ex.track) {
    case 'bw': return s.w > 0 ? `+${fmtW(s.w)} × ${s.r ?? 0}` : `${s.r ?? 0} reps`;
    case 'r': return `${s.r ?? 0} reps`;
    case 't': return `${s.s ?? 0} s`;
    case 'wt': return `${fmtW(s.w || 0)} × ${s.s ?? 0}s`;
    default: return `${fmtW(s.w || 0)} × ${s.r ?? 0}`;
  }
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
