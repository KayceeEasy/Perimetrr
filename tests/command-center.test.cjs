const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const admin=fs.readFileSync('command-center/admin.js','utf8'),common=fs.readFileSync('common.js','utf8');
function fn(source,name){const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,name);return source.slice(start,source.indexOf('\n}',start)+2);}
const context=vm.createContext({});
for(const name of ['normalizeDateKey','normalizeAttendanceStatus','firstVerifiedArrival','weeklyAttendanceMetrics'])vm.runInContext(fn(admin,name),context);
vm.runInContext(fn(common,'workspaceWorkingDays'),context);
const roster=Array.from({length:5},(_,i)=>({id:String(i),name:`Staff ${i}`}));
const log=(person,date,status='on_site',time='08:00:00')=>({name:`Staff ${person}`,date,action:'IN',server_status:status,occurred_at:`${date}T${time}Z`});
test('25 check-ins from five staff mean 100% coverage, not 500%',()=>{
 const logs=roster.flatMap((_,i)=>['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02'].map(date=>log(i,date)));
 const result=context.weeklyAttendanceMetrics(logs,roster);
 assert.equal(result.checkInRate,100);assert.equal(result.signedIn,5);assert.equal(result.verifiedDays,25);
});
test('repeat actions are deduplicated and the first verified arrival determines lateness',()=>{
 const logs=[log(0,'2026-09-28','late','10:00:00'),log(0,'2026-09-28','on_site','08:00:00'),log(1,'2026-09-28','late')];
 const result=context.weeklyAttendanceMetrics(logs,roster);
 assert.equal(result.verifiedDays,2);assert.equal(result.lateCount,1);assert.equal(result.checkInRate,40);
});
test('provisional, rejected and outside-perimeter attempts do not become verified attendance',()=>{
 const logs=[log(0,'2026-09-28','provisional_transfer'),log(1,'2026-09-28','outside_perimeter'),log(2,'2026-09-28','rejected'),log(3,'2026-09-28','remote')];
 const result=context.weeklyAttendanceMetrics(logs,roster);
 assert.equal(result.reviewDays,1);assert.equal(result.verifiedDays,1);assert.equal(result.remoteDays,1);assert.equal(result.checkInRate,20);
 logs.push(log(0,'2026-09-28'));
 assert.equal(context.weeklyAttendanceMetrics(logs,roster).reviewDays,0);
});
test('empty rosters cannot produce fabricated staff coverage',()=>{
 assert.equal(context.weeklyAttendanceMetrics([log(0,'2026-09-28')],[]).checkInRate,0);
});
test('the matrix and exports select the earliest verified arrival, never a rejected attempt',()=>{
 const logs=[log(0,'2026-09-28','provisional_transfer','07:00:00'),log(0,'2026-09-28','late','10:00:00'),log(0,'2026-09-28','on_site','08:00:00')];
 assert.equal(context.firstVerifiedArrival(logs).server_status,'on_site');
 assert.equal(context.firstVerifiedArrival([logs[0]]),undefined);
});
test('working-day ranges support one, six and seven days with Monday-based indexes',()=>{
 assert.equal(context.workspaceWorkingDays('0_5').length,6);
 assert.equal(context.workspaceWorkingDays('0_6').length,7);
 assert.equal(context.workspaceWorkingDays('2_2').length,1);
 assert.equal(context.workspaceWorkingDays('6_0').length,5);
});
test('initialization uses existing notification and roster helpers',()=>{
 assert.doesNotMatch(admin,/latestStaffList|initAdminBrowserNotifications/);
 assert.match(admin,/initAdminPushNotifications\(\)/);
 assert.match(common,/rpc\('update_workspace_config'/);
 assert.doesNotMatch(admin,/Attendance Presence|signedIn\s*\/\s*totalRoster/);
});
