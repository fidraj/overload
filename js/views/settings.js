// Settings tab: units, equipment, rest timer, weight steps and backups.

import { EQUIPMENT, EQUIPMENT_PRESETS } from '../data.js';
import { state, save, flush, exportData, replaceAll, eraseAll, getEx, fmtW, unit } from '../store.js';
import { h, icon, app, confirmSheet, toast, download } from '../ui.js';
import { initAnalytics, hasAnalytics } from '../analytics.js';

export function renderSettings(el) {
  const s = state.settings;
  const eq = new Set(s.equipment);
  const inc = s.inc[s.unit];
  const preset = Object.entries(EQUIPMENT_PRESETS).find(([, p]) => p.items.length === eq.size && p.items.every((i) => eq.has(i)))?.[0];

  el.innerHTML = String(h`
    <header class="page-head"><h1 class="page-title">Settings</h1></header>

    <section class="set-group">
      <h2 class="section-title">Units and look</h2>
      ${seg('unit', 'Weight unit', s.unit, [['kg', 'kg'], ['lb', 'lb']])}
      ${seg('theme', 'Theme', s.theme, [['auto', 'Match device'], ['dark', 'Dark'], ['light', 'Light']])}
    </section>

    <section class="set-group">
      <h2 class="section-title">Equipment</h2>
      <p class="muted">Generated workouts only use exercises you can do with what's ticked here.</p>
      <div class="seg wide" role="group" aria-label="Equipment presets">${Object.entries(EQUIPMENT_PRESETS).map(([k, p]) => h`
        <button class="seg-btn ${preset === k ? 'on' : ''}" data-preset="${k}" aria-pressed="${preset === k}">${p.name}</button>`)}</div>
      <div class="chip-wrap">${Object.entries(EQUIPMENT).map(([k, name]) => h`
        <button class="chip ${eq.has(k) ? 'on' : ''}" data-eq="${k}" aria-pressed="${eq.has(k)}">${eq.has(k) ? icon('check') : ''}${name}</button>`)}</div>
    </section>

    <section class="set-group">
      <h2 class="section-title">Rest timer</h2>
      ${toggle('autoRest', 'Start the rest timer when you tick a set', s.autoRest)}
      ${toggle('sound', 'Beep when rest is over', s.sound)}
      ${toggle('vibrate', 'Vibrate when rest is over (Android)', s.vibrate)}
      ${toggle('wakeLock', 'Keep the screen on during a workout', s.wakeLock)}
    </section>

    <section class="set-group">
      <h2 class="section-title">Weight steps</h2>
      <p class="muted">How much the "Try heavier" hint adds once you hit the top of your rep range, in ${unit()}.</p>
      <div class="field-row three">
        ${incField('barbell', 'Barbell', inc.barbell)}
        ${incField('dumbbell', 'Dumbbell', inc.dumbbell)}
        ${incField('machine', 'Machine', inc.machine)}
      </div>
    </section>

    <section class="set-group">
      <h2 class="section-title">Your data</h2>
      <p class="muted">Your workouts are stored in this browser only. Export a backup now and then, and use it to move to another device.</p>
      <div class="btn-col">
        <button class="btn" data-act="export">${icon('down')} Export backup (JSON)</button>
        <label class="btn file-btn">${icon('up')} Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
        <button class="btn" data-act="csv">${icon('down')} Export history as CSV</button>
        <button class="btn ghost-danger" data-act="erase">${icon('trash')} Erase all data</button>
      </div>
      ${hasAnalytics ? h`${toggle('analytics', 'Count anonymous visits', s.analytics)}
      <p class="muted small">Helps me see how many people use the app. Uses GoatCounter: no cookies, no personal data, and nothing about your workouts.</p>` : ''}
      <p class="muted small">${state.history.length} workouts, ${state.templates.length} saved workouts, ${state.custom.length} custom exercises.</p>
    </section>`);

  el.onclick = async (e) => {
    const t = e.target.closest('[data-seg]');
    if (t) {
      s[t.dataset.seg] = t.dataset.v;
      save('settings');
      if (t.dataset.seg === 'theme') applyTheme();
      return app.refresh();
    }
    const p = e.target.closest('[data-preset]');
    if (p) {
      s.equipment = [...EQUIPMENT_PRESETS[p.dataset.preset].items];
      save('settings');
      return app.refresh();
    }
    const c = e.target.closest('[data-eq]');
    if (c) {
      const k = c.dataset.eq;
      s.equipment = eq.has(k) ? s.equipment.filter((x) => x !== k) : [...s.equipment, k];
      save('settings');
      return app.refresh();
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'export') {
      flush();
      download(`overload-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportData(), null, 1));
    } else if (act === 'csv') {
      download(`overload-history-${new Date().toISOString().slice(0, 10)}.csv`, historyCsv(), 'text/csv');
    } else if (act === 'erase') {
      if (!(await confirmSheet({ title: 'Erase all data?', text: 'Workouts, saved workouts, custom exercises and settings are deleted from this browser. Export a backup first if you might want them back.', ok: 'Erase everything', danger: true }))) return;
      eraseAll();
      applyTheme();
      toast('All data erased');
      app.refresh();
    }
  };

  el.onchange = async (e) => {
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      s[tg.dataset.toggle] = tg.checked;
      save('settings');
      if (tg.dataset.toggle === 'analytics' && tg.checked) initAnalytics();
      return;
    }
    const inc2 = e.target.closest('[data-inc]');
    if (inc2) {
      const v = Number(inc2.value.replace(',', '.'));
      if (v > 0) { s.inc[s.unit][inc2.dataset.inc] = v; save('settings'); } else inc2.value = s.inc[s.unit][inc2.dataset.inc];
      return;
    }
    const file = e.target.closest('[data-import]')?.files?.[0];
    if (file) {
      e.target.value = '';
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        return toast("That file isn't valid JSON");
      }
      if (data?.app !== 'overload' || !Array.isArray(data.history)) return toast("That file isn't an Overload backup");
      const ok = await confirmSheet({
        title: 'Replace your data?',
        text: `The backup has ${data.history.length} workouts. Importing replaces everything currently in this browser.`,
        ok: 'Import',
        danger: true,
      });
      if (!ok) return;
      replaceAll(data);
      applyTheme();
      toast('Backup imported');
      app.refresh();
    }
  };
}

function seg(key, label, value, options) {
  return h`<div class="field"><span class="field-label">${label}</span>
    <div class="seg" role="group" aria-label="${label}">${options.map(([v, name]) => h`
      <button class="seg-btn ${value === v ? 'on' : ''}" data-seg="${key}" data-v="${v}" aria-pressed="${value === v}">${name}</button>`)}</div></div>`;
}

function toggle(key, label, on) {
  return h`<label class="switch-row"><span>${label}</span><input type="checkbox" class="switch" data-toggle="${key}" ${on ? 'checked' : ''}></label>`;
}

function incField(key, label, v) {
  return h`<label class="field"><span class="field-label">${label}</span>
    <input class="text-in" data-inc="${key}" inputmode="decimal" value="${v}"></label>`;
}

function historyCsv() {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['date', 'workout', 'exercise', 'set', 'warmup', `weight_${unit()}`, 'reps', 'seconds'].join(',')];
  for (const w of [...state.history].reverse()) {
    const date = new Date(w.startedAt).toISOString();
    for (const e of w.exercises) {
      const name = getEx(e.exId, e.name).name;
      e.sets.forEach((s, i) => {
        rows.push([date, q(w.name), q(name), i + 1, s.wu ? 1 : 0, s.w == null ? '' : fmtW(s.w), s.r ?? '', s.s ?? ''].join(','));
      });
    }
  }
  return rows.join('\n');
}

export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c1f24' : '#e8ebee');
}
