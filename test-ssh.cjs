const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conectado');
  conn.exec('whoami && hostname && pwd', (err, stream) => {
    stream.on('close', () => conn.end());
    stream.stdout.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
  });
});

conn.on('error', (err) => {
  console.error('❌ Erro:', err.message, err.level);
});

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  console.log('键盘交互:', prompts);
  finish(['MshrUfZrh09hWr#']);
});

conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  tryKeyboard: true,
  readyTimeout: 15000,
});
