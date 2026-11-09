const KEY='phonics-helper-v2', LEGACY_KEY='phonics-helper-v1';
const $=id=>document.getElementById(id);
const today=new Date();
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const plus=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return iso(d)};
const norm=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
let data=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'{"records":[],"tests":{}}');

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
const SOUNDS=[
['规则地图：元音','oa / ow','/əʊ/','boat / snow','常见长 o；ow 在 cow 中读 /aʊ/。美式常把 /əʊ/ 写作 /oʊ/。'],['规则地图：元音','长 a','ai / ay / a_e / eigh','rain / day / name / eight','ai 多在词中，ay 多在词尾；eigh 属进阶拼写。'],['规则地图：元音','长 e','ee / ea / e_e / ey / ie','see / leaf / these / key / field','ea 有例外，如 bread；先连例词学习。'],['规则地图：元音','长 i','i_e / igh / y / ie / i+nd','kite / light / my / pie / find','igh 常读 /aɪ/；i+nd 作为常见词块辨认。'],['规则地图：元音','长 u','u_e / ue / ui / ew','cube / blue / fruit / new','可能读 /juː/ 或 /uː/，不要只背一条。'],['规则地图：元音','air are / ear ere','/eə/；/ɪə/或/eə/','hair / care；hear / here','进阶组合先连例词学习；不同口音会有差异。'],['规则地图：元音','au aw / al','/ɔː/','autumn / draw / ball','进阶组合；在错词出现后再专项练习。'],['规则地图：辅音','ph','/f/','phone / photo / phrase','ph 常读 /f/；当前截图没有专门 ph 卡，用纸笔规则卡巩固。'],['规则地图：音节','闭音节 / 开音节 / 复合词','短元音 / 长元音','bag / be；bus stop / postcard','辅音封住元音常为短音；元音在音节末常为长音；复合词先拆两块。'],
['Consonant Digraphs','ch','/tʃ/','chair, stretch','两个字母合成一个音；可汗页面会分别出现 Sounds: ch。'],['Consonant Digraphs','sh','/ʃ/','ship, shirt, shorts','两个字母合成“嘘”音；可汗页面会分别出现 Sounds: sh。'],['Consonant Digraphs','th','/θ/ 或 /ð/','thin / this','舌尖轻碰牙齿；同一组合有清浊两种常见音。'],['Consonant Digraphs','wh','/w/','what, when','常见读 /w/；who 是例外，单独记。'],['Consonant Blends','sk, st, sp, str, tr','各辅音都要发出来','skirt, stop, spring, stretch, trousers','不是一个新音，是几个辅音连续发；可汗示例含 st、sp、sk、sm、bl 等。'],['Final -e & Long Vowel Teams','a_e / i_e / o_e','/eɪ/ /aɪ/ /oʊ/','name / kite / bone','末尾 e 通常不发音，让前面的元音读字母音；可汗把它称为 The Magic E。'],['Final -e & Long Vowel Teams','ee / ea','/iː/','seek / leaf','长 e；ea 在少数词中例外，例如 bread。'],['Final -e & Long Vowel Teams','ai / ay','/eɪ/','rain / day','ai 常在词中，ay 常在词尾。'],['Final -e & Long Vowel Teams','oa / ow','/əʊ/（美式常写 /oʊ/）','boat / snow','oa 常读长 o；ow 在 cow 中读 /aʊ/，要和例词一起辨认。'],['Final -e & Long Vowel Teams','oo','/uː/ 或 /ʊ/','boots / book','同一组合有两种常见音，必须连例词一起记。'],['Final -e & Long Vowel Teams','ou / oi','/aʊ/ 或 /ʌ/；/ɔɪ/','bounce / touch；point','ou 有多种音；oi 常读 /ɔɪ/。'],['r-Controlled Vowels','ar / or / er ir ur','/ɑr/ /ɔr/ /ɜr/','car / short / shirt','r 会改变前面元音；可汗课程标题直接列出 ar or er ir ur。'],['Inflectional Endings','-ing / -ed / -s -es','/ɪŋ/；/t/ /d/ /ɪd/；/s/ /z/ /ɪz/','painting / jumped / boots','先写词根再加词尾；词尾发音由前一个音决定。']
];

// 常见教材词的“中文 + 音标 + 词块”。家长若录入“英文 | 中文 | 音标”，会优先采用家长填写的信息。
const WORD_INFO={
  dress:['连衣裙；穿衣；打扮','/dres/','dr + e + ss'],shirt:['衬衫','/ʃɜːt/','sh + ir + t'],skirt:['裙子','/skɜːt/','sk + ir + t'],shorts:['短裤；短裙','/ʃɔːts/','sh + or + t + s'],boots:['靴子','/buːts/','oo + t + s'],
  photo:['照片','/ˈfəʊtəʊ/','ph + o + to'],show:['展示；表演','/ʃəʊ/','sh + ow'],model:['模型；模特','/ˈmɒdəl/','o（短元音）+ el'],singer:['歌手','/ˈsɪŋə(r)/','sing + er'],asleep:['睡着的','/əˈsliːp/','a + sleep（ee）'],
  prepare:['准备','/prɪˈpeə(r)/','pre + pare'],holiday:['假期；节日','/ˈhɒlədeɪ/','hol + i + day（ay）'],important:['重要的','/ɪmˈpɔːtənt/','im + por + tant'],exercise:['练习；锻炼','/ˈeksəsaɪz/','ex + er + cise'],television:['电视；电视机','/ˈtelɪvɪʒn/','tel + e + vi + sion'],phone:['电话','/fəʊn/','ph + o_e'],close:['关闭的；关闭','/kləʊz/','cl + o_e'],bone:['骨头','/bəʊn/','o_e'],seek:['寻找；追求','/siːk/','ee'],between:['在……之间','/bɪˈtwiːn/','be + tween（ee）'],stretch:['拉伸；伸展','/stretʃ/','str + e + tch'],trousers:['裤子','/ˈtraʊzəz/','tr + ou + s + ers'],bounce:['弹跳','/baʊns/','ou + nce'],point:['点；分数','/pɔɪnt/','oi + nt'],touch:['触摸','/tʌtʃ/','ou + tch'],
  'in front of':['在……前面','/ɪn frʌnt əv/','短语：in + front + of'],'come from':['来自……','/kʌm frəm/','短语：come + from'],'pick up':['捡起','/pɪk ʌp/','短语：pick + up'],'listen to':['（注意地）听；倾听','/ˈlɪsn tuː/','短语：listen + to'],'bus stop':['公交汽车站','/ˈbʌs stɒp/','复合词：bus + stop'],'sun cream':['防晒霜','/ˈsʌn kriːm/','复合词：sun + cream'],'sunglasses':['太阳镜','/ˈsʌnɡlɑːsɪz/','复合词：sun + glasses'],'postcard':['明信片','/ˈpəʊstkɑːd/','复合词：post + card'],'armchair':['单人沙发；扶手椅','/ˈɑːmtʃeə(r)/','复合词：arm + chair'],'photo album':['相簿','/ˈfəʊtəʊ ˌælbəm/','短语：photo + album'],painting:['（正在）绘画','/ˈpeɪntɪŋ/','ai + nt + ing'],muscle:['肌肉','/ˈmʌsl/','不规则视觉词'],clothes:['衣服','/kləʊðz/','cl + o + th + es'],sausage:['香肠','/ˈsɒsɪdʒ/','au（例外）+ age'],difficult:['困难的','/ˈdɪfɪkəlt/','dif + fi + cult'],remember:['记得；回忆起','/rɪˈmembə(r)/','re + mem + ber'],practise:['练习','/ˈpræktɪs/','prac + tise'],phrase:['短语','/freɪz/','ph + r + a_e'],tidy:['整洁的；整理','/ˈtaɪdi/','i + dy'],hockey:['曲棍球；冰上曲棍球','/ˈhɒki/','ho + ckey']
};
const RULE_DETAILS={
  r_controlled:'r 控制元音：圈 ar / or / er / ir / ur；shirt、skirt 的 ir 常读 /ɜː/，shorts 的 or 常读 /ɔː/。',
  vowel_teams:'元音组合：把组合整体圈出；同一组合可能不止一种读音，必须“组合 + 音标 + 例词”一起记。',
  magic_e:'Magic e：末尾 e 通常不发音，让前面的元音读字母音，例如 phone /fəʊn/、bone /bəʊn/。',
  blends:'辅音连缀/组合：dr、sk、str、tr 中每个辅音都要听到；sh、tch 是整体音。',
  ph:'ph：在 phone、photo、phrase 中 ph 通常读 /f/。',
  endings:'词尾：先写词根，再写 -s / -es / -ing；例如 boot → boots，paint → painting。',
  multisyllable:'多音节：先拍音节、画竖线，再写完整词；不要一次凭感觉拼整词。',
  phrases:'短语与复合词：短语看空格，复合词看两个小词块。',
  irregular:'视觉拼写：不能只靠规则，要看词形、分块并按间隔复写。'
};
const WEEK=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];

function save(){localStorage.setItem(KEY,JSON.stringify(data));}
function parseEntries(text){return text.split(/[\n,，]/).map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.split('|').map(x=>x.trim());return {word:norm(parts[0]),gloss:parts[1]||'',ipa:parts[2]||''}}).filter(x=>x.word)}
function parseLines(text){return parseEntries(text).map(x=>x.word)}
function entryWords(record){return [...new Set([...(record.reviewedWords||[]),...(record.newWords||[]),...(record.errors||[])])];}
function allErrorCounts(){const c={};data.records.forEach(r=>r.errors.forEach(w=>c[w]=(c[w]||0)+1));return c}
const CURVE=[1,3,7,14,30];
function rebuildWordState(){
  const state={};
  [...data.records].sort((a,b)=>a.date.localeCompare(b.date)).forEach(r=>{
    const errors=new Set((r.errors||[]).map(norm));
    const words=[...new Set([...(r.reviewedWords||r.newWords||[]),...(r.errors||[])].map(norm))];
    words.forEach(w=>{
      const old=state[w]||{stage:0,errors:0,lastReviewed:''};
      if(errors.has(w)){state[w]={stage:0,errors:old.errors+1,lastReviewed:r.date,nextDue:plus(r.date,1)};}
      else {const stage=Math.min(old.stage+1,CURVE.length);state[w]={stage,errors:old.errors,lastReviewed:r.date,nextDue:plus(r.date,CURVE[stage-1])};}
    });
  });
  data.wordState=state;return state;
}
function dueWords(targetDate){
  let groups={d1:[],d3:[],d7:[],d14:[],d30:[]};
  const intervals={d1:1,d3:3,d7:7,d14:14,d30:30};
  data.records.forEach(r=>{const words=entryWords(r);Object.entries(intervals).forEach(([k,days])=>{if(plus(r.date,days)===targetDate)groups[k].push(...words)})});
  Object.keys(groups).forEach(k=>groups[k]=[...new Set(groups[k])]);return groups
}
function ruleOf(w){
  const word=norm(w); const ids=PATTERNS.filter(p=>p.match(word)).map(p=>p.id);
  // 未预置的新词也尽量按可见词块归类；这是“提示”，不能替代家长核对音标。
  if(/(?:ar|or|er|ir|ur)/.test(word)) ids.push('r_controlled');
  if(/(?:ai|ay|ee|ea|oa|ow|oo|ou|oi|oy|ue|ui|ew)/.test(word)) ids.push('vowel_teams');
  if(/[aeiou][^aeiou\s]e$/.test(word)) ids.push('magic_e');
  if(/^(?:bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw)/.test(word)) ids.push('blends');
  if(/(?:ch|sh|th|wh|ph|tch)/.test(word)) ids.push('blends');
  if(/(?:ing|ed|es|s)$/.test(word)) ids.push('endings');
  if(word.includes(' ')||/(?:sun|base|photo|tele|post|some)/.test(word)) ids.push('phrases');
  if(word.split(/[ -]/).length>1||word.length>=8) ids.push('multisyllable');
  return [...new Set(ids)];
}
function buildPlan(targetDate){const due=dueWords(targetDate), counts=allErrorCounts(), state=rebuildWordState(); const newest=data.records.at(-1)||{newWords:[],errors:[],nextNewWords:[]};
  let list=[], added=new Set(); const add=(word,tag)=>{word=norm(word);if(word&&!added.has(word)&&list.length<40){list.push({word,tag});added.add(word)}};
  // The next day’s fixed five new words always come first; parent enters them when saving today.
  (newest.nextNewWords||[]).slice(0,5).forEach(w=>add(w,'明日新词'));
  // 到期未复习的词会一直保留在队列，直到实际默写一次；不会因为当天超过40题而丢失。
  Object.entries(state).filter(([,s])=>s.nextDue<=targetDate).sort((a,b)=>a[1].nextDue.localeCompare(b[1].nextDue)||b[1].errors-a[1].errors).forEach(([w,s])=>add(w,s.errors?'错词优先':'间隔复习'));
  Object.entries(counts).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).forEach(([w])=>add(w,'高频错词'));
  // Add rule-linked words that have appeared before, then mastered check words.
  const all=[...new Set(data.records.flatMap(entryWords))]; all.filter(w=>ruleOf(w).length).forEach(w=>add(w,'规律词'));
  MASTERY.forEach(w=>add(w,'已掌握抽查'));
  // 初始词库只用于把早期作业补足40题；所有以后录入、实际默写过的词优先按曲线复现。
  BASE_REVIEW.forEach(w=>add(w,'基础库抽查'));
  return {list,due};
}
function weakness(){
  const counts={}, recent={};
  const lastSeven=data.records.slice(-7);
  data.records.forEach(r=>(r.errors||[]).forEach(w=>ruleOf(w).forEach(id=>counts[id]=(counts[id]||0)+1)));
  lastSeven.forEach(r=>(r.errors||[]).forEach(w=>ruleOf(w).forEach(id=>recent[id]=(recent[id]||0)+1)));
  return PATTERNS.map(p=>({...p,count:counts[p.id]||0,recent:recent[p.id]||0,priority:(recent[p.id]||0)*3+(counts[p.id]||0)})).filter(p=>p.count).sort((a,b)=>b.priority-a.priority)
}
function khanRecommendation(ws){const t=data.tests||{}; const has=t.combo!==''&&t.combo!==undefined; const ruleFail=(has&&+t.combo<8)||(+t.decode<8&&t.decode!==undefined&&t.decode!=='')||(+t.magic<3&&t.magic!==undefined&&t.magic!=='')||(+t.syllable<4&&t.syllable!==undefined&&t.syllable!=='');
  const top=ws[0]; if(ruleFail){return {title:'先补规则，不进入 Practice',course:top?.khan||'Final -e & Long Vowel Teams',card:'Basic 或 Main',text:'规则检验未达标，说明“会写见过的词”不等于掌握规律。先完成对应 Basic（基础支持）或 Main（主课），然后做陌生词读写，不要先刷 Practice。'}}
  if(top?.id==='ph')return {title:'先做 ph 纸笔规则卡',course:'纸笔规则卡',card:'不需要在可汗里搜索 ph 专题',text:'您截图中的可汗课程没有明确的 ph 专题。先用 phone / photo / phrase 做“看 ph—读 /f/—遮住书写”；可汗当天改做 Nonsense Words 或已安排的主课即可。'};
  if(top&&top.count>=3)return {title:'主课后做一轮练习',course:top.khan,card:'Main → Practice 1',text:`${top.name}错误较集中。先 Main（主课），能口头说出规律并完成陌生词读写后，再做 Practice 1（第一轮练习）。`};
  return {title:'规则课短学 + 纸笔主练',course:'1-Syllable & 2-Syllable Words',card:'Main',text:'当前没有明显规则性薄弱项，建议每天只做1张主课卡，其余时间用于纸笔错词间隔复习。'};
}
function currentPlan(){const last=data.records.at(-1);const target=last?plus(last.date,1):iso(today);const computed=buildPlan(target);return {target,list:(last?.nextPlan?.length?last.nextPlan:computed.list)};}
function autoChecks(ws){
  const pick=ws.slice(0,2); if(!pick.length)return ['本周先录入至少一次错词；系统会按错误规律自动出检验题。','不录入错误时，也请周末从已掌握词随机抽10个，避免只记住近期词。'];
  const q=[];pick.forEach(w=>{
    if(w.id==='magic_e')q.push('Magic e：对比 cap/cape、kit/kite、hop/hope、cub/cube。孩子圈出末尾 e，说“e 通常不发音、让前一个元音读字母音”，再各写1个词；4组至少3组正确。');
    if(w.id==='vowel_teams')q.push('元音组合：看 ee/ea、ai/ay、oa/ow、oo、ou、oi/oy 六组，孩子说出“最常见音 + 一个例词”，再读写其中2个没背过的规律词；6组至少5组正确。提醒：oo、ou、ow 等会有不止一种常见读音，要连例词一起学。');
    if(w.id==='r_controlled')q.push('r 控制元音：读写 car、short、shirt、fur 四词，圈出 ar/or/ir/ur，并说“r 改变前一个元音”。4项至少3项正确。');
    if(w.id==='blends')q.push('辅音连缀与组合：读 sk、str、tr、tch；让孩子圈出每个词中的组合，再写 shirt、skirt、stretch 各1次。');
    if(w.id==='ph')q.push('ph 规则：读 phone、photo、phrase；圈出 ph 并说“ph 在这里读 /f/”，然后遮住拼写三个词。');
    if(w.id==='multisyllable')q.push('多音节：听写 prepare、holiday、difficult，再给新词 picnic；每个词先拍音节、画竖线后书写。4个中至少3个完整正确。');
    if(w.id==='phrases')q.push('短语/复合词：不看答案写 in front of、pick up、bus stop、postcard；要求短语空格和复合词词块都正确。4个全对。');
    if(w.id==='endings')q.push('词尾：由 boot、short、paint 写 boots、shorts、painting，并让孩子圈出词尾。3个全对。');
    if(w.id==='irregular')q.push('视觉词形：给 muscle、clothes、sausage 看3秒后遮住写；当天、次日、第3天、第7天连续都对才降级。');
  }); return q;
}
function itemFor(word, metas=[]){
  const own=metas.find(x=>norm(x.word)===norm(word))||{};
  const known=WORD_INFO[norm(word)]||[];
  const ids=ruleOf(word);
  return {word:norm(word),gloss:own.gloss||known[0]||'请按教材核对中文',ipa:own.ipa||known[1]||'请按教材核对音标',chunk:known[2]||ids.map(id=>PATTERNS.find(p=>p.id===id)?.name).join('；')||'先圈元音/辅音词块'};
}
function dateLabel(date){const d=new Date(date+'T12:00:00');return `${date}（${WEEK[d.getDay()]}）`}
function dailyRules(record){
  const words=[...(record.errors||[]),...(record.newWords||[])];
  const ids=[...new Set(words.flatMap(ruleOf))];
  const ordered=ids.sort((a,b)=>{const ae=(record.errors||[]).filter(w=>ruleOf(w).includes(a)).length;const be=(record.errors||[]).filter(w=>ruleOf(w).includes(b)).length;return be-ae});
  return (ordered.length?ordered:['vowel_teams','multisyllable']).slice(0,3).map(id=>({id,name:PATTERNS.find(p=>p.id===id)?.name||id,detail:RULE_DETAILS[id]||''}));
}
function reviewForDaily(record){
  const earlier=data.records.filter(r=>r.date<record.date).sort((a,b)=>b.date.localeCompare(a.date));
  const direct=[...new Set([...(earlier[0]?.newWords||[]),...(record.errors||[])])];
  const counts=allErrorCounts();
  const extra=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  return [...new Set([...direct,...extra])].filter(w=>!record.newWords.includes(w)).slice(0,10);
}
function storyFor(record){
  const w=(record.newWords||[]); const hero='Leo';
  const a=w[0]||'photo',b=w[1]||'show',c=w[2]||'model',d=w[3]||'boots',e=w[4]||'asleep';
  const titles=['午夜赛车任务','迷你车库的密码','山路上的蓝色旗帜','丛林维修站','雨天的秘密地图'];
  const n=data.records.indexOf(record); const title=titles[(n<0?0:n)%titles.length];
  const en=`${hero} found a ${a} in his little car. The ${b} on the photo led him to a hidden ${c}. He put on his ${d}, checked the map, and drove slowly. At the end, the tired helper was ${e}, but the team finished the mission.`;
  const cn=`小虎机 Leo 在小汽车里发现了一张${a}。照片上的${b}带他找到一个藏起来的${c}。他穿上${d}，检查地图，慢慢开车。最后，疲惫的小帮手已经${e}，但小队还是完成了任务。`;
  return {title,en,cn,questions:[`1. What did ${hero} find in his car?`, '2. 圈出今天新词中你能按规则读出的一个词。', '3. 读完后，用中文说一说他们怎样完成任务。']};
}
function dailyCardMarkup(record){
  // 旧错词再次进入复习时，继续带出家长已经录入的中文和音标。
  const metas=data.records.flatMap(r=>[...(r.newItems||[]),...(r.errorItems||[]),...(r.nextNewItems||[])]);
  const newItems=(record.newWords||[]).map(w=>itemFor(w,metas));
  const reviewItems=reviewForDaily(record).map(w=>itemFor(w,metas));
  const rules=dailyRules(record), rec=khanRecommendation(weakness()), story=storyFor(record);
  const curve=CURVE.map(n=>plus(record.date,n)).join('、');
  return `<div class="daily-print"><div class="daily-top"><b>日期：${dateLabel(record.date)}</b><span>姓名：____________</span></div><h3>① 今天 5 个新词：先读词块，再写单词</h3><table class="daily-table"><thead><tr><th>英文</th><th>中文</th><th>音标</th><th>词块/规则</th><th>默写一遍</th></tr></thead><tbody>${newItems.map(x=>`<tr><td><b>${escapeHtml(x.word)}</b></td><td>${escapeHtml(x.gloss)}</td><td>${escapeHtml(x.ipa)}</td><td>${escapeHtml(x.chunk)}</td><td></td></tr>`).join('')}</tbody></table><h3>② 今天复习词：默写后圈出词块</h3><p class="review-words">${reviewItems.map((x,i)=>`${i+1}. ${escapeHtml(x.word)}（${escapeHtml(x.gloss)}）`).join('　')||'今天暂无历史复习词；明天开始会自动加入。'}</p><h3>③ 今天只学这 ${rules.length} 条规则</h3><ol class="rule-list daily-rules">${rules.map(r=>`<li><b>${escapeHtml(r.name)}</b>：${escapeHtml(r.detail)}</li>`).join('')}</ol><p class="red-tip">重点：孩子要能“圈组合 → 说音标/音素 → 读例词 → 写一个同规律陌生词”。只会默写见过的词，不等于会规则。</p><h3>④ 可汗学院（8–10 分钟）</h3><ol class="rule-list"><li>点 <b>Reading</b> → 右上角 <b>1st Grade</b> → 找 <b>${escapeHtml(rec.course)}</b>。</li><li>先点 <b>${escapeHtml(rec.card)}</b>。${escapeHtml(rec.text)}</li><li>完成后让孩子说出今天一个组合和对应读音；说不出，就做本页第③部分，不急着刷 Practice。</li></ol><h3>⑤ 冒险小阅读：《${escapeHtml(story.title)}》</h3><p class="story-en">${escapeHtml(story.en)}</p><p>${escapeHtml(story.cn)}</p><ol class="rule-list">${story.questions.map(q=>`<li>${escapeHtml(q)}</li>`).join('')}</ol><p class="curve-note">本日新词后续复习日期：<b>${curve}</b>。错词自动追加到次日，并继续按曲线出现。</p></div>`;
}
function worksheetHtml(title,body){return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;color:#111;margin:18mm;font-size:12pt;line-height:1.6}h1{text-align:center;font-size:20pt}h2{font-size:15pt;border-bottom:1px solid #1c5e4f;padding-bottom:3px}h3{font-size:13pt;margin:14px 0 6px;color:#155346}table{border-collapse:collapse;width:100%;font-size:10.5pt}th,td{border:1px solid #333;padding:6px;vertical-align:top}th{background:#eaf4f0}.daily-top{display:flex;justify-content:space-between;border-bottom:1px solid #333;padding-bottom:6px}.daily-table td:last-child{height:30px}.review-words{padding:8px;background:#f4f8f5}.red-tip{color:#b00020;font-weight:bold;background:#fff1f1;padding:8px}.story-en{font-family:Arial,sans-serif}.curve-note{background:#fff6d9;padding:8px}@page{size:A4;margin:14mm}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`}
function downloadDoc(name,html){const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function openPrint(title,body){const win=window.open('','_blank');if(!win){alert('浏览器阻止了新页面，请允许弹出窗口后再试，或改用“导出 WPS”。');return}win.document.write(worksheetHtml(title,body));win.document.close();win.focus();setTimeout(()=>win.print(),350)}
function render(){const {target,list}=currentPlan(); const last=data.records.at(-1); const ws=weakness(); const rec=khanRecommendation(ws);
  if(last||Object.values(data.tests||{}).some(x=>x!=='')){['plan','analysis','khanPlan','checkPlan','weekend'].forEach(id=>$(id).classList.remove('hidden'));}
  if(last){$('dailyCard').classList.remove('hidden');$('dailyDate').textContent='（'+dateLabel(last.date)+'）';$('dailyCardContent').innerHTML=dailyCardMarkup(last);}
  else {$('dailyCard').classList.add('hidden');}
  $('nextDate').textContent='（'+target+'）';
  const words=list.length?list:[];$('dictationList').innerHTML=words.map((x,i)=>`<div class="word"><b>${i+1}.</b> ${x.word}<span class="tag">${x.tag}</span></div>`).join('')||'<p>先保存一次“今天录入”，系统才会生成下一次清单。</p>';
  $('planNote').textContent=list.length<40?`目前已排 ${list.length} 个词。请在“明天固定要学的5个新词”补足新词；其余位置会随记录增加，按间隔复习填充。不会为凑40题重复同一个词。`:'40词已由明日新词、次日/第3/7/14/30天复习、高频错词、规律词和已掌握抽查组合。';
  $('weaknessContent').innerHTML=ws.length?ws.map(w=>`<div class="weak"><b>${w.name}<br><span class="score-bad">累计错误 ${w.count} 次；近7次记录 ${w.recent} 次</span></b><span>${w.why}<br><small>建议检验：${w.test}</small></span></div>`).join(''):'<p>还没有录入错词。录入后会按字母组合、元音、音节、短语、词尾和不规则词形自动分析。</p>';
  $('khanContent').innerHTML=`<p><b>${rec.title}</b></p><ol class="rule-list"><li>点 <b>Reading</b> → 右上角选 <b>1st Grade</b>。</li><li>找 <b>${rec.course}</b>。</li><li>今天点 <b>${rec.card}</b>。</li><li>${rec.text}</li><li>完成后让孩子说：“我今天学的是 ______，它常读 ______，例如 ______。”说不出就不算掌握。</li><li><b>再加 5 分钟迁移：</b>Reading Fluency 读一小段，或每周 2 次 Books / Early Readers。让孩子在读物里圈出今天的组合，读出含它的一句话；图书里遇到不规则词不拿来考拼读规则。</li></ol>`;
  const t=data.tests||{}; const rows=[['字母组合辨认',t.combo,10,8],['陌生词读写',t.decode,10,8],['Magic e 对比',t.magic,4,3],['多音节拆分',t.syllable,5,4]]; $('checkContent').innerHTML='<p><b>系统根据当前最高的薄弱项生成：</b></p><ol class="rule-list">'+autoChecks(ws).map(x=>`<li>${x}</li>`).join('')+'</ol><p><b>您填写过的检验结果：</b></p><ul class="rule-list">'+rows.map(([name,score,total,pass])=>`<li><b>${name}</b>：${score??'未填'} / ${total}，${score!==undefined&&score!==''?(+score>=pass?'<span class="score-good">达到规则掌握线</span>':'<span class="score-bad">未达标：回到 Main/Basic + 陌生词纸笔练习</span>'):'可不填；系统已按错词自动调整。'}</li>`).join('')+'</ul>';
  const totalErrors=data.records.reduce((n,r)=>n+r.errors.length,0);$('weekendContent').innerHTML=`<p>已记录 ${data.records.length} 天，累计错词次数 ${totalErrors}。周末从所有错误词中抽20个，再从“已掌握词”抽10个，并做一次本页的规则检验。</p><ul class="rule-list"><li><b>如果旧词会写、陌生词不行：</b>纸笔练习要改为规则卡 + 陌生词读写；可汗做 Main/Basic，不刷 Practice。</li><li><b>如果陌生词能读写、旧词仍错：</b>规律已会，继续按次日/第3天/第7天默写，不增加新规则。</li><li><b>如果多音节、词组空格常错：</b>每题默写前先口头“拍音节 / 说词块”，不要直接整词硬写。</li></ul>`;
  $('soundCardContent').innerHTML=SOUNDS.map(s=>`<div class="sound"><small><b>${s[0]}</b></small><b>${s[1]}</b> <em>${s[2]}</em><small>例词：${s[3]}<br>${s[4]}</small></div>`).join('');
}
function saveRecord(){
  const date=$('studyDate').value||iso(today),newItems=parseEntries($('newWords').value),errorItems=parseEntries($('errorWords').value),nextNewItems=parseEntries($('nextNewWords').value);
  const newWords=newItems.map(x=>x.word),errors=errorItems.map(x=>x.word),nextNewWords=nextNewItems.map(x=>x.word);
  if(!newWords.length&&!errors.length){alert('请至少输入今天的新词或错词。');return}
  const previous=data.records.find(r=>plus(r.date,1)===date);
  // 若昨天已生成过今天的40词，表示这些词今天实际被默写，全部进入下一轮记忆曲线；若没有，至少追踪今天的5个新词。
  const reviewedWords=(previous?.nextPlan||[]).map(x=>typeof x==='string'?x:x.word);
  data.records=data.records.filter(r=>r.date!==date);
  const record={date,newWords,errors,nextNewWords,newItems,errorItems,nextNewItems,reviewedWords:reviewedWords.length?reviewedWords:newWords,khan:$('khanDone').value};
  data.records.push(record);data.records.sort((a,b)=>a.date.localeCompare(b.date));rebuildWordState();
  // 立即保存“明天的40词”；明天录入批改结果时系统就知道哪些词实际参与过默写。
  record.nextPlan=buildPlan(plus(date,1)).list;
  save();render();document.getElementById('plan').scrollIntoView({behavior:'smooth'});
}
function saveTest(){data.tests={combo:$('comboScore').value,decode:$('decodeScore').value,magic:$('magicScore').value,syllable:$('syllableScore').value};save();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function exportWorksheet(){
  const {target,list}=currentPlan();
  if(!list.length){alert('请先保存一次“今天录入”，再导出作业。');return;}
  const rows=list.map((x,i)=>`<tr><td>${i+1}</td><td>&nbsp;</td><td></td><td>${escapeHtml(x.word)}</td><td>${escapeHtml(x.tag||'')}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>英语默写作业</title><style>body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;color:#111;margin:24px}h1{text-align:center;font-size:22px}p{font-size:13px}.meta{display:flex;justify-content:space-between;border-bottom:1px solid #333;padding-bottom:8px}table{border-collapse:collapse;width:100%;font-size:14px;margin-top:14px}th,td{border:1px solid #333;padding:7px;height:24px}th{background:#eaf4f0}.rule{background:#f7fbf9;padding:10px;margin-top:14px;line-height:1.7}@page{size:A4;margin:16mm}</style></head><body><h1>英语默写与拼读巩固作业</h1><div class="meta"><span>日期：${target}</span><span>姓名：__________________</span><span>得分：________</span></div><p><b>规则：</b>家长按中文或英文读词；孩子在“孩子书写”栏写出单词。写完后圈出词中的字母组合/词块，并在“错因”栏写：元音、组合、词尾、音节、空格或视觉词形。</p><table><thead><tr><th style="width:7%">序号</th><th style="width:35%">孩子书写</th><th style="width:24%">错因/订正</th><th style="width:22%">家长答案</th><th style="width:12%">来源</th></tr></thead><tbody>${rows}</tbody></table><div class="rule"><b>今日拼读自检：</b>从本页任选3个词，孩子必须能说出其中的字母组合或词块和读音；再由家长给1个同规律陌生词，能读写才算真正掌握。</div></body></html>`;
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
  const now=iso(today); $('studyDate').value=now;
  const existing=data.records.find(r=>r.date===now), last=data.records.at(-1);
  const formatItems=items=>(items||[]).map(x=>typeof x==='string'?x:[x.word,x.gloss,x.ipa].filter(Boolean).join(' | ')).join('\n');
  if(existing){$('newWords').value=formatItems(existing.newItems?.length?existing.newItems:existing.newWords);$('errorWords').value=formatItems(existing.errorItems?.length?existing.errorItems:existing.errors);$('nextNewWords').value=formatItems(existing.nextNewItems?.length?existing.nextNewItems:existing.nextNewWords);$('khanDone').value=existing.khan||'';}
  else if(last&&plus(last.date,1)===now){$('newWords').value=(last.nextNewWords||[]).join('\n');$('nextNewWords').value='';}
  else if(!data.records.length)$('newWords').value='dress\nshirt\nskirt\nshorts\nboots';
  const t=data.tests||{};$('comboScore').value=t.combo||'';$('decodeScore').value=t.decode||'';$('magicScore').value=t.magic||'';$('syllableScore').value=t.syllable||'';render();
}
$('saveAndPlan').onclick=saveRecord;$('saveTest').onclick=saveTest;
$('exportWorksheet').onclick=exportWorksheet;
$('exportDailyWorksheet').onclick=exportDailyWorksheet;
$('printDailyWorksheet').onclick=printDailyWorksheet;
$('markAllCorrect').onclick=()=>{alert('本次“全对”只说明这批词本次正确。请仍保留它们在第3天、第7天的安排，并在周末做陌生词规则检验。')};
$('exportData').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='英语拼读巩固备份_'+iso(today)+'.json';a.click();URL.revokeObjectURL(a.href)};
$('importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);save();fill();alert('导入成功。')}catch{alert('这不是正确的备份文件。')}};r.readAsText(f)};
$('resetData').onclick=()=>{if(confirm('确定清空本手机的全部记录吗？建议先导出备份。')){data={records:[],tests:{}};save();fill();}};
fill();
