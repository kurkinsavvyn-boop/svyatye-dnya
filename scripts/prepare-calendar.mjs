import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {parseCalendar} from '../lib/calendar.ts';
const directory=new URL('../public/calendar/',import.meta.url);
await mkdir(directory,{recursive:true});
const year=new Date().getUTCFullYear();
const first=Number(process.env.CALENDAR_FIRST_YEAR??year-1);
const last=Number(process.env.CALENDAR_LAST_YEAR??year+1);
const dates=[];
for(let d=new Date(Date.UTC(first,0,1));d.getUTCFullYear()<=last;d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10));
let cursor=0,completed=0;const failures=[];
async function worker(){
 while(cursor<dates.length){
  const date=dates[cursor++],file=new URL(date+'.json',directory);
  try{
   const existing=JSON.parse(await readFile(file,'utf8'));
   const distance=(Date.parse(date)-Date.now())/86400000;
   if(existing.date===date&&existing.blocks&&!(distance>=-7&&distance<=30)){completed++;continue;}
  }catch{}
  let data;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch('https://azbyka.ru/days/'+date,{signal:AbortSignal.timeout(30000),headers:{Accept:'text/html','User-Agent':'SaintsDayCalendar/1.0'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    data=parseCalendar(await response.text(),date);break;
   }catch(error){if(attempt===2)failures.push(date+': '+error.message);else await new Promise(r=>setTimeout(r,1500*(attempt+1)));}
  }
  if(data){await writeFile(file,JSON.stringify(data));completed++;}
  if(completed%50===0)console.log('Calendar:',completed,'/',dates.length);
 }
}
await Promise.all(Array.from({length:4},worker));
if(failures.length)throw Error('Calendar incomplete: '+failures.join('\n'));
await writeFile(new URL('index.json',directory),JSON.stringify({start:dates[0],end:dates.at(-1),updatedAt:new Date().toISOString(),count:completed}));
console.log('Calendar ready:',completed);
