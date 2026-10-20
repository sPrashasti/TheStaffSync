// Helpers for the canvas-style diagrams (empathy map, problem statement canvas, priority grid,
// burndown chart): an SVG with word-wrapped text and sticky notes.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const FONT = 'Segoe UI, Calibri, Arial, sans-serif';
  const el = (t, a, txt) => { const e = document.createElementNS(NS, t); Object.entries(a || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };

  window.makeCanvas = (width, height, title, subtitle) => {
    const svg = el('svg', { xmlns: NS, width, height, viewBox: `0 0 ${width} ${height}` });
    svg.appendChild(el('rect', { x: 0, y: 0, width, height, fill: '#ffffff' }));
    if (title) svg.appendChild(el('text', { x: width / 2, y: 38, 'font-size': 26, 'font-weight': 700, fill: '#1b2a41', 'text-anchor': 'middle', 'font-family': FONT }, title));
    if (subtitle) svg.appendChild(el('text', { x: width / 2, y: 64, 'font-size': 14, fill: '#555', 'text-anchor': 'middle', 'font-family': FONT }, subtitle));
    document.body.appendChild(svg);
    const api = {
      svg,
      el,
      add: (node) => { svg.appendChild(node); return node; },
      // Writes `text` wrapped to `maxWidth`, starting at (x, y). Returns the y below the last line.
      text(text, x, y, { size = 13, weight = 400, color = '#1d2b45', maxWidth = 300, anchor = 'start', lineGap = 1.3, italic = false } = {}) {
        const words = String(text).split(' ');
        let line = '';
        let cy = y;
        const flush = () => {
          svg.appendChild(el('text', { x, y: cy, 'font-size': size, 'font-weight': weight, fill: color, 'text-anchor': anchor, 'font-family': FONT, 'font-style': italic ? 'italic' : 'normal' }, line));
          cy += size * lineGap;
        };
        const probe = el('text', { 'font-size': size, 'font-weight': weight, 'font-family': FONT });
        svg.appendChild(probe);
        words.forEach((w) => {
          const next = line ? `${line} ${w}` : w;
          probe.textContent = next;
          if (probe.getComputedTextLength() > maxWidth && line) { flush(); line = w; } else { line = next; }
        });
        probe.remove();
        if (line) flush();
        return cy;
      },
      bullets(items, x, y, opts = {}) {
        let cy = y;
        items.forEach((item) => {
          svg.appendChild(el('circle', { cx: x + 4, cy: cy - (opts.size || 13) * 0.35, r: 2.6, fill: opts.dot || '#3d4a63' }));
          cy = api.text(item, x + 14, cy, { ...opts, maxWidth: (opts.maxWidth || 300) - 14 }) + (opts.gap ?? 4);
        });
        return cy;
      },
      box(x, y, w, h, { fill = '#f6f8fb', stroke = '#9aa7bd', rx = 12, dashed = false } = {}) {
        return svg.appendChild(el('rect', { x, y, width: w, height: h, rx, fill, stroke, 'stroke-width': 1.5, 'stroke-dasharray': dashed ? '6 5' : 'none' }));
      },
      sticky(x, y, w, h, text, fill, { size = 13 } = {}) {
        svg.appendChild(el('rect', { x: x + 3, y: y + 4, width: w, height: h, fill: 'rgba(0,0,0,0.08)' }));
        svg.appendChild(el('rect', { x, y, width: w, height: h, fill, stroke: 'rgba(0,0,0,0.12)' }));
        // Vertically centre the wrapped text.
        const probeY = api.text(text, -9999, 0, { size, maxWidth: w - 20 });
        const lines = Math.round(probeY / (size * 1.3));
        [...svg.querySelectorAll('text')].filter((t) => t.getAttribute('x') === '-9999').forEach((t) => t.remove());
        const startY = y + h / 2 - ((lines - 1) * size * 1.3) / 2 + size * 0.35;
        api.text(text, x + w / 2, startY, { size, maxWidth: w - 20, anchor: 'middle' });
      },
    };
    return api;
  };
})();
