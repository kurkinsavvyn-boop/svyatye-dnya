import { Document, Packer, Paragraph, TextRun, LineRuleType } from 'docx';
import type {DocumentBlock} from './calendar';
export function buildWord(blocks:DocumentBlock[],size:number){
 return new Document({creator:'Святые дня',styles:{default:{document:{run:{font:'Times New Roman',size:Math.round(size*2),color:'000000'},paragraph:{spacing:{before:0,after:0,line:360,lineRule:LineRuleType.AUTO}}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},children:blocks.filter(b=>b.text.trim()).map(b=>new Paragraph({spacing:{before:b.allBold?Math.round(size*10):0,after:0,line:360,lineRule:LineRuleType.AUTO},children:[...(b.label?[new TextRun({text:b.label.trim()+' ',bold:true})]:[]),new TextRun({text:b.text.trim(),bold:!!b.allBold})]}))}]});
}
export function saveFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export async function prepareDocumentPage(blocks:DocumentBlock[],status:(s:string)=>void){
 if(!blocks.some(b=>b.text.trim()))throw new Error('Добавьте текст святых перед экспортом.');
 const text=blocks.map(b=>b.label+' '+b.text).join('\n');
 if(text.length>30000)throw new Error('Текст слишком длинный для одной страницы. Сократите список.');
 status('Подбираем шрифт…');
 await Promise.all([document.fonts.load('34px "Times New Roman"'),document.fonts.load('bold 34px "Times New Roman"')]);
 const {renderAsync}=await import('docx-preview');
 const host=document.createElement('div');host.className='word-export-host';host.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:white;z-index:-100;';document.body.appendChild(host);
 try{
  async function render(size:number){
   const blob=await Packer.toBlob(buildWord(blocks,size));host.replaceChildren();
   await renderAsync(blob,host,host,{inWrapper:false,breakPages:false,ignoreLastRenderedPageBreak:true,ignoreFonts:false,className:'print-docx',useBase64URL:true});
   // Paragraphs need their own size: docx-preview applies run sizes to spans,
   // so an inherited paragraph size can produce overlapping lines.
   for (const paragraph of host.querySelectorAll<HTMLElement>('section article p')) {
    paragraph.style.fontSize = size + 'pt';
    paragraph.style.lineHeight = '1.5';
    paragraph.style.minHeight = '0';
    paragraph.style.overflowWrap = 'normal';
    paragraph.style.wordBreak = 'normal';
    paragraph.style.hyphens = 'none';
   }
   await document.fonts.ready;
   const page=host.querySelector('section') as HTMLElement|null;
   if(!page)throw new Error('Не удалось отобразить Word-документ.');
   const article=page.querySelector('article') as HTMLElement|null;
   const available=(841.9-113.4)*96/72;
   const fits=!!article&&article.scrollHeight<=available-4&&article.scrollWidth<=article.clientWidth+1&&page.scrollWidth<=page.clientWidth+1;
   page.style.background='#fff';page.style.color='#000';
   return{blob,page,fits};
  }
  let current=await render(34),size=34;
  if(!current.fits){let low=5,high=34;for(let i=0;i<8;i++){const mid=Math.floor(((low+high)/2)*2)/2;if(mid<=low)break;const candidate=await render(mid);if(candidate.fits)low=mid;else high=mid;}size=low;current=await render(size);}
  if(!current.fits)throw new Error('Этот текст не помещается на одной странице. Сократите его перед экспортом.');
  current.page.style.height='841.9pt';current.page.style.minHeight='841.9pt';current.page.style.boxSizing='border-box';
  return {...current,size,dispose:()=>host.remove()};
 }catch(error){host.remove();throw error;}
}

export function fitDocumentPage(page:HTMLElement){
 const article=page.querySelector('article') as HTMLElement|null;
 if(!article)throw new Error('Не удалось отобразить страницу.');
 const paragraphs=[...article.querySelectorAll<HTMLElement>('p')];
 const fits=(size:number)=>{
  for(const paragraph of paragraphs){paragraph.style.fontSize=size+'pt';paragraph.style.lineHeight='1.5';}
  return article.scrollHeight<=(841.9-113.4)*96/72-4&&article.scrollWidth<=article.clientWidth+1&&page.scrollWidth<=page.clientWidth+1;
 };
 let size=34;
 if(!fits(size)){let low=5,high=34;for(let i=0;i<8;i++){const mid=Math.floor(low+high)/2;if(mid<=low)break;if(fits(mid))low=mid;else high=mid;}size=low;}
 if(!fits(size))throw new Error('Текст не помещается на одной странице. Сократите его.');
 return size;
}

export async function createPdfFromPage(page:HTMLElement,date:string){
 // Capture a snapshot so typing can continue while the file is prepared.
 const host=document.createElement('div');host.className='word-export-host pdf-capture-host';
 host.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:white;z-index:-100;';
 const copy=page.cloneNode(true) as HTMLElement;
 copy.style.transform='none';copy.style.height='841.9pt';copy.style.minHeight='841.9pt';copy.style.overflow='hidden';
 for(const editable of copy.querySelectorAll<HTMLElement>('[contenteditable]')){editable.removeAttribute('contenteditable');editable.removeAttribute('role');editable.style.outline='none';editable.style.background='transparent';}
 host.appendChild(copy);document.body.appendChild(host);
 try{
  const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas'),import('jspdf')]);
  await document.fonts.ready;
  const canvas=await html2canvas(copy,{scale:3.125,backgroundColor:'#ffffff',logging:false,useCORS:true,scrollX:0,scrollY:0});
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
  return new File([pdf.output('blob')],'Святые_'+date+'.pdf',{type:'application/pdf'});
 }finally{host.remove();}
}

export async function exportDocument(blocks:DocumentBlock[],date:string,kind:'pdf'|'word',status:(s:string)=>void){
 const prepared=await prepareDocumentPage(blocks,status);
 try{
  if(kind==='word')return new File([prepared.blob],'Святые_'+date+'.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  status('Создаём PDF…');return await createPdfFromPage(prepared.page,date);
 }finally{prepared.dispose();}
}
