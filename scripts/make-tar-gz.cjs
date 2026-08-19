/**
 * make-tar-gz.cjs — Cria um .tar.gz de uma pasta em NODE (zlib), sem depender
 * do tar.exe do Windows (que é extremamente lento com milhares de arquivos).
 *
 * Formato: tar ustar com caminhos SEM prefixo "./" (importante para a limpeza
 * de assets no deploy — deploy-frontend.cjs extrai o basename do tar -tzf).
 *
 * Uso:
 *   node scripts/make-tar-gz.cjs <saida.tar.gz> <pasta>
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const [, , outTar, dir] = process.argv;

if (!outTar || !dir) {
  console.error('Uso: node scripts/make-tar-gz.cjs <saida.tar.gz> <pasta>');
  process.exit(1);
}
if (!fs.existsSync(dir)) {
  console.error('ERRO: pasta não existe:', dir);
  process.exit(1);
}

const octal = (n, len) => n.toString(8).padStart(len - 1, '0') + '\0';

function tarHeader(name, size, mtime, mode, type) {
  const h = Buffer.alloc(512);
  const nb = Buffer.from(name, 'utf8');
  nb.copy(h, 0, 0, Math.min(nb.length, 100));
  h.write(octal(mode, 8), 100, 8, 'utf8');
  h.write(octal(0, 8), 108, 8, 'utf8'); // uid
  h.write(octal(0, 8), 116, 8, 'utf8'); // gid
  h.write(octal(size, 12), 124, 12, 'utf8');
  h.write(octal(Math.floor(mtime / 1000), 12), 136, 12, 'utf8');
  h.write('        ', 148, 8, 'utf8'); // chksum placeholder
  h.write(type || '0', 156, 1, 'utf8');
  h.write('ustar\0', 257, 6, 'utf8');
  h.write('00', 263, 2, 'utf8');
  // soma de checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += h[i];
  h.write(octal(sum, 8), 148, 8, 'utf8');
  return h;
}

function collect(dir, base) {
  const entries = [];
  const walk = (cur) => {
    const abs = path.join(dir, cur);
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) return; // ignora symlinks
    if (st.isDirectory()) {
      if (cur !== '') entries.push({ name: cur.endsWith('/') ? cur : cur + '/', size: 0, mtime: st.mtimeMs, mode: 0o755, type: '5' });
      for (const e of fs.readdirSync(abs)) walk(cur ? `${cur}/${e}` : e);
    } else if (st.isFile()) {
      entries.push({ name: cur, size: st.size, mtime: st.mtimeMs, mode: 0o644, type: '0' });
    }
  };
  walk('');
  return entries;
}

const pad512 = (n) => (512 - (n % 512)) % 512;

const entries = collect(dir, '');
const chunks = [];

for (const e of entries) {
  chunks.push(tarHeader(e.name, e.size, e.mtime, e.mode, e.type));
  if (e.type === '0') {
    const data = fs.readFileSync(path.join(dir, e.name));
    chunks.push(data);
    const pad = pad512(data.length);
    if (pad) chunks.push(Buffer.alloc(pad));
  }
}

// fim do tar: dois blocos zerados
chunks.push(Buffer.alloc(1024));

const tar = Buffer.concat(chunks);
const gz = zlib.gzipSync(tar, { level: 1 });

fs.writeFileSync(outTar, gz);
const mb = (gz.length / 1024 / 1024).toFixed(2);
console.log(`✅ tar.gz criado: ${outTar} (${mb} MB, ${entries.filter(e => e.type === '0').length} arquivos)`);
