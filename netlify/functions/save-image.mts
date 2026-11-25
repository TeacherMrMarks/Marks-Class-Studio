import { getStore } from '@netlify/blobs';

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const body = await req.json();
    const id = String(body.id || '');
    if (!id || typeof body.dataUrl !== 'string') return Response.json({ ok: false, error: 'Imagem inválida.' }, { status: 400 });
    const store = getStore('marks-class-images');
    await store.setJSON(id, body);
    return Response.json({ ok: true, id });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
};
