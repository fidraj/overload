// Single-series progress line chart (SVG) with a hover/touch crosshair and tooltip.

import { esc } from './ui.js';

function niceStep(x) {
  const exp = 10 ** Math.floor(Math.log10(x));
  const f = x / exp;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * exp;
}

function niceScale(min, max) {
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const step = niceStep(span / 3);
  const y0 = Math.floor(min / step) * step;
  let y1 = Math.ceil(max / step) * step;
  if (y1 === y0) y1 += step;
  const ticks = [];
  for (let v = y0; v <= y1 + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { y0, y1, ticks };
}

const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// points: [{ t: timestamp, v: number }] oldest first. fmt(v) -> label text.
export function mountChart(box, points, { fmt, label }) {
  const H = 220;
  const pad = { l: 46, r: 18, t: 22, b: 30 };

  const draw = () => {
    const W = Math.max(260, box.clientWidth);
    const xs = points.map((p) => p.t);
    let x0 = Math.min(...xs);
    let x1 = Math.max(...xs);
    if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
    const { y0, y1, ticks } = niceScale(Math.min(...points.map((p) => p.v)), Math.max(...points.map((p) => p.v)));
    const X = (t) => pad.l + ((t - x0) / (x1 - x0)) * (W - pad.l - pad.r);
    const Y = (v) => pad.t + (1 - (v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    const last = points.at(-1);
    const showMarkers = points.length <= 40;

    box.innerHTML = `
      <svg class="chart-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${esc(fmt(points[0].v))} on ${esc(shortDate(points[0].t))}, ${esc(fmt(last.v))} on ${esc(shortDate(last.t))}">
        ${ticks.map((v) => `
          <line class="chart-grid" x1="${pad.l}" x2="${W - pad.r}" y1="${Y(v)}" y2="${Y(v)}"/>
          <text class="chart-tick" x="${pad.l - 8}" y="${Y(v) + 4}" text-anchor="end">${esc(fmt(v, true))}</text>`).join('')}
        <text class="chart-tick" x="${X(points[0].t)}" y="${H - 8}" text-anchor="start">${esc(shortDate(points[0].t))}</text>
        ${points.length > 1 ? `<text class="chart-tick" x="${X(last.t)}" y="${H - 8}" text-anchor="end">${esc(shortDate(last.t))}</text>` : ''}
        <line class="chart-cross" x1="0" x2="0" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/>
        <path class="chart-line" d="${path}"/>
        ${(showMarkers ? points : [last]).map((p) => `<circle class="chart-dot" cx="${X(p.t)}" cy="${Y(p.v)}" r="4"/>`).join('')}
        <text class="chart-last" x="${Math.min(X(last.t), W - pad.r)}" y="${Y(last.v) - 10}" text-anchor="end">${esc(fmt(last.v))}</text>
        <circle class="chart-focus" r="6" visibility="hidden"/>
        <rect class="chart-hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}"/>
      </svg>
      <div class="chart-tip" hidden></div>`;

    const svg = box.querySelector('svg');
    const cross = svg.querySelector('.chart-cross');
    const focus = svg.querySelector('.chart-focus');
    const tip = box.querySelector('.chart-tip');

    const show = (ev) => {
      const rect = svg.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      let best = points[0];
      for (const p of points) if (Math.abs(X(p.t) - x) < Math.abs(X(best.t) - x)) best = p;
      const px = X(best.t);
      const py = Y(best.v);
      cross.setAttribute('x1', px);
      cross.setAttribute('x2', px);
      cross.setAttribute('visibility', 'visible');
      focus.setAttribute('cx', px);
      focus.setAttribute('cy', py);
      focus.setAttribute('visibility', 'visible');
      tip.innerHTML = `<span>${esc(new Date(best.t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</span><b>${esc(fmt(best.v))}</b>`;
      tip.hidden = false;
      const tw = tip.offsetWidth;
      tip.style.left = `${Math.max(0, Math.min(W - tw, px - tw / 2))}px`;
      tip.style.top = `${Math.max(0, py - tip.offsetHeight - 14)}px`;
    };
    const hide = () => {
      cross.setAttribute('visibility', 'hidden');
      focus.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  };

  draw();
  let lastW = box.clientWidth;
  const ro = new ResizeObserver(() => {
    if (!box.isConnected) return ro.disconnect();
    if (Math.abs(box.clientWidth - lastW) > 4) { lastW = box.clientWidth; draw(); }
  });
  ro.observe(box);
}
