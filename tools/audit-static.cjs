const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const {publicFiles}=require('./public-files.cjs');
const root=path.resolve(__dirname,'..'),files=publicFiles(root);
const scripts=files.filter(f=>f.endsWith('.js'));
const source=scripts.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const names=new Set([...source.matchAll(/(?:function\s+|window\.)([A-Za-z_$][\w$]*)\s*(?:\(|=)/g)].map(m=>m[1]));
const issues=[],pages=[];
for(const f of scripts){try{new vm.Script(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});}catch(e){issues.push({file:f,type:'syntax',message:e.message});}}
for(const f of files.filter(f=>f.endsWith('.html'))){
 const s=fs.readFileSync(path.join(root,f),'utf8');
 const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of new Set(ids))if(ids.filter(v=>v===id).length>1)issues.push({file:f,type:'duplicate-id',id});
 for(const m of s.matchAll(/<img\b[^>]*>/g))if(!/\balt\s*=/.test(m[0]))issues.push({file:f,type:'missing-alt',tag:m[0].slice(0,100)});
 for(const m of s.matchAll(/\bon(?:click|submit|change|input|keydown)="([^"]*)"/g))for(const call of m[1].matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g))if(!names.has(call[1])&&!['if','alert','confirm','prompt','parseInt','encodeURIComponent','decodeURIComponent'].includes(call[1]))issues.push({file:f,type:'missing-handler',name:call[1]});
 for(const m of s.matchAll(/(?:href|src)="([^"?#]+)(?:[?#][^"]*)?"/g)){
  const href=m[1]; if(/^(https?:|data:|mailto:|tel:)/.test(href))continue;
  let target=href.startsWith('/')?href.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(f),href));
  if(href.endsWith('/'))target+='index.html';
  target=target.replace(/^\.\//,'');
  if(!files.includes(target))issues.push({file:f,type:'missing-asset',target});
 }
 pages.push({file:f,title:s.match(/<title>(.*?)<\/title>/s)?.[1],buttons:(s.match(/<button\b/g)||[]).length,links:(s.match(/<a\b/g)||[]).length});
}
console.log(JSON.stringify({pages,issues,bundles:scripts.map(f=>({file:f,bytes:fs.statSync(path.join(root,f)).size,gzipBytes:zlib.gzipSync(fs.readFileSync(path.join(root,f))).length}))},null,2));
