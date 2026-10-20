// Renders each diagram HTML page to <name>.svg and <name>.png (2x) using headless Chrome.
// Usage: node render-diagrams.mjs <srcDir> <outDir> name1 name2 ...
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [srcDir, outDir, ...names] = process.argv.slice(2);
const profile = path.join(process.env.TEMP || '.', 'staffsync-diagram-chrome');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--remote-debugging-port=9341', `--user-data-dir=${profile}`, 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:9341/json')).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
await send('Runtime.enable'); await send('Page.enable');
for (const name of names) {
  errors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width: 2200, height: 1600, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(path.join(srcDir, `${name}.html`)).href });
  await sleep(1200);
  const box = await ev(`(() => { const s = document.querySelector('svg, #canvas'); if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, svg: s.tagName.toLowerCase() === 'svg' ? s.outerHTML : null }; })()`);
  if (!box) { console.log(name, 'NO DIAGRAM', errors); continue; }
  if (box.svg) writeFileSync(path.join(outDir, `${name}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${box.svg}`);
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 } });
  writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(shot.result.data, 'base64'));
  console.log(`${name}: ${Math.round(box.w)}x${Math.round(box.h)}${box.svg ? ' +svg' : ''}${errors.length ? ' ERRORS: ' + errors.join(' | ') : ''}`);
}
ws.close(); chrome.kill(); process.exit(0);
