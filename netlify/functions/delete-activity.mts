import { authorize } from '../shared/auth.mjs';
import { getStore } from '@netlify/blobs';

const handler = async (req: Request) => {
  const denied=await authorize(req);if(denied)return denied;
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const body = await req.json();
    const id = String(body.id || '');
    if (!id) return Response.json({ ok: false, error: 'id obrigatório' }, { status: 400 });
    const store = getStore({name:'marks-class-activities',consistency:'strong'});
    await getStore({name:'marks-class-activity-deletions',consistency:'strong'}).setJSON(id,{deleted:true});
    await store.delete(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};

export default async (req:Request)=>{const response=await handler(req);response.headers.set('Cache-Control','private, no-store');return response;};
