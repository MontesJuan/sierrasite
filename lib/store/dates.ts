// National calendar, https://www.argentina.gob.ar/feriados (checked 2026-11-15).
const holidays2026='01-01,02-16,02-17,03-23,03-24,04-02,04-03,05-01,05-25,06-15,06-20,07-09,07-10,08-17,10-12,11-09,11-23,12-07,12-08,12-25'.split(',').map(d=>'2026-'+d);
export function dispatchDeadline(paidAt:string,additional:string[]=[]){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/San_Juan',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(paidAt));
 const date=new Date(day+'T12:00:00Z');let count=0;
 const closed=new Set([...holidays2026,...additional]);
 while(count<7){date.setUTCDate(date.getUTCDate()+1);const iso=date.toISOString().slice(0,10);if(date.getUTCFullYear()!==2026)return null;if(date.getUTCDay()!==0&&date.getUTCDay()!==6&&!closed.has(iso))count++;}
 return date.toISOString().slice(0,10);
}
