// Verifica a resolução de ownerId da roleta no backend.
const { Streamer, User } = require('/app/dist/models');

(async () => {
  const s = await Streamer.findOne({ streamKey: { $exists: true, $ne: '' } }).select('streamKey hostId id isLive').lean();
  console.log('stream:', JSON.stringify(s));
  if (!s) { console.log('NENHUM stream com streamKey'); process.exit(0); }
  const u = await User.findOne({ id: s.hostId }).select('rouletteSpinCost').lean();
  console.log('host (id=' + s.hostId + '):', JSON.stringify(u));

  // Testa o fluxo da resolução: chama o endpoint cost com o STREAMKEY
  const http = require('http');
  const url = 'http://localhost:3000/api/roulette/cost/' + encodeURIComponent(s.streamKey);
  http.get(url, (res) => {
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
      console.log('GET cost via streamKey ->', data);
      process.exit(0);
    });
  }).on('error', (e) => { console.log('ERR', e.message); process.exit(1); });
})();
