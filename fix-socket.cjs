const fs = require('fs');

// Read socket.js from VPS via ssh-exec
// But we already have the content... we need to do this differently.
// Let me create a script that will be SCP'd to the VPS and run there.

const script = `
const fs = require('fs');
let content = fs.readFileSync('/app/backend/socket.js', 'utf8');

// Step 1: After 'io = new socket_io_1.Server(server, { ... });', add local reference
// Find the line 'io = new socket_io_1.Server(server, {' and its closing '});'
const serverCreate = content.indexOf('io = new socket_io_1.Server(server, {');
if (serverCreate < 0) {
    console.error('Could not find Server creation');
    process.exit(1);
}

// Find the closing }); of the Server constructor
const serverEnd = content.indexOf('});', serverCreate + 30);
if (serverEnd < 0) {
    console.error('Could not find Server constructor end');
    process.exit(1);
}

// Add localIo right after Server creation
const insertPoint = serverEnd + 3;
const localIoDecl = '\\n    const localIo = io;';
if (!content.includes('const localIo = io;')) {
    content = content.slice(0, insertPoint) + localIoDecl + content.slice(insertPoint);
}

// Step 2: Find the io.on('connection') handler and replace io. references within it
const connStart = content.indexOf("io.on('connection', (socket) => {");
const exportsIdx = content.indexOf('exports.initSocket = initSocket;');

if (connStart < 0) {
    console.error('Could not find connection handler');
    process.exit(1);
}

// Only replace within the connection handler
let before = content.substring(0, connStart);
let middle = content.substring(connStart, exportsIdx);
let after = content.substring(exportsIdx);

// Replace io.to( with localIo.to( and io.emit( with localIo.emit( in the handler
middle = middle.replace(/\\bio\\.to\\(/g, 'localIo.to(');
middle = middle.replace(/\\bio\\.emit\\(/g, 'localIo.emit(');

content = before + middle + after;

fs.writeFileSync('/app/backend/socket.js', content);
console.log('socket.js patched successfully!');
console.log('localIo declarations:', (content.match(/const localIo = io;/g) || []).length);
console.log('localIo.to replacements:', (content.match(/localIo\\.to\\(/g) || []).length);
console.log('localIo.emit replacements:', (content.match(/localIo\\.emit\\(/g) || []).length);
console.log('Remaining io.to in handlers:', (middle.match(/\\bio\\.to\\(/g) || []).length);
console.log('Remaining io.emit in handlers:', (middle.match(/\\bio\\.emit\\(/g) || []).length);
`;

fs.writeFileSync('fix-socket-vps.js', script);
console.log('Script written to fix-socket-vps.js');
