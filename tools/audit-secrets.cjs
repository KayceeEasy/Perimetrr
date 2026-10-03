const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function visit(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','.agents','.codex','dist'].includes(item.name))continue;
  const file=path.join(dir,item.name);
  if(item.isDirectory()){visit(file);continue;}
  if(!/\.(js|json|sql|md|html|env|local|cjs)$/.test(item.name) || ['.env.local','.mcp.json'].includes(item.name))continue;
  const source=fs.readFileSync(file,'utf8');
  source.split(/\r?\n/).forEach((line,i)=>{
   if(/sbp_[a-zA-Z0-9_-]{20,}|sb_secret_[a-zA-Z0-9_-]{20,}|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/.test(line))console.log(JSON.stringify({file:path.relative(root,file),line:i+1,issue:'Potential literal privileged credential (value withheld)'}));
   for(const token of line.matchAll(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g))try{const claims=JSON.parse(Buffer.from(token[0].split('.')[1],'base64url'));if(claims.role!=='anon')console.log(JSON.stringify({file:path.relative(root,file),line:i+1,issue:'Potential privileged JWT (value withheld)'}));}catch(_){}
  });
 }
}
visit(root);
if(process.argv[2]==='inspect')for(const file of ['get_project.js','get_db.js'])if(fs.existsSync(path.join(root,file)))console.log(file+'\n'+fs.readFileSync(path.join(root,file),'utf8').replace(/sbp_[a-zA-Z0-9_-]+/g,'[REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s'"`]+/g,'[REDACTED_DATABASE_URL]'));
