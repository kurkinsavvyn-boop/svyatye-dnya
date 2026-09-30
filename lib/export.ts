import { Document, Packer, Paragraph, TextRun } from 'docx';
import type {DocumentBlock} from './calendar';
export function buildWord(blocks:DocumentBlock[],size:number){
 return new Document({creator:'Святые дня',styles:{default:{document:{run:{font:'Times New Roman',size:Math.round(size*2),color:'000000'},paragraph:{spacing:{before:0,after:0,line:Math.round(size*20*1.15)}}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},children:blocks.filter(b=>b.text.trim()).map(b=>new Paragraph({spacing:{before:b.allBold?Math.round(size*10):0,after:0,line:Math.round(size*20*1.15)},children:[...(b.label?[new TextRun({text:b.label.trim()+' ',bold:true})]:[]),new TextRun({text:b.text.trim(),bold:!!b.allBold})]}))}]});
}
function save(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export async function exportDocument(blocks:DocumentBlock[],date:string,kind:'pdf'|'word',status:(s:string)=>void){
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
   await document.fonts.ready;
   const page=host.querySelector('section') as HTMLElement|null;
   if(!page)throw new Error('Не удалось отобразить Word-документ.');
   const article=page.querySelector('article') as HTMLElement|null;
   const style=getComputedStyle(page),available=(841.9-113.4)*96/72;
   const fits=!!article&&article.scrollHeight<=available-4&&page.scrollWidth<=page.clientWidth+1;
   page.style.background='#fff';page.style.color='#000';
   return{blob,page,fits};
  }
  let current=await render(34),size=34;
  if(!current.fits){let low=5,high=34;for(let i=0;i<8;i++){const mid=Math.floor(((low+high)/2)*2)/2;if(mid<=low)break;const candidate=await render(mid);if(candidate.fits)low=mid;else high=mid;}size=low;current=await render(size);}
  if(!current.fits)throw new Error('Этот текст не помещается на одной странице. Сократите его перед экспортом.');
  if(kind==='word'){save(current.blob,'Святые_'+date+'.docx');return;}
  status('Создаём PDF…');
  const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas'),import('jspdf')]);
  current.page.style.height='841.9pt';current.page.style.minHeight='841.9pt';current.page.style.boxSizing='border-box';current.page.style.overflow='hidden';
  const canvas=await html2canvas(current.page,{scale:3.125,backgroundColor:'#ffffff',logging:false,useCORS:true,scrollX:0,scrollY:0});
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
  if(pdf.getNumberOfPages()!==1)throw new Error('Не удалось подготовить одностраничный PDF.');
  save(pdf.output('blob'),'Святые_'+date+'.pdf');
 }finally{host.remove();}
}
