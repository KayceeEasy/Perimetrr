// Private management command. Output is an allowlist: never print jwt_secret.
const env = require('./env.cjs');
const ref = new URL(env.SUPABASE_URL).hostname.split('.')[0];
const modes = new Set(['inspect', 'enable']);
const mode = process.argv[2] || 'inspect';
if (!modes.has(mode)) throw new Error('Use inspect or enable.');
const safeConfig = value => ({
 db_schema: value.db_schema,
 db_extra_search_path: value.db_extra_search_path,
 max_rows: value.max_rows
});
(async () => {
 const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
  method: mode === 'enable' ? 'PATCH' : 'GET',
  headers: {Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json'},
  ...(mode === 'enable' ? {body: JSON.stringify({db_schema: 'api', db_extra_search_path: 'extensions'})} : {})
 });
 const result = await response.json();
 if (!response.ok) {
  console.error(JSON.stringify({status: response.status, message: 'API-schema configuration request failed. Credentials withheld.'}));
  process.exitCode = 1;
  return;
 }
 console.log(JSON.stringify({mode, config: safeConfig(result)}));
})().catch(() => {console.error('Configuration request could not connect. Credentials withheld.'); process.exitCode = 1;});
