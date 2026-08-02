// Copia os assets do MediaPipe (wasm do tasks-vision) para public/wasm
// para que o Vite os sirva/serialize no build do frontend.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDest = join(root, 'public', 'wasm');

if (!existsSync(wasmSrc)) {
  console.error('❌ @mediapipe/tasks-vision não encontrado. Rode `npm install` primeiro.');
  process.exit(1);
}

mkdirSync(wasmDest, { recursive: true });

const files = readdirSync(wasmSrc);
let copied = 0;
for (const file of files) {
  if (!/\.(js|wasm)$/.test(file)) continue;
  copyFileSync(join(wasmSrc, file), join(wasmDest, file));
  copied++;
}

console.log(`✅ MediaPipe wasm sincronizado para public/wasm (${copied} arquivos)`);
