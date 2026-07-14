import { Client } from 'ssh2';
import { writeFileSync } from 'fs';
const PASS = 'MshrUfZrh09hWr#';

const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});

function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='',err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}

// Read current nginx config
let r = await exec('cat /etc/nginx/sites-enabled/livego');
const config = r.out;

// Find the last location block before the server block closes
// Add /sig/ proxy before the closing } of the server block
const proxyBlock = `
    location /sig/ {
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

// Find the SSL server block (port 443) and add the proxy before it
const lines = config.split('\n');
let sslBlockStart = -1;
let sslBlockEnd = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('listen 443') || lines[i].includes('listen [::]:443')) {
    sslBlockStart = i;
    // Count braces to find the end
    braceCount = 0;
    let foundStart = false;
    for (let j = i; j >= 0; j--) {
      if (lines[j].includes('{')) { sslBlockStart = j; break; }
    }
    for (let j = sslBlockStart; j < lines.length; j++) {
      const opens = (lines[j].match(/{/g) || []).length;
      const closes = (lines[j].match(/}/g) || []).length;
      braceCount += opens - closes;
      if (braceCount <= 0 && j > sslBlockStart) {
        sslBlockEnd = j;
        break;
      }
    }
    break;
  }
}

if (sslBlockEnd > 0) {
  // Insert proxy block before the last closing brace of SSL block
  // Find the closing } of the server block
  let insertPos = sslBlockEnd;
  // Go backwards from the end to find where to insert
  lines.splice(insertPos, 0, proxyBlock);
  
  const newConfig = lines.join('\n');
  
  // Write via SSH using base64
  const b64 = Buffer.from(newConfig, 'utf-8').toString('base64');
  r = await exec(`echo "${b64}" | base64 -d > /etc/nginx/sites-enabled/livego`);
  console.log('Write result:', r.out, r.err);
  
  r = await exec('nginx -t 2>&1');
  console.log('nginx test:', r.out, r.err);
  
  if (r.err.includes('test failed') || r.err.includes('emerg')) {
    console.log('❌ Config incorreta, restaurando...');
    // Restore logic here if needed
  } else {
    r = await exec('nginx -s reload 2>&1');
    console.log('nginx reload:', r.out, r.err);
    console.log('✅ Nginx configurado com proxy /sig/ → SRS');
  }
} else {
  console.log('❌ SSL block not found');
}

conn.end();
