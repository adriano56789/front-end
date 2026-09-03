const fs = require('fs');
const path = require('path');
const dir = '/app/backend/src/services';
const files = ['StreamLifecycleManager.ts','StreamEndConsolidator.ts','ViewerCountManager.ts','SRSReconciler.ts'];
for (const f of files) {
  try {
    let c = fs.readFileSync(path.join(dir, f), 'utf8');
    const before = c;
    c = c.split("require('./models/index')").join('require("../models/index")');
    c = c.split("require('./models')").join('require("../models")');
    c = c.split("require(\"./models/index\")").join('require("../models/index")');
    c = c.split("require(\"./models\")").join('require("../models")');
    if (c !== before) { fs.writeFileSync(path.join(dir, f), c); console.log('FIXED:', f); }
    else console.log('OK:', f);
  } catch(e) { console.log('SKIP:', f, e.message); }
}
console.log('DONE');
