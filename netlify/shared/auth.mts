import { getUser, verifyRequestOrigin } from '@netlify/identity';
export async function authorize(req:Request):Promise<Response|null>{
 try{
  if(!['GET','HEAD'].includes(req.method))verifyRequestOrigin(req);
  const owner=process.env.MCS_OWNER_EMAIL?.trim().toLowerCase();
  if(!owner)return Response.json({ok:false,error:'Configure MCS_OWNER_EMAIL nas variáveis do Netlify.'},{status:503});
  const user=await getUser();
  if(!user||user.email?.toLowerCase()!==owner)return Response.json({ok:false,error:'Acesso restrito ao proprietário.'},{status:401});
  return null;
 }catch{return Response.json({ok:false,error:'Sessão inválida ou origem não autorizada.'},{status:401});}
}
