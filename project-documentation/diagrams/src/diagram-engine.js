// Tiny diagram engine used to draw the StaffSync diagrams from data (no external libraries).
// A diagram is { width, height, title, groups, nodes, edges }:
//   nodes: { id, kind: 'entity' | 'process' | 'store' | 'box' | 'actor', x, y, w, h, r, label, sub, fill }
//          x/y is the centre. 'process' is a circle (r); 'store' is an open-ended data store.
//   edges: { from, to, label, offset, labelAt, dashed, both }
//          offset shifts the arrow sideways (px) so two flows between the same pair stay apart.
//   groups: { x, y, w, h, label, fill } frames drawn behind the nodes (top-left coordinates).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const FONT = 'Segoe UI, Calibri, Arial, sans-serif';

  // Point where the line from the node centre towards (tx, ty) leaves the node outline.
  const boundary = (n, tx, ty) => {
    const dx = tx - n.x;
    const dy = ty - n.y;
    const len = Math.hypot(dx, dy) || 1;
    if (n.kind === 'process') return { x: n.x + (dx / len) * n.r, y: n.y + (dy / len) * n.r };
    const hw = n.w / 2;
    const hh = n.h / 2;
    const scale = Math.min(Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity);
    return { x: n.x + dx * scale, y: n.y + dy * scale };
  };

  // Where the ray start + t·dir (start inside the node) crosses the node's outline.
  const exitPoint = (n, start, dir) => {
    let t;
    if (n.kind === 'process') {
      const fx = start.x - n.x;
      const fy = start.y - n.y;
      const a = dir.x * dir.x + dir.y * dir.y;
      const b = 2 * (fx * dir.x + fy * dir.y);
      const c = fx * fx + fy * fy - n.r * n.r;
      t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
    } else {
      const hw = n.w / 2;
      const hh = n.h / 2;
      const tx = dir.x === 0 ? Infinity : ((dir.x > 0 ? n.x + hw : n.x - hw) - start.x) / dir.x;
      const ty = dir.y === 0 ? Infinity : ((dir.y > 0 ? n.y + hh : n.y - hh) - start.y) / dir.y;
      t = Math.min(tx, ty);
    }
    return { x: start.x + dir.x * t, y: start.y + dir.y * t };
  };

  const multiline = (g, lines, x, y, size, weight, fill, anchor = 'middle', lineGap = 1.25) => {
    const start = y - ((lines.length - 1) * size * lineGap) / 2;
    lines.forEach((line, i) => {
      g.appendChild(el('text', { x, y: start + i * size * lineGap, 'font-size': size, 'font-weight': weight, fill, 'text-anchor': anchor, 'dominant-baseline': 'middle', 'font-family': FONT }, line));
    });
  };

  window.drawDiagram = (spec) => {
    const svg = el('svg', { xmlns: NS, width: spec.width, height: spec.height, viewBox: `0 0 ${spec.width} ${spec.height}` });
    svg.appendChild(el('rect', { x: 0, y: 0, width: spec.width, height: spec.height, fill: '#ffffff' }));
    const defs = el('defs');
    const marker = el('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' });
    marker.appendChild(el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#2f3b52' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    if (spec.title) {
      svg.appendChild(el('text', { x: spec.width / 2, y: 34, 'font-size': 24, 'font-weight': 700, fill: '#1b2a41', 'text-anchor': 'middle', 'font-family': FONT }, spec.title));
    }
    if (spec.subtitle) {
      svg.appendChild(el('text', { x: spec.width / 2, y: 60, 'font-size': 14, fill: '#555', 'text-anchor': 'middle', 'font-family': FONT }, spec.subtitle));
    }

    (spec.groups || []).forEach((gr) => {
      svg.appendChild(el('rect', { x: gr.x, y: gr.y, width: gr.w, height: gr.h, rx: 14, fill: gr.fill || '#f6f8fb', stroke: gr.stroke || '#9aa7bd', 'stroke-dasharray': gr.dashed ? '6 5' : 'none', 'stroke-width': 1.5 }));
      svg.appendChild(el('text', { x: gr.x + 14, y: gr.y + 22, 'font-size': 14, 'font-weight': 700, fill: gr.labelColor || '#3d4a63', 'font-family': FONT }, gr.label));
    });

    const byId = Object.fromEntries(spec.nodes.map((n) => [n.id, n]));
    const edgeLayer = el('g');
    const labelLayer = el('g');
    const nodeLayer = el('g');
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);
    svg.appendChild(labelLayer);

    spec.edges.forEach((e) => {
      const a = byId[e.from];
      const b = byId[e.to];
      if (!a || !b) throw new Error(`Unknown node in edge ${e.from} -> ${e.to}`);
      // Routed flow: a polyline through `via` points, so it can go round other nodes.
      if (e.via) {
        const first = e.via[0];
        const last = e.via[e.via.length - 1];
        const s = exitPoint(a, { x: a.x, y: a.y }, { x: first.x - a.x, y: first.y - a.y });
        const t = exitPoint(b, { x: b.x, y: b.y }, { x: last.x - b.x, y: last.y - b.y });
        const pts = [s, ...e.via, t].map((pt) => `${pt.x},${pt.y}`).join(' ');
        const attrs = { points: pts, fill: 'none', stroke: '#2f3b52', 'stroke-width': 1.6, 'marker-end': 'url(#arrow)' };
        if (e.both) attrs['marker-start'] = 'url(#arrow)';
        if (e.dashed) attrs['stroke-dasharray'] = '6 4';
        edgeLayer.appendChild(el('polyline', attrs));
        if (e.label) {
          const g = el('g');
          labelLayer.appendChild(g);
          multiline(g, e.label.split('\n'), e.lx, e.ly, 12, 500, '#1d2b45');
          const box = g.getBBox();
          g.insertBefore(el('rect', { x: box.x - 4, y: box.y - 2, width: box.width + 8, height: box.height + 4, rx: 4, fill: '#ffffff', stroke: '#d6dbe4' }), g.firstChild);
        }
        return;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const px = (-dy / len) * (e.offset || 0);
      const py = (dx / len) * (e.offset || 0);
      // The shifted line runs between the two centres moved sideways by the offset; each end stops
      // exactly where that line leaves its node's real outline.
      const p1 = exitPoint(a, { x: a.x + px, y: a.y + py }, { x: dx, y: dy });
      const p2 = exitPoint(b, { x: b.x + px, y: b.y + py }, { x: -dx, y: -dy });
      const { x: x1, y: y1 } = p1;
      const { x: x2, y: y2 } = p2;
      const attrs = { x1, y1, x2, y2, stroke: '#2f3b52', 'stroke-width': 1.6, 'marker-end': 'url(#arrow)' };
      if (e.both) attrs['marker-start'] = 'url(#arrow)';
      if (e.dashed) attrs['stroke-dasharray'] = '6 4';
      edgeLayer.appendChild(el('line', attrs));
      if (e.label) {
        // Either an absolute position (lx, ly) or a point along the line, nudged by labelDx/labelDy.
        const t = e.labelAt ?? 0.5;
        const lx = e.lx ?? x1 + (x2 - x1) * t + (e.labelDx || 0);
        const ly = e.ly ?? y1 + (y2 - y1) * t + (e.labelDy || 0);
        const lines = e.label.split('\n');
        const g = el('g');
        labelLayer.appendChild(g);
        multiline(g, lines, lx, ly, 12, 500, '#1d2b45');
        const box = g.getBBox();
        g.insertBefore(el('rect', { x: box.x - 4, y: box.y - 2, width: box.width + 8, height: box.height + 4, rx: 4, fill: '#ffffff', stroke: '#d6dbe4' }), g.firstChild);
      }
    });

    spec.nodes.forEach((n) => {
      const g = el('g');
      nodeLayer.appendChild(g);
      const lines = n.label.split('\n');
      if (n.kind === 'process') {
        g.appendChild(el('circle', { cx: n.x, cy: n.y, r: n.r, fill: n.fill || '#e8f0fe', stroke: '#2f5fa8', 'stroke-width': 2 }));
        if (n.num) {
          g.appendChild(el('text', { x: n.x, y: n.y - n.r + 24, 'font-size': 14, 'font-weight': 700, fill: '#2f5fa8', 'text-anchor': 'middle', 'font-family': FONT }, n.num));
          g.appendChild(el('line', { x1: n.x - n.r * 0.72, y1: n.y - n.r + 34, x2: n.x + n.r * 0.72, y2: n.y - n.r + 34, stroke: '#2f5fa8', 'stroke-width': 1 }));
          multiline(g, lines, n.x, n.y + 10, n.size || 13, 600, '#1b2a41');
        } else {
          multiline(g, lines, n.x, n.y, n.size || 15, 700, '#1b2a41');
        }
      } else if (n.kind === 'store') {
        const x = n.x - n.w / 2;
        const y = n.y - n.h / 2;
        g.appendChild(el('rect', { x, y, width: n.w, height: n.h, fill: n.fill || '#fff8ec', stroke: 'none' }));
        g.appendChild(el('line', { x1: x, y1: y, x2: x + n.w, y2: y, stroke: '#9a6b1f', 'stroke-width': 2 }));
        g.appendChild(el('line', { x1: x, y1: y + n.h, x2: x + n.w, y2: y + n.h, stroke: '#9a6b1f', 'stroke-width': 2 }));
        g.appendChild(el('line', { x1: x, y1: y, x2: x, y2: y + n.h, stroke: '#9a6b1f', 'stroke-width': 2 }));
        g.appendChild(el('line', { x1: x + 44, y1: y, x2: x + 44, y2: y + n.h, stroke: '#9a6b1f', 'stroke-width': 1.5 }));
        g.appendChild(el('text', { x: x + 22, y: n.y, 'font-size': 13, 'font-weight': 700, fill: '#7a4f0f', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': FONT }, n.num || ''));
        multiline(g, lines, x + 44 + (n.w - 44) / 2, n.y, n.size || 13, 600, '#3b2a0c');
      } else {
        const x = n.x - n.w / 2;
        const y = n.y - n.h / 2;
        const isEntity = n.kind === 'entity';
        g.appendChild(el('rect', { x, y, width: n.w, height: n.h, rx: isEntity ? 2 : 10, fill: n.fill || (isEntity ? '#eef1f6' : '#ffffff'), stroke: n.stroke || (isEntity ? '#3d4a63' : '#5b6b88'), 'stroke-width': isEntity ? 2.2 : 1.6 }));
        if (n.sub) {
          // Title above, subtitle below, the whole block centred vertically in the box.
          const size = n.size || 14;
          const subLines = n.sub.split('\n');
          const titleH = lines.length * size * 1.25;
          const subH = subLines.length * 11.5 * 1.3;
          const top = n.y - (titleH + 4 + subH) / 2;
          multiline(g, lines, n.x, top + titleH / 2, size, 700, '#1b2a41');
          multiline(g, subLines, n.x, top + titleH + 4 + subH / 2, 11.5, 400, '#4a5670', 'middle', 1.3);
        } else {
          multiline(g, lines, n.x, n.y, n.size || 14, 700, '#1b2a41');
        }
      }
    });

    (spec.notes || []).forEach((nt) => {
      multiline(svg, nt.text.split('\n'), nt.x, nt.y, nt.size || 12, nt.weight || 400, nt.color || '#555', nt.anchor || 'start');
    });

    document.body.appendChild(svg);
    return svg;
  };
})();
