// Copia os assets do OpenMakeupSDK (shaders, modelos 3D, padrões de maquiagem)
// e o runtime do @mediapipe/face_mesh para public/, para que o Vite os sirva no
// build (o mesmo padrão do scripts/copy-mediapipe-assets.mjs).
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');

const sdkSrc = join(nm, 'open-makeup-sdk', 'assets');
const sdkDest = join(root, 'public', 'openmakeup');

const faceMeshSrc = join(nm, '@mediapipe', 'face_mesh');
const faceMeshDest = join(root, 'public', 'mediapipe', 'face_mesh');

const cameraUtilsSrc = join(nm, '@mediapipe', 'camera_utils');
const cameraUtilsDest = join(root, 'public', 'mediapipe', 'camera_utils');

const SKIP_AT_DEST = new Set(['package.json', 'README.md', 'index.d.ts', 'LICENSE']);

const ensureCleanDest = (dest) => {
  mkdirSync(dest, { recursive: true });
  for (const entry of SKIP_AT_DEST) {
    rmSync(join(dest, 'package.json'), { recursive: true, force: true });
    rmSync(join(dest, 'README.md'), { recursive: true, force: true });
    rmSync(join(dest, 'index.d.ts'), { recursive: true, force: true });
    rmSync(join(dest, 'LICENSE'), { recursive: true, force: true });
  }
};

const copy = (src, dest) => {
  if (!existsSync(src)) {
    console.error(`❌ OpenMakeup assets não encontrados em ${src}. Rode \`npm install\` primeiro.`);
    process.exit(1);
  }
  ensureCleanDest(dest);
  cpSync(src, dest, { recursive: true });
};

copy(sdkSrc, sdkDest);
copy(faceMeshSrc, faceMeshDest);
copy(cameraUtilsSrc, cameraUtilsDest);

console.log('✅ OpenMakeupSDK + mediapipe/face_mesh sincronizados para public/');