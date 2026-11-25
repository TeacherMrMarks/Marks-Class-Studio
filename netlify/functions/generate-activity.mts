type Reference = { title?: string; grade?: string; text?: string };

type RequestBody = {
  component?: 'english' | 'life-project';
  grade?: string;
  topic?: string;
  questionCount?: number;
  questionType?: string;
  notes?: string;
  references?: Reference[];
};

const extractText = (json: any): string => {
  if (typeof json?.output_text === 'string') return json.output_text;
  const chunks: string[] = [];
  for (const item of json?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n');
};

const parseJsonText = (text: string) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
};

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: 'IA não configurada. No Netlify, adicione a variável OPENAI_API_KEY e faça um novo deploy.' }, { status: 503 });
  }

  try {
    const body = await req.json() as RequestBody;
    const component = body.component === 'life-project' ? 'Projeto de Vida' : 'Língua Inglesa';
    const grade = String(body.grade || '').slice(0, 80);
    const topic = String(body.topic || '').slice(0, 500);
    const count = Math.min(30, Math.max(1, Number(body.questionCount) || 8));
    const questionType = String(body.questionType || 'mista').slice(0, 30);
    const notes = String(body.notes || '').slice(0, 2500);
    const references = Array.isArray(body.references) ? body.references.slice(0, 4) : [];
    const referenceText = references.length
      ? references.map((ref, i) => `REFERÊNCIA ${i + 1}: ${String(ref.title || '')} | ${String(ref.grade || '')}\n${String(ref.text || '').slice(0, 2500)}`).join('\n\n')
      : 'Sem referências anteriores.';

    const instructions = `Você é um assistente pedagógico dentro do Marks Class Studio, usado por um professor do Ensino Médio. Crie atividades escolares originais, claras e prontas para edição. Preserve o estilo dos exemplos fornecidos sem copiar perguntas literalmente. Para Língua Inglesa, use o inglês nos enunciados quando pedagogicamente adequado e explicações em português somente quando fizer sentido. Para Projeto de Vida, priorize reflexão, autonomia, planejamento, competências socioemocionais e aplicação prática. Não crie cabeçalho: o aplicativo adiciona o cabeçalho automaticamente. Responda SOMENTE com JSON válido no formato {"title":"...","html":"..."}. O campo html deve conter apenas HTML simples compatível com editor: p, strong, em, u, ol, ul, li, br e table quando necessário. Não use scripts, estilos, markdown nem blocos de código.`;

    const input = `COMPONENTE: ${component}\nSÉRIE/TURMA: ${grade}\nTEMA: ${topic}\nQUANTIDADE: ${count}\nTIPO: ${questionType}\nORIENTAÇÕES: ${notes || 'Nenhuma orientação adicional.'}\n\nATIVIDADES DO PRÓPRIO PROFESSOR PARA REFERÊNCIA DE ESTILO:\n${referenceText}\n\nCrie uma atividade com exatamente ${count} questões, adequada ao componente e à série.`;

    const model = process.env.OPENAI_MODEL || 'gpt-6-luna';
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, instructions, input })
    });
    const result = await response.json();
    if (!response.ok) {
      const message = result?.error?.message || `Falha na API (${response.status}).`;
      return Response.json({ ok: false, error: message }, { status: response.status });
    }
    const text = extractText(result);
    const parsed = parseJsonText(text);
    if (typeof parsed?.html !== 'string') throw new Error('A IA retornou um formato inesperado.');
    return Response.json({ ok: true, title: String(parsed.title || ''), html: parsed.html });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
};
