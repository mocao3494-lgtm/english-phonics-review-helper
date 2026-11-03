const KEY='phonics-helper-v1';
const $=id=>document.getElementById(id);
const today=new Date();
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const plus=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return iso(d)};
const norm=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
let data=JSON.parse(localStorage.getItem(KEY)||'{"records":[],"tests":{}}');

const PATTERNS=[
  {id:'multisyllable',name:'多音节拆分',match:w=>['important','television','exercise','difficult','holiday','prepare','remember','practise','photo album','hockey','tidy'].some(x=>w.includes(x)),khan:'1-Syllable & 2-Syllable Words',why:'先拍音节，再用竖线把词块分开；这类错误说明完整词形还没稳定。',test:'给 prepare、holiday、difficult、remember 和一个新词 volcano，要求先拍音节、画竖线、再写。4/5 才通过。'},
  {id:'vowels',name:'长元音与元音组合',match:w=>/(seek|between|bounce|point|phone|close|bone|boots|trousers|painting|holiday|touch|sausage)/.test(w),khan:'Final -e & Long Vowel Teams',why:'重点辨认 ee、oo、ou、oi、ai/ay 和 Magic e。',test:'写 ee、oo、ou、oi、ai、a_e 等10个组合，让孩子说读音并举词；再读写没背过的同规律词。8/10 才通过。'},
  {id:'blends',name:'辅音连缀与特殊字母',match:w=>/(stretch|trousers|shirt|skirt|shorts|phone|phrase|photo|hockey|touch)/.test(w),khan:'Consonant Blends',why:'重点是 sh、sk、str、tr、ph、tch；听到声音后要能定位到字母。',test:'给 sh/ch/th/ph、sk/str/tr/tch 共10项，让孩子说出读音并写一个例词；8/10 才通过。'},
  {id:'phrases',name:'短语空格与复合词',match:w=>/(in front of|come from|pick up|listen to|bus stop|sun cream|photo album|postcard|armchair|sunglasses)/.test(w),khan:'1-Syllable & 2-Syllable Words',why:'短语要看空格，复合词要看两个词块。',test:'各抽5个短语和5个复合词，只给中文提示。短语看空格、复合词看词块，9/10 才通过。'},
  {id:'endings',name:'词尾变化',match:w=>/(shorts|boots|sunglasses|painting)/.test(w),khan:'Inflectional Endings',why:'先写词根，再补 s、es 或 ing，避免漏词尾。',test:'用 boot/short/paint 给3个新变化形式；能正确写 3/3 才通过。'},
  {id:'irregular',name:'不规则视觉拼写',match:w=>/(muscle|clothes|sausage|trousers)/.test(w),khan:'Sight Words',why:'这类词不能只靠拼读，需要看词形、分块和间隔复现。',test:'看词3秒后遮住书写；当天、次日、第3天和第7天都正确，才可移出错题池。'}
];
const MASTERY=['hall','touch','bone','rhino','floor','armchair','hat','diet','close','phrase','hockey'];
const SOUNDS=[
['Consonant Digraphs','ch','/tʃ/','chair, stretch','两个字母合成一个音；可汗页面会分别出现 Sounds: ch。'],['Consonant Digraphs','sh','/ʃ/','ship, shirt, shorts','两个字母合成“嘘”音；可汗页面会分别出现 Sounds: sh。'],['Consonant Digraphs','th','/θ/ 或 /ð/','thin / this','舌尖轻碰牙齿；同一组合有清浊两种常见音。'],['Consonant Digraphs','wh','/w/','what, when','常见读 /w/；who 是例外，单独记。'],['Consonant Blends','sk, st, sp, str, tr','各辅音都要发出来','skirt, stop, spring, stretch, trousers','不是一个新音，是几个辅音连续发；可汗示例含 st、sp、sk、sm、bl 等。'],['Final -e & Long Vowel Teams','a_e / i_e / o_e','/eɪ/ /aɪ/ /oʊ/','name / kite / bone','末尾 e 通常不发音，让前面的元音读字母音；可汗把它称为 The Magic E。'],['Final -e & Long Vowel Teams','ee / ea','/iː/','seek / leaf','长 e；ea 在少数词中例外，例如 bread。'],['Final -e & Long Vowel Teams','ai / ay','/eɪ/','rain / day','ai 常在词中，ay 常在词尾。'],['Final -e & Long Vowel Teams','oo','/uː/ 或 /ʊ/','boots / book','同一组合有两种常见音，必须连例词一起记。'],['Final -e & Long Vowel Teams','ou / oi','/aʊ/ 或 /ʌ/；/ɔɪ/','bounce / touch；point','ou 有多种音；oi 常读 /ɔɪ/。'],['r-Controlled Vowels','ar / or / er ir ur','/ɑr/ /ɔr/ /ɜr/','car / short / shirt','r 会改变前面元音；可汗课程标题直接列出 ar or er ir ur。'],['Inflectional Endings','-ing / -ed / -s -es','/ɪŋ/；/t/ /d/ /ɪd/；/s/ /z/ /ɪz/','painting / jumped / boots','先写词根再加词尾；词尾发音由前一个音决定。']
];

function save(){localStorage.setItem(KEY,JSON.stringify(data));}
function parseLines(text){return text.split(/[\n,，]/).map(x=>x.split('|')[0].trim()).filter(Boolean).map(norm)}
function entryWords(record){return [...new Set([...record.newWords,...record.errors])];}
function allErrorCounts(){const c={};data.records.forEach(r=>r.errors.forEach(w=>c[w]=(c[w]||0)+1));return c}
function dueWords(targetDate){let groups={d1:[],d3:[],d7:[]};data.records.forEach(r=>{const words=entryWords(r); if(plus(r.date,1)===targetDate)groups.d1.push(...words);if(plus(r.date,3)===targetDate)groups.d3.push(...words);if(plus(r.date,7)===targetDate)groups.d7.push(...words)});Object.keys(groups).forEach(k=>groups[k]=[...new Set(groups[k])]);return groups}
function ruleOf(w){return PATTERNS.filter(p=>p.match(w)).map(p=>p.id)}
function buildPlan(targetDate){const due=dueWords(targetDate), counts=allErrorCounts(); const newest=data.records.at(-1)||{newWords:[],errors:[]};
  let list=[], added=new Set(); const add=(word,tag)=>{word=norm(word);if(word&&!added.has(word)&&list.length<40){list.push({word,tag});added.add(word)}};
  // New words for the coming day are entered on that day. For the immediate next plan, current errors and current new words lead.
  due.d1.forEach(w=>add(w,'次日巩固')); due.d3.forEach(w=>add(w,'第3天巩固')); due.d7.forEach(w=>add(w,'第7天巩固'));
  Object.entries(counts).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).forEach(([w])=>add(w,'高频错词'));
  const recent=[...newest.errors,...newest.newWords]; recent.forEach(w=>add(w,'近期复核'));
  // Add rule-linked words that have appeared before, then mastered check words.
  const all=[...new Set(data.records.flatMap(entryWords))]; all.filter(w=>ruleOf(w).length).forEach(w=>add(w,'规律词'));
  MASTERY.forEach(w=>add(w,'已掌握抽查'));
  // If no database yet, keep empty rather than inventing a 40-word set.
  return {list,due};
}
function weakness(){const counts={};data.records.forEach(r=>r.errors.forEach(w=>PATTERNS.forEach(p=>{if(p.match(w))counts[p.id]=(counts[p.id]||0)+1})));return PATTERNS.map(p=>({...p,count:counts[p.id]||0})).filter(p=>p.count).sort((a,b)=>b.count-a.count)}
function khanRecommendation(ws){const t=data.tests||{}; const ruleFail=(+t.combo<8&&t.combo!==undefined)||(+t.decode<8&&t.decode!==undefined)||(+t.magic<3&&t.magic!==undefined)||(+t.syllable<4&&t.syllable!==undefined);
  const top=ws[0]; if(ruleFail){return {title:'先补规则，不进入 Practice',course:top?.khan||'Final -e & Long Vowel Teams',card:'Basic 或 Main',text:'规则检验未达标，说明“会写见过的词”不等于掌握规律。先完成对应 Basic（基础支持）或 Main（主课），然后做陌生词读写，不要先刷 Practice。'}}
  if(top&&top.count>=3)return {title:'主课后做一轮练习',course:top.khan,card:'Main → Practice 1',text:`${top.name}错误较集中。先 Main（主课），能口头说出规律并完成陌生词读写后，再做 Practice 1（第一轮练习）。`};
  return {title:'规则课短学 + 纸笔主练',course:'1-Syllable & 2-Syllable Words',card:'Main',text:'当前没有明显规则性薄弱项，建议每天只做1张主课卡，其余时间用于纸笔错词间隔复习。'};
}
function render(){const last=data.records.at(-1); const target=last?plus(last.date,1):iso(today); const {list,due}=buildPlan(target); const ws=weakness(); const rec=khanRecommendation(ws);
  if(last||Object.values(data.tests||{}).some(x=>x!=='')){['plan','analysis','khanPlan','checkPlan','weekend'].forEach(id=>$(id).classList.remove('hidden'));}
  $('nextDate').textContent='（'+target+'）';
  const words=list.length?list:[];$('dictationList').innerHTML=words.map((x,i)=>`<div class="word"><b>${i+1}.</b> ${x.word}<span class="tag">${x.tag}</span></div>`).join('')||'<p>先保存一次“今天录入”，系统才会生成下一次清单。</p>';
  $('planNote').textContent=list.length<40?`目前可安排 ${list.length} 个复习词；你继续每日录入后会逐渐补足。不要为了凑40题重复同一个词。`:'已按次日、第3天、第7天、高频错词、规律词和已掌握抽查组合。';
  $('weaknessContent').innerHTML=ws.length?ws.map(w=>`<div class="weak"><b>${w.name}<br><span class="score-bad">近期错误 ${w.count} 次</span></b><span>${w.why}<br><small>纸笔：${w.test}</small></span></div>`).join(''):'<p>还没有录入错词。录入后会按字母组合、元音、音节、短语、词尾和不规则词形自动分析。</p>';
  $('khanContent').innerHTML=`<p><b>${rec.title}</b></p><ol class="rule-list"><li>点 <b>Reading</b> → 右上角选 <b>1st Grade</b>。</li><li>找 <b>${rec.course}</b>。</li><li>今天点 <b>${rec.card}</b>。</li><li>${rec.text}</li><li>完成后让孩子说：“我今天学的是 ______，例如 ______。”说不出就不算掌握。</li></ol>`;
  const t=data.tests||{}; const rows=[['字母组合辨认',t.combo,10,8],['陌生词读写',t.decode,10,8],['Magic e 对比',t.magic,4,3],['多音节拆分',t.syllable,5,4]]; $('checkContent').innerHTML='<ul class="rule-list">'+rows.map(([name,score,total,pass])=>`<li><b>${name}</b>：${score??'未填'} / ${total}，${score!==undefined&&score!==''?(+score>=pass?'<span class="score-good">达到规则掌握线</span>':'<span class="score-bad">未达标：回到 Main/Basic + 陌生词纸笔练习</span>'):'请在“本周规则检验”填写结果。'}</li>`).join('')+'</ul>';
  const totalErrors=data.records.reduce((n,r)=>n+r.errors.length,0);$('weekendContent').innerHTML=`<p>已记录 ${data.records.length} 天，累计错词次数 ${totalErrors}。周末从所有错误词中抽20个，再从“已掌握词”抽10个，并做一次本页的规则检验。</p><ul class="rule-list"><li><b>如果旧词会写、陌生词不行：</b>纸笔练习要改为规则卡 + 陌生词读写；可汗做 Main/Basic，不刷 Practice。</li><li><b>如果陌生词能读写、旧词仍错：</b>规律已会，继续按次日/第3天/第7天默写，不增加新规则。</li><li><b>如果多音节、词组空格常错：</b>每题默写前先口头“拍音节 / 说词块”，不要直接整词硬写。</li></ul>`;
  $('soundCardContent').innerHTML=SOUNDS.map(s=>`<div class="sound"><small><b>${s[0]}</b></small><b>${s[1]}</b> <em>${s[2]}</em><small>例词：${s[3]}<br>${s[4]}</small></div>`).join('');
}
function saveRecord(){const date=$('studyDate').value||iso(today),newWords=parseLines($('newWords').value),errors=parseLines($('errorWords').value);if(!newWords.length&&!errors.length){alert('请至少输入今天的新词或错词。');return} data.records=data.records.filter(r=>r.date!==date);data.records.push({date,newWords,errors,khan:$('khanDone').value});data.records.sort((a,b)=>a.date.localeCompare(b.date));save();render();document.getElementById('plan').scrollIntoView({behavior:'smooth'});}
function saveTest(){data.tests={combo:$('comboScore').value,decode:$('decodeScore').value,magic:$('magicScore').value,syllable:$('syllableScore').value};save();render();}
function fill(){ $('studyDate').value=iso(today);if(!data.records.length)$('newWords').value='dress\nshirt\nskirt\nshorts\nboots';const t=data.tests||{};$('comboScore').value=t.combo||'';$('decodeScore').value=t.decode||'';$('magicScore').value=t.magic||'';$('syllableScore').value=t.syllable||'';render();}
$('saveAndPlan').onclick=saveRecord;$('saveTest').onclick=saveTest;
$('markAllCorrect').onclick=()=>{alert('本次“全对”只说明这批词本次正确。请仍保留它们在第3天、第7天的安排，并在周末做陌生词规则检验。')};
$('exportData').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='英语拼读巩固备份_'+iso(today)+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);save();fill();alert('导入成功。')}catch{alert('这不是正确的备份文件。')}};r.readAsText(f)};
$('resetData').onclick=()=>{if(confirm('确定清空本手机的全部记录吗？建议先导出备份。')){data={records:[],tests:{}};save();fill();}};
fill();
