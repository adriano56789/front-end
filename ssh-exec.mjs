import { Client } from 'ssh2';

const conn = new Client();

const cmd = process.argv[2] || 'echo CONNECTED && hostname';

conn.on('ready', () => {
  console.log('SSH CONNECTED!');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('EXEC ERROR:', err); conn.end(); process.exit(1); }
    stream.on('close', (code) => { conn.end(); process.exit(code || 0); });
    stream.on('data', (data) => process.stdout.write(data));
    stream.stderr.on('data', (data) => process.stderr.write(data));
  });
}).on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  console.log('Keyboard-interactive auth:', name);
  finish(['MshrUfZrh09hWr#']);
}).on('error', (err) => {
  console.error('CONNECTION ERROR:', err.message, err.level);
  process.exit(1);
}).connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 20000,
  tryKeyboard: true
});
