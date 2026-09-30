import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {parseCalendar,chronology,formatHieromartyrs,cleanCalendarComments,classify} from '../lib/calendar.ts';
const fixtures=JSON.parse(readFileSync(new URL('./fixtures/calendar.json',import.meta.url),'utf8'));
const day=date=>parseCalendar(fixtures.find(f=>f.date===date).html,date);
const block=(date,label)=>day(date).blocks.find(b=>b.label===label)?.text;
const plain=s=>s.replace(/\u0301/g,'');
test('full rank spellings inside mixed groups',()=>{
 const html='<div class="day__text"><ul class="paragraph-1"><li><a href="/days/svv-test">Священномученика Петра, пресвитера, и мученика Павла (300)</a></li></ul></div>';
 const r=parseCalendar(html,'2026-11-27');assert.equal(r.blocks.find(b=>b.label==='Сщмч.').text,'Петра, пресвитера');assert.equal(r.blocks.find(b=>b.label==='Мч.').text,'Павла');
});

test('27 November: all 34 named saints, inherited groups, ranks and distinct clergy titles',()=>{
 const r=day('2026-11-27');
 const expected=['Дими́трия','Алекса́ндра','Ви́ктора','Алекси́я','Михаила','Михаила','Фео́дора','Петра','Алекси́я','Се́ргия','Николая','Васи́лия','Алекса́ндра','Николая','Дими́трия','Порфи́рия','Васи́лия','Гео́ргия','Васи́лия','Се́ргия','Алекса́ндра','Се́ргия','Николая','Фео́дора','Се́ргия'];
 const hier=r.blocks.find(b=>b.label==='Сщмчч.').text;
 for(const name of new Set(expected))assert.equal(hier.split(name).length-1,expected.filter(v=>v===name).length,name);
 assert.equal(hier.match(/пресвитеров/g).length,1);
 assert.ok(hier.endsWith('; Николая, диакона'));
 assert.equal(block('2026-11-27','Прмч.'),'Ариста́рха, иеромонаха');
 assert.equal(block('2026-11-27','Мчч.'),'Гаврии́ла, Дими́трия, Анны');
 assert.equal(block('2026-11-27','Блгвв.'),'царя Иустиниа́на I и царицы Феодо́ры');
 assert.equal(block('2026-11-27','Ап.'),'Фили́ппа');
 assert.equal(block('2026-11-27','Свт.'),'Григо́рия Паламы́, архиепископа Фессалонитского');
 assert.equal(block('2026-11-27','Прп.'),'Фили́ппа Ира́пского');
 assert.deepEqual(r.entries.filter(e=>e.rank===6).map(e=>e.year),[1937,1940,1941]);
 assert.ok(!r.warnings.length);
});
test('mixed saints and relationship words do not transfer the priest title to martyrs',()=>{
 assert.ok(block('2026-02-27','Мчч.').includes('Бори́са, Григо́рия и Симео́на'));
 assert.ok(!block('2026-02-27','Сщмчч.').includes('Бори́са'));
 assert.ok(block('2026-06-27','Сщмчч.').includes('Ио́сифа, Димитрия'));
 assert.ok(block('2026-06-27','Сщмчч.').includes('Николая, диакона'));
 assert.ok(!block('2026-06-27','Сщмчч.').includes('Богоявленского'));
 const s=formatHieromartyrs(['Ипа́тия, епископа, и Андре́я, пресвитера','Петра, пресвитера']);
 assert.equal(s,'Ипа́тия, епископа; Андре́я; Петра, пресвитеров');
});
test('source accents, explanation removal and generic saints remain separate',()=>{
 assert.equal(block('2026-10-05','Прав.'),'Петра Африканского');
 assert.ok(block('2026-10-05','Прпп.').startsWith('Ио́ны, пресвитера;'));
 assert.equal(block('2026-10-14','Равноапп.'),'царя Иверского Мириа́на и царицы Иверской На́ны');
 assert.ok(!JSON.stringify(day('2026-10-14').blocks).includes('Хитона'));
 assert.ok(!JSON.stringify(day('2026-10-05').blocks).includes('Румын.'));
 assert.equal(block('2026-04-01','Исп.'),'Иоа́нна');
 assert.equal(block('2026-11-01','Блж.'),'Клеопа́тры');
 assert.equal(block('2026-11-01','Св.'),'Иоа́нна');
 assert.equal(block('2026-01-14','Св.'),'Еми́лии');
 assert.equal(cleanCalendarComments('Фео́дора (Садовского), пресвитера (Румын.)'),'Фео́дора, пресвитера');
});
test('councils, fathers, counted groups and an empty day',()=>{
 const fathers=day('2026-01-27').blocks.at(-1);assert.ok(fathers.allBold&&fathers.text.startsWith('преподобных отец'));
 assert.ok(day('2026-02-27').blocks.at(-1).text.startsWith('12-ти греков'));
 assert.ok(block('2026-08-14','Мчч.').includes('Соломони́и'));
 assert.ok(block('2026-11-01','Мчч.').includes('128-ми мучеников'));
 assert.ok(!block('2026-11-01','Сщмчч.').includes('128-ми'));
 assert.equal(block('2026-09-11','Прор.'),'Предтечи и Крестителя Господня Иоанна');
 assert.ok(block('2026-07-07','Прор.').endsWith('Иоанна'));
 assert.deepEqual(day('2026-08-28').blocks,[]);
});
test('dates, centuries before Christ and shared group dates',()=>{
 assert.equal(chronology('(VIII в. до Р. Х.)'),-750);
 assert.equal(chronology('(565) и (548)'),548);
 assert.equal(chronology('(XV–XVI)'),1450);
 assert.equal(chronology('(переходящее празднование в 1-е воскресенье после 1 июня)'),null);
});
for(const f of fixtures)test('source coverage and formatting '+f.date,()=>{
 const r=parseCalendar(f.html,f.date),text=plain(r.blocks.map(b=>b.text).join('; '));
 const{document}=parseHTML(f.html);const names=new Map();
 for(const li of document.querySelectorAll('.day__text ul[class*="paragraph-"] > li')){
  if(/^(?:Праздн|Предпраздн|Попраздн|Отдание)/i.test(li.textContent.trim()))continue;
  for(const a of li.querySelectorAll('a[href]')){
   if(!/\/svv?-/.test(a.getAttribute('href')))continue;
   for(const n of a.querySelectorAll('.secondary-content,em,i'))n.remove();
   let t=cleanCalendarComments(a.textContent.trim()),c=classify(t);if(c)t=t.slice(c.consumed);
   t=t.replace(/^свв?\.\s*/i,'');const first=t.match(/^[А-ЯЁ][а-яё\u0301]+/);if(!first)continue;
   const name=plain(first[0]);if(['Собор','Обретение','Перенесение','Преставление','Рождество','Усекновение'].includes(name))continue;
   names.set(name,(names.get(name)||0)+1);
  }
 }
 for(const[name,count]of names){const actual=[...text.matchAll(new RegExp('(?<![А-ЯЁа-яё])'+name+'(?![А-ЯЁа-яё])','g'))].length;assert.ok(actual>=count,`${f.date}: ${name}, expected ${count}, got ${actual}`);}
 assert.ok(!/[()]/.test(text));
 assert.ok(!/Празднование в честь|Иконы Божией Матери/.test(text));
 const ranks=r.entries.map(e=>e.rank);assert.ok(ranks.every(rank=>rank>=0&&rank<=18));
 for(let rank=0;rank<19;rank++){const e=r.entries.filter(v=>v.rank===rank).sort((a,b)=>(a.year??Infinity)-(b.year??Infinity)||a.order-b.order);assert.ok(e.every((v,i)=>i===0||(v.year??Infinity)>=(e[i-1].year??Infinity)));}
});
