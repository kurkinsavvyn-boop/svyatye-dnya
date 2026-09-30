import{createServer}from'node:http';
import{readFile,stat}from'node:fs/promises';
import{resolve,dirname,extname,sep}from'node:path';
import{fileURLToPath}from'node:url';
import{parseCalendar}from'../lib/calendar';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'public');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const cache=new Map<string,{expires:number;data:unknown}>();
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 const url=new URL(req.url??'/','http://localhost');
 if(url.pathname==='/api/calendar'){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const date=url.searchParams.get('date')??'',parsed=new Date(date+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date){res.writeHead(400).end(JSON.stringify({error:'Выберите существующую дату по новому стилю.'}));return;}
  const cached=cache.get(date);if(cached&&cached.expires>Date.now()){res.end(JSON.stringify(cached.data));return;}
  try{
   const response=await fetch('https://azbyka.ru/days/'+date,{headers:{Accept:'text/html','User-Agent':'SaintsDayCalendar/1.0'},signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw new Error('Календарь «Азбуки веры» временно недоступен. Повторите попытку позже.');
   const html=await response.text();if(html.length>2000000)throw new Error('Источник вернул слишком большую страницу.');
   const data=parseCalendar(html,date);if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(date,{expires:Date.now()+300000,data});res.end(JSON.stringify(data));
  }catch(e){res.writeHead(502).end(JSON.stringify({error:e instanceof Error?e.message:'Не удалось загрузить календарь.'}));}return;
 }
 try{
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  const info=await stat(path);if(!info.isFile()){res.writeHead(404).end();return;}
  const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','Content-Length':body.length,'Cache-Control':url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end('Страница не найдена');}
});
const port=Number(process.env.PORT??8080);server.listen(port,'0.0.0.0',()=>console.log('Святые дня: http://localhost:'+port));
