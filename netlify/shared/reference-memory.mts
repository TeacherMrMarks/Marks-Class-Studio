import { getStore } from '@netlify/blobs';
export const CHUNK=384*1024;
export const MAX_BYTES=25*1024*1024;
export type RefMeta={id:string;name:string;component:'english'|'life-project'|'general';grade:string;kind:string;sourceUrl:string;size:number;parts:number;createdAt:string;updatedAt:string;status:'stored'|'partial'|'processed';note:string;text:string;pages:number};
export const refStore=()=>getStore({name:'marks-class-reference-memory-v9',consistency:'strong'});
export const validRef=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
export const metaKey=(id:string)=>`meta/${id}`;
export const partKey=(id:string,index:number)=>`file/${id}/${index}`;
export async function allReferences():Promise<RefMeta[]>{const store=refStore();const {blobs}=await store.list({prefix:'meta/'});const keys=blobs.filter(b=>b.key.startsWith('meta/'));const out:RefMeta[]=[];for(let i=0;i<keys.length;i+=20){const rows=await Promise.all(keys.slice(i,i+20).map(b=>store.get(b.key,{type:'json'})));out.push(...rows.filter(Boolean));}return out;}
const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const stop=new Set('para com uma das dos que por seu sua sobre atividade atividades criar ingles lingua projeto vida ano emti the and for from with this that'.split(' '));
const words=(s:string)=>[...new Set(normalize(s).match(/[a-z0-9]{3,}/g)||[])].filter(w=>!stop.has(w));
export function rankReferences(rows:RefMeta[],component:string,grade:string,query:string){const terms=words(query);const gradeNum=grade.match(/[123]/)?.[0];const hits: {title:string;grade:string;text:string;pageCount:number;score:number}[]=[];for(const r of rows){if(r.component!==component&&r.component!=='general'||!r.text.trim())continue;const name=normalize(r.name+' '+r.kind);const text=r.text;const chunks:string[]=[];for(let i=0;i<text.length;i+=2400)chunks.push(text.slice(Math.max(0,i-180),i+2400));const base=(r.component===component?3:0)+(gradeNum&&r.grade.match(/[123]/)?.[0]===gradeNum?3:0)+terms.reduce((n,w)=>n+(name.includes(w)?5:0),0);const best=chunks.map(text=>({text,score:base+terms.reduce((n,w)=>n+(normalize(text).includes(w)?3:0),0)})).sort((a,b)=>b.score-a.score).slice(0,2);for(const x of best)hits.push({title:r.name,grade:r.grade,text:x.text,pageCount:r.pages,score:x.score});}return hits.sort((a,b)=>b.score-a.score).slice(0,8);}
