// 🎞️ Converte os mp4 VAP (side-by-side RGB+alpha) dos presentes em sequência
// de frames webp com transparência REAL + JSON Lottie (formato lfvideo2lottie,
// idêntico ao coracao.json). Elimina o uso de <video> no evento de presente.
//
// Uso:
//   node scripts/vap2lottie.mjs --gift <out>   (processa UM gift, ex.: rosa)
//   node scripts/vap2lottie.mjs --all          (processa os 9 gifts)
//
// Requisitos: ffmpeg no PATH.
//
// O JSON gerado segue exatamente o coracao.json:
//   - assets: um por frame ({ id, w, h, p: "N.webp", u: "/images/", e: 0 })
//   - layers: um ty:2 por frame (ip=N, op=N+1, st=N, refId=N+1)
//   - w/h = dimensões dos webp (375×812 — nítido no display ~360px, 4x menor)

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ANIM_DIR = join(process.cwd(), 'public', 'animations');
const TEMPLATE = join(ANIM_DIR, 'coracao.json');

// ⚙️ Geometria de cada gift (lida do services/vap/giftVapConfig.ts):
//   SIDE-BY-SIDE 1500×1624 → rgb em [0,0,750,1624], alfa em [750,0,750,1624]
//   Asas de Anjo (1136×1632) → rgb [0,0,750,1624], alfa [754,0,375,812] (2x)
// Resolução de saída: 375×812 (metade — suficiente e leve).
const GIFTS = [
  { out: 'rosa',              file: 'rosa_cristal.mp4',              fps: 24, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'pirulito',          file: 'pirulito.mp4',                  fps: 30, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'planta',            file: 'planta.mp4',                    fps: 30, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'sorvete',           file: 'sorvete.mp4',                   fps: 24, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'anel',              file: 'anel_de_ouro.mp4',              fps: 30, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'champanhe',         file: 'champanhe_dourado.mp4',         fps: 30, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'caixa_presente_rosa', file: 'caixa_de_presente_rosa.mp4',  fps: 24, W: 1500, H: 1624, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'meu_coracao_palpita', file: 'meu_coracao_palpita_por_voce.mp4', fps: 24, W: 1500, H: 1624, rx: 0, ry: 0, rw: 750, rh: 1624, ax: 750, ay: 0, aw: 750, ah: 1624 },
  { out: 'asas_anjo',         file: 'asas_de_anjo.mp4',              fps: 30, W: 1136, H: 1632, rx: 0,  ry: 0,  rw: 750, rh: 1624, ax: 754, ay: 0, aw: 375, ah: 812 },
];

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const OUT_W = 375;
const OUT_H = 812;
const QUALITY = 75;
const COMPRESSION = 2;

function buildFilter(g) {
  const cropRgb = `[0:v]crop=${g.rw}:${g.rh}:${g.rx}:${g.ry}[rgb]`;
  const cropA = `[0:v]crop=${g.aw}:${g.ah}:${g.ax}:${g.ay}[a]`;
  // Asas de Anjo: a máscara (375×812) precisa ser ampliada 2× para cobrir o conteúdo.
  const scaleA = (g.aw !== g.rw || g.ah !== g.rh) ? `[a]scale=${g.rw}:${g.rh}[a2]` : null;
  const merge = scaleA
    ? `[rgb][a2]alphamerge,scale=${OUT_W}:${OUT_H}[v]`
    : `[rgb][a]alphamerge,scale=${OUT_W}:${OUT_H}[v]`;
  return `${cropRgb};${cropA}${scaleA ? ';' + scaleA : ''};${merge}`;
}

function buildLottieJson(g, frameCount) {
  const template = JSON.parse(readFileSync(TEMPLATE, 'utf8'));
  const assets = [];
  const layers = [];
  for (let i = 0; i < frameCount; i++) {
    assets.push({ id: String(i + 1), w: OUT_W, h: OUT_H, p: `${i + 1}.webp`, u: '/images/', e: 0 });
    layers.push({
      ind: i,
      ty: 2,
      refId: String(i + 1),
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [0, 0, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 },
      },
      ao: 0,
      ip: i,
      op: i + 1,
      st: i,
      bm: 0,
    });
  }
  return {
    ...template,
    fr: g.fps,
    ip: 0,
    op: frameCount,
    w: OUT_W,
    h: OUT_H,
    nm: 'lfvideo2lottie',
    assets,
    layers,
  };
}

function convertOne(g, skipFrames) {
  const mp4 = join(ANIM_DIR, g.file);
  const outDir = join(ANIM_DIR, g.out);
  const jsonPath = join(ANIM_DIR, `${g.out}.json`);

  if (!existsSync(mp4)) {
    console.error(`❌ ${g.file} não existe — pulando.`);
    return false;
  }
  mkdirSync(outDir, { recursive: true });

  // 1) Webp frames (pipeline único: crop RGB + crop alfa + alphamerge + scale)
  let count = 0;
  if (!skipFrames) {
    console.log(`🎬 ${g.out} (${g.file}) — extraindo frames...`);
    const r = spawnSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', mp4,
      '-filter_complex', buildFilter(g),
      '-map', '[v]',
      '-c:v', 'libwebp', '-pix_fmt', 'yuva420p',
      '-compression_level', String(COMPRESSION), '-quality', String(QUALITY),
      join(outDir, '%d.webp'),
    ], { stdio: ['ignore', 'inherit', 'inherit'] });

    if (r.status !== 0) {
      console.error(`❌ ffmpeg falhou para ${g.out} (status ${r.status})`);
      return false;
    }
  } else {
    console.log(`⏭️  ${g.out} — frames existentes reutilizados.`);
  }

  const files = readdirSync(outDir)
    .filter((f) => f.endsWith('.webp'))
    .sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]));
  count = files.length;

  // 2) JSON Lottie
  const json = buildLottieJson(g, count);
  writeFileSync(jsonPath, JSON.stringify(json));
  const kb = Math.round(readFileSize(outDir) / 1024);

  console.log(`✅ ${g.out}: ${count} frames → ${jsonPath} (${kb} KB total)`);
  return true;
}

function readFileSize(dir) {
  return readdirSync(dir).reduce((acc, f) => {
    try { return acc + statSync(join(dir, f)).size; } catch { return acc; }
  }, 0);
}

const only = arg('gift', '');
const all = process.argv.includes('--all');
const skipFrames = process.argv.includes('--skip-frames');

if (!only && !all) {
  console.error('Uso: node scripts/vap2lottie.mjs --gift <out> | --all [--skip-frames]');
  process.exit(1);
}

const targets = all ? GIFTS : GIFTS.filter((g) => g.out === only);
if (targets.length === 0) {
  console.error(`❌ Gift desconhecido: ${only}`);
  process.exit(1);
}

for (const g of targets) {
  if (!convertOne(g, skipFrames)) process.exitCode = 1;
}
