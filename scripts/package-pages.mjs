import {cp,mkdir,writeFile,rm,readFile,readdir} from 'node:fs/promises';
const target=new URL('../docs/',import.meta.url);
const assets=new URL('assets/',target);
let history;
try{history=JSON.parse(await readFile(new URL('.asset-history.json',target),'utf8'));}
catch{try{history=[await readdir(assets)];}catch{history=[];}}
const retained=new Map();
for(const name of new Set(history.slice(0,2).flat())){
 if(typeof name!=='string'||name.includes('/')||name.includes('..'))continue;
 try{retained.set(name,await readFile(new URL(name,assets)));}catch{}
}
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
await cp(new URL('../outputs/standalone/public/',import.meta.url),target,{recursive:true});
const current=await readdir(assets);
for(const [name,body] of retained)if(!current.includes(name))await writeFile(new URL(name,assets),body);
await writeFile(new URL('.asset-history.json',target),JSON.stringify([current,...history.slice(0,1)]));
await writeFile(new URL('.nojekyll',target),'');
