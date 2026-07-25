const { Client } = require('ssh2');
const c = new Client();

c.on('ready', () => {
  console.log('CONNECTED');
  c.exec('hostname && date', (err, stream) => {
    if (err) { console.error('exec err:', err); c.end(); return; }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', () => c.end());
  });
}).on('error', (err) => {
  console.error('ERROR:', err.message);
}).on('keyboard-interactive', (n, i, il, prompts, finish) => {
  finish(prompts.map(() => 'MshrUfZrh09hWr#'));
}).connect({
  host: '2.25.192.154',
  port: 22,
  username: 'root',
  tryKeyboard: true,
  readyTimeout: 10000,
  connTimeout: 10000,
});

setTimeout(() => { console.log('SCRIPT_TIMEOUT'); process.exit(1); }, 20000);
