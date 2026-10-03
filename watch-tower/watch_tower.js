/* Watch Tower is organization-scoped. Local state is never an authorization grant. */
let watchTowerOrganizations = [];
let watchTowerOverview = null;
let watchTowerOrganizationId = null;
let watchTowerLoadVersion = 0;
function wtNotice(text, error = false, id = 'wt-message') {
 const el = document.getElementById(id); if (el) { el.textContent = text; el.classList.toggle('error', error); }
}
async function enterpriseRpc(name, args = {}) {
 if (!supabaseClient) throw new Error('Account service unavailable. Reload the page or check your connection.');
 const { data, error } = await supabaseClient.rpc(name, args);
 if (error) throw new Error(error.message || 'Could not complete the request.');
 if (data?.ok === false) throw new Error(data.message || 'The request was not approved.');
 return data;
}
async function loadWatchTower() {
 const version = ++watchTowerLoadVersion;
 watchTowerOverview = null;
 document.getElementById('wt-dashboard').hidden = true;
 document.getElementById('wt-login').hidden = true;
 document.getElementById('wt-empty').hidden = true;
 wtNotice('Checking your organization access…');
 try {
  if (!supabaseClient) throw new Error('Account service unavailable. Reload the page or check your connection.');
  const {data,error} = await supabaseClient.auth.getUser();
  if (version !== watchTowerLoadVersion) return;
  if (error || !data?.user) {
   document.getElementById('wt-login').hidden = false; document.getElementById('wt-signout').hidden = true;
   wtNotice('Sign in with your authorized organization account.'); return;
  }
  document.getElementById('wt-signout').hidden = false;
  const organizations = await enterpriseRpc('get_my_organizations');
  if (version !== watchTowerLoadVersion) return;
  watchTowerOrganizations = Array.isArray(organizations) ? organizations : [];
  if (!watchTowerOrganizations.length) { document.getElementById('wt-empty').hidden = false; wtNotice('This account has no organization-wide access.'); return; }
  const requested = new URLSearchParams(location.search).get('organization');
  watchTowerOrganizationId = watchTowerOrganizations.find(o => o.id === requested || o.id === watchTowerOrganizationId)?.id || watchTowerOrganizations[0].id;
  const select = document.getElementById('wt-organization');
  select.replaceChildren(...watchTowerOrganizations.map(o => {const option=document.createElement('option'); option.value=o.id; option.textContent=o.name; return option;}));
  select.value = watchTowerOrganizationId;
  await refreshWatchTower();
 } catch (error) { wtNotice(error.message, true); }
}
async function refreshWatchTower() {
 const version = ++watchTowerLoadVersion;
 const organizationId = watchTowerOrganizationId;
 document.getElementById('wt-dashboard').hidden = true;
 watchTowerOverview = null;
 wtNotice('Loading authorized branches…');
 try {
  const overview = await enterpriseRpc('get_organization_overview', {p_organization_id:organizationId});
  if (version !== watchTowerLoadVersion || organizationId !== watchTowerOrganizationId) return;
  if (!overview?.organization || !Array.isArray(overview.workspaces)) throw new Error('The organization returned an incomplete response. Please retry.');
  watchTowerOverview = overview;
  document.getElementById('wt-dashboard').hidden = false;
  document.getElementById('wt-org-name').textContent = overview.organization.name;
  const workspaces = overview.workspaces;
  for (const [id,value] of [['wt-branches',workspaces.length],['wt-staff',workspaces.reduce((n,w)=>n+Number(w.staff_count||0),0)],['wt-present',workspaces.reduce((n,w)=>n+Number(w.present_today||0),0)],['wt-transfers',workspaces.reduce((n,w)=>n+Number(w.pending_transfers||0),0)]]) document.getElementById(id).textContent=value;
  renderWatchTowerBranches(); renderWatchTowerMembers();
  wtNotice('Showing only branches attached to this organization. Presence follows each office’s local day; pending transfers include requests awaiting review.');
 } catch (error) {
  if (version === watchTowerLoadVersion) { wtNotice(error.message,true); document.getElementById('wt-empty').hidden=false; }
 }
}
function renderWatchTowerBranches() {
 const container=document.getElementById('wt-workspaces'); container.replaceChildren();
 const q=document.getElementById('wt-search').value.trim().toLowerCase();
 const workspaces=(watchTowerOverview?.workspaces||[]).filter(w => [w.name,w.short_name,w.workspace_code].some(v=>String(v||'').toLowerCase().includes(q)));
 if (!workspaces.length) {const p=document.createElement('p'); p.className='muted'; p.textContent=q?'No branches match your search.':'No branches attached yet. Create a branch or attach a workspace you own.'; container.append(p); return;}
 for (const workspace of workspaces) {
  const card=document.createElement('article');card.className='branch';
  const heading=document.createElement('h3');heading.textContent=workspace.name;card.append(heading);
  const code=document.createElement('small');code.className='code';code.textContent=workspace.workspace_code;card.append(code);
  const plan=document.createElement('small');plan.textContent=workspace.plan_tier+' • '+workspace.subscription_status+' • '+workspace.timezone;card.append(plan);
  const stats=document.createElement('p');stats.className='branch-stats';
  stats.textContent=workspace.staff_count+' staff · '+workspace.present_today+' present · '+workspace.pending_transfers+' pending transfers · '+workspace.provisional_records+' provisional records';card.append(stats);
  const links=document.createElement('div');links.className='actions';
  for (const [label,route] of [['Command Center','command-center'],['Hybrid schedule','hybrid']]) {
   const link=document.createElement('a');link.className='button secondary';link.textContent=label;link.href='../'+route+'/?tenant='+encodeURIComponent(workspace.slug);links.append(link);
  }
  const invite=document.createElement('a');invite.className='button secondary';invite.textContent='Staff pairing link';invite.href='../?join='+encodeURIComponent(workspace.workspace_code);links.append(invite);
  card.append(links);container.append(card);
 }
}
function renderWatchTowerMembers() {
 const container=document.getElementById('wt-members');container.replaceChildren();
 const owner=watchTowerOverview?.organization.role==='owner';
 document.getElementById('wt-member-form').hidden=!owner;
 for (const member of watchTowerOverview?.members||[]) {
  const row=document.createElement('div');row.className='member';const text=document.createElement('strong');text.textContent=member.email+' · '+member.role;row.append(text);
  if (owner && member.role!=='owner') {
   const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Revoke access';remove.setAttribute('aria-label','Revoke organization access for '+member.email);
   remove.addEventListener('click',async()=>{
    if (!confirm('Revoke organization-wide access for '+member.email+'? Any separately assigned branch role remains unchanged.')) return;
    remove.disabled=true;
    try {await enterpriseRpc('manage_organization_member',{p_organization_id:watchTowerOrganizationId,p_email:member.email,p_action:'revoke'});await refreshWatchTower();}
    catch(error){wtNotice(error.message,true);remove.disabled=false;}
   });row.append(remove);
  }
  container.append(row);
 }
}
async function withWatchTowerForm(form, action, messageId='wt-message') {
 const button=form.querySelector('[type="submit"]');button.disabled=true;
 try {await action();}catch(error){wtNotice(error.message,true,messageId);}finally{button.disabled=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
 if(typeof initTheme==='function')initTheme();
 document.getElementById('wt-login-form').addEventListener('submit',event=>{
  event.preventDefault();withWatchTowerForm(event.currentTarget,async()=>{
   if(!supabaseClient)throw new Error('Account service unavailable.');
   const {error}=await supabaseClient.auth.signInWithPassword({email:document.getElementById('wt-email').value.trim(),password:document.getElementById('wt-password').value});
   if(error)throw new Error('Sign-in failed. Check your email and password.');
   document.getElementById('wt-password').value='';await loadWatchTower();
  });
 });
 document.getElementById('wt-signout').addEventListener('click',async()=>{
  ++watchTowerLoadVersion;watchTowerOverview=null;watchTowerOrganizations=[];watchTowerOrganizationId=null;
  document.getElementById('wt-dashboard').hidden=true;
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  try{const {error}=await supabaseClient.auth.signOut();if(error)throw error;await loadWatchTower();}
  catch(error){wtNotice('Sign-out could not complete. Reload and try again.',true);}
 });
 document.getElementById('wt-refresh').addEventListener('click',loadWatchTower);
 document.getElementById('wt-organization').addEventListener('change',event=>{watchTowerOrganizationId=event.target.value;document.getElementById('wt-search').value='';refreshWatchTower();});
 document.getElementById('wt-search').addEventListener('input',renderWatchTowerBranches);
 document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.closeDialog).close()));
 document.getElementById('wt-add-branch').addEventListener('click',()=>{
  document.getElementById('wt-branch-form').reset();document.getElementById('wt-timezone').value=Intl.DateTimeFormat().resolvedOptions().timeZone;
  wtNotice('',false,'wt-branch-message');document.getElementById('wt-branch-dialog').showModal();
 });
 document.getElementById('wt-detect-location').addEventListener('click',event=>{
  const button=event.currentTarget;if(!navigator.geolocation){wtNotice('This browser does not support location. Enter the office coordinates manually.',true,'wt-branch-message');return;}
  button.disabled=true;wtNotice('Finding your current location…',false,'wt-branch-message');
  navigator.geolocation.getCurrentPosition(position=>{
   document.getElementById('wt-latitude').value=position.coords.latitude.toFixed(6);document.getElementById('wt-longitude').value=position.coords.longitude.toFixed(6);
   wtNotice('Confirm that this is the branch office location before creating it.',false,'wt-branch-message');button.disabled=false;
  },()=>{wtNotice('Location unavailable or permission denied. Enter the office coordinates manually.',true,'wt-branch-message');button.disabled=false;},{enableHighAccuracy:true,timeout:15000});
 });
 document.getElementById('wt-branch-form').addEventListener('submit',event=>{
  event.preventDefault();withWatchTowerForm(event.currentTarget,async()=>{
   await enterpriseRpc('create_organization_workspace',{p_organization_id:watchTowerOrganizationId,p_name:document.getElementById('wt-branch-name').value.trim(),p_office_name:document.getElementById('wt-office-name').value.trim(),p_latitude:Number(document.getElementById('wt-latitude').value),p_longitude:Number(document.getElementById('wt-longitude').value),p_radius_meters:Number(document.getElementById('wt-radius').value),p_timezone:document.getElementById('wt-timezone').value.trim()});
   document.getElementById('wt-branch-dialog').close();await refreshWatchTower();
  },'wt-branch-message');
 });
 document.getElementById('wt-attach-open').addEventListener('click',async()=>{
  wtNotice('',false,'wt-attach-message');const select=document.getElementById('wt-attach-workspace');select.replaceChildren();document.getElementById('wt-attach-dialog').showModal();
  const button=document.querySelector('#wt-attach-form [type="submit"]');button.disabled=true;
  try {
   const workspaces=await enterpriseRpc('get_admin_workspaces');
   const owned=workspaces.filter(m=>m.role==='owner'&&!m.tenants.organization_id);
   for(const membership of owned){const option=document.createElement('option');option.value=membership.tenants.id;option.textContent=membership.tenants.name;select.append(option);}
   if(!owned.length)wtNotice('No unattached workspaces owned by this account. Create a new branch instead.',false,'wt-attach-message');
   button.disabled=!owned.length;
  }catch(error){wtNotice(error.message,true,'wt-attach-message');}
 });
 document.getElementById('wt-attach-form').addEventListener('submit',event=>{
  event.preventDefault();withWatchTowerForm(event.currentTarget,async()=>{
   const id=document.getElementById('wt-attach-workspace').value;if(!id)throw new Error('Select an owned workspace.');
   if(!confirm('Attach this workspace and grant your organization administrators branch access?'))return;
   await enterpriseRpc('attach_organization_workspace',{p_organization_id:watchTowerOrganizationId,p_tenant_id:id});document.getElementById('wt-attach-dialog').close();await refreshWatchTower();
  },'wt-attach-message');
 });
 document.getElementById('wt-member-form').addEventListener('submit',event=>{
  event.preventDefault();withWatchTowerForm(event.currentTarget,async()=>{
   const email=document.getElementById('wt-member-email').value.trim();
   if(!confirm('Authorize '+email+' to oversee every branch in this organization?'))return;
   await enterpriseRpc('manage_organization_member',{p_organization_id:watchTowerOrganizationId,p_email:email,p_action:'grant'});
   document.getElementById('wt-member-form').reset();await refreshWatchTower();
  });
 });
 if(supabaseClient?.auth)supabaseClient.auth.onAuthStateChange(event=>{
  if(event==='SIGNED_OUT'){++watchTowerLoadVersion;watchTowerOverview=null;watchTowerOrganizations=[];document.getElementById('wt-dashboard').hidden=true;document.getElementById('wt-workspaces').replaceChildren();document.getElementById('wt-members').replaceChildren();document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());document.getElementById('wt-login').hidden=false;document.getElementById('wt-empty').hidden=true;document.getElementById('wt-signout').hidden=true;}
 });
 loadWatchTower();
});
