import { Client } from 'ssh2';
const PASS = 'MshrUfZrh09hWr#';

const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});

function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='';let err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}

// Remove the broken /sig/ block first (it's inside /rtc/)
let r = await exec(`sed -i '/n    location \\/sig\\//,/    }/d' /etc/nginx/sites-enabled/livego`);

// Now add the proxy before the last } of the server block (port 443)
const proxyBlock = `    location /sig/ {
        proxy_pass http://127.0.0.1:1985/rtc/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

`;

// Read current config
r = await exec('cat /etc/nginx/sites-enabled/livego');
const config = r.out;

// Find the second server block (SSL, port 443) and add before its closing }
let braceCount = 0;
let serverCount = 0;
let insertPos = -1;
const lines = config.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('server {')) {
    serverCount++;
  }
  if (serverCount === 2) {
    // In the SSL server block
    const opens = (lines[i].match(/{/g) || []).length;
    const closes = (lines[i].match(/}/g) || []).length;
    braceCount += opens - closes;
    
    if (braceCount <= 0 && opens === 0 && closes > 0) {
      // This closing } ends the SSL server block - insert before it
      insertPos = i - 1; // Insert before the closing brace... 
      break;
    }
  }
}

if (insertPos > 0) {
  lines.splice(insertPos, 0, proxyBlock);
} else {
  // Fallback: add just before the last } in the file
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === '}') {
      lines.splice(i, 0, proxyBlock);
      break;
    }
  }
}

const newConfig = lines.join('\n');
const b64 = Buffer.from(newConfig, 'utf-8').toString('base64');

r = await exec(`echo "${b64}" | base64 -d > /etc/nginx/sites-enabled/livego`);
console.log('Write:', r.out, r.err);

r = await exec('nginx -t 2>&1');
console.log('Test:', r.out, r.err);

if (!r.err.includes('test failed') && !r.err.includes('emerg')) {
  r = await exec('nginx -s reload 2>&1');
  console.log('✅ Nginx configurado!');
} else {
  console.log('❌ Falha no teste. Restaurando último backup conhecido...');
  // Try to restore from git or another source
  r = await exec('cp /app/frontend/nginx.conf /etc/nginx/sites-enabled/livego 2>/dev/null; nginx -t 2>&1');
  console.log('Restore result:', r.out, r.err);
}

conn.end();
