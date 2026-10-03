// Read-only/denied HTTP probes. No real workspace codes, users, or rows queried.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const env = require('./env.cjs');
const common = fs.readFileSync(path.join(__dirname, '../common.js'), 'utf8');
const publicKey = common.match(/const supabaseKey = '([^']+)'/)?.[1];
if (!publicKey) throw new Error('Browser publishable key unavailable.');
const headers = {apikey: publicKey, Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json'};
const uuid = '00000000-0000-4000-8000-000000000000';
async function probe(label, route, options, check) {
 const response = await fetch(env.SUPABASE_URL + route, {...options, headers: {...headers,...options?.headers}});
 const text = await response.text();
 let body;
 try {body = JSON.parse(text);} catch {body = null;}
 check(response, body);
 console.log(JSON.stringify({label, status: response.status, result: 'PASS'}));
}
(async () => {
 await probe('Auth health unchanged','/auth/v1/health',{},r=>assert.equal(r.ok,true));
 await probe('Unknown workspace pairing returns empty','/rest/v1/rpc/get_workspace_for_pairing',{
  method:'POST',headers:{'Content-Profile':'api'},body:JSON.stringify({p_workspace_code:'__API_SECURITY_PROBE_NOT_A_WORKSPACE__'})
 },(r,b)=>{assert.equal(r.status,200);assert.deepEqual(b,[]);});
 await probe('Unknown employee credential denied','/rest/v1/rpc/get_staff_attendance',{
  method:'POST',headers:{'Content-Profile':'api'},body:JSON.stringify({p_staff_id:uuid,p_device_id:uuid})
 },(r,b)=>{assert.equal(r.status,200);assert.equal(b.ok,false);});
 await probe('Invalid attendance cannot write','/rest/v1/rpc/record_attendance',{
  method:'POST',headers:{'Content-Profile':'api'},body:JSON.stringify({p_staff_id:uuid,p_device_id:null,p_event_type:'in',p_latitude:null,p_longitude:null})
 },(r,b)=>{assert.equal(r.status,200);assert.equal(b[0].ok,false);});
 await probe('Anonymous administrator operation denied','/rest/v1/rpc/get_admin_attendance',{
  method:'POST',headers:{'Content-Profile':'api'},body:JSON.stringify({p_tenant_slug:'__NO_WORKSPACE__'})
 },r=>assert.ok([401,403,404].includes(r.status)));
 for (const route of ['/rest/v1/tenants?select=id&limit=0','/rest/v1/spatial_ref_sys?select=srid&limit=0']) {
  await probe('Raw table not in API',route,{headers:{'Accept-Profile':'api'}},r=>assert.equal(r.status,404));
  await probe('Public schema profile rejected',route,{headers:{'Accept-Profile':'public'}},(r,b)=>{assert.equal(r.status,406);assert.equal(b.code,'PGRST106');});
 }
 await probe('PostGIS function not in API','/rest/v1/rpc/st_makepoint',{
  method:'POST',headers:{'Content-Profile':'api'},body:JSON.stringify({x:0,y:0})
 },r=>assert.equal(r.status,404));
 await probe('GraphQL schema not exposed','/rest/v1/rpc/graphql',{
  method:'POST',headers:{'Content-Profile':'graphql_public'},body:JSON.stringify({query:'{ __typename }'})
 },(r,b)=>{assert.equal(r.status,406);assert.equal(b.code,'PGRST106');});
 await probe('GraphQL gateway cannot expose tables','/graphql/v1',{
  method:'POST',body:JSON.stringify({query:'{ __typename }'})
 },(r,b)=>{assert.ok(r.status>=400 || Array.isArray(b?.errors),'Unexpected usable GraphQL gateway');});
})().catch(error => {console.error(error instanceof assert.AssertionError ? error.message : 'API probe failed. Credentials withheld.');process.exitCode=1;});
