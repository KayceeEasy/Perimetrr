// Private management utility; SQL files are never included in the public build.
const fs = require('node:fs');
const path = require('node:path');
const env = require('./env.cjs');
const files = process.argv.slice(2).filter(arg => arg.endsWith('.sql'));
if (!files.length) throw new Error('Supply reviewed SQL files. Default mode is read-only.');
const root = path.resolve(__dirname, '..');
let query = files.map(file => {
 const target = path.resolve(root, file);
 if (!target.startsWith(root + path.sep)) throw new Error('SQL must be inside this workspace.');
 return fs.readFileSync(target, 'utf8');
}).join('\n');
if (process.argv.includes('--atomic')) {
 query = 'begin;\n' + query.replace(/^\s*(?:begin|commit);\s*$/gim, '') + '\n' + (process.argv.includes('--check') ? 'rollback;' : 'commit;');
}
const apply = process.argv.includes('--apply');
(async () => {
  const ref = new URL(env.SUPABASE_URL).hostname.split('.')[0];
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({query, read_only: !apply})
  });
  const body = await res.json();
  if (!res.ok) { console.error(JSON.stringify({status: res.status, error: body})); process.exitCode = 1; return; }
  console.log(JSON.stringify(body));
})().catch(() => { console.error('Database request could not connect. No credentials printed.'); process.exitCode = 1; });
