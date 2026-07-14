import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ CONECTADO COM SUCESSO!');
  conn.exec('echo "Teste OK" && hostname', (err, stream) => {
    if (err) { console.log('❌', err.message); conn.end(); return; }
    let out = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.on('close', () => { console.log('📤', out.trim()); conn.end(); process.exit(0); });
  });
});

conn.on('error', (err) => {
  console.log('❌ Erro:', err.message);
  process.exit(1);
});

conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  console.log('⌨️ keyboard-interactive');
  finish(['MshrUfZrh09hWr#']);
});

console.log('🔌 Conectando...');
conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 15000,
  tryKeyboard: true,
});
