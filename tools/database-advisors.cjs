// Read-only checks. Credentials and customer rows are never printed.
const env=require('./env.cjs');
const ref=new URL(env.SUPABASE_URL).hostname.split('.')[0];
(async()=>{
 for(const type of ['security','performance']) {
  const response=await fetch(`https://api.supabase.com/v1/projects/${ref}/advisors/${type}`,{headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`}});
  if(!response.ok){console.log(JSON.stringify({type,status:response.status}));continue;}
  const result=await response.json();
  const findings=Array.isArray(result)?result:result.lints||result.advisors||[];
  const groups={}; for(const finding of findings){const key=finding.level+':'+finding.name;groups[key]=(groups[key]||0)+1;}
  console.log(JSON.stringify({type,counts:groups,findings:findings.filter(item=>!item.name.includes('security_definer_function_executable')&&item.name!=='unused_index').map(item=>({name:item.name,level:item.level,detail:item.detail,metadata:item.metadata}))}));
 }
})().catch(()=>{console.error('Advisor request could not connect. No credentials printed.');process.exitCode=1;});
