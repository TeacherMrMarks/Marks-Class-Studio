import { authorize } from '../shared/auth.mjs';
import { getStore } from '@netlify/blobs';

const handler = async (req: Request) => {
  const denied=await authorize(req);if(denied)return denied;
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ ok: false, error: 'id obrigatório' }, { status: 400 });
  try {
    const store = getStore('marks-class-activities');
    const data = await store.get(id, { type: 'json' });
    if (!data) return Response.json({ ok: false, error: 'não encontrado' }, { status: 404 });
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};

export default async (req:Request)=>{const response=await handler(req);response.headers.set('Cache-Control','private, no-store');return response;};
