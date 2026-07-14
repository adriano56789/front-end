const fs = require('fs');
let content = fs.readFileSync('/app/backend/socket.js', 'utf8');

// Check if already patched
if (content.includes('const localIo = io;')) {
  console.log('Already patched!');
  process.exit(0);
}

// Step 1: After 'io = new socket_io_1.Server(server, { ... });', add local reference
const serverCreate = content.indexOf('io = new socket_io_1.Server(server, {');
if (serverCreate < 0) {
  console.error('Could not find Server creation');
  process.exit(1);
}

const serverEnd = content.indexOf('});', serverCreate + 30);
if (serverEnd < 0) {
  console.error('Could not find Server constructor end');
  process.exit(1);
}

const insertPoint = serverEnd + 3;
const localIoDecl = '\n    const localIo = io;';
content = content.slice(0, insertPoint) + localIoDecl + content.slice(insertPoint);

// Step 2: Find the io.on('connection') handler and replace io. references within it
const connStart = content.indexOf("io.on('connection', (socket) => {");
const exportsIdx = content.indexOf('exports.initSocket = initSocket;');

if (connStart < 0) {
  console.error('Could not find connection handler');
  process.exit(1);
}

let before = content.substring(0, connStart);
let middle = content.substring(connStart, exportsIdx);
let after = content.substring(exportsIdx);

// Count before
const ioToBefore = (middle.match(/\bio\.to\(/g) || []).length;
const ioEmitBefore = (middle.match(/\bio\.emit\(/g) || []).length;

// Replace io.to( with localIo.to( and io.emit( with localIo.emit( in the handler
middle = middle.replace(/\bio\.to\(/g, 'localIo.to(');
middle = middle.replace(/\bio\.emit\(/g, 'localIo.emit(');

content = before + middle + after;

fs.writeFileSync('/app/backend/socket.js', content);

const ioToAfter = (middle.match(/\bio\.to\(/g) || []).length;
const ioEmitAfter = (middle.match(/\bio\.emit\(/g) || []).length;
console.log('socket.js patched successfully!');
console.log('io.to replaced:', ioToBefore, '-> remaining:', ioToAfter);
console.log('io.emit replaced:', ioEmitBefore, '-> remaining:', ioEmitAfter);
console.log('localIo.to:', (content.match(/localIo\.to\(/g) || []).length);
console.log('localIo.emit:', (content.match(/localIo\.emit\(/g) || []).length);
