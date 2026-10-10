/* Organization registration and upgrade. Permissions are enforced by database RPCs. */
let enterpriseConfirmationEmail = '';
let enterpriseRecoveryActive = false;
let enterpriseAccessVersion = 0;
function enterpriseNotice(message,error=false) {
 const el=document.getElementById('enterprise-message');el.textContent=message;el.classList.toggle('error',error);
}
async function organizationRpc(name,args={}) {
 if(!supabaseClient)throw new Error('Account service unavailable. Reload or check your connection.');
 const {data,error}=await supabaseClient.rpc(name,args);if(error)throw error;
 if(data?.ok===false)throw new Error(data.message||'Request not approved.');return data;
}
async function refreshEnterpriseAccess() {
 const version=++enterpriseAccessVersion;
 for(const id of ['enterprise-auth','enterprise-setup','enterprise-existing','enterprise-recovery'])document.getElementById(id).hidden=true;
 enterpriseNotice('Checking your account…');
 try {
  if(!supabaseClient)throw new Error('Account service unavailable. Reload or check your connection.');
  const {data,error}=await supabaseClient.auth.getUser();if(version!==enterpriseAccessVersion)return;
  if(error||!data?.user){document.getElementById('enterprise-auth').hidden=false;document.getElementById('enterprise-signout').hidden=true;enterpriseNotice('Sign in or register to continue.');return;}
  document.getElementById('enterprise-signout').hidden=false;
  if(enterpriseRecoveryActive){document.getElementById('enterprise-recovery').hidden=false;enterpriseNotice('Choose a new password for your account.');return;}
  const [workspaces,organizations]=await Promise.all([organizationRpc('get_admin_workspaces'),organizationRpc('get_my_organizations')]);
  if(version!==enterpriseAccessVersion)return;
  document.getElementById('enterprise-account').textContent='Signed in as '+data.user.email;
  const select=document.getElementById('enterprise-workspace');select.replaceChildren();
  const none=document.createElement('option');none.value='';none.textContent='Start without a branch';select.append(none);
  for(const membership of workspaces||[])if(membership.role==='owner'&&!membership.tenants.organization_id){
   const option=document.createElement('option');option.value=membership.tenants.id;option.textContent=membership.tenants.name;select.append(option);
  }
  const requested=new URLSearchParams(location.search).get('workspace');
  if(Array.from(select.options).some(option=>option.value===requested))select.value=requested;
  const container=document.getElementById('enterprise-organizations');container.replaceChildren();
  for(const organization of organizations||[]){const link=document.createElement('a');link.className='button secondary';link.textContent=organization.name;link.href='../watch-tower/?organization='+encodeURIComponent(organization.id);container.append(link);}
  document.getElementById('enterprise-existing').hidden=!(organizations||[]).length;
  document.getElementById('enterprise-setup').hidden=false;enterpriseNotice('Your account is ready. Choose an organization name and an optional first branch.');
 }catch(error){enterpriseNotice(error.message||'Could not load organization setup.',true);}
}
async function enterpriseAction(button,action){
 button.disabled=true;try{await action();}catch(error){enterpriseNotice(error.message||'Could not complete this request.',true);}finally{button.disabled=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
 if(typeof initTheme==='function')initTheme();
 const authForm=document.getElementById('enterprise-auth-form');
 authForm.addEventListener('submit',event=>{
  event.preventDefault();enterpriseAction(event.currentTarget.querySelector('[type="submit"]'),async()=>{
   if(!supabaseClient)throw new Error('Account service unavailable.');
   const {error}=await supabaseClient.auth.signInWithPassword({email:document.getElementById('enterprise-email').value.trim(),password:document.getElementById('enterprise-password').value});
   if(error)throw new Error('Sign-in failed. Check your email and password.');
   document.getElementById('enterprise-password').value='';await refreshEnterpriseAccess();
  });
 });
 document.getElementById('enterprise-register').addEventListener('click',event=>{
  const agreement=document.getElementById('enterprise-terms');
  if(!agreement.checked){agreement.focus();enterpriseNotice('Read the policies and accept the terms before registering.',true);return;}
  if(!authForm.reportValidity())return;
  enterpriseAction(event.currentTarget,async()=>{
   const email=document.getElementById('enterprise-email').value.trim(),password=document.getElementById('enterprise-password').value;
   const strength=validatePasswordStrength(password);if(!strength.ok)throw new Error(strength.message);
   if(!supabaseClient)throw new Error('Account service unavailable.');
   const {data,error}=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:new URL('../enterprise/',location.href).href}});
   if(error)throw error;document.getElementById('enterprise-password').value='';
   if(data?.session){await refreshEnterpriseAccess();return;}
   enterpriseConfirmationEmail=email;document.getElementById('enterprise-verify-form').hidden=false;
   enterpriseNotice('Check your email to confirm your account. Use the confirmation link or enter the code, then sign in. Existing accounts should sign in instead.');
  });
 });
 document.getElementById('enterprise-verify-form').addEventListener('submit',event=>{
  event.preventDefault();enterpriseAction(event.currentTarget.querySelector('button'),async()=>{
   const {error}=await supabaseClient.auth.verifyOtp({email:enterpriseConfirmationEmail,token:document.getElementById('enterprise-otp').value.trim(),type:'signup'});
   if(error)throw error;document.getElementById('enterprise-verify-form').hidden=true;await refreshEnterpriseAccess();
  });
 });
 document.getElementById('enterprise-recover').addEventListener('click',event=>{
  enterpriseAction(event.currentTarget,async()=>{
   const email=document.getElementById('enterprise-email');if(!email.reportValidity()||!email.value)throw new Error('Enter your account email first.');
   const {error}=await supabaseClient.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:new URL('../enterprise/?recover=1',location.href).href});
   if(error)throw error;enterpriseNotice('If this account exists, password recovery instructions have been sent.');
  });
 });
 document.getElementById('enterprise-recovery-form').addEventListener('submit',event=>{
  event.preventDefault();enterpriseAction(event.currentTarget.querySelector('button'),async()=>{
   const password=document.getElementById('enterprise-new-password').value;const strength=validatePasswordStrength(password);if(!strength.ok)throw new Error(strength.message);
   const {error}=await supabaseClient.auth.updateUser({password});if(error)throw error;
   document.getElementById('enterprise-new-password').value='';enterpriseRecoveryActive=false;
   history.replaceState({},'',location.pathname);await refreshEnterpriseAccess();enterpriseNotice('Password updated. Your account is ready.');
  });
 });
 document.getElementById('enterprise-setup-form').addEventListener('submit',event=>{
  event.preventDefault();enterpriseAction(event.currentTarget.querySelector('button'),async()=>{
   const tenantId=document.getElementById('enterprise-workspace').value;
   if(tenantId&&!confirm('Attach this workspace and grant future organization administrators access to it?'))return;
   const result=await organizationRpc('create_enterprise_organization',{p_name:document.getElementById('enterprise-name').value.trim(),p_existing_tenant_id:tenantId||null});
   if(!result?.organization_id)throw new Error('Organization setup returned an incomplete response. Refresh before retrying.');
   location.href='../watch-tower/?organization='+encodeURIComponent(result.organization_id);
  });
 });
 document.getElementById('enterprise-signout').addEventListener('click',event=>{
  enterpriseAction(event.currentTarget,async()=>{
   ++enterpriseAccessVersion;document.getElementById('enterprise-setup').hidden=true;document.getElementById('enterprise-existing').hidden=true;document.getElementById('enterprise-recovery').hidden=true;
   const {error}=await supabaseClient.auth.signOut();if(error)throw error;enterpriseRecoveryActive=false;await refreshEnterpriseAccess();
  });
 });
 if(supabaseClient?.auth)supabaseClient.auth.onAuthStateChange(event=>{
  if(event==='PASSWORD_RECOVERY'){enterpriseRecoveryActive=true;setTimeout(refreshEnterpriseAccess,0);}
  if(event==='SIGNED_OUT'){++enterpriseAccessVersion;for(const id of ['enterprise-setup','enterprise-existing','enterprise-recovery'])document.getElementById(id).hidden=true;document.getElementById('enterprise-organizations').replaceChildren();document.getElementById('enterprise-auth').hidden=false;document.getElementById('enterprise-signout').hidden=true;}
 });
 refreshEnterpriseAccess();
});
