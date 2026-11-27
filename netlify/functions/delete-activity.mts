import { authorize } from '../shared/auth.mjs';
import { getStore } from '@netlify/blobs';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
const valid=(id:unknown):id is string=>typeof id==='string'&&/^[\w-]{1,100}$/.test(id);
const activityValid=(a:any,id:string)=>a&&a.id===id&&typeof a.title==='string'&&Array.isArray(a.pages)&&a.pages.length>0&&a.pages.every((p:any)=>p&&typeof p.html==='string'&&valid(p.id));
const restoredId=async(id:string)=>'mcs-restored-'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)))).slice(0,20).map(x=>x.toString(16).padStart(2,'0')).join('');
export default async(req:Request)=>{
 const denied=await authorize(req);if(denied)return denied;
 const store=getStore({name:'marks-class-activities',consistency:'strong'});
 const deleted=getStore({name:'marks-class-activity-deletions',consistency:'strong'});
 const trash=getStore({name:'marks-class-activity-trash-v33',consistency:'strong'});
 try{
  if(req.method==='GET'){
   const result=await trash.list({prefix:'item/'});
   const data=(await Promise.all(result.blobs.map(b=>trash.get(b.key,{type:'json'})))).filter(Boolean);
   return json({ok:true,data,recoveryDone:!!await trash.get('migration/recovery-v33',{type:'json'})});
  }
  if(req.method!=='POST')return json({ok:false,error:'Método inválido'},405);
  const b=await req.json();
  if(b.action==='seed-complete'){await trash.setJSON('migration/recovery-v33',{done:true});return json({ok:true});}
  const id=b.id;if(!valid(id))return json({ok:false,error:'ID inválido'},400);
  const key='item/'+id;const existing=await trash.get(key,{type:'json'});
  if(b.action==='archive'){
   if(!activityValid(b.snapshot,id))return json({ok:false,error:'Cópia inválida'},400);
   if(!existing)await trash.setJSON(key,{id,activity:b.snapshot,deletedAt:b.deletedAt||new Date().toISOString()});
   return json({ok:true});
  }
  if(b.action==='restore'){
   if(existing?.restoredId){const restored=await store.get(existing.restoredId,{type:'json'});if(!restored||await deleted.get(existing.restoredId,{type:'json'}))return json({ok:false,error:'Esta cópia já foi restaurada anteriormente.'},409);return json({ok:true,data:restored,record:existing});}
   const snapshot=existing?.activity||b.snapshot;
   if(!activityValid(snapshot,id))return json({ok:false,error:'Cópia não encontrada na lixeira'},404);
   const rid=await restoredId(id);
   if(await deleted.get(rid,{type:'json'}))return json({ok:false,error:'A cópia restaurada já foi excluída. Consulte a lixeira.'},409);
   const now=new Date().toISOString();const copy=await store.get(rid,{type:'json'})||{...snapshot,id:rid,updatedAt:now};
   await store.setJSON(rid,copy);
   const record={id,activity:snapshot,deletedAt:existing?.deletedAt||b.deletedAt||now,restoredId:rid,restoredAt:now};
   await trash.setJSON(key,record);return json({ok:true,data:copy,record});
  }
  if(b.action&&b.action!=='delete')return json({ok:false,error:'Ação inválida'},400);
  const old=await store.get(id,{type:'json'});
  const supplied=activityValid(b.snapshot,id)?b.snapshot:null;
  const snapshot=old&&(!supplied||String(old.updatedAt||'')>String(supplied.updatedAt||''))?old:supplied||old;
  if(!existing&&snapshot)await trash.setJSON(key,{id,activity:snapshot,deletedAt:b.deletedAt||new Date().toISOString()});
  // Nunca apagar o original antes de gravar uma cópia recuperável.
  if(!existing&&!snapshot){if(await deleted.get(id,{type:'json'}))return json({ok:true,legacy:true});return json({ok:false,error:'Cópia não localizada. Exclusão cancelada.'},409);}
  await deleted.setJSON(id,{deleted:true});await store.delete(id);return json({ok:true});
 }catch(error){return json({ok:false,error:String(error)},500);}
};
