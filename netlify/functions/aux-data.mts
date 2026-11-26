import { getStore } from '@netlify/blobs';
import { authorize } from '../shared/auth.mjs';
const handler = async(req:Request)=>{
 const denied=await authorize(req);if(denied)return denied;
 const store=getStore('marks-class-aux-v8');
 try{
  if(req.method==='GET'){const result=await store.list();const rows=await Promise.all(result.blobs.filter(b=>!b.key.startsWith('history/')).map(b=>store.get(b.key,{type:'json'})));return Response.json({ok:true,data:rows.filter(Boolean)},{headers:{'Cache-Control':'no-store'}});}
  if(req.method==='DELETE'){const result=await store.list();await Promise.all(result.blobs.filter(b=>b.key.startsWith('history/')).map(b=>store.delete(b.key)));return Response.json({ok:true});}
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const body=await req.json();const items=Array.isArray(body.items)?body.items:[body];if(!items.length||items.length>8||items.some((row:any)=>!['model','prefs'].includes(row.kind)||!row.item||typeof row.item.id!=='string'||! /^[\w-]{1,100}$/.test(row.item.id)))return Response.json({ok:false,error:'Registro inválido.'},{status:400});
  await Promise.all(items.map((row:any)=>store.setJSON(`${row.kind}/${row.item.id}`,row)));return Response.json({ok:true});
 }catch{return Response.json({ok:false,error:'Falha ao sincronizar dados auxiliares.'},{status:500});}
};

export default async (req:Request)=>{const response=await handler(req);response.headers.set('Cache-Control','private, no-store');return response;};
