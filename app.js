Warning: truncated output (original token count: 12854)
Total output lines: 400

const KEY='phonics-helper-v2', LEGACY_KEY='phonics-helper-v1';
const $=id=>document.getElementById(id);
const today=new Date();
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const plus=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return iso(d)};
const norm=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
let data=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'{"records":[],"tests":{}}');
data.customWords=Array.isArray(data.customWords)?data.customWords:[];
const query=new URLSearchParams(location.search);
const queryDate=/^\d{4}-\d{2}-\d{2}$/.test(query.get('date')||'')?query.get('date'):'';
const reviewMode=query.get('mark')==='1';
const masterPlanFor=date=>(window.MASTER_DAILY_PLAN||[]).find(x=>x.date===date);
const formatItems=items=>(items||[]).map(x=>typeof x==='string'?x:[x.word,x.gloss||x.cn,x.ipa].filter(Boolean).join(' | ')).join('\n');
function planRuleIds(focus=''){
  const pairs=[['r 控制','r_controlled'],['元音组合','vowel_teams'],['辅音连缀','blends'],['辅音字母组合','blends'],['词尾','endings'],['音节','multisyllable'],['短语','phrases'],['视觉','irregular']];
  return [...new Set(pairs.filter(([key])=>focus.includes(key)).map(([,id])=>id))];
}
function updateMasterPlanHint(){
  const date=$('studyDate').value||iso(today), plan=masterPlanFor(date), next=masterPlanFor(plus(date,1));
  $('masterPlanHint').innerHTML=plan
    ? `<b>今天固定新词：</b>${plan.words.map(x=>`<b>${escapeHtml(x.word)}</b>`).join('、')}。<br><b>明天预告：</b>${next?next.words.map(x=>`<b>${escapeHtml(x.word)}</b>`).join('、'):'明天为复习日'}。<br>今天重点：${escapeHtml(plan.focus)}。您只需在下方填写今天的错词。`
    : '今天是复习日：无需输入新词，只填写今天默写错误的词。';
}
function fillMasterPlan(){
  const date=$('studyDate').value||iso(today), plan=masterPlanFor(date);
  if(!plan){$('newWords').value='今天是复习日（没有固定新词）';$('nextNewWords').value='';updateMasterPlanHint();return;}
  $('newWords').value=formatItems(plan.words);
  const next=masterPlanFor(plus(date,1));
  $('nextNewWords').value=next?formatItems(next.words):'';
  updateMasterPlanHint();
}

const PATTERNS=[
  {id:'multisyllable',name:'多音节拆分',match:w=>['important','television','exercise','difficult','holiday','prepare','remember','practise','photo album','hockey','tidy'].some(x=>w.includes(x)),khan:'1-Syllable & 2-Syllable Words',why:'先拍音节，再用竖线把词块分开；这类错误说明完整词形还没稳定。',test:'给 prepare、holiday、difficult、remember 和一个新词 volcano，要求先拍音节、画竖线、再写。4/5 才通过。'},
  {id:'magic_e',name:'Magic e 与长元音',match:w=>/(phone|close|bone|prepare|sausage)/.test(w),khan:'Final -e & Long Vowel Teams',why:'重点辨认 a_e、i_e、o_e、u_e：末尾 e 通常不发音，但让前面元音读字母音。',test:'对比 cap/cape、kit/kite、hop/hope、cub/cube；每组能读、说规则、各写对1个词，4/4 才通过。'},
  {id:'vowel_teams',name:'元音组合与双元音',match:w=>/(seek|between|bounce|point|boots|trousers|painting|holiday|touch)/.test(w),khan:'Final -e & Long Vowel Teams',why:'重点辨认 ee/ea、ai/ay、oa/ow、oo、ou、oi/oy；同一组合可能有不止一种常见读音。',test:'写 ee、ai、ay、oa、ow、oo、ou、oi 八个组合；孩子说最常见音并读写 leaf、rain、day、boat、snow、book、house、coin 等陌生规律词，8/10 才通过。'},
  {id:'r_controlled',name:'r 控制元音',match:w=>/(shirt|skirt|shorts|armchair|floor|hockey)/.test(w),khan:'r-Controlled Vowels (ar, or, er, ir, ur)',why:'重点是 ar、or、er、ir、ur；r 会改变前面元音。shirt/skirt 是 ir，shorts 是 or。',test:'把 bird、shirt、nurse、car、short 分类到 ir/ur/ar/or；圈组合、说常见音、再听写 4 个词，4/5 才通过。'},
  {id:'blends',name:'辅音连缀与字母组合',match:w=>/(stretch|trousers|dress)/.test(w),khan:'Consonant Blends',why:'重点是 dr、str、tr：每个辅音都要听见、写全；stretch 还要留意末尾 tch。',test:'给 dr、str、tr、tch 共8项，让孩子圈出词块，再写 dress、stretch、trousers；7/8 才通过。'},
  {id:'ph',name:'ph 拼写规则（/f/）',match:w=>/(phone|phrase|photo)/.test(w),khan:'纸笔规则卡（可汗截图中没有专门 ph 课程）',why:'ph 常读 /f/，如 phone、photo、phrase；它不是辅音连缀，不能按拼音或普通 f 随意写。',test:'读 phone、photo、phrase，圈出 ph；再遮住拼写3个词。当天、次日、第3天都对才稳定。'},
  {id:'phrases',name:'短语空格与复合词',match:w=>/(in front of|come from|pick up|listen to|bus stop|sun cream|photo album|postcard|armchair|sunglasses)/.test(w),khan:'1-Syllable & 2-Syllable Words',why:'短语要看空格，复合词要看两个词块。',test:'各抽5个短语和5个复合词，只给中文提示。短语看空格、复合词看词块，9/10 才通过。'},
  {id:'endings',name:'词尾变化',match:w=>/(shorts|boots|sunglasses|painting)/.test(w),khan:'Inflectional Endings',why:'先写词根，再补 s、es 或 ing，避免漏词尾。',test:'用 boot/short/paint 给3个新变化形式；能正确写 3/3 才通过。'},
  {id:'irregular',name:'不规则视觉拼写',match:w=>/(muscle|clothes|sausage|trousers)/.test(w),khan:'Sight Words',why:'这类词不能只靠拼读，需要看词形、分块和间隔复现。',test:'看词3秒后遮住书写；当天、次日、第3天和第7天都正确，才可移出错题池。'}
];
const MASTERY=['hall','touch','bone','rhino','floor','armchair','hat','diet','close','phrase','hockey'];
// 已有教材中近期出现过的词，用于最初几天凑足40题；之后会逐步被真实历史记录取代。
const BASE_REVIEW=['dress','shirt','skirt','shorts','boots','prepare','holiday','important','exercise','television','phone','close','bone','seek','between','stretch','trousers','bounce','point','touch','in front of','come from','pick up','listen to','bus stop','sun cream','sunglasses','postcard','armchair','painting','muscle','clothes','sausage','difficult','remember','practise','phrase','photo album','tidy','hockey'];
// 默写纸需要词性。未能可靠判断的词性留空，宁可由教材补充，也不把错误词性教给孩子。
const POS_INFO={
  dress:'n.&v.',shirt:'n.',skirt:'n.',shorts:'n.',boots:'n.',photo:'n.',show:'n.&v.',model:'n.',singer:'n.',asleep:'adj.',
  grass:'n.',ground:'n.',lake:'n.',leaf:'n.',leaves:'n.',field:'n.',tractor:'n.',awake:'adj.',pretty:'adj.',naughty:'adj.',
  prepare:'v.',holiday:'n.',important:'adj.',exercise:'n.&v.',television:'n.',phone:'n.',close:'adj.&v.',bone:'n.',seek:'v.',between:'prep.&adv.',stretch:'v.',trousers:'n.',bounce:'v.',point:'n.&v.',touch:'v.',forest:'n.',cheese:'n.',collect:'v.',mountain:'n.',
  'in front of':'prep.', 'come from':'phr.', 'pick up':'phr.', 'listen to':'phr.', 'bus stop':'n.', 'sun cream':'n.',sunglasses:'n.',postcard:'n.',armchair:'n.',painting:'n.',muscle:'n.',clothes:'n.',sausage:'n.',difficult:'adj.',remember:'v.',practise:'v.',phrase:'n.', 'photo album':'n.',tidy:'adj.&v.',hockey:'n.'
};
const SOUNDS=[
['规则地图：元音','oa / ow','/əʊ/','boat / snow','常见长 o；ow 在 cow 中读 /aʊ/。美式常把 /əʊ/ 写作 /oʊ/。'],['规则地图：元音','长 a','ai / ay / a_e / eigh','rain / day / name / eight','ai 多在词中，ay 多在词尾；eigh 属进阶拼写。'],['规则地图：元音','长 e','ee / ea / e_e / ey / ie','see / leaf / these / key / field','ea 有例外，如 bread；先连例词学习。'],['规则地图：元音','长 i','i_e / igh / y / ie / i+nd','kite / light / my / pie / find','igh 常读 /aɪ/；i+nd 作为常见词块辨认。'],['规则地图：元音','长 u','u_e / ue / ui / ew','cube / blue / fruit / new','可能读 …8854 tokens truncated…honetic||x.phonetics?.find(p=>p.text)?.text||'';pos=pos||x.meanings?.[0]?.partOfSpeech||'';}}).catch(()=>{}));
  if(!gloss)jobs.push(fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(entry.word)}`).then(r=>r.ok?r.json():null).then(v=>{gloss=v?.[0]?.[0]?.[0]||''}).catch(()=>{}));
  await Promise.all(jobs);
  return {word:norm(entry.word),gloss:gloss||'请按教材核对中文',ipa:ipa||'请按教材核对音标',pos,addedDate:$('studyDate').value||iso(today)};
}
async function addCustomWords(){
  const entries=parseEntries($('customWords').value);if(!entries.length){alert('请先输入至少一个英文单词。');return;}
  const button=$('addCustomWords');button.disabled=true;button.textContent='正在查询音标和中文…';
  try{
    for(const entry of entries){
      const enriched=await enrichCustomEntry(entry), old=data.customWords.find(x=>norm(x.word)===enriched.word);
      if(old){Object.assign(old,{...enriched,addedDate:old.addedDate||enriched.addedDate});}
      else data.customWords.push(enriched);
    }
    save();$('customWords').value='';$('customStatus').textContent=`已加入 ${entries.length} 个词；它们会从下一次默写开始自动进入复习曲线。`;render();
  }finally{button.disabled=false;button.textContent='加入并自动补全';}
}
function publicPageUrl(date){return `https://mocao3494-lgtm.github.io/english-phonics-review-helper/?date=${encodeURIComponent(date)}&mark=1`;}
function qrImageUrl(url){return `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=${encodeURIComponent(url)}`;}
function exportWorksheet(){
  const {target,list}=currentPlan();
  if(!list.length){alert('请先保存一次“今天录入”，再导出作业。');return;}
  const metas=allMetas();
  const correctionUrl=publicPageUrl(target);
  const chunks=[]; for(let i=0;i<list.length;i+=20)chunks.push(list.slice(i,i+20));
  const pad=(arr,n)=>[...arr,...Array(Math.max(0,n-arr.length)).fill(null)];
  const pages=chunks.map((part,pageIndex)=>{
    const rows=pad(part,20).map((x,i)=>x?(()=>{const d=itemFor(x.word,metas);return `<tr><td>${pageIndex*20+i+1}</td><td class="write"></td><td>${escapeHtml(d.ipa)}</td><td>${escapeHtml(d.pos||'')}</td><td>${escapeHtml(d.gloss)}</td></tr>`})():`<tr><td>${pageIndex*20+i+1}</td><td class="write"></td><td></td><td></td><td></td></tr>`).join('');
    const qr=pageIndex===0?`<div class="qr"><img src="${qrImageUrl(correctionUrl)}" alt="扫码批改二维码"><small>写完后扫码<br>勾选错词并保存</small></div>`:'';
    return `<section class="paper"><header><div class="badge">ABC<br><small>拼读默写</small></div><div class="paper-title">英语默写</div><div class="fields"><div>用时________　得分________</div><div>班级________　姓名________</div></div>${qr}</header><p class="tip">请根据“音标 / 中文”写出英文；完成后，口头圈说其中的字母组合和音素。</p><table><thead><tr><th>序号</th><th>英文</th><th>音标</th><th>词性</th><th>中文</th></tr></thead><tbody>${rows}</tbody></table><footer>日期：${target}　　第 ${pageIndex+1} / ${chunks.length} 页${pageIndex===0?`　扫码地址：${escapeHtml(correctionUrl)}`:''}</footer></section>`;
  }).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>英语默写作业</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;color:#111;margin:0;font-size:10.5pt}.paper{min-height:277mm;page-break-after:always;break-after:page}.paper:last-child{page-break-after:auto;break-after:auto}header{height:25mm;display:grid;grid-template-columns:30mm 1fr 62mm 28mm;align-items:center}.badge{width:23mm;height:23mm;border:1.4px solid #222;border-radius:50%;text-align:center;padding-top:4mm;font:bold 12pt Arial;line-height:1.1}.badge small{font:6.5pt 'Microsoft YaHei'}.paper-title{text-align:center;font-size:19pt;font-weight:bold;letter-spacing:2px}.fields{font-size:10.5pt;line-height:1.9}.qr{text-align:center;font-size:6.5pt;line-height:1.15}.qr img{width:23mm;height:23mm;display:block;margin:auto}.tip{margin:1.5mm 0 2mm;font-size:9.5pt}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #222;text-align:center;vertical-align:middle;padding:1.5mm 1mm;height:11.4mm}th{font-weight:bold;height:9mm;background:#fff}th:nth-child(1),td:nth-child(1){width:7%}th:nth-child(2),td:nth-child(2){width:31%}th:nth-child(3),td:nth-child(3){width:25%}th:nth-child(4),td:nth-child(4){width:10%}th:nth-child(5),td:nth-child(5){width:27%}.write{background:#fff}footer{text-align:center;font-size:7.5pt;margin-top:2mm;color:#444}</style></head><body>${pages}</body></html>`;
  const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`英语默写作业_${target}.doc`;a.click();URL.revokeObjectURL(a.href);
}
function exportDailyWorksheet(){
  const last=data.records.at(-1);if(!last){alert('请先保存一次“今天录入”。');return;}
  downloadDoc(`英语拼读每日总表_${last.date}.doc`,worksheetHtml(`英语拼读每日总表｜${dateLabel(last.date)}`,dailyCardMarkup(last)));
}
function printDailyWorksheet(){
  const last=data.records.at(-1);if(!last){alert('请先保存一次“今天录入”。');return;}
  openPrint(`英语拼读每日总表｜${dateLabel(last.date)}`,dailyCardMarkup(last));
}
function fill(){
  data.customWords=Array.isArray(data.customWords)?data.customWords:[];
  seedKnownErrors();
  let now=queryDate||iso(today); const first=(window.MASTER_DAILY_PLAN||[])[0]; if(!data.records.length&&first&&now<first.date)now=first.date; $('studyDate').value=now;
  const existing=data.records.find(r=>r.date===now), last=data.records.at(-1);
  if(existing){$('errorWords').value=formatItems(existing.errorItems?.length?existing.errorItems:existing.errors);$('khanDone').value=existing.khan||'';}
  fillMasterPlan();
  const t=data.tests||{};$('comboScore').value=t.combo||'';$('decodeScore').value=t.decode||'';$('magicScore').value=t.magic||'';$('syllableScore').value=t.syllable||'';updateMasterPlanHint();render();
  if(reviewMode)setTimeout(()=>$('correctionBox').scrollIntoView({behavior:'smooth',block:'start'}),250);
}
$('saveAndPlan').onclick=saveRecord;$('saveTest').onclick=saveTest;
$('fillMasterPlan').onclick=fillMasterPlan;
$('studyDate').onchange=()=>{fillMasterPlan();render();};
$('errorWords').onchange=renderCorrectionPicker;
$('addCustomWords').onclick=addCustomWords;
$('selectAllErrors').onclick=()=>{document.querySelectorAll('#correctionWords input').forEach(x=>x.checked=true);syncCheckedErrors();};
$('clearAllErrors').onclick=()=>{document.querySelectorAll('#correctionWords input').forEach(x=>x.checked=false);syncCheckedErrors();};
$('exportWorksheet').onclick=exportWorksheet;
$('exportDailyWorksheet').onclick=exportDailyWorksheet;
$('printDailyWorksheet').onclick=printDailyWorksheet;
$('markAllCorrect').onclick=()=>{alert('本次“全对”只说明这批词本次正确。请仍保留它们在第3天、第7天的安排，并在周末做陌生词规则检验。')};
$('exportData').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='英语拼读巩固备份_'+iso(today)+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);data.customWords=Array.isArray(data.customWords)?data.customWords:[];save();fill();alert('导入成功。')}catch{alert('这不是正确的备份文件。')}};r.readAsText(f)};
$('resetData').onclick=()=>{if(confirm('确定清空本手机的全部记录吗？建议先导出备份。')){data={records:[],tests:{},customWords:[]};save();fill();}};
fill();

