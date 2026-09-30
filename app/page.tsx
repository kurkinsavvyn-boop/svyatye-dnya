'use client';
import{useCallback,useEffect,useState}from 'react';
import{ru}from 'date-fns/locale';
import{Calendar}from '@/components/ui/calendar';
import{Button}from '@/components/ui/button';
import{Input}from '@/components/ui/input';
import{Textarea}from '@/components/ui/textarea';
import{Dialog,DialogContent,DialogDescription,DialogTitle}from '@/components/ui/dialog';
import{BookOpen,CalendarDays,FileDown,FileText,LoaderCircle,Pencil,Check,CircleAlert,ChevronLeft,ChevronRight,Share2}from 'lucide-react';
import type{CalendarResult,DocumentBlock}from '@/lib/calendar';
function iso(d:Date){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function today(){const s=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date());return new Date(s+'T12:00:00');}
function display(d:Date){return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(d);}
export default function Home(){
 const[date,setDate]=useState<Date>(()=>today()),[month,setMonth]=useState<Date>(()=>today());
 const[result,setResult]=useState<CalendarResult|null>(null),[blocks,setBlocks]=useState<DocumentBlock[]>([]);
 const[loading,setLoading]=useState(false),[exporting,setExporting]=useState(false),[open,setOpen]=useState(false);
 const[error,setError]=useState(''),[exportError,setExportError]=useState(''),[status,setStatus]=useState(''),[done,setDone]=useState(false);
 const[prepared,setPrepared]=useState<{file:File;key:string}|null>(null),[shareSupported,setShareSupported]=useState(false),[shareStatus,setShareStatus]=useState('');
 const documentKey=JSON.stringify({date:result?.date,blocks});
 const readyFile=prepared?.key===documentKey?prepared.file:null;
 useEffect(()=>{setDone(false);setShareStatus('');},[documentKey]);
 const generate=useCallback(async(selected:Date)=>{
  setLoading(true);setError('');setExportError('');setDone(false);setPrepared(null);setShareStatus('');
  try{const r=await fetch('/api/calendar?date='+iso(selected)),data=await r.json() as CalendarResult&{error?:string};if(!r.ok)throw new Error(data.error??'Не удалось загрузить календарь.');setResult(data);setBlocks(data.blocks);setOpen(true);setDate(selected);return{date:data.date,groups:data.groupCount};}
  catch(e){setError(e instanceof Error?e.message:'Ошибка загрузки');throw e;}finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:unknown)=>void}}).modelContext;
  if(!context?.registerTool)return;const lifecycle=new AbortController();
  try{context.registerTool({name:'start_saints_document',title:'Подготовить список святых',description:'Загрузить календарь по новому стилю и открыть список для редактирования.',inputSchema:{type:'object',properties:{date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}},required:['date'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:unknown)=>{const value=(input as{date?:string})?.date;if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Нужна дата YYYY-MM-DD.');const parsed=new Date(value+'T12:00:00');if(isNaN(parsed.getTime())||iso(parsed)!==value)throw new Error('Дата не существует.');return generate(parsed);}},{signal:lifecycle.signal});}catch{}
  return()=>lifecycle.abort();
 },[generate]);
 async function download(kind:'pdf'|'word'){
  setExporting(true);setExportError('');setDone(false);setShareStatus('');
  try{
   const{exportDocument,saveFile}=await import('@/lib/export');
   const file=kind==='pdf'&&readyFile?readyFile:await exportDocument(blocks,result!.date,kind,setStatus);
   if(kind==='pdf'){
    setPrepared({file,key:documentKey});
    const supported=!!navigator.share&&!!navigator.canShare?.({files:[file]});
    setShareSupported(supported);
    if(!supported){saveFile(file,file.name);setDone(true);}
   }else{saveFile(file,file.name);setDone(true);}
  }catch(e){setExportError(e instanceof Error?e.message:'Не удалось подготовить файл.');}finally{setExporting(false);setStatus('');}
 }
 function sharePdf(){
  if(!readyFile)return;
  setExportError('');setShareStatus('');
  // Invoke directly in this click, while Safari still has user activation.
  let promise:Promise<void>;
  try{promise=navigator.share({files:[readyFile]});}catch{setExportError('Не удалось открыть отправку. Нажмите «Скачать PDF» и отправьте сохранённый файл.');return;}
  setExporting(true);
  void promise.then(()=>setShareStatus('Файл передан выбранному приложению.')).catch(e=>{
   if(e?.name!=='AbortError')setExportError('Не удалось открыть отправку. Нажмите «Скачать PDF» и отправьте сохранённый файл.');
  }).finally(()=>setExporting(false));
 }
 async function savePdf(){
  if(!readyFile)return;
  const{saveFile}=await import('@/lib/export');saveFile(readyFile,readyFile.name);setDone(true);
 }
 const editable=blocks.some(b=>b.text.trim());
 return<div className="site-shell">
  <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><BookOpen size={23}/></span><span>Святые дня</span></a><span className="top-meta">БОГОСЛУЖЕБНЫЙ СПИСОК</span></header>
  <main className="workspace"><div className="page-heading"><div><span className="eyebrow">ПОДГОТОВКА К СЛУЖБЕ</span><h1>Святые на выбранный день</h1><p>Выберите дату. Проверьте список. Скачайте для печати.</p></div><span className="format-badge"><FileText size={17}/>А4 · одна страница</span></div>
   <div className="working-grid"><section className="date-panel"><div className="panel-heading"><CalendarDays size={20}/><h2>Дата богослужения</h2></div><div className="selected-date">{display(date)}<span>По новому стилю</span></div>
    <Calendar locale={ru} mode="single" required selected={date} onSelect={d=>{if(d){setDate(d);setError('');}}} month={month} onMonthChange={setMonth} weekStartsOn={1} captionLayout="dropdown" startMonth={new Date(1900,0)} endMonth={new Date(2100,11)} className="saints-calendar"/>
    <div className="date-shortcuts"><Button variant="outline" onClick={()=>{const d=today();setDate(d);setMonth(d);}}>Сегодня</Button><div><Button variant="ghost" size="icon" aria-label="Предыдущий день" onClick={()=>{const d=new Date(date);d.setDate(d.getDate()-1);setDate(d);setMonth(d);}}><ChevronLeft size={18}/></Button><Button variant="ghost" size="icon" aria-label="Следующий день" onClick={()=>{const d=new Date(date);d.setDate(d.getDate()+1);setDate(d);setMonth(d);}}><ChevronRight size={18}/></Button></div></div>
    <Button className="generate-button" disabled={loading} onClick={()=>void generate(date).catch(()=>{})}>{loading?<LoaderCircle className="spin" size={19}/>:<BookOpen size={19}/>} {loading?'Загружаем святых…':'Сгенерировать святых'}</Button><p className="source-note">Источник: <a href={'https://azbyka.ru/days/'+iso(date)} target="_blank" rel="noreferrer">«Азбука веры»</a></p>
    {error&&<div className="error-message" role="alert"><CircleAlert size={18}/><span>{error}</span></div>}
   </section><section className="document-panel"><div className="preview-heading"><div><span className="eyebrow">ДОКУМЕНТ ДЛЯ ПЕЧАТИ</span><h2>{result?'Список подготовлен':'Ваш список святых'}</h2></div>{result&&<Button variant="outline" onClick={()=>setOpen(true)}><Pencil size={16}/>Редактировать</Button>}</div>
    <div className="paper-stage">{result?<div className="paper result-paper" aria-label="Предварительный список святых">{blocks.map((b,i)=><p key={i} className={b.allBold?'all-bold':''}><strong>{b.label}{b.label?' ':''}</strong>{b.text}</p>)}</div>:<div className="paper empty-paper"><div className="paper-watermark"><FileText size={38}/></div><h3>Готов к заполнению</h3><p>Список появится после<br/>выбора даты и генерации</p><div className="paper-lines"><span/><span/><span/><span/></div><span className="paper-foot">Без заголовка и даты</span></div>}</div>
    <div className="preview-foot"><span><Check size={16}/>Группы святых сохранены</span><span><Check size={16}/>Только ударения источника</span></div>
   </section></div><div className="rules-strip"><span className="rules-title">ПОРЯДОК В ДОКУМЕНТЕ</span><p>По ликам, внутри лика — от древних к поздним. Соборы святых — в конце.</p><span>Без фамилий и годов</span></div>
  </main><footer className="site-footer"><span>Святые дня</span><span>Для чтения за богослужением</span></footer>
  <Dialog open={open} onOpenChange={value=>{if(!exporting)setOpen(value);}}><DialogContent className="editor-dialog" onEscapeKeyDown={e=>{if(exporting)e.preventDefault();}} onInteractOutside={e=>{if(exporting)e.preventDefault();}}><div className="editor-header"><span className="eyebrow">{result&&display(new Date(result.date+'T12:00:00'))}</span><DialogTitle className="editor-title">Проверьте список святых</DialogTitle><DialogDescription>Измените текст перед экспортом. Сокращения ликов и названия соборов будут выделены жирным.</DialogDescription></div>
   <div className="editor-scroll">{result?.warnings.length?<details className="review-notice"><summary><CircleAlert size={17}/>Есть записи для проверки ({result.warnings.length})</summary><ul>{result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>:null}<div className="editor-blocks">{blocks.map((b,i)=><div className={'editor-row '+(b.allBold&&!b.label?'council-row':'')} key={i}>{b.allBold&&!b.label?<span className="council-label">Собор / память отцов</span>:<Input aria-label={'Сокращение лика '+(i+1)} className="rank-input" value={b.label} onChange={e=>setBlocks(old=>old.map((v,j)=>j===i?{...v,label:e.target.value}:v))}/>}<Textarea aria-label={'Святые, группа '+(i+1)} value={b.text} rows={Math.min(7,Math.max(2,Math.ceil(b.text.length/80)))} onChange={e=>setBlocks(old=>old.map((v,j)=>j===i?{...v,text:e.target.value}:v))}/></div>)}</div><a className="editor-source" href={result?.source} target="_blank" rel="noreferrer">Открыть календарь источника</a></div>
   <div className="editor-bottom">{exportError&&<p className="error-message" role="alert">{exportError}</p>}{done&&<p className="success-message" role="status"><Check size={16}/>Файл готов и отправлен на скачивание</p>}{readyFile&&<div className="pdf-ready"><p role="status">PDF готов.{shareSupported?' Нажмите «Поделиться PDF» и выберите Telegram, почту или другое приложение.':' Скачайте файл для отправки.'}</p><div>{shareSupported&&<Button disabled={exporting} onClick={sharePdf}><Share2 size={18}/>Поделиться PDF</Button>}<Button variant="outline" disabled={exporting} onClick={()=>void savePdf()}><FileDown size={18}/>Скачать PDF</Button></div></div>}{shareStatus&&<p className="success-message" role="status">{shareStatus}</p>}<div className="export-actions"><span className="export-format">А4 · 1 страница</span><Button variant="outline" disabled={exporting||!editable} onClick={()=>download('word')}><FileText size={17}/>Word</Button><Button disabled={exporting||!editable} className="export-pdf" onClick={()=>download('pdf')}>{exporting?<LoaderCircle className="spin" size={18}/>:<FileDown size={18}/>} {exporting?status||'Подготовка…':'Подготовить PDF'}</Button></div></div>
  </DialogContent></Dialog>
 </div>;
}
