// Pós-instalação do open-makeup-sdk: propaga `cameraClass` e `faceMeshClass`
// do construtor do OpenMakeup para o MakeupEngine (o engine já suporta, mas o
// wrapper OpenMakeup ignorava esses dois campos).
//
// Por quê: o app injeta o TrackCameraShim (cameraClass) para alimentar o
// FaceMesh com a MESMA track crua do pipeline de beleza (sem 2ª sessão de
// câmera), e o window.FaceMesh (faceMeshClass) via <script>. Como o OpenMakeup
// dropava essas opções, o engine caía no fallback window.Camera — que nunca é
// carregado — e o SDK lançava "MediaPipe Camera not found", deixando o canvas
// de maquiagem inativo e a câmera "crua" na transmissão.
//
// Idempotente: marca o arquivo com um comentário sentinela e não faz nada se
// já estiver aplicado.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'node_modules', 'open-makeup-sdk', 'src', 'OpenMakeup.js');

const MARK = '// [patched by scripts/patch-openmakeup-sdk.mjs]';

if (!existsSync(file)) {
  console.warn('[patch-openmakeup-sdk] open-makeup-sdk não encontrado — nada a fazer.');
  process.exit(0);
}

const src = readFileSync(file, 'utf8');

if (src.includes(MARK)) {
  console.log('[patch-openmakeup-sdk] patch já aplicado.');
  process.exit(0);
}

const from = [
  '      video, renderCanvas, overlayCanvas,\n      assetsBaseUrl, mediapipeBaseUrl, faceMesh, camera,\n      defaults = {}, aiColor = null,\n    } = options;',
  '    this.engine = new MakeupEngine({\n      video, renderCanvas, overlayCanvas,\n      assetsBaseUrl, mediapipeBaseUrl, faceMesh, camera,\n    });',
];
const to = [
  '      video, renderCanvas, overlayCanvas,\n      assetsBaseUrl, mediapipeBaseUrl, faceMesh, camera,\n      cameraClass, faceMeshClass,\n      defaults = {}, aiColor = null,\n    } = options;',
  '    this.engine = new MakeupEngine({\n      video, renderCanvas, overlayCanvas,\n      assetsBaseUrl, mediapipeBaseUrl, faceMesh, camera,\n      cameraClass, faceMeshClass, // ' + MARK.slice(2) + '\n    });',
];

let patched = src;
for (let i = 0; i < from.length; i++) {
  if (!patched.includes(from[i])) {
    console.error(`[patch-openmakeup-sdk] trecho ${i + 1} não encontrado — SDK mudou?`);
    process.exit(1);
  }
  patched = patched.replace(from[i], to[i]);
}

writeFileSync(file, patched);
console.log('[patch-openmakeup-sdk] OpenMakeup.js patcheado (cameraClass/faceMeshClass agora chegam ao engine).');