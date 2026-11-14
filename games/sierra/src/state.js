import { FAUNA_IDS, sanitizeName } from './rewards.js';

export const SAVE_KEY = 'sierra-juego-v1';
export const PHOTO_KEY = 'sierra-fotos-v1';
const six = value => Array.from({length:6},()=>value);
export const freshSave = () => ({version:1, chapter:0, completed:[], photos:[], attempts:0, finished:false, sound:true, quality:'auto', reducedMotion:false,speedMultiplier:1,finds:six(0),words:six(0),wild:six(0),fatigue:six(0),fauna:{},best:six(null),name:''});
export function readSave(storage) {
  try {
    const value = JSON.parse(storage.getItem(SAVE_KEY));
    if (!value || value.version !== 1) return freshSave();
    const integer = n => Number.isInteger(n) && n >= 0 && n < 6;
    const completed = [...new Set((Array.isArray(value.completed) ? value.completed : []).filter(integer))].sort((a,b)=>a-b);
    const contiguous = []; for(let i=0;i<6 && completed.includes(i);i++) contiguous.push(i);
    const counters = (list,max) => Array.from({length:6},(_,i)=>Array.isArray(list)&&Number.isInteger(list[i])?Math.max(0,Math.min(max,list[i])):0);
    const fauna = {}; for (const id of FAUNA_IDS) { const rating = value.fauna?.[id]; if (Number.isInteger(rating) && rating >= 1 && rating <= 3) fauna[id] = rating; }
    // Partidas anteriores al sonido activado por defecto lo reciben una vez; después se respeta la elección.
    const legacy = !Array.isArray(value.words);
    return {...freshSave(), chapter:Math.min(integer(value.chapter) ? value.chapter : 0, contiguous.length, 5), completed:contiguous,
      photos:[...new Set((Array.isArray(value.photos) ? value.photos : []).filter(integer))],
      attempts:Math.max(0, Math.min(9999, Number.isInteger(value.attempts)?value.attempts:0)), finished:contiguous.length===6,
      speedMultiplier:value.speedMultiplier===2?2:1,finds:counters(value.finds,3),words:counters(value.words,255),wild:counters(value.wild,3),fatigue:counters(value.fatigue,3),fauna,
      best:Array.from({length:6},(_,i)=>Array.isArray(value.best)&&Number.isFinite(value.best[i])&&value.best[i]>=1&&value.best[i]<3600?value.best[i]:null),
      name:sanitizeName(value.name),
      sound:legacy?true:value.sound!==false, quality:['auto','low','high'].includes(value.quality)?value.quality:'auto', reducedMotion:value.reducedMotion===true};
  } catch { return freshSave(); }
}
export function writeSave(storage, save) { try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; } }
export function completeChapter(save, chapter) {
  if(chapter !== save.completed.length || chapter<0 || chapter>5) return save;
  return {...save, completed:[...save.completed,chapter], chapter:Math.min(chapter+1,5), finished:chapter===5};
}
export function timingScore(position) { return position>=.32 && position<=.68; }

/** Fotos tomadas por quien juega: JPEG pequeños, sólo en este dispositivo. */
const validPhoto = value => typeof value === 'string' && value.startsWith('data:image/jpeg;base64,') && value.length < 90000;
const photoId = id => typeof id === 'string' && (FAUNA_IDS.includes(id) || /^paisaje-[0-5]$/.test(id));
export function readPhotos(storage) {
  try {
    const value = JSON.parse(storage.getItem(PHOTO_KEY)); const photos = {};
    for (const [id, data] of Object.entries(value || {})) if (photoId(id) && validPhoto(data)) photos[id] = data;
    return photos;
  } catch { return {}; }
}
export function writePhoto(storage, photos, id, data) {
  if (!photoId(id) || !validPhoto(data)) return photos;
  const next = {...photos, [id]: data};
  try { storage.setItem(PHOTO_KEY, JSON.stringify(next)); } catch { /* Sin espacio: la foto vive sólo en esta sesión. */ }
  return next;
}
