const fs = require('node:fs');
const path = require('node:path');
const { publicFiles } = require('./tools/public-files.cjs');
const root = __dirname;
const dist = path.join(root, 'dist');
// Only the explicit generated output directory is cleaned; source files stay intact.
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw new Error('Invalid output directory');
fs.rmSync(dist, { recursive: true, force: true });
for (const file of publicFiles(root)) {
  const target = path.join(dist, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
process.stdout.write('Perimetrr production files built in dist/. Deploy this directory only.\n');
