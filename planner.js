function nextPlanState({currentDate,records,planForDate}){
  const target=plus(currentDate,1);
  const completed=(records||[]).some(record=>record.date===currentDate&&!record.seed);
  return completed
    ? {target,list:planForDate(target)}
    : {target,list:[],awaitingCorrection:true};
}

if(typeof module!=='undefined')module.exports={nextPlanState};
