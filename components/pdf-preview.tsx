'use client';
import {useEffect,useRef,useState} from 'react';
import {FileDown,Share2,LoaderCircle,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {DocumentBlock} from '@/lib/calendar';
import {prepareDocumentPage,fitDocumentPage,createPdfFromPage,saveFile} from '@/lib/export';

export function PdfPreview({blocks,date,onChange}:{blocks:DocumentBlock[];date:string;onChange:(blocks:DocumentBlock[])=>void}){
 const initial=useRef(blocks),change=useRef(onChange);change.current=onChange;
 const viewport=useRef<HTMLDivElement>(null),mount=useRef<HTMLDivElement>(null);
 const[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(true),[sharing,setSharing]=useState(false);
 const[status,setStatus]=useState('Подготавливаем страницу…'),[error,setError]=useState(''),[message,setMessage]=useState('');
 const[dimensions,setDimensions]=useState({width:794,height:1123,scale:1});
 useEffect(()=>{
  let active=true,version=0,running=false,queued=false;
  let timer:ReturnType<typeof setTimeout>|undefined,dispose:(()=>void)|undefined,observer:ResizeObserver|undefined;
  let page:HTMLElement|undefined;
  const edited=initial.current.filter(b=>b.text.trim()).map(b=>({...b}));
  async function build(){
   if(!active||!page)return;
   if(running){queued=true;return;}
   running=true;const current=version;
   try{
    if(!edited.some(b=>b.text.trim()))throw new Error('Добавьте текст на листе перед скачиванием.');
    if(edited.map(b=>b.label+b.text).join('').length>30000)throw new Error('Текст слишком длинный для одной страницы. Сократите список.');
    fitDocumentPage(page);
    const next=await createPdfFromPage(page,date);
    if(active&&current===version){setFile(next);setBusy(false);setStatus('Изменения сохранены в PDF');}
   }catch(e){if(active&&current===version){setError(e instanceof Error?e.message:'Не удалось подготовить PDF.');setBusy(false);}}
   finally{running=false;if(active&&queued){queued=false;void build();}}
  }
  function schedule(){
   version++;setFile(null);setBusy(true);setError('');setMessage('');setStatus('Обновляем PDF…');
   if(timer)clearTimeout(timer);timer=setTimeout(()=>void build(),450);
  }
  void prepareDocumentPage(edited,s=>{if(active)setStatus(s);}).then(prepared=>{
   if(!active){prepared.dispose();return;}
   page=prepared.page;dispose=()=>{page?.remove();prepared.dispose();};
   const paragraphs=[...page.querySelectorAll<HTMLElement>('article p')];
   paragraphs.forEach((paragraph,index)=>{
    const block=edited[index];if(!block)return;
    paragraph.replaceChildren();paragraph.style.fontFamily='"Times New Roman",serif';paragraph.style.fontWeight='400';
    function field(value:string,label:string,bold:boolean,key:'label'|'text'){
     const element=document.createElement(bold?'strong':'span');element.textContent=value;
     element.contentEditable='true';element.spellcheck=false;element.className='pdf-editable';
     element.setAttribute('role','textbox');element.setAttribute('aria-label',label);element.setAttribute('aria-multiline','true');
     element.addEventListener('input',()=>{
      edited[index][key]=element.innerText.replace(/\u00a0/g,' ');
      change.current(edited.map(b=>({...b})));schedule();
     });
     element.addEventListener('paste',event=>{
      event.preventDefault();const plain=event.clipboardData?.getData('text/plain')??'';
      // Keep the document's type and bold hierarchy when pasting from other apps.
      document.execCommand('insertText',false,plain);
     });
     paragraph.appendChild(element);
    }
    if(block.label){field(block.label,'Лик в PDF, группа '+(index+1),true,'label');paragraph.appendChild(document.createTextNode(' '));}
    field(block.text,'Текст PDF, группа '+(index+1),!!block.allBold,'text');
   });
   mount.current?.appendChild(page);prepared.dispose();
   const resize=()=>{if(!active||!page||!viewport.current)return;const width=page.offsetWidth,height=page.offsetHeight;setDimensions({width,height,scale:Math.min(1,viewport.current.clientWidth/width)});};
   observer=new ResizeObserver(resize);if(viewport.current)observer.observe(viewport.current);resize();
   schedule();
  }).catch(e=>{if(active){setError(e instanceof Error?e.message:'Не удалось открыть предпросмотр.');setBusy(false);}});
  return()=>{active=false;if(timer)clearTimeout(timer);observer?.disconnect();dispose?.();};
 },[date]);
 function download(){if(!file)return;saveFile(file,file.name);setMessage('PDF отправлен на скачивание.');}
 function share(){
  if(!file)return;setError('');setMessage('');
  if(!navigator.share||!navigator.canShare?.({files:[file]})){
   saveFile(file,file.name);setMessage('Браузер не поддерживает отправку файлов. PDF скачан — отправьте его из Telegram, почты или другого приложения.');return;
  }
  try{
   const promise=navigator.share({files:[file]});setSharing(true);
   void promise.then(()=>setMessage('PDF передан выбранному приложению.')).catch(e=>{if(e?.name!=='AbortError')setError('Не удалось поделиться файлом. Скачайте PDF и отправьте его из приложения.');}).finally(()=>setSharing(false));
  }catch{setError('Не удалось поделиться файлом. Скачайте PDF и отправьте его из приложения.');}
 }
 return <>
  <div className="pdf-preview-stage"><div className="pdf-page-viewport" ref={viewport}><div className="pdf-page-frame" style={{width:dimensions.width*dimensions.scale,height:dimensions.height*dimensions.scale}}><div className="word-export-host pdf-live-page" ref={mount} style={{transform:`scale(${dimensions.scale})`,width:dimensions.width}}/></div></div></div>
  <div className="editor-bottom pdf-preview-bottom">
   {error&&<p className="error-message" role="alert">{error}</p>}
   {message&&<p className="success-message" role="status"><Check size={16}/>{message}</p>}
   <p className="pdf-update-status" role="status">{busy?<><LoaderCircle size={15} className="spin"/>{status}</>:error?'Исправьте текст на листе':status}</p>
   <div className="pdf-final-actions"><Button disabled={!file||busy||sharing} onClick={download}><FileDown size={18}/>Скачать</Button><Button variant="outline" disabled={!file||busy||sharing} onClick={share}>{sharing?<LoaderCircle size={18} className="spin"/>:<Share2 size={18}/>}Поделиться</Button></div>
  </div>
 </>;
}
