import { getStore } from '@netlify/blobs';
import type { RefMeta } from './reference-memory.mjs';
export type Subquestion={prompt:string;alternatives:string[];correct:string;answer:string;justification:string;lines:number;mode:'objective'|'open';skillId?:string};
export type Question={id:string;sourceId:string;sourceName:string;number:string;component:'english'|'life-project'|'general';grade:string;topic:string;kind:string;html:string;context:string;answer:string;reviewed:boolean;updatedAt:string;name?:string;skill?:string;filters?:string[];correct?:string;justification?:string;columns?:number;gap?:number;divider?:boolean;columnWidth?:number;structured?:boolean;editorType?:string;series?:string[];schoolMode?:string;generatorData?:string;responseLines?:number;curriculumIds?:string[];curriculumObjects?:string[];subquestions?:Subquestion[]};
export const questionStore=()=>getStore({name:'marks-class-question-bank-v9',consistency:'strong'});
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const plainHtml=(s:string)=>s.split(/\n+/).filter(x=>x.trim()).map(x=>`<p>${esc(x.trim())}</p>`).join('');
export function extractQuestions(m:RefMeta):Question[]{
 const text=m.text.replace(/^\[Página \d+\]\s*$/gmi,'').replace(/\r/g,'');
 const matches=[...text.matchAll(/^\s*(?:(?:quest(?:ão|ao)|question)\s*(\d{1,3})\s*[:.)º°–-]?\s*|(\d{1,3})[.)–-]\s+)([^\n]+)/gmi)];
 if(!matches.length)return [];
 const out:Question[]=[]; const context=text.slice(0,matches[0].index||0).trim().slice(-10000);
 for(let i=0;i<Math.min(matches.length,300);i++){const hit=matches[i],num=hit[1]||hit[2];const end=matches[i+1]?.index??text.length;const body=(hit[3]+text.slice((hit.index||0)+hit[0].length,end)).trim().slice(0,35000);if(body.length<4)continue;const cleaned=body.split(/^\s*(?:gabarito|answer key)\s*[:\n]/im)[0].trim();if(!cleaned)continue;out.push({id:`${m.id}-${i+1}`,sourceId:m.id,sourceName:m.name,number:num,component:m.component,grade:m.grade,topic:'',kind:/^\s*[a-e][.)-]\s+/mi.test(cleaned)?'Objetiva':'Revisar',html:plainHtml(cleaned),context,answer:'',reviewed:false,updatedAt:new Date().toISOString()});}return out;
}
export async function indexQuestions(m:RefMeta){const store=questionStore();let added=0;for(const q of extractQuestions(m)){const key='q/'+q.id;if(await store.get(key,{type:'json'})||await store.get('deleted/'+q.id,{type:'json'}))continue;await store.setJSON(key,q);added++;}return added;}
export async function allQuestions():Promise<Question[]>{const store=questionStore();const {blobs}=await store.list({prefix:'q/'});const out:Question[]=[];for(let i=0;i<blobs.length;i+=25)out.push(...(await Promise.all(blobs.slice(i,i+25).map(b=>store.get(b.key,{type:'json'})))).filter(Boolean));return (await Promise.all(out.map(async q=>await store.get('deleted/'+q.id,{type:'json'})?null:q))).filter((q):q is Question=>q!==null);}
