import {cp,mkdir,writeFile,rm} from 'node:fs/promises';
const target=new URL('../docs/',import.meta.url);
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
await cp(new URL('../outputs/standalone/public/',import.meta.url),target,{recursive:true});
await writeFile(new URL('.nojekyll',target),'');
