import { parseHTML } from 'linkedom';
export type SaintEntry={text:string;original:string;rank:number;plural:boolean;female:boolean;year:number|null;order:number};
export type DocumentBlock={label:string;text:string;allBold?:boolean};
export type CalendarResult={date:string;source:string;blocks:DocumentBlock[];entries:SaintEntry[];warnings:string[];groupCount:number};
const labels=[['Ап.','Апп.'],['Праот.','Праотт.'],['Прор.','Прорр.'],['Равноап.','Равноапп.'],['Свт.','Свтт.'],['Вмч.','Вмчч.'],['Сщмч.','Сщмчч.'],['Прмч.','Прмчч.'],['Мч.','Мчч.'],['Страст.','Страстт.'],['Исп.','Испп.'],['Бесср.','Бессрр.'],['Блгв.','Блгвв.'],['Блж.','Блжж.'],['Прп.','Прпп.'],['Прав.','Правв.'],['Столп.','Столпп.'],['Чуд.','Чудд.'],['Юрод.','Юродд.']];
const noAccent=(s:string)=>s.replace(/\u0301/g,'');
const clean=(s:string)=>s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').replace(/\s+([,;:.])/g,'$1').replace(/,\s*,/g,',').trim();
function roman(s:string){const m:Record<string,number>={I:1,V:5,X:10,L:50,C:100};return [...s].reduce((n,c,i)=>n+((m[c]??0)<(m[s[i+1]]??0)?-(m[c]??0):(m[c]??0)),0);}
export function chronology(text:string):number|null{
 const values:number[]=[];
 for(const match of text.matchAll(/\(([^)]*)\)/g)){
  const d=noAccent(match[1]);if(/переходящ|воскресень|суббот|понедель|празднован/i.test(d))continue;
  const before=/до\s*(?:р\.?\s*х|н\.?\s*э)/i.test(d);
  const years=[...d.matchAll(/\b(\d{1,4})\b/g)].map(m=>+m[1]).filter(y=>y>0&&y<2200);
  if(years.length){values.push(...years.map(y=>before?-y:y));continue;}
  const century=d.match(/^\s*([IVX]+)(?:\s*[-–]\s*[IVX]+)?(?:\s*в[^)]*)?\s*$/i);
  if(century){const value=(roman(century[1].toUpperCase())-1)*100+50;values.push(before?-value:value);}
 }
 return values.length?Math.min(...values):null;
}
export function classify(text:string){
 const normalized=noAccent(text).toLowerCase(),optional=normalized.match(/^свв?\.\s*/),offset=optional?.[0].length??0;
 const alternatives:[number,RegExp][]=[
 [7,/^(?:прмчч?\.|прмцц?\.|преподобномучен\S*)\s*/],[6,/^(?:сщмчч?\.|сщмцц?\.|священномучен\S*)\s*/],
 [10,/^(?:сщисп\.|прписп\.|священноисповед\S*|преподобноисповед\S*)\s*/],[5,/^(?:вмчч?\.|вмцц?\.|великомучен\S*)\s*/],
 [0,/^(?:апп?\.|апостол\S*)\s*/],[1,/^(?:праотт?\.|праот\S*)\s*/],[2,/^(?:прорр?\.|пророк\S*)\s*/],
 [3,/^(?:равноапп?\.|равноапостол\S*)\s*/],[4,/^(?:свтт?\.|святител\S*)\s*/],[8,/^(?:мчч?\.|мцц?\.|мчцц?\.|мучен\S*)\s*/],
 [9,/^(?:страстт?\.|страстотерп\S*)\s*/],[10,/^(?:испп?\.|исповед\S*)\s*/],[11,/^(?:бессрр?\.|бессребрен\S*)\s*/],
 [12,/^(?:блгвв?\.|благовер\S*|правовер\S*)\s*/],[13,/^(?:блжж?\.|блажен\S*)\s*/],[14,/^(?:прпп?\.|преподобн\S*)\s*/],
 [15,/^(?:правв?\.|праведн\S*)\s*/],[16,/^(?:столпп?\.|столпник\S*)\s*/],[17,/^(?:чудд?\.|чудотвор\S*)\s*/],[18,/^(?:юродд?\.|юродив\S*)\s*/]];
 for(const [rank,re]of alternatives){const m=re.exec(normalized.slice(offset));if(!m)continue;
  let consumed=0;while(consumed<text.length&&noAccent(text.slice(0,consumed)).length<offset+m[0].length)consumed++;
  const prefix=m[0].trim();return{rank,consumed,plural:/(?:чч|цц|пп|тт|рр|вв|жж|дд)\./.test(prefix)||/(?:ов|ей|иц)$/.test(prefix.replace(/\.$/,'')),female:/(?:мц|мчц|цц)\.|(?:ениц|еницы|еницам|еницами)$/.test(prefix),prefix};
 }return null;
}
function abbreviation(rank:number,plural:boolean,female:boolean){
 const f:Record<number,[string,string]>={5:['Вмц.','Вмцц.'],6:['Сщмц.','Сщмцц.'],7:['Прмц.','Прмцц.'],8:['Мц.','Мцц.']};
 return(female&&f[rank]?f[rank]:labels[rank])[plural?1:0];
}
// Shared titles belong only to their own names. In particular, a deacon or
// bishop must not get swept into the single shared presbyter title.
export function formatHieromartyrs(texts:string[]):string {
 const priests:string[]=[],pieces:string[]=[];
 let priestPosition=-1,priestCount=0;
 for(const text of texts){
  const tokens=text.replace(/(пре[\u0301]?сви[\u0301]?те[\u0301]?р(?:а|ов))\s+и\s+(?=[А-ЯЁ])/g,'$1, ').split(',').map(clean).filter(Boolean),pending:string[]=[];
  let lastOther=-1;
  for(const token of tokens){
   const role=noAccent(token).toLowerCase();
   if(/^пресвитер(?:а|ов)(?:\s|$)/.test(role)){
    if(!pending.length){pieces.push(token);continue;}
    if(/^пресвитер(?:а|ов)\s+\S/.test(role)){pieces.push(pending.join(', ')+', '+token);pending.length=0;lastOther=pieces.length-1;continue;}
    if(priestPosition<0){priestPosition=pieces.length;pieces.push('');}
    const names=pending.join(', ').replace(/^и\s+/i,'');priests.push(names);
    priestCount+=/пресвитеров/.test(role)||pending.length>1||/\sи\s/.test(names)?2:1;
    pending.length=0;lastOther=-1;
   }else if(/^(?:и\s+)?(?:архи)?(?:епископ|диакон|протодиакон|митрополит|патриарх|архимандрит|иеромонах|игумен|викари)[а-я]*(?:\s|$)/.test(role)){
    if(pending.length){pieces.push(pending.join(', ')+', '+token);pending.length=0;lastOther=pieces.length-1;}
    else if(lastOther>=0)pieces[lastOther]+=', '+token;
    else pieces.push(token);
   }else pending.push(token.replace(/^(?:и\s+)?с ним\s+(?=[А-ЯЁ])/,'').replace(/^и\s+(?=[А-ЯЁ])/,'').trim());
  }
  if(pending.length)pieces.push(pending.join(', '));
 }
 if(priestPosition>=0)pieces[priestPosition]=priests.join('; ')+', '+(priestCount>1?'пресвитеров':'пресвитера');
 return pieces.filter(Boolean).join('; ');
}
export function cleanCalendarComments(text:string):string {
 // Parentheses carry dates, surnames and calendar notes; never print them.
 text=text.replace(/\([^()]*\)/g,'').replace(/,\s*во\s+Святом\s+Крещении\s+[^,;]+/gi,'').replace(/,\s*в\s+(?:Ближних|Дальних)\s+пещерах/gi,'');
 const explanation=/,\s*(?:приня[\u0301]?вш|крести[\u0301]?вш|пострада[\u0301]?вш|жи[\u0301]?вш|сконча[\u0301]?вш|роди[\u0301]?вш|подвиза[\u0301]?вш|основа[\u0301]?вш|бы[\u0301]?вш|в миру(?=[\s,;]|$)|при крещении(?=[\s,;]|$)|котор|изве[\u0301]?стн|имену[\u0301]?ем|называ[\u0301]?ем|обрати[\u0301]?вш|(?:отца|матери|брата|сестры)\s+(?:святых(?=[\s,;]|$)|свт\.|прп\.|мч\.)|творца\s+канонов(?=[\s,;]|$))[\s\S]*?(?=,\s*(?:сщмчч?|сщмцц?|прмчч?|прмцц?|вмчч?|вмцц?|мчч?|мцц?|свтт?|прпп?|правв?|блгвв?|блжж?|апп?|равноапп?|прорр?|испп?|бессрр?|страстт?|праотт?|столпп?|чудд?|юродд?)\.|;|$)/gi;
 return clean(text.replace(explanation,'')).replace(/[,;\s]+$/,'');
}
function commemoratedName(text:string){
 return clean(text).replace(/^(?:Рождество|Усекновение\s+главы|Зачатие|(?:Первое|Второе|Третье)\s+обре[\u0301]?тение\s+главы)\s+(?:(?:честно[\u0301]?го|сла[\u0301]?вного|свято[\u0301]?го)\s+)*/i,'').replace(/^(?:Перене[\u0301]?сение|Обре[\u0301]?тение|Возвраще[\u0301]?ние)\s+(?:мощей|святых мощей)\s*/i,'')
  .replace(/^(?:Преставле[\u0301]?ние|Память)\s+/i,'')
  .replace(/^(?:Славных и всехвальных )?первоверховных апостолов\s*/i,'Апп. ');
}
function isCouncil(text:string,links:string[]){
 return /^(?:Собор(?:\s|$)|Память.*(?:отц|отец)|(?:Всех\s+)?(?:преподобных|святых|богоносных).*(?:отц|отец))/i.test(noAccent(text))||links.some(h=>/\/svv?-sobor-/.test(h));
}
function saintLinks(li:Element){return [...li.querySelectorAll('a')].map(a=>a.getAttribute('href')??'').filter(h=>/\/svv?-/.test(h));}
function isFeast(text:string,li:Element){
 const links=[...li.querySelectorAll('a')].map(a=>a.getAttribute('href')??'');
 return links.some(h=>/\/ikona-/.test(h))||/^(?:Празднован|Празднест|Предпраздн|Попраздн|Отдание|Покров Пресвят|Пасха|День Святого Духа|Начало инди|По плоти обрезание|Изнесение Честных|Воздвижение Честного)/i.test(noAccent(text))||(!saintLinks(li).length&&!classify(commemoratedName(text))&&!isCouncil(text,links));
}
const abbreviatedRank='(?:сщмчч?|сщмцц?|прмчч?|прмцц?|вмчч?|вмцц?|мчч?|мцц?|мчцц?|свтт?|прпп?|правв?|блгвв?|блжж?|апп?|равноапп?|прорр?|испп?|сщисп|прписп|бессрр?|страстт?|праотт?|столпп?|чудд?|юродд?)\\.';
const fullRanks=['преподобномучен','священномучен','великомучен','священноисповед','преподобноисповед','равноапостол','апостол','праот','пророк','святител','мучен','страстотерп','исповед','бессребрен','благовер','правовер','блажен','преподобн','праведн','столпник','чудотвор','юродив'];
const rankToken='(?:'+abbreviatedRank+'|'+fullRanks.map(root=>[...root].map(letter=>letter+'[\\u0301]?').join('')+'[А-ЯЁа-яё\\u0301]*').join('|')+')';

export function parseCalendar(html:string,date:string):CalendarResult{
 const{document}=parseHTML(html),items=[...document.querySelectorAll('.day__text ul[class*="paragraph-"] > li')];
 if(!items.length)throw new Error('На странице календаря не найден список святых. Попробуйте другую дату или повторите загрузку.');
 const entries:SaintEntry[]=[],endings:DocumentBlock[]=[],warnings:string[]=[],unclassified:DocumentBlock[]=[];
 // Some lists are split over several <li>s. The final line carries the shared
 // date and clergy title. Reassemble the source group before assigning either.
 const records:{element:Element;original:string;order:number}[]=[];
 for(const[order,li]of items.entries()){
  const original=clean(li.textContent??''),links=saintLinks(li);
  if(isFeast(original,li))continue;
  const named=commemoratedName(original),previous=records.at(-1);
  const standalone=classify(named)||/^свв?\./i.test(named)||isCouncil(original,links);
  if(!standalone&&links.length&&previous&&chronology(previous.original)===null&&!isCouncil(previous.original,saintLinks(previous.element))&&classify(commemoratedName(previous.original))){
   const joiner=/[,;]$/.test(previous.original)?' ':', ';
   previous.original+=joiner+original;
   previous.element.appendChild(document.createTextNode(joiner));
   for(const child of [...li.childNodes])previous.element.appendChild(child);
  }else records.push({element:li,original,order});
 }
 for(const {element:li,original,order}of records){
  const links=saintLinks(li);
  if(isCouncil(original,links)){
   for(const e of li.querySelectorAll('.secondary-content, em, i'))e.remove();
   endings.push({label:'',text:cleanCalendarComments(li.textContent??''),allBold:true});continue;
  }
  const year=chronology(original);
  for(const e of li.querySelectorAll('.secondary-content, em, i'))e.remove();
  let text=commemoratedName(li.textContent??'').replace(/[,;\s]+$/,'');
  let c=classify(text);
  // The calendar sometimes writes the rank after the name: "Св. ... исп.".
  if(!c&&/(?:^|[\s,])исп\./i.test(text)){
   text='Исп. '+text.replace(/^свв?\.\s*/i,'').replace(/[,\s]*исп\.\s*,?\s*/i,', ').replace(/[,\s]+$/,'');c=classify(text);
  }
  // Counted groups can start "Семи мучеников ...".
  if(!c){const counted=noAccent(text).match(/^(?:\d+(?:-ти|-х)?|Семи|Девяти|Десяти|Сорока)\s+(мучеников|мучениц|преподобных|апостолов)\s+/i);if(counted){const prefix=classify(counted[1]+' ');if(prefix){c={...prefix,consumed:0,plural:true};text=text.replace(new RegExp(counted[1],'i'),'');}}}
  if(!c){
   // Preserve actual saint records, but never manufacture a rank from a name.
   const name=cleanCalendarComments(text.replace(/^свв?\.\s*/i,''));
   if(name){unclassified.push({label:'Св.',text:name});warnings.push('Источник не указал конкретный лик: '+name+'. Имя сохранено; проверьте по календарю.');}
   continue;
  }
  let body=cleanCalendarComments(text.slice(c.consumed)).replace(/\s+и\s+с ним\s+(\d+(?:-ми|-ти|-х)?)\s+мучеников/gi,', Мчч. $1 мучеников').replace(/^и\s+(?=(?:евангелиста|ев\.))/i,'');
  // A generic 'Св.' is not evidence that a relative shares the first saint's rank.
  const generic=body.match(/(?:,\s*|\s+и\s+)(?:сына ее\s+|сыновей его\s+|дочери ее\s+)?свв?\.\s+/i);
  if(generic){const name=cleanCalendarComments(body.slice(generic.index!+generic[0].length));unclassified.push({label:'Св.',text:name});warnings.push('Источник не указал конкретный лик: '+name+'. Имя сохранено; проверьте по календарю.');body=body.slice(0,generic.index);}
  const segments:{body:string;classification:NonNullable<ReturnType<typeof classify>>}[]=[];
  let segmentStart=0,active=c,title='';
  const secondary=new RegExp('(?:,\\s*|\\s+и\\s+)(?:((?:боярина его|матери их|учителя их|сына ее|сыновей его|дочери ее))\\s+)?('+rankToken+')\\s+','gi');
  for(const match of body.matchAll(secondary)){
   const next=classify(match[2]+' ');if(!next||next.rank===active.rank)continue;
   segments.push({body:title+body.slice(segmentStart,match.index).replace(/[,;\s]+$/,''),classification:active});
   segmentStart=match.index!+match[0].length;active=next;title=match[1]?.startsWith('боярина')?'боярина ':'';
  }
  segments.push({body:title+body.slice(segmentStart),classification:active});
  for(const segment of segments){
   const k=segment.classification;
   let piece=cleanCalendarComments(segment.body);
   piece=piece.replace(new RegExp(rankToken+'\\s+','gi'),prefix=>classify(prefix)?.rank===k.rank?'':prefix);
   if(!piece)continue;
   const plural=k.plural||(segments.length===1&&!generic&&links.some(h=>/\/svv-/.test(h)))||/и с ним|и ученик|и .*дев|\d+-?ти:|\sи\s+(?:царя|царицы|князя|княгини)\s|\sи\s+(?!Крестителя|Предтечи|Евангелиста|Чудотворца)[А-ЯЁ][а-яё]+(?:[,\s]|$)/.test(noAccent(piece));
   entries.push({text:piece,original,rank:k.rank,plural,female:k.female,year,order});
   if(year===null)warnings.push('Год не указан: '+piece+' — порядок среди записей без года сохранён из календаря.');
  }
 }
 if(!entries.length&&!endings.length&&!unclassified.length)warnings.push('В календаре на эту дату нет отдельных поминовений святых или соборов для этого документа. Праздники и иконы исключены по вашим правилам.');
 const blocks:DocumentBlock[]=[];
 for(let rank=0;rank<labels.length;rank++){
  const group=entries.filter(e=>e.rank===rank).sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||a.order-b.order);
  if(group.length){const primary=rank===0&&group.length===1&&/первоверховных апостолов/i.test(noAccent(group[0].original));blocks.push({label:primary?'Первоверховных апостолов':abbreviation(rank,group.length>1||group.some(e=>e.plural),group.every(e=>e.female)),text:rank===6?formatHieromartyrs(group.map(e=>e.text)):group.map(e=>e.text).join('; '),...(primary?{allBold:true}:{})});}
 }
 return{date,source:'https://azbyka.ru/days/'+date,blocks:[...blocks,...unclassified,...endings],entries,warnings,groupCount:entries.length+unclassified.length+endings.length};
}
