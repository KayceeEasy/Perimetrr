// Read-only schema/security inspection. Never prints credentials or customer rows.
const fs = require('node:fs');
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
}
const ref = new URL(env.SUPABASE_URL).hostname.split('.')[0];
const query = `select jsonb_build_object(
  'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type)) from information_schema.columns where table_schema='public'),
  'rls', (select jsonb_agg(jsonb_build_object('table',relname,'enabled',relrowsecurity)) from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'),
  'policies', (select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check)) from pg_policies where schemaname='public'),
  'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definer',prosecdef,'settings',proconfig,'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e'))
) as audit;`;
(async () => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, read_only: true })
  });
  if (!res.ok) { console.error(`Read-only database inspection unavailable (HTTP ${res.status}).`); process.exitCode = 1; return; }
  console.log(JSON.stringify(await res.json()));
})().catch(() => { console.error('Read-only database inspection could not connect.'); process.exitCode = 1; });
