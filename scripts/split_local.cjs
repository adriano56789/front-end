const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const LOCAL_TAR = path.resolve(__dirname, '..', 'dist-restore.tar');
const OUT_DIR = path.resolve(__dirname, '..', 'dist-parts');
const SIZE = 25 * 1024 * 1024;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const stat = fs.statSync(LOCAL_TAR);
console.log('tamanho local:', stat.size, `(~${Math.ceil(stat.size / SIZE)} partes)`);

let part = 0;
let off = 0;
const results = [];
while (off < stat.size) {
  const name = path.join(OUT_DIR, 'p' + String(part).padStart(2, '0'));
  const len = Math.min(SIZE, stat.size - off);
  const fd = fs.openSync(LOCAL_TAR, 'r');
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, off);
  fs.closeSync(fd);
  fs.writeFileSync(name, buf);
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  results.push(`${part}\t${len}\t${hash}`);
  console.log('part', part, '->', name, len, 'bytes');
  off += len; part++;
}
fs.writeFileSync(path.join(OUT_DIR, 'parts.txt'), results.join('\n'));
console.log('TOTAL partes:', part);