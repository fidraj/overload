// Exercise picker and muscle picker sheets.

import { MUSCLES } from './data.js';
import { state, allExercises, getEx, hasEquipment, fmtW, unit } from './store.js';
import { alternatives, lastSession, working } from './engine.js';
import { h, raw, sheet, icon, musclesText, equipmentText, muscleName } from './ui.js';
import { muscleIcon } from './art.js';
import { thumb } from './components.js';

// Resolves with an exercise id, or null if dismissed.
// swapFor: show the best alternatives for that exercise first. exclude: ids already in the workout.
export function pickExercise({ title = 'Add exercise', swapFor = null, exclude = [] } = {}) {
  return new Promise((resolve) => {
    let q = '';
    let muscle = swapFor ? getEx(swapFor).primary[0] || 'all' : 'all';
    let mine = true;
    const skip = new Set([...exclude, swapFor]);
    const altRank = swapFor ? new Map(alternatives(swapFor).map((e, i) => [e.id, i])) : null;

    sheet({
      title,
      tall: true,
      body: h`
        <div class="picker-tools">
          <label class="search">${icon('search')}<input type="search" data-q placeholder="Search exercises" aria-label="Search exercises" autocomplete="off"></label>
          <div class="filter-row">
            <button class="muscle-select" data-muscle-btn aria-haspopup="dialog"></button>
            <label class="check-line"><input type="checkbox" data-mine checked> My equipment only</label>
          </div>
        </div>
        <ul class="picker-list" data-list></ul>`,
      onMount(body, close) {
        const list = body.querySelector('[data-list]');
        const muscleBtn = body.querySelector('[data-muscle-btn]');

        const drawMuscle = () => {
          muscleBtn.innerHTML = String(h`
            ${muscle === 'all' ? h`<span class="ms-icon all">${icon('dumbbell')}</span>` : h`<span class="ms-icon">${raw(muscleIcon(muscle))}</span>`}
            <span class="ms-text"><span class="ms-k">Muscle</span><span class="ms-v">${muscle === 'all' ? 'All muscles' : muscleName(muscle)}</span></span>
            ${icon('chevron')}`);
          muscleBtn.setAttribute('aria-label', `Muscle filter: ${muscle === 'all' ? 'all muscles' : muscleName(muscle)}. Change`);
        };

        const draw = () => {
          const words = q.toLowerCase().split(/\s+/).filter(Boolean);
          let items = allExercises().filter((e) => !skip.has(e.id)
            && (muscle === 'all' || e.primary.includes(muscle) || (words.length && e.secondary.includes(muscle)))
            && (!mine || hasEquipment(e))
            && words.every((w) => e.name.toLowerCase().includes(w)));
          items.sort((a, b) => {
            if (altRank) {
              const ra = altRank.has(a.id) ? altRank.get(a.id) : 1e9;
              const rb = altRank.has(b.id) ? altRank.get(b.id) : 1e9;
              if (ra !== rb) return ra - rb;
            }
            return a.name.localeCompare(b.name);
          });
          items = items.slice(0, 150);
          list.innerHTML = String(items.length ? h`${items.map((e) => {
            const last = lastSession(e.id);
            const top = last ? Math.max(0, ...working(last.e.sets).map((s) => s.w || 0)) : 0;
            return h`<li><button class="pick-row" data-pick="${e.id}">
              ${thumb(e, 'small')}
              <span class="pick-text">
                <span class="pick-name">${e.name}${state.prefs.fav[e.id] ? icon('star', 'fav') : ''}</span>
                <span class="pick-sub">${musclesText(e)}</span>
                <span class="pick-eq">${equipmentText(e)}${top ? h`<span class="pick-last">Last ${fmtW(top)} ${unit()}</span>` : ''}</span>
              </span>
            </button></li>`;
          })}` : h`<li class="empty-note">No exercises match. Try another muscle or turn off the equipment filter.</li>`);
        };

        body.querySelector('[data-q]').addEventListener('input', (e) => { q = e.target.value; draw(); });
        body.querySelector('[data-mine]').addEventListener('change', (e) => { mine = e.target.checked; draw(); });
        body.addEventListener('click', async (e) => {
          if (e.target.closest('[data-muscle-btn]')) {
            const m = await pickMuscle(muscle);
            if (m) { muscle = m; drawMuscle(); draw(); list.scrollIntoView({ block: 'nearest' }); }
            return;
          }
          const p = e.target.closest('[data-pick]');
          if (p) close(p.dataset.pick);
        });
        drawMuscle();
        draw();
      },
      onClose: (v) => resolve(v || null),
    });
  });
}

// Single muscle, shown as a grid of body-map tiles. Resolves with a muscle key, 'all', or null.
export function pickMuscle(current = 'all') {
  return new Promise((resolve) => {
    sheet({
      title: 'Muscle',
      body: h`<div class="muscle-grid">
        <button class="muscle-tile ${current === 'all' ? 'on' : ''}" data-m="all" aria-pressed="${current === 'all'}">
          <span class="mt-icon all">${icon('dumbbell')}</span><span class="mt-name">All muscles</span></button>
        ${Object.keys(MUSCLES).map((m) => h`
        <button class="muscle-tile ${current === m ? 'on' : ''}" data-m="${m}" aria-pressed="${current === m}">
          <span class="mt-icon">${raw(muscleIcon(m))}</span><span class="mt-name">${muscleName(m)}</span></button>`)}
      </div>`,
      onMount(body, close) {
        body.addEventListener('click', (e) => {
          const b = e.target.closest('[data-m]');
          if (b) close(b.dataset.m);
        });
      },
      onClose: (v) => resolve(v || null),
    });
  });
}

// Multi-select of muscles. Resolves with an array, or null if dismissed.
export function pickMuscles({ title = 'Target muscles', selected = [] } = {}) {
  return new Promise((resolve) => {
    const sel = new Set(selected);
    sheet({
      title,
      body: h`
        <p class="sheet-text">Pick the muscles you want to train. The workout is rebuilt around them.</p>
        <div class="muscle-grid" role="group" aria-label="Muscles">${Object.keys(MUSCLES).map((m) => h`
          <button class="muscle-tile ${sel.has(m) ? 'on' : ''}" data-m="${m}" aria-pressed="${sel.has(m)}">
            <span class="mt-icon">${raw(muscleIcon(m))}</span><span class="mt-name">${muscleName(m)}</span></button>`)}</div>
        <div class="sheet-actions">
          <button class="btn" data-no>Cancel</button>
          <button class="btn primary" data-yes>Build workout</button>
        </div>`,
      onMount(body, close) {
        body.addEventListener('click', (e) => {
          const c = e.target.closest('[data-m]');
          if (c) {
            const m = c.dataset.m;
            if (sel.has(m)) sel.delete(m); else sel.add(m);
            c.classList.toggle('on', sel.has(m));
            c.setAttribute('aria-pressed', sel.has(m));
          }
          if (e.target.closest('[data-no]')) close(null);
          if (e.target.closest('[data-yes]') && sel.size) close([...sel]);
        });
      },
      onClose: (v) => resolve(v || null),
    });
  });
}
