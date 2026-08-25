const { Client } = require('ssh2');

// Script que roda DENTRO do container: insere escopo "fans" na rota /ranking/:period
const innerScript = `const fs = require('fs');
const p = '/app/dist/routes/metadataRoutes.js';
let s = fs.readFileSync(p, 'utf8');
if (s.indexOf("source: 'fans_scope'") !== -1) { console.log('ALREADY_PATCHED'); process.exit(0); }
const anchor = "console.log('\\uD83C\\uDFC6 Buscando ranking real para per\\u00EDodo:', period);";
const idx = s.indexOf(anchor);
if (idx === -1) { console.log('ANCHOR_NOT_FOUND'); process.exit(1); }
const nl = String.fromCharCode(10);
const L = [
'        // \\uD83C\\uDFAF ESCOPO F\\u00C3S: ranking de F\\u00C3S REAIS do usu\\u00E1rio \\u2014 S\\u00D3 quem ENVIOU',
'        // presente PARA ele. Antes a rota ignorava userId/scope e devolvia o ranking',
'        // global (qualquer um com diamantes recebidos) \\u2014 aparecia gente que nunca',
'        // mandou presente. Corre\\u00E7\\u00E3o: agrega GiftTransaction por remetente.',
'        {',
"            const qScope = String(req.query.scope || '');",
"            const qTarget = req.query.userId ? String(req.query.userId) : '';",
'            if (qScope === \\'fans\\' && qTarget) {',
'                try {',
'                    const periodDays = { daily: 1, weekly: 7, monthly: 30 };',
'                    const days = periodDays[period] || 30;',
'                    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);',
'                    const agg = await models_1.GiftTransaction.aggregate([',
'                        { \\$match: { toUserId: qTarget, createdAt: { \\$gte: since } } },',
"                        { \\$group: { _id: '\\$fromUserId', total: { \\$sum: '\\$totalValue' }, giftCount: { \\$sum: 1 }, lastAt: { \\$max: '\\$createdAt' } } },",
'                        { \\$sort: { total: -1, lastAt: -1 } },',
'                        { \\$limit: 50 }',
'                    ]);',
'                    const ids = agg.map(function (a) { return String(a._id); });',
'                    const fanDocs = ids.length ? await models_1.User.find({ id: { \\$in: ids } }) : [];',
'                    const byId = new Map(fanDocs.map(function (u) { return [String(u.id), u.toObject ? u.toObject() : u]; }));',
'                    const fans = [];',
'                    for (let i = 0; i < agg.length; i++) {',
'                        const u = byId.get(String(agg[i]._id));',
'                        if (!u) continue;',
'                        fans.push(Object.assign({}, u, {',
'                            contribution: agg[i].total,',
'                            giftCount: agg[i].giftCount,',
'                            rank: fans.length + 1,',
'                            period: period,',
"                            debug: { source: 'fans_scope', gifts: agg[i].giftCount }",
'                        }));',
'                    }',
"                    console.log('[FANS] fa\\u0303s reais para ' + qTarget + ' (' + period + '): ' + fans.length);",
'                    return res.json(fans);',
'                } catch (eFanErr) {',
"                    console.error('[FANS] erro:', eFanErr && eFanErr.message);",
'                    return res.json([]);',
'                }',
'            }',
'        }'
].join(nl);
fs.copyFileSync(p, p + '.bak_fans');
s = s.slice(0, idx) + L + nl + s.slice(idx);
fs.writeFileSync(p, s);
console.log('PATCH_FANS_OK');
`;

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP_ERR', err.message); return conn.end(); }
    const stream = sftp.createWriteStream('/tmp/inner-fans.cjs');
    stream.on('close', () => {
      const steps = [
        'docker cp /tmp/inner-fans.cjs app-backend:/tmp/inner-fans.cjs',
        'docker exec app-backend node /tmp/inner-fans.cjs',
        'docker restart app-backend',
      ];
      let i = 0;
      const runNext = () => {
        if (i >= steps.length) {
          conn.exec('sleep 2; docker exec app-backend grep -c "fans_scope" /app/dist/routes/metadataRoutes.js; docker exec app-backend node -e "new Function(require(\'fs\').readFileSync(\'/app/dist/routes/metadataRoutes.js\',\'utf8\')); console.log(\'SYNTAX_OK\')"', (e, s2) => {
            let out = '';
            s2.on('close', () => { console.log('VERIFY:', out.trim()); conn.end(); })
              .on('data', d => out += d.toString())
              .stderr.on('data', d => out += d.toString());
          });
          return;
        }
        const cmd = steps[i]; i++;
        conn.exec(cmd, (e, s2) => {
          let out = '';
          s2.on('close', (code) => { console.log('>>', cmd, '=> CODE', code); if (out.trim()) console.log(out.trim()); runNext(); })
            .on('data', d => out += d.toString())
            .stderr.on('data', d => out += d.toString());
        });
      };
      runNext();
    });
    stream.end(innerScript);
  });
}).connect({
  host: '2.25.192.154', port: 22, username: 'root', password: 'MshrUfZrh09hWr#',
  tryKeyboard: true, readyTimeout: 45000,
});
conn.on('keyboard-interactive', (_, __, ___, ____, finish) => finish([conn.config.password]));
