const assert=require('node:assert/strict');
const {parseStoredData}=require('../storage.js');

assert.deepEqual(parseStoredData('').data,{records:[],tests:{}});
assert.equal(parseStoredData('').corrupted,false);
assert.deepEqual(parseStoredData('{"records":[{"date":"2026-11-16"}],"tests":{}}'),{
  data:{records:[{date:'2026-11-16'}],tests:{}},
  corrupted:false
});
assert.deepEqual(parseStoredData('{"records":').data,{records:[],tests:{}});
assert.equal(parseStoredData('{"records":').corrupted,true);
assert.equal(parseStoredData('[]').corrupted,true);
console.log('storage recovery checks passed');
