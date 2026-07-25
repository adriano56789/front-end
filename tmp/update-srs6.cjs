const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const conf = fs.readFileSync(path.join(__dirname, 'srs-new.conf'), 'utf8');
const b64 = Buffer.from(conf).toString('base64');

const script = `
import base64, sys
data = base64.b64decode("${b64}")
with open("/app/srs-docker.conf", "wb") as f:
    f.write(data)
print("CONFIG_WRITTEN")
print(f"Size: {len(data)} bytes")
`;

fs.writeFileSync(path.join(__dirname, 'write-srs.py'), script);

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH CONNECTED');
  
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP:', err); conn.end(); process.exit(1); return; }
    
    // Upload the python script
    sftp.fastPut(
      path.join(__dirname, 'write-srs.py'),
      '/tmp/write-srs.py',
      (err) => {
        if (err) { console.error('SFTP upload:', err); conn.end(); process.exit(1); return; }
        console.log('Script uploaded');
        
        conn.exec('python3 /tmp/write-srs.py && grep hls_dispose /app/srs-docker.conf && docker restart app-srs && sleep 3 && docker ps --filter name=app-srs --format "{{.Status}}" && echo ALL_DONE', (err2, stream) => {
          if (err2) { console.error('exec:', err2); conn.end(); process.exit(1); return; }
          let out = '';
          stream.stdout.on('data', (d) => { out += d.toString(); });
          stream.stderr.on('data', (d) => { out += 'STDERR: ' + d.toString(); });
          stream.on('close', (code) => {
            console.log(out);
            console.log('Exit code:', code);
            conn.end();
            process.exit(0);
          });
        });
      }
    );
  });
});

conn.on('error', (err) => {
  console.error('SSH ERROR:', err.message);
  process.exit(1);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  readyTimeout: 15000,
  tryKeyboard: true
});

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
});
