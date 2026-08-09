// 🎞️ Converte uma animação Lottie (JSON) em MP4 alpha-strip (formato VAP) p/ os presentes.
//
// O MP4 gerado tem o DOBRO da altura do comp:
//   ┌────────────────────────────┐
//   │  W × H   CONTEÚDO RGB      │  ← cor PRÉ-MULTIPLICADA (rgb × alpha)
//   ├────────────────────────────┤
//   │  W × H   MÁSCARA ALFA      │  ← escala de cinza (luminância = alpha)
//   └────────────────────────────┘
// O shader do GiftVapPlayer amostra `rgbFrame` + `aFrame` e emite
// `vec4(rgb, alpha)` num canvas WebGL com premultipliedAlpha:true — por isso
// o topo precisa ser pré-multiplicado (mesmo formato dos mp4 existentes).
//
// Como funciona:
//   1. Lê o JSON Lottie (formato MERGED, com assets embutidos em base64).
//   2. Remove camadas de marca d'água (nome contém "水印").
//   3. Abre o Edge headless via CDP (sem instalar puppeteer) e renderiza cada
//      frame do comp num canvas, empilhando RGB pré-multiplicado + máscara alfa.
//   4. Salva os frames como PNG e codifica com ffmpeg → H.264 yuv420p.
//
// Uso:
//   node scripts/render-lottie-gift.mjs --input path/animacao.json --output path/animacao.mp4 [--fps 25] [--width 750] [--height 1624]
//
// Requisitos: ffmpeg no PATH · Edge (Chrome) instalado · Node 22+ (WebSocket global)

import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';

const EDGE_CANDIDATES = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

const LOTTIE_URL = 'https://unpkg.com/lottie-web@5.12.2/build/player/lottie.min.js';

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const INPUT = arg('input');
const OUTPUT = arg('output');
const FPS = Number(arg('fps', '25'));
const W = Number(arg('width', '750'));
const H = Number(arg('height', '1624'));
const PORT = Number(arg('port', '9222'));
const MAX_FRAMES = Number(arg('frames', '0'));

if (!INPUT || !OUTPUT) {
  console.error('Uso: node render-lottie-gift.mjs --input anim.json --output anim.mp4 [--fps 25] [--width 750] [--height 1624]');
  process.exit(1);
}

const animJson = JSON.parse(readFileSync(INPUT, 'utf8'));
console.log(`🎬 Lottie: ${animJson.nm ?? basename(INPUT)} | ${animJson.w}x${animJson.h} | fr=${animJson.fr} | frames [${animJson.ip}, ${animJson.op})`);

// ---------------------------------------------------------------------------
// 1. Remove marca d'água
// ---------------------------------------------------------------------------
const before = animJson.layers?.length ?? 0;
if (Array.isArray(animJson.layers)) {
  animJson.layers = animJson.layers.filter((l) => !/水印|watermark/i.test(String(l?.nm ?? '')));
}
console.log(`🧹 Camadas: ${before} → ${animJson.layers?.length ?? 0} (marca d'água removida)`);

// ---------------------------------------------------------------------------
// 2. Baixa o lottie-web (cache em temp) — CDN no lugar do npm
// ---------------------------------------------------------------------------
const cacheDir = join(tmpdir(), 'lottie-gift-tool');
const lottieFile = join(cacheDir, 'lottie.min.js');
mkdirSync(cacheDir, { recursive: true });
if (!existsSync(lottieFile)) {
  console.log('⬇️  Baixando lottie-web do unpkg...');
  const res = await fetch(LOTTIE_URL, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`Falha ao baixar lottie-web: HTTP ${res.status}`);
  writeFileSync(lottieFile, Buffer.from(await res.arrayBuffer()));
}
const lottieSrc = readFileSync(lottieFile, 'utf8');

// ---------------------------------------------------------------------------
// 3. CDP client
// ---------------------------------------------------------------------------
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    };
  }
  open() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout ao abrir WebSocket CDP')), 15000);
      this.ws.onopen = () => { clearTimeout(t); resolve(); };
      this.ws.onerror = () => { clearTimeout(t); reject(new Error('Falha ao conectar no WebSocket CDP')); };
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const mid = ++this.id;
      const t = setTimeout(() => { this.pending.delete(mid); reject(new Error(`TIMEOUT ${method}`)); }, 300000);
      this.pending.set(mid, {
        resolve: (v) => { clearTimeout(t); resolve(v); },
        reject: (e) => { clearTimeout(t); reject(e); },
      });
      this.ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

function killEdge() {
  try { execFileSync('taskkill', ['/pid', String(edgeProc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ignore */ }
}

const edgePath = EDGE_CANDIDATES.find((c) => existsSync(c));
if (!edgePath) {
  console.error('❌ Edge/Chrome não encontrado. Defina EDGE_PATH.');
  process.exit(1);
}
console.log(`🌐 Browser: ${edgePath}`);

const edgeProc = spawn(edgePath, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(cacheDir, `profile-${Date.now()}`)}`,
  'about:blank',
], { stdio: 'ignore' });

let cdp = null;
try {
  // espera o debug port
  let info = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) { info = await r.json(); break; }
    } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!info) throw new Error('Edge não respondeu no debug port');

  let target = null;
  for (const method of ['PUT', 'GET']) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about%3Ablank`, { method, signal: AbortSignal.timeout(5000) });
      if (r.ok) { target = await r.json(); break; }
    } catch { /* próximo */ }
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('Não criou target CDP');

  cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  // injeção fire-and-forget (onload NÃO dispara em about:blank) + poll
  await cdp.send('Runtime.evaluate', {
    expression: `(function(){var s=document.createElement('script');s.textContent=${JSON.stringify(lottieSrc)};document.head.appendChild(s);return 'ok';})()`,
  });
  let lottieReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const ck = await cdp.send('Runtime.evaluate', { expression: 'typeof lottie !== "undefined"', returnByValue: true });
    if (ck.result?.value === true) { lottieReady = true; break; }
  }
  if (!lottieReady) throw new Error('lottie-web não carregou na página');
  console.log('✅ lottie-web carregado');

  // setup da cena (fire-and-forget) + poll de pronto
  const setupExpr = `(function(){
    window.__gift = { ready: false, error: null };
    try {
      var json = ${JSON.stringify(JSON.stringify(animJson))};
      var animData = JSON.parse(json);
      var container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-10000px;top:0;width:${W}px;height:${H}px;';
      document.body.appendChild(container);
      var anim = lottie.loadAnimation({
        container: container, renderer: 'canvas', loop: false, autoplay: false,
        rendererSettings: { clearCanvas: true, hideOnTransparent: true },
        animationData: animData,
      });
      anim.addEventListener('DOMLoaded', function () {
        try {
          var canvas = container.querySelector('canvas');
          canvas.width = ${W}; canvas.height = ${H};
          var outCanvas = document.createElement('canvas');
          outCanvas.width = ${W}; outCanvas.height = ${H * 2};
          outCanvas.style.cssText = 'position:fixed;left:-100000px;top:0;';
          document.body.appendChild(outCanvas);
          window.__gift.anim = anim;
          window.__gift.canvas = canvas;
          window.__gift.ctx = canvas.getContext('2d');
          window.__gift.outCanvas = outCanvas;
          window.__gift.outCtx = outCanvas.getContext('2d');
          window.__gift.ready = true;
        } catch (e) { window.__gift.error = String(e); }
      });
      anim.addEventListener('data_failed', function () { window.__gift.error = 'data_failed'; });
    } catch (e) { window.__gift.error = String(e); }
    return 'setup ok';
  })()`;
  await cdp.send('Runtime.evaluate', { expression: setupExpr });

  let ready = false;
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const ck = await cdp.send('Runtime.evaluate', { expression: 'window.__gift.ready || window.__gift.error', returnByValue: true });
    if (ck.result?.value === true) { ready = true; break; }
    if (typeof ck.result?.value === 'string') throw new Error(`Setup falhou: ${ck.result.value}`);
  }
  if (!ready) throw new Error('Animação não ficou pronta (timeout)');
  console.log('✅ Comp renderizado');

  // extrai os frames em lotes (síncrono — sem awaitPromise)
  const extractFn = `(function () {
    var g = window.__gift;
    var img = g.ctx.getImageData(0, 0, ${W}, ${H});
    var out = g.ctx.createImageData(${W}, ${H * 2});
    var d = img.data, o = out.data;
    var len = ${W} * ${H};
    for (var i = 0; i < len; i++) {
      var j = i * 4;
      var r = d[j], gg = d[j + 1], b = d[j + 2], a = d[j + 3];
      var pa = a / 255;
      o[j] = Math.round(r * pa); o[j + 1] = Math.round(gg * pa); o[j + 2] = Math.round(b * pa); o[j + 3] = 255;
      var k = (len + i) * 4;
      o[k] = a; o[k + 1] = a; o[k + 2] = a; o[k + 3] = 255;
    }
    g.outCtx.putImageData(out, 0, 0);
    return g.outCanvas.toDataURL('image/png').split(',')[1];
  })`;

  const ip = animJson.ip ?? 0;
  const op = animJson.op ?? animJson.fr ?? 100;
  const frames = [];
  for (let f = ip; f < op; f++) frames.push(f);
  if (MAX_FRAMES > 0) frames.length = Math.min(frames.length, MAX_FRAMES);

  const frameDir = join(cacheDir, 'frames');
  rmSync(frameDir, { recursive: true, force: true });
  mkdirSync(frameDir, { recursive: true });

  console.log(`🎞️  Renderizando ${frames.length} frames em ${FPS} fps...`);
  let BATCH = 8;
  let done = 0;
  for (let i = 0; i < frames.length;) {
    const batch = frames.slice(i, i + BATCH);
    const expr = `(function(){ var g = window.__gift; var out = []; for (var k = 0; k < ${JSON.stringify(batch)}.length; k++) { g.anim.goToAndStop(${JSON.stringify(batch)}[k], true); out.push(${extractFn}()); } return out; })()`;
    let res;
    try {
      res = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    } catch (e) {
      if (batch.length > 1) {
        console.log(`\n  batch lento (${batch.length}), reduzindo para ${Math.floor(batch.length / 2)}...`);
        BATCH = Math.max(1, Math.floor(batch.length / 2));
        continue;
      }
      throw e;
    }
    if (res.exceptionDetails) throw new Error(`Erro ao renderizar frame: ${JSON.stringify(res.exceptionDetails).slice(0, 300)}`);
    const b64 = res.result?.value;
    if (!Array.isArray(b64)) throw new Error('Resposta de frame inválida');
    for (let b = 0; b < b64.length; b++) {
      writeFileSync(join(frameDir, `frame_${String(done + b).padStart(4, '0')}.png`), Buffer.from(b64[b], 'base64'));
    }
    done += b64.length;
    i += b64.length;
    process.stdout.write(`\r  ${done}/${frames.length}`);
  }
  console.log('');

  if (done < frames.length) throw new Error('Render incompleto');

  // ffmpeg → H.264 yuv420p
  const pngCount = readdirSync(frameDir).filter((f) => f.endsWith('.png')).length;
  console.log(`🧾 ${pngCount} PNGs gerados. Codificando MP4...`);
  mkdirSync(dirname(OUTPUT), { recursive: true });
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(FPS),
    '-i', join(frameDir, 'frame_%04d.png'),
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '5.1',
    '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow',
    '-movflags', '+faststart', '-an', OUTPUT,
  ], { stdio: ['ignore', 'inherit', 'inherit'] });

  rmSync(frameDir, { recursive: true, force: true });

  const size = Math.round(existsSync(OUTPUT) ? readFileSync(OUTPUT).length / 1024 : 0);
  console.log(`✅ MP4 gerado: ${OUTPUT} (${size} KB, ${FPS} fps, ${W}x${H * 2})`);
} catch (err) {
  console.error('❌', err.message);
  process.exitCode = 1;
} finally {
  try { cdp?.close(); } catch { /* ignore */ }
  killEdge();
  await new Promise((r) => setTimeout(r, 300));
}
