const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

const PASSWORD = 'MshrUfZrh09hWr#';
const HOST = '2.25.192.154';
const REMOTE_DIR = '/var/www/livego.store';
const LOCAL_DIR = path.resolve(__dirname, '..', 'dist');

const conn = new Client();

conn.on('ready', () => {
  console.log('[SSH] Conectado!');

  conn.exec('docker ps --format "{{.Names}} {{.Status}}" && echo "---ASSETS---" && ls -la ' + REMOTE_DIR + '/assets/ 2>&1 | head -25 && echo "---INDEX---" && head -5 ' + REMOTE_DIR + '/index.html 2>&1 && echo "---NGINX---" && docker ps --filter "name=nginx" --format "{{.Names}} {{.Status}}"', (err, stream) => {
    if (err) { console.error('exec error:', err); conn.end(); return; }

    let stdout = '';
    let stderr = '';
    stream.on('data', d => { stdout += d.toString(); process.stdout.write(d); });
    stream.stderr.on('data', d => { stderr += d.toString(); process.stderr.write(d); });
    stream.on('close', () => {
      console.log('\n[INFO] Diagnóstico completo. Verificando se precisa deploy...');
      console.log(stdout);

      const assetsNeeded = ['index-Dpl8EjUl.js', 'react-3Y9XYdBH.js', 'index-CFc36G9A.css'];

      if (stdout.includes('No such file') || !stdout.includes('index-Dpl8EjUl.js')) {
        console.log('\n[DEPLOY] Assets faltando no servidor. Fazendo upload do dist...');
        deployDist(conn);
      } else {
        console.log('\n[OK] Assets parecem estar no servidor.');
        conn.end();
      }
    });
  });
}).on('error', (err) => {
  console.error('[SSH] Erro:', err.message);
}).connect({
  host: HOST,
  port: 22,
  username: 'root',
  password: PASSWORD,
  readyTimeout: 30000,
  algorithms: {
    kex: [
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group14-sha256',
      'diffie-hellman-group14-sha1'
    ]
  }
});

function deployDist(conn) {
  const sftpClient = require('ssh2-sftp-client');
  const sftp = new sftpClient();

  sftp.connect({ host: HOST, port: 22, username: 'root', password: PASSWORD, readyTimeout: 30000 })
    .then(() => {
      console.log('[SFTP] Conectado. Fazendo upload de', LOCAL_DIR, '->', REMOTE_DIR);
      return sftp.uploadDir(LOCAL_DIR, REMOTE_DIR, {
        overwrite: true,
        recursive: true
      });
    })
    .then(() => {
      console.log('[SFTP] Upload completo!');
      return sftp.end();
    })
    .then(() => {
      conn.end();
    })
    .catch(err => {
      console.error('[SFTP] Erro:', err.message);
      sftp.end().catch(() => {});
      conn.end();
    });
}
