const KEY='phonics-helper-v2', LEGACY_KEY='phonics-helper-v1';
const $=id=>document.getElementById(id);
const today=new Date();
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const plus=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return iso(d)};
const norm=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
let data=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'{"records":[],"tests":{}}');
data.customWords=Array.isArray(data.customWords)?data.customWords:[];
const query=new URLSearchParams(location.search);
const reviewMode=query.get('mark')==='1';
// 平时打开页面永远使用当天；只有打印作业的二维码才固定到历史日期。
const queryDate=reviewMode&&/^\d{4}-\d{2}-\d{2}$/.test(query.get('date')||'')?query.get('date'):'';
const realToday=()=>iso(new Date());
const queryItems=reviewMode?(query.get('items')||'').split('|').map(norm).filter(Boolean).map(word=>({word,tag:'当日默写'})):[];
data.printedPlans=data.printedPlans&&typeof data.printedPlans==='object'?data.printedPlans:{};
const masterPlanFor=date=>(window.MASTER_DAILY_PLAN||[]).find(x=>x.date===date);
const formatItems=items=>(items||[]).map(x=>typeof x==='string'?x:[x.word,x.gloss||x.cn,x.ipa].filter(Boolean).join(' | ')).join('\n');
function planRuleIds(focus=''){
  const pairs=[['r 控制','r_controlled'],['元音组合','vowel_teams'],['辅音连缀','blends'],['辅音字母组合','blends'],['词尾','endings'],['音节','multisyllable'],['短语','phrases'],['视觉','irregular']];
  return [...new Set(pairs.filter(([key])=>focus.includes(key)).map(([,id])=>id))];
}
function updateMasterPlanHint(){
  const date=$('studyDate').value||realToday(), plan=masterPlanFor(date), next=masterPlanFor(plus(date,1));
  $('masterPlanHint').innerHTML=plan
    ? `<b>今天固定新词：</b>${plan.words.map(x=>`<b>${escapeHtml(x.word)}</b>`).join('、')}。<br><b>明天预告：</b>${next?next.words.map(x=>`<b>${escapeHtml(x.word)}</b>`).join('、'):'明天为复习日'}。<br>今天重点：${escapeHtml(plan.focus)}。您只需在下方填写今天的错词。`
    : '今天是复习日：无需输入新词，只填写今天默写错误的词。';
}
function renderTodayWords(){
  const date=$('studyDate').value||realToday(), plan=masterPlanFor(date);
  $('todayWordDate').textContent=`${dateLabel(date)}｜5 个新词`;
  if(plan?.words?.length){
    $('todayWordChips').innerHTML=plan.words.map((x,i)=>`<span class="word-chip"><b>${i+1}.</b> ${escapeHtml(x.word)}</span>`).join('');
    $('todayFocus').textContent=`今天重点：${plan.focus||'按词块读、说、写。'}`;
  }else{
    $('todayWordDate').textContent=`${dateLabel(date)}｜复习日`;
    $('todayWordChips').innerHTML='<span class="word-chip">今天没有固定新词</span>';
    $('todayFocus').textContent='今天只完成默写批改和复习即可。';
  }
}
function fillMasterPlan(){
  const date=$('studyDate').value||realToday(), plan=masterPlanFor(date);
  if(!plan){$('newWords').value='今天是复习日（没有固定新词）';$('nextNewWords').value='';updateMasterPlanHint();renderTodayWords();return;}
  $('newWords').value=formatItems(plan.words);
  const next=masterPlanFor(plus(date,1));
  $('nextNewWords').value=next?formatItems(next.words):'';
  updateMasterPlanHint();
  renderTodayWords();
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
  prepare:'v.',holiday:'n.',important:'adj.',exercise:'n.&v.',television:'n.',phone:'n.',close:'adj.&v.',bone:'n.',seek:'v.',between:'prep.&adv.',stretch:'v.',trousers:'n.',bounce:'v.',point:'n.&v.',touch:'v.',forest:'n.',cheese:'n.',collect:'v.',mountain:'n.',whose:'pron.',chorus:'n.',delicious:'adj.',
  'in front of':'prep.', 'come from':'phr.', 'pick up':'phr.', 'listen to':'phr.', 'bus stop':'n.', 'sun cream':'n.',sunglasses:'n.',postcard:'n.',armchair:'n.',painting:'n.',muscle:'n.',clothes:'n.',sausage:'n.',difficult:'adj.',remember:'v.',practise:'v.',phrase:'n.', 'photo album':'n.',tidy:'adj.&v.',hockey:'n.'
};
const SOUNDS=[
['规则地图：元音','oa / ow','/əʊ/','boat / snow','常见长 o；ow 在 cow 中读 /aʊ/。美式常把 /əʊ/ 写作 /oʊ/。'],['规则地图：元音','长 a','ai / ay / a_e / eigh','rain / day / name / eight','ai 多在词中，ay 多在词尾；eigh 属进阶拼写。'],['规则地图：元音','长 e','ee / ea / e_e / ey / ie','see / leaf / these / key / field','ea 有例外，如 bread；先连例词学习。'],['规则地图：元音','长 i','i_e / igh / y / ie / i+nd','kite / light / my / pie / find','igh 常读 /aɪ/；i+nd 作为常见词块辨认。'],['规则地图：元音','长 u','u_e / ue / ui / ew','cube / blue / fruit / new','可能读 /juː/ 或 /uː/，不要只背一条。'],['规则地图：元音','air are / ear ere','/eə/；/ɪə/或/eə/','hair / care；hear / here','进阶组合先连例词学习；不同口音会有差异。'],['规则地图：元音','au aw / al','/ɔː/','autumn / draw / ball','进阶组合；在错词出现后再专项练习。'],['规则地图：辅音','ph','/f/','phone / photo / phrase','ph 常读 /f/；当前截图没有专门 ph 卡，用纸笔规则卡巩固。'],['规则地图：音节','闭音节 / 开音节 / 复合词','短元音 / 长元音','bag / be；bus stop / postcard','辅音封住元音常为短音；元音在音节末常为长音；复合词先拆两块。'],
['Consonant Digraphs','ch','/tʃ/','chair, stretch','两个字母合成一个音；可汗页面会分别出现 Sounds: ch。'],['Consonant Digraphs','sh','/ʃ/','ship, shirt, shorts','两个字母合成“嘘”音；可汗页面会分别出现 Sounds: sh。'],['Consonant Digraphs','th','/θ/ 或 /ð/','thin / this','舌尖轻碰牙齿；同一组合有清浊两种常见音。'],['Consonant Digraphs','wh','/w/','what, when','常见读 /w/；who 是例外，单独记。'],['Consonant Blends','sk, st, sp, str, tr','各辅音都要发出来','skirt, stop, spring, stretch, trousers','不是一个新音，是几个辅音连续发；可汗示例含 st、sp、sk、sm、bl 等。'],['Final -e & Long Vowel Teams','a_e / i_e / o_e','/eɪ/ /aɪ/ /oʊ/','name / kite / bone','末尾 e 通常不发音，让前面的元音读字母音；可汗把它称为 The Magic E。'],['Final -e & Long Vowel Teams','ee / ea','/iː/','seek / leaf','长 e；ea 在少数词中例外，例如 bread。'],['Final -e & Long Vowel Teams','ai / ay','/eɪ/','rain / day','ai 常在词中，ay 常在词尾。'],['Final -e & Long Vowel Teams','oa / ow','/əʊ/（美式常写 /oʊ/）','boat / snow','oa 常读长 o；ow 在 cow 中读 /aʊ/，要和例词一起辨认。'],['Final -e & Long Vowel Teams','oo','/uː/ 或 /ʊ/','boots / book','同一组合有两种常见音，必须连例词一起记。'],['Final -e & Long Vowel Teams','ou / oi','/aʊ/ 或 /ʌ/；/ɔɪ/','bounce / touch；point','ou 有多种音；oi 常读 /ɔɪ/。'],['r-Controlled Vowels','ar / or / er ir ur','/ɑr/ /ɔr/ /ɜr/','car / short / shirt','r 会改变前面元音；可汗课程标题直接列出 ar or er ir ur。'],['Inflectional Endings','-ing / -ed / -s -es','/ɪŋ/；/t/ /d/ /ɪd/；/s/ /z/ /ɪz/','painting / jumped / boots','先写词根再加词尾；词尾发音由前一个音决定。']
];

// 常见教材词的“中文 + 音标 + 词块”。家长若录入“英文 | 中文 | 音标”，会优先采用家长填写的信息。
const WORD_INFO={
  dress:['连衣裙；穿衣；打扮','/dres/','dr + e + ss'],shirt:['衬衫','/ʃɜːt/','sh + ir + t'],skirt:['裙子','/skɜːt/','sk + ir + t'],shorts:['短裤；短裙','/ʃɔːts/','sh + or + t + s'],boots:['靴子','/buːts/','oo + t + s'],
  photo:['照片','/ˈfəʊtəʊ/','ph + o + to'],show:['展示；表演','/ʃəʊ/','sh + ow'],model:['模型；模特','/ˈmɒdəl/','o（短元音）+ el'],singer:['歌手','/ˈsɪŋə(r)/','sing + er'],asleep:['睡着的','/əˈsliːp/','a + sleep（ee）'],
  prepare:['准备','/prɪˈpeə(r)/','pre + pare'],holiday:['假期；节日','/ˈhɒlədeɪ/','hol + i + day（ay）'],important:['重要的','/ɪmˈpɔːtənt/','im + por + tant'],exercise:['练习；锻炼','/ˈeksəsaɪz/','ex + er + cise'],television:['电视；电视机','/ˈtelɪvɪʒn/','tel + e + vi + sion'],phone:['电话','/fəʊn/','ph + o_e'],close:['关闭的；关闭','/kləʊz/','cl + o_e'],bone:['骨头','/bəʊn/','o_e'],seek:['寻找；追求','/siːk/','ee'],between:['在……之间','/bɪˈtwiːn/','be + tween（ee）'],stretch:['拉伸；伸展','/stretʃ/','str + e + tch'],trousers:['裤子','/ˈtraʊzəz/','tr + ou + s + ers'],bounce:['弹跳','/baʊns/','ou + nce'],point:['点；分数','/pɔɪnt/','oi + nt'],touch:['触摸','/tʌtʃ/','ou + tch'],forest:['森林','/ˈfɒrɪst/','for + est'],cheese:['奶酪','/tʃiːz/','ch + ee + se'],collect:['收集；收取','/kəˈlekt/','col + lect'],mountain:['山','/ˈmaʊntən/','moun + tain'],whose:['谁的','/huːz/','wh + ose'],chorus:['合唱','/ˈkɔːrəs/','chor + us'],delicious:['美味的；可口的','/dɪˈlɪʃəs/','de + li + cious'],
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
function allMetas(){return [...(data.customWords||[]),...data.records.flatMap(r=>[...(r.newItems||[]),...(r.errorItems||[]),...(r.nextNewItems||[])])];}
function customPendingWords(targetDate){
  const appeared=new Set(data.records.flatMap(r=>[...entryWords(r),...(r.nextPlan||[]).map(x=>typeof x==='string'?x:x.word)]).map(norm));
  return (data.customWords||[]).filter(x=>(x.addedDate||'')<=targetDate&&!appeared.has(norm(x.word)));
}
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
// 家长已确认的历史批改结果。首次打开新版网页时写入一次。
// 11 月 10 日的记录曾被旧版页面缓存错误覆盖，因此本版会在每台设备上
// 仅同步一次“家长最终确认”的数据，不影响之后手动录入的日期。
const CORRECTION_SYNC_VERSION='2026-11-11-real-sheet-v4';
const SEEDED_ERROR_RECORDS=[
  {date:'2026-11-09',errors:['holiday','postcard','singer','forest','cheese','collect','exercise','trousers','mountain']},
  {date:'2026-11-10',errors:['collect','dress','phone','whose','chorus','postcard','mountain','forest','delicious','leaves','exercise']}
];
// 已确认的纸质默写表：批改页必须严格以它为准，不能再重新随机出题。
const HISTORICAL_DICTATION_ITEMS={
  '2026-11-10':[
    'ground','tidy','trousers','collect','triangle','leaf','seek','holiday','in front of','volcano',
    'dress','enjoy','phone','singer','whose','painting','chorus','postcard','between','photo album',
    'mountain','socks','lake','sun cream','stretch','forest','delicious','boots','cheese','leaves',
    'exercise','jellyfish','muscle','touch','heart','grass','pineapple','bounce','trunks','important'
  ].map(word=>({word,tag:'11月10日实际默写'}))
};
const cloneItems=items=>(items||[]).map(x=>typeof x==='string'?{word:x}:{...x});
function dictationItemsFor(date){
  if(reviewMode&&queryDate===date&&queryItems.length)return cloneItems(queryItems);
  if(HISTORICAL_DICTATION_ITEMS[date])return cloneItems(HISTORICAL_DICTATION_ITEMS[date]);
  const saved=storedPlanFor(date);
  if(saved)return saved;
  const record=data.records.find(r=>r.date===date);
  if(Array.isArray(record?.dictationItems)&&record.dictationItems.length&&hasRequiredNewWords(date,record.dictationItems))return cloneItems(record.dictationItems);
  const planned=planForDate(date);
  if(planned.length)return cloneItems(planned);
  return cloneItems(masterPlanFor(date)?.words||[]);
}
function seedKnownErrors(){
  data.printedPlans=data.printedPlans&&typeof data.printedPlans==='object'?data.printedPlans:{};
  // 早期测试版曾把 11 月 4/5 日的示例计划保存到手机浏览器。
  // 它们不是孩子的真实学习记录；若本机尚没有 11 月 9 或 10 日的确认记录，
  // 自动移除这批旧示例，再写入家长已经确认过的真实数据。
  let changed=false;
  const hasVerifiedRecord=data.records.some(r=>r.date==='2026-11-09'||r.date==='2026-11-10');
  if(!hasVerifiedRecord&&data.records.length){
    data.records=[];
    data.wordState={};
    data.tests={};
    changed=true;
  }
  SEEDED_ERROR_RECORDS.forEach(seed=>{
    const plan=masterPlanFor(seed.date); if(!plan?.words?.length)return;
    const next=masterPlanFor(plus(seed.date,1));
    const actualItems=HISTORICAL_DICTATION_ITEMS[seed.date]?cloneItems(HISTORICAL_DICTATION_ITEMS[seed.date]):null;
    if(actualItems&&(!data.printedPlans[seed.date]||data.correctionSyncVersion!==CORRECTION_SYNC_VERSION)){
      data.printedPlans[seed.date]=cloneItems(actualItems);changed=true;
    }
    const newWords=plan.words.map(x=>norm(x.word));
    const errors=seed.errors.map(norm);
    const old=data.records.find(r=>r.date===seed.date);
    if(!old){
      data.records.push({date:seed.date,newWords,errors,nextNewWords:(next?.words||[]).map(x=>norm(x.word)),newItems:plan.words,errorItems:errors.map(word=>({word})),nextNewItems:next?.words||[],dictationItems:actualItems||undefined,reviewedWords:actualItems?actualItems.map(x=>norm(x.word)):[...new Set([...newWords,...errors])],khan:'',masterFocus:plan.focus||'',seed:true});
      changed=true;
      return;
    }
    // 已存在的 11 月 10 日记录也必须改正为本次家长给出的 11 个错词。
    if(seed.date==='2026-11-10'&&data.correctionSyncVersion!==CORRECTION_SYNC_VERSION){
      Object.assign(old,{newWords,errors,nextNewWords:(next?.words||[]).map(x=>norm(x.word)),newItems:plan.words,errorItems:errors.map(word=>({word})),nextNewItems:next?.words||[],dictationItems:actualItems,reviewedWords:actualItems.map(x=>norm(x.word)),masterFocus:plan.focus||old.masterFocus||'',syncedCorrection:CORRECTION_SYNC_VERSION});
      changed=true;
    }
  });
  if(!changed)return;
  data.records.sort((a,b)=>a.date.localeCompare(b.date));
  rebuildWordState();
  data.records.filter(r=>r.seed||r.date==='2026-11-10').forEach(record=>record.nextPlan=buildPlan(plus(record.date,1)).list);
  data.correctionSyncVersion=CORRECTION_SYNC_VERSION;
  save();
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
function scheduledWords(targetDate){
  const fixed=masterPlanFor(targetDate);
  if(fixed?.words?.length)return fixed.words.slice(0,5).map(x=>norm(x.word));
  // 周末默认只做总复习；周一至周五若家长尚未建立总表，才沿用手动录入的下一批新词。
  const day=new Date(targetDate+'T12:00:00').getDay();
  if(day===0||day===6)return [];
  const latest=data.records.at(-1);
  return (latest?.nextNewWords||[]).slice(0,5).map(norm);
}
function stableShuffle(items,seedText){
  let seed=[...seedText].reduce((n,c)=>((n*31)+c.charCodeAt(0))>>>0,17);
  const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const copy=[...items]; for(let i=copy.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];} return copy;
}
function buildPlan(targetDate){
  const due=dueWords(targetDate),counts=allErrorCounts(),state=rebuildWordState();
  let list=[],added=new Set(); const add=(word,tag)=>{word=norm(word);if(word&&!added.has(word)&&list.length<40){list.push({word,tag});added.add(word)}};
  // 1. 总表日期优先：每天固定5个新词绝不因错词或排序而消失。
  scheduledWords(targetDate).forEach(w=>add(w,'今日新词·必默'));
  // 家长临时加入的词也视作“新词”，先出现一次，再进入同一条复习曲线。
  customPendingWords(targetDate).forEach(x=>add(x.word,'家长新增·必默'));
  // 2. 错词先按“次日→第3→第7→第14→第30天”回归；错得越多，越靠前进入候选池。
  Object.entries(state).filter(([,s])=>s.nextDue<=targetDate&&s.errors>0)
    .sort((a,b)=>a[1].nextDue.localeCompare(b[1].nextDue)||b[1].errors-a[1].errors).forEach(([w,s])=>add(w,`错词曲线·第${Math.min(s.stage+1,5)}轮`));
  Object.entries(counts).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).forEach(([w,n])=>add(w,`高频错词·${n}次`));
  // 3. 已学但目前无错的词，仍按曲线回归；这样“软件显示掌握”也会被抽查。
  Object.entries(state).filter(([,s])=>s.nextDue<=targetDate&&s.errors===0)
    .sort((a,b)=>a[1].nextDue.localeCompare(b[1].nextDue)).forEach(([w])=>add(w,'已学曲线复习'));
  const focus=masterPlanFor(targetDate)?.focus||'';
  const all=[...new Set(data.records.flatMap(entryWords))];
  all.filter(w=>ruleOf(w).some(id=>planRuleIds(focus).includes(id))).forEach(w=>add(w,'同规律迁移'));
  MASTERY.forEach(w=>add(w,'已掌握抽查'));
  BASE_REVIEW.forEach(w=>add(w,'基础库抽查'));
  // 孩子看到的默写顺序每次固定打乱；家长网页预览仍能看到答案与来源。
  return {list:stableShuffle(list,targetDate),due};
}
function weakness(){
  const counts={}, recent={};
  const lastSeven=data.records.slice(-7);
  data.records.forEach(r=>(r.errors||[]).forEach(w=>ruleOf(w).forEach(id=>counts[id]=(counts[id]||0)+1)));
  lastSeven.forEach(r=>(r.errors||[]).forEach(w=>ruleOf(w).forEach(id=>recent[id]=(recent[id]||0)+1)));
  return PATTERNS.map(p=>({...p,count:counts[p.id]||0,recent:recent[p.id]||0,priority:(recent[p.id]||0)*3+(counts[p.id]||0)})).filter(p=>p.count).sort((a,b)=>b.priority-a.priority)
}
function khanRecommendation(ws,focus=''){const t=data.tests||{}; const has=t.combo!==''&&t.combo!==undefined; const ruleFail=(has&&+t.combo<8)||(+t.decode<8&&t.decode!==undefined&&t.decode!=='')||(+t.magic<3&&t.magic!==undefined&&t.magic!=='')||(+t.syllable<4&&t.syllable!==undefined&&t.syllable!=='');
  const focusIds=planRuleIds(focus); const focusRule=PATTERNS.find(p=>focusIds.includes(p.id));
  const top=ws.find(w=>focusIds.includes(w.id)&&w.recent>0)||ws[0]||focusRule;
  const syncNote=focusRule?`今天总表的重点还包括“${focusRule.name}”，完成本课后请在当天新词里圈出这个组合。`:'';
  if(ruleFail){return {title:'先补规则，不进入 Practice',course:top?.khan||'Final -e & Long Vowel Teams',card:'Basic 或 Main',text:`规则检验未达标，说明“会写见过的词”不等于掌握规律。先完成对应 Basic（基础支持）或 Main（主课），然后做陌生词读写，不要先刷 Practice。${syncNote}`}}
  if(top?.id==='ph')return {title:'先做 ph 纸笔规则卡',course:'纸笔规则卡',card:'不需要在可汗里搜索 ph 专题',text:'您截图中的可汗课程没有明确的 ph 专题。先用 phone / photo / phrase 做“看 ph—读 /f/—遮住书写”；可汗当天改做 Nonsense Words 或已安排的主课即可。'};
  if(top&&top.count>=3)return {title:'主课后做一轮练习',course:top.khan,card:'Main → Practice 1',text:`${top.name}错误较集中。先 Main（主课），能口头说出规律并完成陌生词读写后，再做 Practice 1（第一轮练习）。${syncNote}`};
  if(focusRule)return {title:'跟当天新词同步学规则',course:focusRule.khan,card:'Main',text:`今天先围绕${focusRule.name}做一张 Main（主课）卡，再从新词中找同一组合。${syncNote}`};
  return {title:'规则课短学 + 纸笔主练',course:'1-Syllable & 2-Syllable Words',card:'Main',text:'当前没有明显规则性薄弱项，建议每天只做1张主课卡，其余时间用于纸笔错词间隔复习。'};
}
const hasRequiredNewWords=(date,items)=>{
  const required=(masterPlanFor(date)?.words||[]).map(x=>norm(x.word));
  if(!required.length)return true;
  const set=new Set((items||[]).map(x=>norm(typeof x==='string'?x:x.word)));
  return required.every(word=>set.has(word));
};
function storedPlanFor(date){
  const stored=data.printedPlans?.[date];
  return Array.isArray(stored)&&stored.length&&hasRequiredNewWords(date,stored)?cloneItems(stored):null;
}
function currentPlan(){
  const target=reviewMode&&queryDate?queryDate:realToday();
  if(reviewMode&&queryItems.length)return {target,list:cloneItems(queryItems)};
  const frozen=storedPlanFor(target);
  return {target,list:frozen||buildPlan(target).list};
}
function planForDate(date){
  const frozen=storedPlanFor(date);
  if(frozen)return frozen;
  const yesterday=data.records.find(r=>plus(r.date,1)===date);
  const saved=(yesterday?.nextPlan||[]).map(x=>typeof x==='string'?x:x.word).filter(Boolean);
  const fresh=buildPlan(date).list;
  // 先保留当天固定新词和家长新增词，再补昨天已生成的清单，避免新增词被40题上限挤掉。
  const merged=[...fresh,...saved.map(word=>({word,tag:'已生成默写'}))];
  const seen=new Set();return merged.filter(x=>!seen.has(norm(x.word))&&seen.add(norm(x.word))).slice(0,40);
}
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
  const planned=masterWordInfo(word);
  const known=WORD_INFO[norm(word)]||[];
  const ids=ruleOf(word);
  return {word:norm(word),gloss:own.gloss||planned.cn||known[0]||'请按教材核对中文',ipa:own.ipa||planned.ipa||known[1]||'请按教材核对音标',pos:own.pos||POS_INFO[norm(word)]||'',chunk:planned.chunk||known[2]||ids.map(id=>PATTERNS.find(p=>p.id===id)?.name).join('；')||'先圈元音/辅音词块'};
}
function masterWordInfo(word){
  const target=norm(word);
  for(const day of (window.MASTER_DAILY_PLAN||[])){
    const hit=(day.words||[]).find(x=>norm(x.word)===target);
    if(hit)return hit;
  }
  return {};
}
function dateLabel(date){const d=new Date(date+'T12:00:00');return `${date}（${WEEK[d.getDay()]}）`}
function dailyRules(record){
  const words=[...(record.errors||[]),...(record.newWords||[])];
  const ids=[...new Set(words.flatMap(ruleOf))];
  const ordered=ids.sort((a,b)=>{const ae=(record.errors||[]).filter(w=>ruleOf(w).includes(a)).length;const be=(record.errors||[]).filter(w=>ruleOf(w).includes(b)).length;return be-ae});
  const fromMaster=planRuleIds(record.masterFocus||masterPlanFor(record.date)?.focus||'');
  const selected=[...new Set([...ordered,...fromMaster])];
  return (selected.length?selected:['vowel_teams','multisyllable']).slice(0,3).map(id=>({id,name:PATTERNS.find(p=>p.id===id)?.name||id,detail:RULE_DETAILS[id]||''}));
}
function reviewForDaily(record){
  const earlier=data.records.filter(r=>r.date<record.date).sort((a,b)=>b.date.localeCompare(a.date));
  const direct=[...new Set([...(earlier[0]?.newWords||[]),...(record.errors||[])])];
  const counts=allErrorCounts();
  const extra=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
  return [...new Set([...direct,...extra])].filter(w=>!record.newWords.includes(w)).slice(0,10);
}
function storyFor(record){
  const w=(record.newWords||[]); const a=w[0]||'photo',b=w[1]||'show',c=w[2]||'model',d=w[3]||'singer',e=w[4]||'asleep';
  const review=reviewForDaily(record).slice(0,3);
  // 前两天与目前总表完全同步；后续继续用同一条“少年赛车队”主线，而不是重复同一种句子。
  if(record.date==='2026-11-09')return {title:'赛车队的第一张线索',en:'Leo took a photo of a tiny model car at the school show. A young singer smiled at him. After the show, the singer was asleep beside the car. Leo put the photo in his Adventure Notebook.',cn:'Leo 在学校展示会上拍了一辆小模型车的照片。一位年轻歌手朝他微笑。展示会结束后，歌手在车旁睡着了。Leo 把照片放进了《冒险笔记》。',review,questions:['1. What did Leo take at the school show?','2. Who was asleep beside the car?','3. 圈出 ph、sh、ee、sl 中的两个组合，说出读音。']};
  if(record.date==='2026-11-10')return {title:'湖边的隐藏赛道',en:'After school, Leo drove his small model car across the grass. The ground near the lake was soft. A leaf landed on the map, and two leaves pointed to a hidden path. Leo remembered the photo and called the singer. Together, they found the key to the next race.',cn:'放学后，Leo 驾驶小模型车穿过草地。湖边的地面很软。一片叶子落在地图上，两片叶子指向一条隐藏的小路。Leo 想起那张照片，叫来了歌手。他们一起找到了下一场比赛的钥匙。',review,questions:['1. Where was the ground soft?','2. What pointed to the hidden path?','3. 圈出 gr、ou、a_e、ea 和词尾 -s，任选两个说出读音。']};
  const plots=[
    {title:'拖拉机的晨光任务',en:`At dawn, Leo saw a ${a} near the field. It had to cross a ${b} before the race. His friend was ${c}, but the map was ${d}. A ${e} sound came from the old gate. Leo followed it and found a safe road.`,cn:`清晨，Leo 在田野旁看见了一个${a}。它必须穿过${b}才能到达赛道。他的朋友${c}，但地图上有${d}。旧门后传来${e}的声音。Leo 顺着声音找到了安全的路。`},
    {title:'车库里的新任务',en:`Leo put the ${a} in his race bag. On the way, he found ${b}. The team used ${c} to solve a small problem. Then ${d} gave Leo a clue about ${e}. The next part of the adventure began.`,cn:`Leo 把${a}放进赛车包。路上他发现了${b}。小队用${c}解决了一个小问题。随后，${d}给了 Leo 关于${e}的线索。冒险的下一段开始了。`},
    {title:'终点前的选择',en:`The road was quiet when Leo checked the ${a}. He and Max saw ${b} near ${c}. They did not rush. ${d} helped them read the signs, and ${e} showed the final turn. The team reached the finish line together.`,cn:`Leo 查看${a}时，路上很安静。他和 Max 在${c}附近看到了${b}。他们没有着急。${d}帮助他们读懂路标，${e}指向最后一个转弯。小队一起到达终点。`}
  ];
  const n=Math.max(0,data.records.findIndex(r=>r.date===record.date)); const plot=plots[n%plots.length];
  return {title:plot.title,en:plot.en,cn:plot.cn,review,questions:['1. 用中文说说这次任务遇到了什么。','2. 找出今天的两个新词并读出来。','3. 找一处昨天词或错词，圈出其中的字母组合。']};
}
function dailyCardMarkup(record){
  // 旧错词再次进入复习时，继续带出家长已经录入的中文和音标。
  const metas=allMetas();
  const newItems=(record.newWords||[]).map(w=>itemFor(w,metas));
  const reviewItems=reviewForDaily(record).map(w=>itemFor(w,metas));
  const masterFocus=record.masterFocus||masterPlanFor(record.date)?.focus||'';
  const rules=dailyRules(record), rec=khanRecommendation(weakness(),masterFocus), story=storyFor(record);
  const curve=CURVE.map(n=>plus(record.date,n)).join('、');
  return `<div class="daily-print"><div class="daily-top"><b>日期：${dateLabel(record.date)}</b><span>姓名：____________</span></div>${masterFocus?`<p class="master-focus"><b>总表当天重点：</b>${escapeHtml(masterFocus)}。网页会先结合这个重点，再结合累计错词决定今日练习。</p>`:''}<h3>① 今天 5 个新词：先读词块，再写单词</h3><table class="daily-table"><thead><tr><th>英文</th><th>中文</th><th>音标</th><th>词块/规则</th><th>默写一遍</th></tr></thead><tbody>${newItems.map(x=>`<tr><td><b>${escapeHtml(x.word)}</b></td><td>${escapeHtml(x.gloss)}</td><td>${escapeHtml(x.ipa)}</td><td>${escapeHtml(x.chunk)}</td><td></td></tr>`).join('')}</tbody></table><h3>② 今天复习词：默写后圈出词块</h3><p class="review-words">${reviewItems.map((x,i)=>`${i+1}. ${escapeHtml(x.word)}（${escapeHtml(x.gloss)}）`).join('　')||'今天暂无历史复习词；明天开始会自动加入。'}</p><h3>③ 今天只学这 ${rules.length} 条规则</h3><ol class="rule-list daily-rules">${rules.map(r=>`<li><b>${escapeHtml(r.name)}</b>：${escapeHtml(r.detail)}</li>`).join('')}</ol><p class="red-tip">重点：孩子要能“圈组合 → 说音标/音素 → 读例词 → 写一个同规律陌生词”。只会默写见过的词，不等于会规则。</p><h3>④ 可汗学院（8–10 分钟）</h3><ol class="rule-list"><li>点 <b>Reading</b> → 右上角 <b>1st Grade</b> → 找 <b>${escapeHtml(rec.course)}</b>。</li><li>先点 <b>${escapeHtml(rec.card)}</b>。${escapeHtml(rec.text)}</li><li>完成后让孩子说出今天一个组合和对应读音；说不出，就做本页第③部分，不急着刷 Practice。</li></ol><h3>⑤ 冒险小阅读：《${escapeHtml(story.title)}》</h3><p class="story-en">${escapeHtml(story.en)}</p><p>${escapeHtml(story.cn)}</p><p class="curve-note"><b>本篇词汇：</b>今天新词 ${newItems.map(x=>escapeHtml(x.word)).join('、')}；复习词 ${story.review?.map(escapeHtml).join('、')||'无'}。</p><ol class="rule-list">${story.questions.map(q=>`<li>${escapeHtml(q)}</li>`).join('')}</ol><p class="curve-note">本日新词后续复习日期：<b>${curve}</b>。错词自动追加到次日，并继续按曲线出现。</p></div>`;
}
function currentDailyRecord(target,list){
  const saved=data.records.find(r=>r.date===target);
  const master=masterPlanFor(target),next=masterPlanFor(plus(target,1));
  return {...(saved||{}),date:target,
    newWords:(master?.words||saved?.newWords||[]).map(x=>typeof x==='string'?x:x.word),
    newItems:master?.words||saved?.newItems||[],
    nextNewWords:(next?.words||saved?.nextNewWords||[]).map(x=>typeof x==='string'?x:x.word),
    nextNewItems:next?.words||saved?.nextNewItems||[],
    errors:saved?.errors||[],errorItems:saved?.errorItems||[],
    dictationItems:cloneItems(list),reviewedWords:cloneItems(list).map(x=>norm(x.word)),
    masterFocus:master?.focus||saved?.masterFocus||''};
}
function worksheetHtml(title,body){return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:'Microsoft YaHei','PingFang SC',sans-serif;color:#111;margin:18mm;font-size:12pt;line-height:1.6}h1{text-align:center;font-size:20pt}h2{font-size:15pt;border-bottom:1px solid #1c5e4f;padding-bottom:3px}h3{font-size:13pt;margin:14px 0 6px;color:#155346}table{border-collapse:collapse;width:100%;font-size:10.5pt}th,td{border:1px solid #333;padding:6px;vertical-align:top}th{background:#eaf4f0}.daily-top{display:flex;justify-content:space-between;border-bottom:1px solid #333;padding-bottom:6px}.daily-table td:last-child{height:30px}.review-words{padding:8px;background:#f4f8f5}.red-tip{color:#b00020;font-weight:bold;background:#fff1f1;padding:8px}.story-en{font-family:Arial,sans-serif}.curve-note{background:#fff6d9;padding:8px}@page{size:A4;margin:14mm}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`}
function downloadDoc(name,html){const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function openPrint(title,body){const win=window.open('','_blank');if(!win){alert('浏览器阻止了新页面，请允许弹出窗口后再试，或改用“导出 WPS”。');return}win.document.write(worksheetHtml(title,body));win.document.close();win.focus();setTimeout(()=>win.print(),350)}
function render(){const {target,list}=currentPlan(); const dailyRecord=currentDailyRecord(target,list); const last=data.records.at(-1); const ws=weakness(); const targetFocus=masterPlanFor(target)?.focus||''; const rec=khanRecommendation(ws,targetFocus);
  renderCorrectionPicker();renderCorrectionQr();
  if(last||Object.values(data.tests||{}).some(x=>x!=='')){['plan','analysis','khanPlan','checkPlan','weekend'].forEach(id=>$(id).classList.remove('hidden'));}
  $('dailyCard').classList.remove('hidden');$('dailyDate').textContent='（'+dateLabel(target)+'）';$('dailyCardContent').innerHTML=dailyCardMarkup(dailyRecord);
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
  const {target:date,list:dictationItems}=currentPlan(),master=masterPlanFor(date),nextMaster=masterPlanFor(plus(date,1));
  // 新词不再由家长手输，始终以总表为准；家长每天只录入批改后的错误词。
  const newItems=master?.words||[],errorItems=parseEntries($('errorWords').value),nextNewItems=nextMaster?.words||[];
  const newWords=newItems.map(x=>x.word),errors=errorItems.map(x=>x.word),nextNewWords=nextNewItems.map(x=>x.word);
  if(!newWords.length&&!errors.length){alert('请至少输入今天的新词或错词。');return}
  // 当天打印过的清单就是当天实际默写池；这样扫码勾错或手工录错后，所有正确词都会进入下一轮曲线。
  data.printedPlans[date]=cloneItems(dictationItems);
  const reviewedWords=dictationItems.map(x=>norm(x.word));
  data.records=data.records.filter(r=>r.date!==date);
  const record={date,newWords,errors,nextNewWords,newItems,errorItems,nextNewItems,dictationItems:cloneItems(dictationItems),reviewedWords:reviewedWords.length?reviewedWords:newWords,khan:$('khanDone').value,masterFocus:master?.focus||''};
  data.records.push(record);data.records.sort((a,b)=>a.date.localeCompare(b.date));rebuildWordState();
  // 立即保存“明天的40词”；明天录入批改结果时系统就知道哪些词实际参与过默写。
  record.nextPlan=buildPlan(plus(date,1)).list;
  save();render();document.getElementById('plan').scrollIntoView({behavior:'smooth'});
}
function saveTest(){data.tests={combo:$('comboScore').value,decode:$('decodeScore').value,magic:$('magicScore').value,syllable:$('syllableScore').value};save();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function correctionWords(){return [...document.querySelectorAll('#correctionWords input:checked')].map(x=>norm(x.value));}
function syncCheckedErrors(){
  const checked=correctionWords();
  const {list}=currentPlan();
  const extras=parseEntries($('errorWords').value).filter(x=>!list.some(y=>norm(y.word)===x.word));
  $('errorWords').value=[...checked,...extras.map(x=>x.word)].join('\n');
}
function renderCorrectionPicker(){
  // 批改、打印和当天总表始终读取同一份当天清单。
  const {target:date,list:planned}=currentPlan(), master=masterPlanFor(date);
  $('studyDate').value=date;
  const list=planned.length?planned:(master?.words||[]).map(x=>({...x,tag:'今天新词'}));
  const selected=new Set(parseEntries($('errorWords').value).map(x=>x.word));
  $('correctionDate').textContent=date;
  $('correctionWords').innerHTML=list.length?list.map((x,i)=>`<label class="correction-choice"><input type="checkbox" value="${escapeHtml(x.word)}" ${selected.has(norm(x.word))?'checked':''}><span>${i+1}. <b>${escapeHtml(x.word)}</b><small>${escapeHtml(x.tag||'')}</small></span></label>`).join(''):'<p>暂时没有可勾选的词。请在“补充功能”中确认日期后重新载入。</p>';
  document.querySelectorAll('#correctionWords input').forEach(input=>input.onchange=syncCheckedErrors);
}
function renderCorrectionQr(){
  const box=$('qrAccess');if(!box)return;
  const {target:date,list}=currentPlan();
  if(reviewMode){
    box.innerHTML=`<div><b>正在批改 ${escapeHtml(dateLabel(date))} 的默写</b><span>只勾选写错的词，再点下方“保存错词”。</span><a href="./">返回今天学习页</a></div>`;
    return;
  }
  const url=publicPageUrl(date,list);
  box.innerHTML=`<img src="${qrImageUrl(url)}" alt="当天批改二维码"><div><b>当天批改二维码</b><span>打印后用微信扫一扫，直接进入当天的勾错页。</span><a href="${escapeHtml(url)}">二维码未显示？直接点此进入批改</a></div>`;
}
async function enrichCustomEntry(entry){
  const base=itemFor(entry.word,allMetas());
  let gloss=entry.gloss||(!base.gloss.startsWith('请按')?base.gloss:''),ipa=entry.ipa||(!base.ipa.startsWith('请按')?base.ipa:''),pos=base.pos||'';
  const jobs=[];
  if(!ipa||!pos)jobs.push(fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(entry.word)}`).then(r=>r.ok?r.json():null).then(v=>{const x=Array.isArray(v)?v[0]:null;if(x){ipa=ipa||x.phonetic||x.phonetics?.find(p=>p.text)?.text||'';pos=pos||x.meanings?.[0]?.partOfSpeech||'';}}).catch(()=>{}));
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
function publicPageUrl(date,items=[]){
  const packed=(items||[]).map(x=>norm(typeof x==='string'?x:x.word)).filter(Boolean).join('|');
  return `https://mocao3494-lgtm.github.io/english-phonics-review-helper/?date=${encodeURIComponent(date)}&mark=1${packed?`&items=${encodeURIComponent(packed)}`:''}`;
}
function qrImageUrl(url){return `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=${encodeURIComponent(url)}`;}
function exportWorksheet(){
  const {target,list}=currentPlan();
  if(!list.length){alert('请先保存一次“今天录入”，再导出作业。');return;}
  // 导出即冻结本次40词；二维码批改页将读取同一份清单。
  data.printedPlans=data.printedPlans&&typeof data.printedPlans==='object'?data.printedPlans:{};
  data.printedPlans[target]=cloneItems(list);save();
  const metas=allMetas();
  const correctionUrl=publicPageUrl(target,list);
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
function currentDailyPrintRecord(){const {target,list}=currentPlan();return currentDailyRecord(target,list);}
function exportDailyWorksheet(){const record=currentDailyPrintRecord();downloadDoc(`英语拼读每日总表_${record.date}.doc`,worksheetHtml(`英语拼读每日总表｜${dateLabel(record.date)}`,dailyCardMarkup(record)));}
function printDailyWorksheet(){const record=currentDailyPrintRecord();openPrint(`英语拼读每日总表｜${dateLabel(record.date)}`,dailyCardMarkup(record));}
function fill(){
  data.customWords=Array.isArray(data.customWords)?data.customWords:[];
  seedKnownErrors();
  // 普通入口始终使用设备当天；只有二维码的 mark=1 才允许打开历史日期。
  const now=reviewMode&&queryDate?queryDate:realToday(); $('studyDate').value=now;
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
let advancedShown=false;
$('toggleAdvanced').onclick=()=>{advancedShown=!advancedShown;document.querySelectorAll('.advanced-card').forEach(x=>x.classList.toggle('shown',advancedShown));$('toggleAdvanced').textContent=advancedShown?'收起更多功能':'显示更多功能（规则卡、可汗记录、备份）';};
try{fill();}catch(err){
  console.error(err);
$('studyDate').value=reviewMode&&queryDate?queryDate:realToday();
  fillMasterPlan();
  renderCorrectionPicker();
  renderCorrectionQr();
}
