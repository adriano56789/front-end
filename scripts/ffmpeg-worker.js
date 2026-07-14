// =============================================================================
// FFmpeg Worker — Simple HTTP Server for FFmpeg Transcoding
// Rodando dentro do container app-ffmpeg (node:20-alpine com ffmpeg instalado)
// =============================================================================

const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 5000;

// ── Store active FFmpeg processes ──
const activeProcesses = new Map();

// ── Helper: Execute FFmpeg command ──
function runFfmpeg(commandString, streamId) {
  return new Promise((resolve, reject) => {
    // Kill existing process for same stream if any
    if (activeProcesses.has(streamId)) {
      activeProcesses.get(streamId).kill('SIGTERM');
      activeProcesses.delete(streamId);
    }

    const args = commandString.split(' ').slice(1); // Remove 'ffmpeg' from args
    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    activeProcesses.set(streamId, proc);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      activeProcesses.delete(streamId);
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      activeProcesses.delete(streamId);
      reject(err);
    });

    // Return immediately — ffmpeg runs in background
    resolve({ success: true, pid: proc.pid, message: 'FFmpeg started' });
  });
}

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Health check ──
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      ffmpeg: await checkFfmpeg(),
      activeProcesses: activeProcesses.size,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // ── List active processes ──
  if (req.method === 'GET' && req.url === '/processes') {
    const processes = [];
    activeProcesses.forEach((proc, id) => {
      processes.push({ streamId: id, pid: proc.pid, running: !proc.killed });
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ processes }));
    return;
  }

  // ── Start transcode ──
  if (req.method === 'POST' && req.url === '/transcode') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { streamId, commandString } = JSON.parse(body);
        if (!streamId || !commandString) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'streamId and commandString required' }));
          return;
        }

        const result = await runFfmpeg(commandString, streamId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── Stop transcode ──
  if (req.method === 'POST' && req.url?.startsWith('/stop/')) {
    const streamId = req.url.split('/stop/')[1];
    if (activeProcesses.has(streamId)) {
      activeProcesses.get(streamId).kill('SIGTERM');
      activeProcesses.delete(streamId);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: `Stream ${streamId} stopped` }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: `No active process for stream ${streamId}` }));
    }
    return;
  }

  // ── 404 ──
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ── Check if ffmpeg is available ──
function checkFfmpeg() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('close', (code) => {
      resolve({ available: code === 0, version: output.split('\n')[0] || 'unknown' });
    });
    proc.on('error', () => resolve({ available: false }));
  });
}

// ── Start ──
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[FFmpeg-Worker] Server running on port ${PORT}`);
  checkFfmpeg().then((result) => {
    console.log(`[FFmpeg-Worker] FFmpeg available: ${result.available}`);
    if (result.available) console.log(`[FFmpeg-Worker] Version: ${result.version}`);
  });
});
