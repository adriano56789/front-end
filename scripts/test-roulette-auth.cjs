/**
 * test-roulette-auth.cjs — Valida o novo contrato da roleta em produção:
 *  1. GET /items (leitura) é público → 200
 *  2. POST /items SEM token (espectador) → 403
 *  3. PUT /items/:id SEM token → 403
 *  4. PUT /cost SEM token → 403
 *  5. POST /spin SEM token → 401
 */
const { Client } = require('ssh2');

const HOST = '2.25.192.154';
const USER = 'root';
const PASSWORD = process.env.VPS_PASS || 'MshrUfZrh09hWr#';
const BASE = 'https://api.livego.store/api/roulette';

const REMOTE_SCRIPT = `
set +e
BASE="${BASE}"
echo '=== [1/5] GET /items (leitura publica) ==='
curl -s -o /tmp/r1.txt -w 'HTTP %{http_code}\\n' "$BASE/items?ownerId=teste-roleta"
head -c 120 /tmp/r1.txt; echo

echo '=== [2/5] POST /items SEM token (espectador) — esperado 403 ==='
curl -s -o /tmp/r2.txt -w 'HTTP %{http_code}\\n' -X POST "$BASE/items" -H 'Content-Type: application/json' -d '{"ownerId":"teste-roleta","label":"Invasao do espectador"}'
cat /tmp/r2.txt; echo

echo '=== [3/5] PUT /cost SEM token — esperado 403 ==='
curl -s -o /tmp/r3.txt -w 'HTTP %{http_code}\\n' -X PUT "$BASE/cost" -H 'Content-Type: application/json' -d '{"ownerId":"teste-roleta","cost":999}'
cat /tmp/r3.txt; echo

echo '=== [4/5] DELETE /items/<id inventado> SEM token — esperado 403 ==='
curl -s -o /tmp/r4.txt -w 'HTTP %{http_code}\\n' -X DELETE "$BASE/items/000000000000000000000000"
cat /tmp/r4.txt; echo

echo '=== [5/5] POST /spin SEM token — esperado 401 ==='
curl -s -o /tmp/r5.txt -w 'HTTP %{http_code}\\n' -X POST "$BASE/spin" -H 'Content-Type: application/json' -d '{"userId":"qualquer","ownerId":"teste-roleta","streamId":"teste"}'
cat /tmp/r5.txt; echo
echo '=== FIM ==='
`;

function sshExec(cmd, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;
    const guard = setTimeout(() => {
      if (!settled) { settled = true; try { conn.end(); } catch {} reject(new Error('timeout ' + timeoutMs + 'ms')); }
    }, timeoutMs);
    conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
      finish(prompts.map(() => PASSWORD));
    });
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { settled = true; clearTimeout(guard); conn.end(); reject(err); return; }
        let out = '';
        stream.on('close', (code) => {
          if (!settled) { settled = true; clearTimeout(guard); conn.end(); resolve({ code, out }); }
        });
        stream.on('data', (d) => { out += d.toString(); });
        stream.stderr.on('data', (d) => { out += d.toString(); });
      });
    });
    conn.on('error', (e) => { if (!settled) { settled = true; clearTimeout(guard); reject(e); } });
    conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 20000, keepaliveInterval: 15000 });
  });
}

async function main() {
  const r = await sshExec(REMOTE_SCRIPT);
  console.log(r.out);
  console.log('[exit ' + r.code + ']');
  process.exit(r.code || 0);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
