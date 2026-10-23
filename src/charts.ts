/** Hand-rolled animated SVG charts — zero chart libraries. */

/* ---------------- Count-up animation ---------------- */

/**
 * Animate an element's text from 0 to `target` over ~1.2s with ease-out,
 * formatting each frame with `format`. Cancels any previous run on the element.
 */
export function countUp(el: HTMLElement, target: number, format: (n: number) => string): void {
  const key = '__rs_countup';
  const prev = (el as unknown as Record<string, number>)[key];
  if (prev) cancelAnimationFrame(prev);

  const duration = 1200;
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(target * eased);
    if (p < 1) {
      (el as unknown as Record<string, number>)[key] = requestAnimationFrame(tick);
    } else {
      el.textContent = format(target);
    }
  };
  (el as unknown as Record<string, number>)[key] = requestAnimationFrame(tick);
}

/* ---------------- Language donut ---------------- */

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

/**
 * Animated donut: segments sweep in via stroke-dashoffset transition.
 * `size` in px; returns the SVG element.
 */
export function donutChart(slices: DonutSlice[], size = 220): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'donut');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Language breakdown donut chart');

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  let offset = 0;

  slices.forEach((s, i) => {
    const frac = s.value / total;
    const len = Math.max(frac * c - (slices.length > 1 ? 3 : 0), 0.5); // 3px gap
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', s.color);
    circle.setAttribute('stroke-width', '26');
    circle.setAttribute('stroke-dasharray', `${len} ${c - len}`);
    circle.setAttribute('stroke-dashoffset', String(-offset));
    circle.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    circle.setAttribute('class', 'donut-seg');
    circle.style.transitionDelay = `${i * 90}ms`;
    // Animate in: start fully hidden, then reveal on next frame.
    circle.setAttribute('stroke-dasharray', `0 ${c}`);
    svg.appendChild(circle);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        circle.setAttribute('stroke-dasharray', `${len} ${c - len}`);
      }),
    );
    offset += frac * c;
  });

  // Center label: total bytes.
  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', String(cx));
  text.setAttribute('y', String(cy - 4));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('class', 'donut-total');
  text.textContent = formatBytesShort(total);
  const sub = document.createElementNS(ns, 'text');
  sub.setAttribute('x', String(cx));
  sub.setAttribute('y', String(cy + 18));
  sub.setAttribute('text-anchor', 'middle');
  sub.setAttribute('class', 'donut-sub');
  sub.textContent = `${slices.length} language${slices.length === 1 ? '' : 's'}`;
  svg.append(text, sub);
  return svg;
}

function formatBytesShort(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

/* ---------------- Commit rhythm bars ---------------- */

/**
 * Weekly commit bars. Bars grow from the baseline with a stagger so the
 * "heartbeat" sweeps in left → right. Returns a wrapper div.
 */
export function rhythmBars(
  buckets: Array<{ label: string; count: number }>,
  accent: string,
): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'rhythm';
  const max = Math.max(...buckets.map((b) => b.count), 1);
  buckets.forEach((b, i) => {
    const col = document.createElement('div');
    col.className = 'rhythm-col';
    const barWrap = document.createElement('div');
    barWrap.className = 'rhythm-barwrap';
    const bar = document.createElement('div');
    bar.className = 'rhythm-bar';
    bar.style.background = accent;
    bar.style.animationDelay = `${i * 55}ms`;
    bar.title = `${b.label}: ${b.count} commit${b.count === 1 ? '' : 's'}`;
    const pct = Math.max((b.count / max) * 100, b.count > 0 ? 4 : 0);
    bar.style.setProperty('--h', `${pct}%`);
    const count = document.createElement('div');
    count.className = 'rhythm-count';
    count.textContent = b.count > 0 ? String(b.count) : '';
    const label = document.createElement('div');
    label.className = 'rhythm-label';
    label.textContent = i % 2 === 0 ? b.label : '';
    barWrap.appendChild(bar);
    col.append(barWrap, count, label);
    wrap.appendChild(col);
  });
  return wrap;
}

/* ---------------- Horizontal ranked bars ---------------- */

export interface HBarItem {
  label: string;
  sub?: string;
  value: number;
  color?: string;
}

/**
 * Ranked horizontal bars that grow in with a stagger. `formatValue` renders
 * the trailing value label; colors default to the accent gradient.
 */
export function rankedBars(
  items: HBarItem[],
  formatValue: (v: number) => string,
  accent: string,
): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'hbars';
  const max = Math.max(...items.map((i) => i.value), 1);
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'hbar-row';
    const head = document.createElement('div');
    head.className = 'hbar-head';
    const label = document.createElement('span');
    label.className = 'hbar-label';
    label.textContent = item.label;
    if (item.sub) label.title = item.sub;
    const val = document.createElement('span');
    val.className = 'hbar-val';
    val.textContent = formatValue(item.value);
    head.append(label, val);
    const track = document.createElement('div');
    track.className = 'hbar-track';
    const fill = document.createElement('div');
    fill.className = 'hbar-fill';
    fill.style.background = item.color ?? accent;
    fill.style.animationDelay = `${i * 70}ms`;
    fill.style.setProperty('--w', `${Math.max((item.value / max) * 100, 1.5)}%`);
    track.appendChild(fill);
    row.append(head, track);
    wrap.appendChild(row);
  });
  return wrap;
}

/* ---------------- Score ring ---------------- */

/** Animated 0–100 ring that sweeps up to `score`. Returns {el, set}. */
export function scoreRing(score: number, size = 190): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'score-ring');
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const cx = size / 2;

  const track = document.createElementNS(ns, 'circle');
  track.setAttribute('cx', String(cx));
  track.setAttribute('cy', String(cx));
  track.setAttribute('r', String(r));
  track.setAttribute('class', 'score-track');

  const arc = document.createElementNS(ns, 'circle');
  arc.setAttribute('cx', String(cx));
  arc.setAttribute('cy', String(cx));
  arc.setAttribute('r', String(r));
  arc.setAttribute('class', 'score-arc');
  arc.setAttribute('transform', `rotate(-90 ${cx} ${cx})`);
  const dash = (score / 100) * c;
  arc.setAttribute('stroke-dasharray', `${c}`);
  arc.setAttribute('stroke-dashoffset', `${c}`);
  svg.append(track, arc);

  const text = document.createElementNS(ns, 'text');
  text.setAttribute('x', String(cx));
  text.setAttribute('y', String(cx + 2));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('class', 'score-num');
  text.textContent = '0';
  svg.appendChild(text);

  // Sweep the arc + count the number together.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      arc.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.22, 1, 0.36, 1)';
      arc.setAttribute('stroke-dashoffset', `${c - dash}`);
      const start = performance.now();
      const dur = 1600;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        text.textContent = String(Math.round(score * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }),
  );
  return svg;
}
