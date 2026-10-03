const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {webcrypto}=require('node:crypto');
const {publicFiles}=require('../tools/public-files.cjs');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const pages=publicFiles(root).filter(f=>f.endsWith('.html'));
function sandbox(client){
 const values=new Map(),connections=[],store={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const context={console,URL,URLSearchParams,TextEncoder,Uint8Array,crypto:webcrypto,Intl,Date,localStorage:store,sessionStorage:store,navigator:{language:'en-US',onLine:true},setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},location:{search:'',pathname:'/',origin:'http://localhost'},addEventListener:()=>{},matchMedia:()=>({matches:false})};
 context.document={readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],documentElement:{getAttribute:()=>null,setAttribute:()=>{}},body:{classList:{add:()=>{},remove:()=>{}}}};
 context.window=context;
 if(client)context.supabase={createClient:(...args)=>{connections.push(args);return client}};
 vm.createContext(context);vm.runInContext(read('common.js'),context);
 return {context,store,connections};
}
test('all public JavaScript and static handlers parse; assets, IDs and alt text are valid',()=>{
 const report=JSON.parse(execFileSync(process.execPath,['tools/audit-static.cjs'],{cwd:root,encoding:'utf8'}));
 assert.deepEqual(report.issues,[]);
});
test('all public pages have unique titles, descriptions, canonical URLs and social metadata',()=>{
 const titles=new Set(),descriptions=new Set(),canonicals=new Set();
 for(const page of pages){const s=read(page);
  const title=s.match(/<title>(.*?)<\/title>/s)?.[1],description=s.match(/<meta name="description"\s+content="([^"]+)"/)?.[1],canonical=s.match(/<link rel="canonical"\s+href="([^"]+)"/)?.[1];
  assert.ok(title&&description&&canonical,page);titles.add(title);descriptions.add(description);canonicals.add(canonical);
  for(const field of ['og:title','og:description','og:image','og:url','twitter:card','twitter:image'])assert.ok(s.includes(`"${field}"`),`${page}: ${field}`);
  assert.match(s,/<html lang="en">/);assert.match(s,/rel="icon"/);assert.match(s,/apple-touch-icon\.png/);assert.doesNotMatch(s,/user-scalable=no|maximum-scale=1/);
 }
 assert.equal(titles.size,pages.length);assert.equal(descriptions.size,pages.length);assert.equal(canonicals.size,pages.length);
});
test('social preview and Apple icon are correctly sized PNGs',()=>{
 for(const [file,width,height] of [['image/social-preview.png',1200,630],['image/apple-touch-icon.png',180,180]]){
  const png=fs.readFileSync(path.join(root,file));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
 }
});
test('publish allowlist excludes credentials, diagnostics, database files and dependencies',()=>{
 const files=publicFiles(root);
 for(const forbidden of ['.env.local','.mcp.json','get_db.js','get_project.js','openapi.json','run_sql_api2.js','security-hardening.sql','tools/env.cjs','package.json'])assert.ok(!files.includes(forbidden),forbidden);
 assert.ok(!files.some(f=>f.includes('node_modules')));
});
test('HTTP preview returns a real 404 and never serves private files',async()=>{
 const {createPreviewServer}=require('../tools/serve.cjs');const server=createPreviewServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 try{for(const route of ['/missing-page','/.env.local','/get_db.js','/openapi.json','/security-hardening.sql']){
  const res=await fetch(origin+route);assert.equal(res.status,404,route);assert.match(await res.text(),/This page isn’t here/);
 }assert.equal((await fetch(origin+'/')).status,200);
 const alias=await fetch(origin+'/acme/command-center/',{redirect:'manual'});assert.equal(alias.status,302);assert.equal(alias.headers.get('location'),'/command-center/?tenant=acme');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('schedule formats map to exactly the same Monday, including year boundaries',()=>{
 const {context}=sandbox();for(const [input,expected]of [['28/09/2026','2026-09-28'],['Sep 28 - Oct 2, 2026','2026-09-28'],['2026-09-28','2026-09-28'],['Dec 28 - Jan 1, 2027','2026-12-28']])assert.equal(context.scheduleWeekStart(input),expected,input);
 assert.throws(()=>context.scheduleWeekStart('not-a-week'));
});
test('authentication fails closed and cannot use legacy password hashes',async()=>{
 const {context}=sandbox({auth:{signInWithPassword:async()=>({error:{message:'Invalid credentials'}})}});
 const result=await context.handleAuthBackend('admin-login',{email:'operator@example.invalid',password:'not-a-real-password'});assert.equal(result.ok,false);
 assert.doesNotMatch(read('common.js'),/storedHash\s*===\s*passwordHash|matchedAdmin\.password_hash/);
});
test('administrator login uses actual tenant membership, not an arbitrary requested workspace',async()=>{
 const {context}=sandbox({auth:{signInWithPassword:async()=>({data:{user:{id:'user-a',email:'owner@example.invalid'}}})},rpc:async name=>{assert.equal(name,'get_admin_workspaces');return {data:[{role:'owner',tenants:{slug:'tenant-a',workspace_code:'TEST-1234'}}]};}});
 assert.equal((await context.handleAuthBackend('admin-login',{email:'owner@example.invalid',password:'test-only',tenantSlug:'tenant-b'})).ok,false);
 const own=await context.handleAuthBackend('admin-login',{email:'owner@example.invalid',password:'test-only',tenantSlug:'tenant-a'});assert.equal(own.ok,true);assert.equal(own.isSuperuser,false);
});
test('Watch Tower checks database organization membership and fails closed on denied access',async()=>{
 let requested=false;
 const {context,store}=sandbox({auth:{getUser:async()=>({data:{user:{id:'user-a',user_metadata:{role:'super_admin'}}}})},rpc:async name=>{assert.equal(name,'get_my_organizations');requested=true;return {data:[]};}});
 const elements=new Map();context.document.getElementById=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',classList:{toggle(){}}});return elements.get(id)};
 store.setItem('is_superuser','true');vm.runInContext(read('watch-tower/watch_tower.js'),context);await context.loadWatchTower();
 assert.equal(requested,true);assert.equal(elements.get('wt-dashboard').hidden,true);assert.equal(elements.get('wt-empty').hidden,false);
 assert.doesNotMatch(read('watch-tower/watch_tower.js'),/isPlatformOperator|user_metadata|is_superuser|masquerade/);
});
test('interrupted demo restores workspace, identity and queued records',()=>{
 const {context,store}=sandbox();vm.runInContext(read('script.js'),context);
 store.setItem('active_tenant_slug','demo');store.setItem('saved_name','Alex Rivera');store.setItem('attendance_pending_queue','[]');
 store.setItem('perimetrr_demo_state_backup',JSON.stringify({active_tenant_slug:'tenant-a',saved_name:'Original Employee',attendance_pending_queue:'[{"id":"unsent-record"}]',attendance_last_action:null}));
 context.restoreDemoState();assert.equal(store.getItem('active_tenant_slug'),'tenant-a');assert.equal(store.getItem('saved_name'),'Original Employee');assert.equal(store.getItem('attendance_pending_queue'),'[{"id":"unsent-record"}]');assert.equal(store.getItem('perimetrr_demo_state_backup'),null);
});
test('generated UUIDs are valid version 4 identifiers without browser fingerprints',()=>{
 const {context}=sandbox();vm.runInContext(read('script.js'),context);assert.match(context.generateUuid(),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
 assert.doesNotMatch(read('script.js'),/computeCanvasHardwareHash/);
});

test('staff DTOs strip browser credentials, including old cached directory entries',()=>{
 const {context}=sandbox();const result=context.sanitizeStaffDirectory([{name:'Test Profile',device_id:'secret',deviceId:'other-secret',device_token:'token'}]);
 assert.equal(result[0].device_linked,true);for(const field of ['device_id','deviceId','device_token'])assert.equal(field in result[0],false);
});
test('schedule editing ignores forged local admin flags',async()=>{
 const {context,store}=sandbox({auth:{getUser:async()=>({data:{user:{id:'user-a'}}})},rpc:async name=>{assert.equal(name,'get_admin_workspaces');return {data:[]};}});
 store.setItem('is_superuser','true');store.setItem('admin_session','{}');context.location.search='?tenant=foreign-branch';
 vm.runInContext(read('hybrid/script.js'),context);assert.equal(await context.checkHasAdminSession(),false);
});
test('Command Center transfer statuses cannot display provisional or rejected records as verified',()=>{
 const {context}=sandbox();vm.runInContext(read('command-center/admin.js'),context);
 assert.equal(context.getStatusBadgeClass('Provisional Transfer'),'late');assert.equal(context.getStatusLabel('Provisional Transfer'),'Provisional');
 assert.equal(context.getStatusBadgeClass('rejected'),'offline');assert.equal(context.getStatusBadgeClass('Outside Perimeter'),'offline');
 assert.equal(context.getStatusLabel('on_site'),'On Time');
 assert.doesNotMatch(read('command-center/admin.js'),/safeStorage\.setItem\('admin_cache_|masqueradeBanner|initOperatorIdleMonitor/);
});
test('QR images are generated locally and reject off-site invitation URLs',async()=>{
 const {context}=sandbox();vm.runInContext(read('qr.js'),context);
 await assert.rejects(context.getWorkspaceQrDataUrl('https://foreign.example/?join=TEST-1234'),/Only this site/);
 assert.doesNotMatch(read('qr.js')+read('command-center/admin.js')+read('onboard/onboard.js'),/api\.qrserver\.com/);
});
test('an unknown workspace cannot be fabricated from default configuration',async()=>{
 const {context}=sandbox({rpc:async()=>({data:null}),auth:{getSession:async()=>({data:{session:null}})}});
 assert.equal(await context.getTenantConfig('unknown-workspace'),null);
});

test('browser clients target only the dedicated API and never query raw tables',()=>{
 const {connections}=sandbox({});assert.equal(connections[0][2].db.schema,'api');
 assert.match(read('hybrid/script.js'),/schema:\s*'api'/);
 for(const file of publicFiles(root).filter(f=>f.endsWith('.js')))assert.doesNotMatch(read(file),/supabaseClient\s*\.from\s*\(/,file);
 for(const removed of ['getStaffMetadataMap','saveStaffMetadataMap','app_config'])assert.ok(!read('common.js').includes(removed),removed);
});

test('attendance filters normalize display dates and reject invalid calendar dates',()=>{
 const {context}=sandbox();assert.equal(context.attendanceFilterDate(null),null);
 assert.equal(context.attendanceFilterDate('03/10/2026'),context.attendanceFilterDate('2026-10-03'));
 assert.ok(Date.parse(context.attendanceFilterDate('03/10/2026',true))>Date.parse(context.attendanceFilterDate('03/10/2026')));
 assert.throws(()=>context.attendanceFilterDate('31/02/2026'),/valid attendance date/);
 assert.throws(()=>context.attendanceFilterDate('invalid'),/valid attendance date/);
});

test('administrator attendance uses the guarded API and propagates denial',async()=>{
 const calls=[];const {context}=sandbox({rpc:async(name,args)=>{calls.push({name,args});return {data:[]}}});
 assert.equal((await context.handleAttendanceBackend('list-logs',{tenantSlug:'tenant-a',fromDate:'03/10/2026',toDate:'03/10/2026',limit:500})).ok,true);
 const call=calls.find(c=>c.name==='get_admin_attendance');assert.ok(call);assert.equal(call.args.p_tenant_slug,'tenant-a');assert.equal(call.args.p_limit,500);
 const denied=sandbox({rpc:async()=>({error:new Error('Workspace administrator access required.')})});
 await assert.rejects(denied.context.handleAttendanceBackend('list-logs',{tenantSlug:'foreign-branch'}),/administrator access required/);
});

test('schedule writes use the server-checked endpoint instead of browser table upserts',async()=>{
 const calls=[];const {context}=sandbox({auth:{getUser:async()=>({data:{user:{id:'user-a'}}})},rpc:async(name,args)=>{calls.push({name,args});return name==='get_workspace_config'?{data:{id:'tenant-a',slug:'tenant-a',workspace_code:'TEST-1234'}}:{data:{ok:true}};}});
 const result=await context.handleScheduleBackend('save-hybrid-schedule',{tenantSlug:'tenant-a',weekStart:'05/10/2026',scheduleData:{Employee:{Monday:'office'}}});
 assert.equal(result.ok,true);const call=calls.find(c=>c.name==='save_workspace_schedule');assert.ok(call);assert.equal(call.args.p_tenant_slug,'tenant-a');assert.equal(call.args.p_week_start,'2026-10-05');assert.equal('updated_by' in call.args,false);
});
