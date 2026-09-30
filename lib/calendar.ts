import { parseHTML } from 'linkedom';
export type SaintEntry={text:string;original:string;rank:number;plural:boolean;female:boolean;year:number|null;order:number};
export type DocumentBlock={label:string;text:string;allBold?:boolean};
export type CalendarResult={date:string;source:string;blocks:DocumentBlock[];entries:SaintEntry[];warnings:string[];groupCount:number};
const labels=[['Ап.','Апп.'],['Праот.','Праотт.'],['Прор.','Прорр.'],['Равноап.','Равноапп.'],['Свт.','Свтт.'],['Вмч.','Вмчч.'],['Сщмч.','Сщмчч.'],['Прмч.','Прмчч.'],['Мч.','Мчч.'],['Страст.','Страстт.'],['Исп.','Испп.'],['Бесср.','Бессрр.'],['Блгв.','Блгвв.'],['Блж.','Блжж.'],['Прп.','Прпп.'],['Прав.','Правв.'],['Столп.','Столпп.'],['Чуд.','Чудд.'],['Юрод.','Юродд.']];
const noAccent=(s:string)=>s.normalize('NFD').replace(/\u0301/g,'');
const clean=(s:string)=>s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').replace(/\s+([,;:.])/g,'$1').replace(/,\s*,/g,',').trim();
function roman(s:string){const m:Record<string,number>={I:1,V:5,X:10,L:50,C:100};return [...s].reduce((n,c,i)=>n+((m[c]??0)<(m[s[i+1]]??0)?-(m[c]??0):(m[c]??0)),0);}
export function chronology(text:string):number|null{
 for(const match of text.matchAll(/\(([^)]*)\)/g)){
  const d=match[1];if(/переходящ|воскресень|суббот|понедель|празднован/i.test(d))continue;const years=[...d.matchAll(/\b(\d{1,4})\b/g)].map(m=>+m[1]).filter(y=>y>0&&y<2200);
  if(years.length)return /до\s*(?:р\.?\s*х|н\.?\s*э)/i.test(d)?-Math.max(...years):Math.min(...years);
  const century=d.match(/^\s*([IVX]+)\s*(?:[-–]\s*[IVX]+)?(?:\s*в[^)]*)?\s*$/i);if(century){const value=(roman(century[1].toUpperCase())-1)*100+50;return /до\s*(?:р\.?\s*х|н\.?\s*э)/i.test(d)?-value:value;}
 }return null;
}
function classify(text:string){
 const normalized=noAccent(text).toLowerCase(),optional=normalized.match(/^свв?\.\s*/),offset=optional?.[0].length??0;
 const alternatives:[number,RegExp][]=[
 [7,/^(?:прмчч?\.|прмцц?\.|преподобномучен\S*)\s*/],[6,/^(?:сщмчч?\.|сщмцц?\.|священномучен\S*)\s*/],
 [10,/^(?:сщисп\.|прписп\.|священноисповед\S*|преподобноисповед\S*)\s*/],[5,/^(?:вмчч?\.|вмцц?\.|великомучен\S*)\s*/],
 [0,/^(?:апп?\.|апостол\S*)\s*/],[1,/^(?:праотт?\.|праот\S*)\s*/],[2,/^(?:прорр?\.|пророк\S*)\s*/],
 [3,/^(?:равноапп?\.|равноапостол\S*)\s*/],[4,/^(?:свтт?\.|святител\S*)\s*/],[8,/^(?:мчч?\.|мцц?\.|мчцц?\.|мучен\S*)\s*/],
 [9,/^(?:страстт?\.|страстотерп\S*)\s*/],[10,/^(?:испп?\.|исповед\S*)\s*/],[11,/^(?:бессрр?\.|бессребрен\S*)\s*/],
 [12,/^(?:блгвв?\.|благовер\S*)\s*/],[13,/^(?:блжж?\.|блажен\S*)\s*/],[14,/^(?:прпп?\.|преподобн\S*)\s*/],
 [15,/^(?:правв?\.|праведн\S*)\s*/],[16,/^(?:столпп?\.|столпник\S*)\s*/],[17,/^(?:чудд?\.|чудотвор\S*)\s*/],[18,/^(?:юродд?\.|юродив\S*)\s*/]];
 for(const [rank,re]of alternatives){const m=re.exec(normalized.slice(offset));if(!m)continue;
  let consumed=0;while(consumed<text.length&&noAccent(text.slice(0,consumed)).length<offset+m[0].length)consumed++;
  const prefix=m[0].trim();return{rank,consumed,plural:/(?:чч|цц|пп|тт|рр|вв|жж|дд)\./.test(prefix)||/(?:ов|ей|иц|цы|и)$/.test(prefix.replace(/\.$/,'')),female:/ц|еницы|ениц|ницы|ниц/.test(prefix),prefix};
 }return null;
}
function abbreviation(rank:number,plural:boolean,female:boolean){
 const f:Record<number,[string,string]>={5:['Вмц.','Вмцц.'],6:['Сщмц.','Сщмцц.'],7:['Прмц.','Прмцц.'],8:['Мц.','Мцц.']};
 return(female&&f[rank]?f[rank]:labels[rank])[plural?1:0];
}
// Keep calendar groups and chronology, with one shared title for presbyters.
export function formatHieromartyrs(texts:string[]):string {
 const role=/,\s*пре[\u0301]?сви[\u0301]?те[\u0301]?р(?:а|ов)(?=[;,.\s]|$)/gi;
 const counts=texts.map(text=>[...text.matchAll(role)].length);
 if(counts.reduce((a,b)=>a+b,0)<2)return texts.join('; ');
 const last=counts.length-1-[...counts].reverse().findIndex(count=>count>0);
 return texts.map((text,i)=>{
  const stripped=clean(text.replace(role,''));
  return stripped+(i===last?', пресвитеров':'');
 }).join('; ');
}
export function parseCalendar(html:string,date:string):CalendarResult{
 const{document}=parseHTML(html),items=[...document.querySelectorAll('.day__text ul[class*="paragraph-"] > li')];
 if(!items.length)throw new Error('На странице календаря не найден список святых. Попробуйте другую дату или повторите загрузку.');
 const entries:SaintEntry[]=[],endings:DocumentBlock[]=[],warnings:string[]=[];
 for(const[order,li]of items.entries()){
  const original=clean(li.textContent??''),plain=noAccent(original);
  if(/^(?:Собор(?:\s|$)|Память.*(?:отц|отец))/i.test(plain)){
   for(const e of li.querySelectorAll('.secondary-content, em, i'))e.remove();
   endings.push({label:'',text:clean(li.textContent??'').replace(/\([^)]*\d[^)]*\)/g,'').trim(),allBold:true});continue;
  }
  const links=[...li.querySelectorAll('a')].map(a=>a.getAttribute('href')??'');
  if(links.some(h=>/\/ikona-/.test(h))||(!links.some(h=>/\/sv[v]?-/.test(h))&&/Божией Матери|Богородиц|Господн|Предпраздн|Попраздн|Отдание|Пасха|Рождество Христово|Богоявление|Преображение|Вознесение|Пятидесятниц/i.test(plain)))continue;
  if(!links.some(h=>/\/sv[v]?-/.test(h))&&!/апостол|отцов|святых/i.test(plain))continue;
  const year=chronology(original);
  for(const e of li.querySelectorAll('.secondary-content, em, i'))e.remove();
  let text=clean(li.textContent??'').replace(/\([^)]*\d[^)]*\)/g,'').replace(/\([^)]*[IVX]+\s*в[^)]*\)/g,'').replace(/\((?:[А-ЯЁа-яё\u0301-]+|в миру[^)]*)\)/g,(_m,offset,str)=>{const p=_m.slice(1,-1);return /(?:ского|цкого|ской|цкой)$/.test(noAccent(p))?' '+p:'';}).replace(/^(?:Перене[\u0301]?сение|Обре[\u0301]?тение)\s+(?:мощей|святых мощей)\s*/i,'').replace(/^(?:Славных и всехвальных )?первоверховных апостолов\s*/i,'Апп. ');
  text=clean(text).replace(/[;,\s]+$/,'');const c=classify(text);
  // Only the configured saint ranks enter the document; councils were handled above.
  if(!c)continue;
  let body=clean(text.slice(c.consumed)).replace(/^и\s+(?=(?:евангелиста|ев\.))/i,'');
  if(/сщисп|прписп/.test(c.prefix))body+=' исп.';
  const segments:{body:string;classification:NonNullable<ReturnType<typeof classify>>}[]=[];
  let segmentStart=0,active=c;
  const secondary=/(?:,\s*|\s+и\s+)((?:сщмчч?|сщмцц?|прмчч?|прмцц?|вмчч?|вмцц?|мчч?|мцц?|свтт?|прпп?|правв?|блгвв?|блжж?)\.)\s+/gi;
  for(const match of body.matchAll(secondary)){
   const next=classify(match[1]+' ');if(!next||next.rank===active.rank)continue;
   segments.push({body:body.slice(segmentStart,match.index).replace(/[,;\s]+$/,''),classification:active});
   segmentStart=match.index!+match[0].length;active=next;
  }
  segments.push({body:body.slice(segmentStart),classification:active});
  for(const segment of segments){
   const k=segment.classification;
   let piece=clean(segment.body);
   // Calendar biographical explanations are not part of the liturgical name.
   // Apply after mixed ranks are split, so a later saint is preserved.
   piece=piece.replace(/,\s*(?:приня[\u0301]?вш|крести[\u0301]?вш|пострада[\u0301]?вш|жи[\u0301]?вш|сконча[\u0301]?вш|роди[\u0301]?вш|подвиза[\u0301]?вш|основа[\u0301]?вш)[\s\S]*?(?=,\s*(?:сщмчч?|сщмцц?|прмчч?|прмцц?|вмчч?|вмцц?|мчч?|мцц?|свтт?|прпп?|правв?|блгвв?|блжж?|апп?|равноапп?|прорр?|испп?|бессрр?|страстт?|праотт?|столпп?|чудд?|юродд?)\.|;|$)/i,'');
   piece=piece.replace(/(?:сщмчч?|прмчч?|вмчч?|мчч?|мцц?|свтт?|прпп?)\.\s+/gi,(prefix)=>classify(prefix)?.rank===k.rank?'':prefix);
   const plural=k.plural||/и с ним|и ученик|и .*дев|\d+-?ти:/.test(noAccent(piece));
   entries.push({text:piece,original,rank:k.rank,plural,female:k.female,year,order});
   if(year===null)warnings.push('Год не указан: '+piece+' — порядок среди записей без года сохранён из календаря.');
  }
 }
 if(!entries.length&&!endings.length)throw new Error('На эту дату не удалось получить список святых. Проверьте календарь источника.');
 const blocks:DocumentBlock[]=[];
 for(let rank=0;rank<labels.length;rank++){
  const group=entries.filter(e=>e.rank===rank).sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||a.order-b.order);
  if(group.length){const primary=rank===0&&group.length===1&&/первоверховных апостолов/i.test(noAccent(group[0].original));blocks.push({label:primary?'Первоверховных апостолов':abbreviation(rank,group.length>1||group.some(e=>e.plural),group.every(e=>e.female)),text:rank===6?formatHieromartyrs(group.map(e=>e.text)):group.map(e=>e.text).join('; '),...(primary?{allBold:true}:{})});}
 }
 return{date,source:'https://azbyka.ru/days/'+date,blocks:[...blocks,...endings],entries,warnings,groupCount:entries.length+endings.length};
}
