import { authorize } from '../shared/auth.mjs';
import { getStore } from '@netlify/blobs';

const handler = async (req: Request) => {
  const denied=await authorize(req);if(denied)return denied;
  try {
    const store = getStore('marks-class-activities');
    const result = await store.list();
    const items = await Promise.all(
      result.blobs.map(async (blob) => {
        const data = await store.get(blob.key, { type: 'json' });
        return data;
      })
    );
    const valid = items.filter(Boolean).sort((a: any, b: any) =>
      String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || ''))
    );
    return Response.json({ ok: true, data: valid });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};

export default async (req:Request)=>{const response=await handler(req);response.headers.set('Cache-Control','private, no-store');return response;};
