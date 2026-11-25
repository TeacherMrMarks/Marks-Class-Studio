import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('marks-class-images');
    const result = await store.list();
    const items = await Promise.all(result.blobs.slice(0, 60).map(async blob => store.get(blob.key, { type: 'json' })));
    const valid = items.filter(Boolean).sort((a: any, b: any) => String(b?.createdAt || '').localeCompare(String(a?.createdAt || '')));
    return Response.json({ ok: true, data: valid });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};
