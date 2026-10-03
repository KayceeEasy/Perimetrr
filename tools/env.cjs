// Private diagnostic scripts only. This file is excluded from the public build.
const fs=require('node:fs'),path=require('node:path');
const values={};
const file=path.resolve(__dirname,'../.env.local');
if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
 const match=line.match(/^([A-Z_]+)=(.*)$/);
 if(match)values[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');
}
module.exports=new Proxy({...values,...process.env},{get(target,key){
 const value=target[key];
 if(!value)throw new Error(`Missing private environment setting: ${String(key)}`);
 return value;
}});
