import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ CONECTADO COM SUCESSO!');
  conn.exec('echo "Teste de conexao OK"', (err, stream) => {
    if (err) {
      console.log('❌ Erro ao executar comando:', err.message);
      conn.end();
      return;
    }
    let output = '';
    stream.on('data', (data) => { output += data.toString(); });
    stream.on('close', () => {
      console.log('📤 Output:', output.trim());
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.log('❌ Erro:', err.message);
  console.log('Código:', err.code || 'N/A');
  console.log('Nível:', err.level || 'N/A');
  process.exit(1);
});

conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
  console.log('⌨️ Keyboard-interactive solicitado');
  console.log('Prompts:', JSON.stringify(prompts));
  finish(['MshrUfZrh09hWr#']);
});

console.log('🔌 Conectando a 2.25.192.154...');
conn.connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  password: 'MshrUfZrh09hWr#',
  readyTimeout: 15000,
  tryKeyboard: true,
  authHandler: (methodsLeft, partialSuccess, callback) => {
    console.log('🔑 Métodos de autenticação disponíveis:', methodsLeft);
    console.log('🟡 Partial success:', partialSuccess);
    if (methodsLeft.includes('password')) {
      callback({ type: 'password', username: 'root', password: 'MshrUfZrh09hWr#' });
    } else if (methodsLeft.includes('keyboard-interactive')) {
      callback({ type: 'keyboard-interactive', username: 'root' });
    } else {
      console.log('❌ Nenhum método de autenticação suportado:', methodsLeft);
      callback(new Error('No supported auth methods'));
    }
  },
  debug: (msg) => console.log('🐛', msg)
});
