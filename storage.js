const isPlainObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function parseStoredData(raw){
  const empty={records:[],tests:{}};
  if(!raw)return {data:empty,corrupted:false,repaired:false};
  try{
    const data=JSON.parse(raw);
    if(!isPlainObject(data))throw new Error('存储格式无效');
    const repaired=!Array.isArray(data.records)||!isPlainObject(data.tests);
    return {
      data:{...data,records:Array.isArray(data.records)?data.records:[],tests:isPlainObject(data.tests)?data.tests:{}},
      corrupted:false,
      repaired
    };
  }catch{
    return {data:empty,corrupted:true,repaired:false};
  }
}

if(typeof module!=='undefined')module.exports={parseStoredData};
