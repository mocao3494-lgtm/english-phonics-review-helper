const assert=require('node:assert/strict');
const plus=(date,days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
const CURVE=[1,3,7,14,30];
assert.deepEqual(CURVE.map(n=>plus('2026-11-11',n)),['2026-11-12','2026-11-14','2026-11-18','2026-11-25','2026-12-11']);
const state={word:{stage:0,errors:1,lastReviewed:'2026-11-11',nextDue:plus('2026-11-11',1)}};
assert.equal(state.word.nextDue,'2026-11-12');
assert.equal(plus('2026-12-31',1),'2027-01-01');
console.log('business regression checks passed');