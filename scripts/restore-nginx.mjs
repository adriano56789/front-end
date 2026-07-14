import { Client } from 'ssh2';
const PASS = 'MshrUfZrh09hWr#';

const conn = new Client();
conn.on('keyboard-interactive',(n,i,l,p,f)=>f([PASS]));
await new Promise((ok,err)=>{conn.on('ready',ok);conn.on('error',err);conn.connect({host:'2.25.192.154',port:22,username:'root',password:PASS,readyTimeout:15000,tryKeyboard:true});});

function exec(cmd){return new Promise((res,rej)=>{conn.exec(cmd,(e,st)=>{if(e)return rej(e);let out='',err='';st.on('data',d=>out+=d.toString());st.stderr.on('data',d=>err+=d.toString());st.on('close',()=>res({out,err}));});});}

// Read the CURRENT corrupted config
let r = await exec('cat /etc/nginx/sites-enabled/livego');
const config = r.out;

// Remove lines from "location /rtc/ {" to its closing "}"
// Then add correct /rtc/ block followed by /sig/ block
const lines = config.split('\n');
let newLines = [];
let skip = false;
let bracketCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('location /rtc/ {')) {
    // Replace this block + nested /sig/ with the correct version
    newLines.push('    location /rtc/ {');
    newLines.push('        proxy_pass http://127.0.0.1:1985/rtc/;');
    newLines.push('        proxy_http_version 1.1;');
    newLines.push('        proxy_set_header Upgrade $http_upgrade;');
    newLines.push('        proxy_set_header Connection "upgrade";');
    newLines.push('        proxy_set_header Host $host;');
    newLines.push('        proxy_set_header X-Real-IP $remote_addr;');
    newLines.push('        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
    newLines.push('        proxy_set_header X-Forwarded-Proto $scheme;');
    newLines.push('        proxy_buffering off;');
    newLines.push('        proxy_read_timeout 60s;');
    newLines.push('        proxy_send_timeout 60s;');
    newLines.push('    }');
    newLines.push('');
    newLines.push('    # WebRTC Signaling via WebSocket');
    newLines.push('    location /sig/ {');
    newLines.push('        proxy_pass http://127.0.0.1:1985/rtc/;');
    newLines.push('        proxy_http_version 1.1;');
    newLines.push('        proxy_set_header Upgrade $http_upgrade;');
    newLines.push('        proxy_set_header Connection "upgrade";');
    newLines.push('        proxy_set_header Host $host;');
    newLines.push('        proxy_set_header X-Real-IP $remote_addr;');
    newLines.push('        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
    newLines.push('        proxy_set_header X-Forwarded-Proto $scheme;');
    newLines.push('        proxy_read_timeout 86400s;');
    newLines.push('        proxy_send_timeout 86400s;');
    newLines.push('    }');
    
    // Skip lines until /rtc/ block ends
    skip = true;
    bracketCount = 1;
    continue;
  }
  
  if (skip) {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    bracketCount += opens - closes;
    if (bracketCount <= 0) {
      skip = false;
    }
    continue;
  }
  
  // Skip the orphaned /sig/ blocks (they have no opening '{' on the same line)
  if (line.trim().startsWith('location /sig/') || line.trim().startsWith('n    location /sig/')) {
    skip = true;
    bracketCount = 1;
    continue;
  }
  if (skip) {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    bracketCount += opens - closes;
    if (bracketCount <= 0) {
      skip = false;
    }
    continue;
  }
  
  newLines.push(line);
}

const newConfig = newLines.join('\n');
const b64 = Buffer.from(newConfig, 'utf-8').toString('base64');

r = await exec(`echo "${b64}" | base64 -d > /etc/nginx/sites-enabled/livego`);
console.log('Write:', r.out, r.err);

r = await exec('nginx -t 2>&1');
console.log('Test:', r.out, r.err);

if (!r.err.includes('test failed') && !r.err.includes('emerg')) {
  r = await exec('nginx -s reload 2>&1');
  console.log('✅ Nginx configurado com /rtc/ e /sig/!');
} else {
  console.log('❌ Ainda com erro');
}

conn.end();
