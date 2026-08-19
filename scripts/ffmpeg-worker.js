// FFmpeg Worker — HTTP server for FFmpeg transcoding
// Runs inside the app-ffmpeg container (node:20-alpine with ffmpeg installed)
// Deployed at /app/ffmpeg-worker.js on the VPS (bind-mounted into the container)

const http = require('http');
const { spawn, execSync } = require('child_process');

const PORT = 5000;

function ensureFfmpeg() {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); } catch {
    console.log('Installing ffmpeg...');
    execSync('apk add --no-cache ffmpeg', { stdio: 'inherit' });
  }
}

const processes = new Map();

// 🛡️ Proteção de CPU: acima deste nº de transcodes simultâneos, pula o ladder
// (mantém só o transcode base) para não sobrecarregar o servidor.
const MAX_LADDER_JOBS = 4;

// 🪫 Ladder padrão de qualidades leves (economia de dados/bateria dos espectadores).
// Cada tier gera uma stream extra no SRS: {streamKey}_t360 e {streamKey}_t240.
// O app escolhe a URL WHEP do tier conforme a velocidade da rede do espectador.
// Formato: "ALTURA:bitrate_kbps" separado por vírgula. Ex: "360:500,240:300"
const DEFAULT_LADDER = [
  { height: 540, bitrate: 1500 },
  { height: 360, bitrate: 800 },
  { height: 240, bitrate: 400 },
];

function parseLadder(ladder) {
  if (!Array.isArray(ladder) || ladder.length === 0) return DEFAULT_LADDER;
  const parsed = ladder
    .map((t) => ({
      height: parseInt(t.height, 10),
      bitrate: parseInt(t.bitrate, 10),
    }))
    .filter((t) => t.height > 0 && t.bitrate > 0);
  return parsed.length > 0 ? parsed : DEFAULT_LADDER;
}

function buildTierArgs(streamKey, tier, fps) {
  return [
    '-map', '0:v:0',
    '-map', '0:a:0',
    // 🎨 Espaço de cor BT.709 explícito: a stream H264 do WebRTC (libwebrtc)
    // costuma vir SEM metadado de cor no SPS. O FFmpeg assume BT.601 nesse caso
    // e o libx264 re-marca o tier 360/240 como BT.601 → o player aplica matriz
    // de conversão errada → TOM AMARELADO. Forçando BT.709 na entrada e saída
    // o matiz fica consistente (cores vivas, sem amarelado).
    '-vf', 'scale=-2:' + tier.height + ',format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'faster',
    '-tune', 'zerolatency',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-b:v', tier.bitrate + 'k',
    '-maxrate', Math.round(tier.bitrate * 1.2) + 'k',
    '-bufsize', (tier.bitrate * 2) + 'k',
    '-r', String(fps),
    '-g', String(fps * 2),
    '-af', 'aresample=async=1:first_pts=0',
    '-c:a', 'aac',
    '-b:a', '64k',
    '-ar', '48000',
    '-ac', '2',
    '-f', 'flv',
    'rtmp://srs:1935/live/' + streamKey + '_t' + tier.height,
  ];
}

function startTranscode(streamKey, preset, filters, ladder) {
  preset = preset || {};
  filters = filters || {};
  ladder = parseLadder(ladder);
  if (processes.size >= MAX_LADDER_JOBS) {
    console.log('⚠️ ' + processes.size + ' transcodes ativos — pulando ladder para ' + streamKey + ' (proteção de CPU)');
    ladder = [];
  }
  if (processes.has(streamKey)) {
    stopTranscode(streamKey);
  }

  const inputUrl = 'rtmp://srs:1935/live/' + streamKey;
  const outputUrl = 'rtmp://srs:1935/live/' + streamKey + '_transcoded';

  // Audio fixes for the buzz/static issue (SRS rtc->rtmp produces non-monotonic DTS):
  // - use_wallclock_as_timestamps: rebuild monotonic timestamps from wall-clock
  // - aresample=async=1:first_pts=0: fill gaps / drop overlaps, normalize audio start
  // 🎨 Cor BT.709 explícita na ENTRADA: sem isso o FFmpeg assume BT.601 (SD) para
  // streams H264 sem metadado de cor e o libx264 re-marca a saída como BT.601 →
  // matriz YUV→RGB errada no player → TOM AMARELADO nas streams transcodificadas.
  const args = [
    '-fflags', 'nobuffer+genpts',
    '-use_wallclock_as_timestamps', '1',
    '-color_range', 'tv',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-i', inputUrl
  ];

  if (filters && filters.watermarkEnabled) {
    const pos = filters.watermarkPosition || 'top-right';
    var x, y;
    if (pos.indexOf('right') >= 0) { x = 'W-w-10'; } else { x = '10'; }
    if (pos.indexOf('bottom') >= 0) { y = 'H-h-10'; } else { y = '10'; }
    args.push('-vf', 'drawtext=text=\'' + (filters.watermarkText || '') + '\':x=' + x + ':y=' + y + ':fontsize=24:fontcolor=white');
  }

  // Output base (compatibilidade): {streamKey}_transcoded
  args.push(
    '-map', '0:v:0',
    '-map', '0:a:0',
    '-c:v', preset.videoCodec || 'libx264',
    '-preset', 'veryfast',
    // 🎨 BT.709 explícito na saída base (stream _transcoded) — mesma lógica dos
    // tiers: evita o TOM AMARELADO por matriz de cor errada (BT.601 vs BT.709).
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-b:v', (preset.videoBitrate || 4000) + 'k',
    '-maxrate', Math.round((preset.videoBitrate || 4000) * 1.3) + 'k',
    '-bufsize', ((preset.videoBitrate || 4000) * 2) + 'k',
    '-r', String(preset.fps || 30),
    '-g', String((preset.fps || 30) * 2),
    '-af', 'aresample=async=1:first_pts=0',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-f', 'flv',
    outputUrl
  );

  // 🪫 Ladder de qualidades leves: um único processo FFmpeg gera TODOS os
  // tiers (lê a stream 1x, re-encode cada resolução, publica no SRS).
  // Fonte de economia de dados: espectadores em rede lenta jogam nos tiers.
  const fps = preset.fps || 30;
  ladder.forEach((tier) => {
    args.push.apply(args, buildTierArgs(streamKey, tier, fps));
  });

  console.log('Starting FFmpeg for ' + streamKey + ': ffmpeg ' + args.join(' '));
  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  processes.set(streamKey, proc);

  proc.stdout.on('data', function(d) { process.stdout.write('[' + streamKey + '] ' + d); });
  proc.stderr.on('data', function(d) { process.stderr.write('[' + streamKey + '] ' + d); });
  proc.on('exit', function(code) {
    console.log('FFmpeg for ' + streamKey + ' exited with code ' + code);
    processes.delete(streamKey);
  });
}

function stopTranscode(streamKey) {
  var proc = processes.get(streamKey);
  if (proc) {
    proc.kill('SIGTERM');
    setTimeout(function() { try { proc.kill('SIGKILL'); } catch(e) {} }, 5000);
    processes.delete(streamKey);
  }
}

ensureFfmpeg();

var server = http.createServer(function(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/transcode/start') {
    var body = '';
    req.on('data', function(c) { body += c; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        startTranscode(data.streamKey, data.preset || data.options, data.filters, data.ladder);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/transcode/stop') {
    var body = '';
    req.on('data', function(c) { body += c; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        stopTranscode(data.streamKey);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/health') {
    res.end(JSON.stringify({ status: 'ok', activeStreams: Array.from(processes.keys()) }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '0.0.0.0', function() {
  console.log('FFmpeg worker listening on port ' + PORT);
});
