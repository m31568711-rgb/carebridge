const localPattern=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function wallClockParts(value:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(value);
  const get=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(part=>part.type===type)?.value);
  return Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'),get('second'));
}

export function zonedLocalDateTimeToIso(value:string,timeZone:string){
  const match=localPattern.exec(value);
  if(!match)throw new RangeError('Invalid local date and time');
  const target=Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),Number(match[4]),Number(match[5]),Number(match[6]??0));
  let result=target-(wallClockParts(new Date(target),timeZone)-target);
  result=target-(wallClockParts(new Date(result),timeZone)-result);
  if(wallClockParts(new Date(result),timeZone)!==target)throw new RangeError('Local time does not exist in the selected timezone');
  return new Date(result).toISOString();
}
