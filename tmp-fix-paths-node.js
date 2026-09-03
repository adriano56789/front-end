const fs = require('fs');
const path = require('path');

const dir = '/app/src/services';
const files = [
  'StreamLifecycleManager.ts',
  'StreamEndConsolidator.ts',
  'ViewerCountManager.ts',
  'SRSReconciler.ts',
];

for (const f of files) {
  const fp = path.join(dir, f);
  try {
    let c = fs.readFileSync(fp, 'utf8');
    const before = c;
    // Fix all variations of require path
    c = c.replace(/require\(['"]\.\/models\/index['"]\)/g, 'require("../models/index")');
    c = c.replace(/require\(['"]\.\/models['"]\)/g, 'require("../models")');
    if (c !== before) {
      fs.writeFileSync(fp, c);
      console.log('FIXED:', f);
    } else {
      console.log('OK (no change):', f);
    }
  } catch (e) {
    console.log('SKIP:', f, e.message);
  }
}
console.log('ALL_DONE');
