function parseStoredData(raw){
  const empty={records:[],tests:{}};
  if(!raw)return {data:empty,corrupted:false};
  try{
    const data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('存储格式无效');
    return {data,corrupted:false};
  }catch{
    return {data:empty,corrupted:true};
  }
}

if(typeof module!=='undefined')module.exports={parseStoredData};
