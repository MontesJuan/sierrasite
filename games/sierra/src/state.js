export const SAVE_KEY = 'sierra-juego-v1';
export const freshSave = () => ({version:1, chapter:0, completed:[], photos:[], attempts:0, finished:false, sound:false, quality:'auto', reducedMotion:false,speedMultiplier:1,finds:[0,0,0,0,0,0]});
export function readSave(storage) {
  try {
    const value = JSON.parse(storage.getItem(SAVE_KEY));
    if (!value || value.version !== 1) return freshSave();
    const integer = n => Number.isInteger(n) && n >= 0 && n < 6;
    const completed = [...new Set((Array.isArray(value.completed) ? value.completed : []).filter(integer))].sort((a,b)=>a-b);
    const contiguous = []; for(let i=0;i<6 && completed.includes(i);i++) contiguous.push(i);
    return {...freshSave(), chapter:Math.min(integer(value.chapter) ? value.chapter : 0, contiguous.length, 5), completed:contiguous,
      photos:[...new Set((Array.isArray(value.photos) ? value.photos : []).filter(integer))],
      attempts:Math.max(0, Math.min(9999, Number.isInteger(value.attempts)?value.attempts:0)), finished:contiguous.length===6,
      speedMultiplier:value.speedMultiplier===2?2:1,finds:Array.from({length:6},(_,i)=>Array.isArray(value.finds)&&Number.isInteger(value.finds[i])?Math.max(0,Math.min(3,value.finds[i])):0),
      sound:value.sound===true, quality:['auto','low','high'].includes(value.quality)?value.quality:'auto', reducedMotion:value.reducedMotion===true};
  } catch { return freshSave(); }
}
export function writeSave(storage, save) { try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }
export function completeChapter(save, chapter) {
  if(chapter !== save.completed.length || chapter<0 || chapter>5) return save;
  return {...save, completed:[...save.completed,chapter], chapter:Math.min(chapter+1,5), finished:chapter===5};
}
export function timingScore(position) { return position>=.32 && position<=.68; }
