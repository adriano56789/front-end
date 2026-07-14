import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();
const action = process.argv[2] || 'exec';
const arg = process.argv[3];

conn.on('ready', () => {
  if (action === 'upload') {
    const localPath = arg;
    const remotePath = process.argv[4];
    conn.sftp((err, sftp) => {
      if (err) { console.error('SFTP ERROR:', err); conn.end(); process.exit(1); }
      sftp.writeFile(remotePath, readFileSync(localPath), (err2) => {
        if (err2) { console.error('UPLOAD ERROR:', err2); conn.end(); process.exit(1); }
        console.log(`Uploaded ${localPath} -> ${remotePath}`);
        conn.end();
      });
    });
  } else {
    conn.exec(arg || 'echo CONNECTED', (err, stream) => {
      if (err) { console.error('EXEC ERROR:', err); conn.end(); process.exit(1); }
      stream.on('close', (code) => { conn.end(); process.exit(code || 0); });
      stream.on('data', (data) => process.stdout.write(data));
      stream.stderr.on('data', (data) => process.stderr.write(data));
    });
  }
}).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  finish(['MshrUfZrh09hWr#']);
}).on('error', (err) => {
  console.error('CONNECTION ERROR:', err.message);
  process.exit(1);
}).connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 20000,
  tryKeyboard: true
});
