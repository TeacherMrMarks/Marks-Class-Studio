import { getStore } from '@netlify/blobs';

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const body = await req.json();
    const id = String(body.id || 'default');
    const store = getStore('marks-class-activities');
    await store.setJSON(id, body);
    return Response.json({ ok: true, id });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};
