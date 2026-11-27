import {dataStorage,flushStorage} from './storage';
export type TrashRecord<T={id:string;updatedAt?:string}>={id:string;activity:T;deletedAt:string;restoredId?:string;restoredAt?:string};
const KEY='marks-class-studio:activity-trash:v33';
const endpoint='/.netlify/functions/delete-activity';
export function trashRows<T extends {id:string;updatedAt?:string}>():TrashRecord<T>[] {try{const rows=JSON.parse(dataStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}}
export function mergeTrash<T extends {id:string;updatedAt?:string}>(rows:TrashRecord<T>[]):TrashRecord<T>[] {
 const map=new Map(trashRows<T>().map(r=>[r.id,r]));
 for(const r of rows){if(!r||!r.activity||r.activity.id!==r.id)continue;const old=map.get(r.id);if(!old||(!old.restoredId&&(r.restoredId||String(r.activity.updatedAt||'')>=String(old.activity.updatedAt||''))))map.set(r.id,r);}
 const result=[...map.values()];dataStorage.setItem(KEY,JSON.stringify(result));return result;
}
export async function trashRequest(body?:unknown){const r=await fetch(endpoint,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'}:{cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Lixeira indisponível.');return j;}
export async function pullTrash<T extends {id:string;updatedAt?:string}>(){const result=await trashRequest();mergeTrash<T>(result.data||[]);await flushStorage();return result;}
export async function archiveLocal<T extends {id:string;updatedAt?:string}>(a:T){const row:TrashRecord<T>={id:a.id,activity:structuredClone(a),deletedAt:new Date().toISOString()};mergeTrash([row]);if(!await flushStorage())throw Error('Não foi possível gravar a cópia de segurança. Exclusão cancelada.');return row;}
