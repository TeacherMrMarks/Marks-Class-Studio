import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('marks-class-activities');
    const result = await store.list();
    const items = await Promise.all(
      result.blobs.slice(0, 100).map(async (blob) => {
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
