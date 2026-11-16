const assert=require('node:assert/strict');
const {nextPlanState}=require('../planner.js');

const plus=(date,days)=>{
  const d=new Date(date+'T12:00:00');
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
};

const calls=[];
const planForDate=date=>{
  calls.push(date);
  return [{word:'reading',tag:'今日新词·必默'}];
};

assert.deepEqual(
  nextPlanState({currentDate:'2026-11-16',records:[],planForDate}),
  {target:'2026-11-17',list:[],awaitingCorrection:true}
);
assert.deepEqual(calls,[]);

assert.deepEqual(
  nextPlanState({
    currentDate:'2026-11-16',
    records:[{date:'2026-11-16',seed:false}],
    planForDate
  }),
  {target:'2026-11-17',list:[{word:'reading',tag:'今日新词·必默'}]}
);
assert.deepEqual(calls,['2026-11-17']);

assert.deepEqual(
  nextPlanState({
    currentDate:'2026-11-16',
    records:[{date:'2026-11-16',seed:true}],
    planForDate
  }),
  {target:'2026-11-17',list:[],awaitingCorrection:true}
);
assert.equal(plus('2026-12-31',1),'2027-01-01');
console.log('next-plan regression checks passed');
