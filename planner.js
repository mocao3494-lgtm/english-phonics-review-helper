const addDays=(date,days)=>{
  const value=new Date(date+'T12:00:00');
  value.setDate(value.getDate()+days);
  return value.toISOString().slice(0,10);
};

function nextPlanState({currentDate,records,planForDate}){
  const target=addDays(currentDate,1);
  const completed=(records||[]).some(record=>record.date===currentDate&&!record.seed);
  return completed
    ? {target,list:planForDate(target)}
    : {target,list:[],awaitingCorrection:true};
}

if(typeof module!=='undefined')module.exports={nextPlanState};
