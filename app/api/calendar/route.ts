import{parseCalendar}from '@/lib/calendar';
export async function GET(request:Request){
 const date=new URL(request.url).searchParams.get('date')??'';
 const parsed=new Date(date+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return Response.json({error:'Выберите существующую дату по новому стилю.'},{status:400});
 try{
  const response=await fetch('https://azbyka.ru/days/'+date,{headers:{Accept:'text/html','User-Agent':'SaintsDayCalendar/1.0'},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error('Календарь «Азбуки веры» временно недоступен. Повторите попытку позже.');
  const html=await response.text();if(html.length>2000000)throw new Error('Источник вернул слишком большую страницу.');
  return Response.json(parseCalendar(html,date),{headers:{'Cache-Control':'private, max-age=300'}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Не удалось загрузить святых. Повторите попытку.'},{status:502});}
}
