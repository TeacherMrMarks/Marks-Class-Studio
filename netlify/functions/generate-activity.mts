import { authorize } from '../shared/auth.mjs';
type Reference = { title?: string; grade?: string; text?: string; pageCount?: number; orientations?: string[]; columns?: number[] };
type RequestBody = {
  component?: 'english' | 'life-project'; grade?: string; topic?: string; questionCount?: number; questionType?: string; notes?: string;
  references?: Reference[]; pageCount?: number; orientation?: 'portrait'|'landscape'; columns?: number; includeKey?: boolean;
  layout?: { margins?: unknown; showPageNumbers?: boolean };
};
const extractText=(json:any)=>{if(typeof json?.output_text==='string')return json.output_text;const chunks:string[]=[];for(const item of json?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')chunks.push(c.text);return chunks.join('\n');};
const parseJsonText=(text:string)=>JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
const handler = async (req: Request) => {
  const denied=await authorize(req);if(denied)return denied;
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return Response.json({ok:false,error:'IA não configurada. Adicione OPENAI_API_KEY no Netlify e faça um novo deploy.'},{status:503});
  try{
    const body=await req.json() as RequestBody;
    const component=body.component==='life-project'?'Projeto de Vida':'Língua Inglesa';
    const grade=String(body.grade||'').slice(0,100);const topic=String(body.topic||'').slice(0,600);const count=Math.min(40,Math.max(1,Number(body.questionCount)||8));
    const questionType=String(body.questionType||'mista').slice(0,40);const notes=String(body.notes||'').slice(0,3500);const pageCount=Math.min(4,Math.max(1,Number(body.pageCount)||2));
    const orientation=body.orientation==='landscape'?'landscape':'portrait';const columns=[1,2,3].includes(Number(body.columns))?Number(body.columns):1;const includeKey=body.includeKey!==false;
    const refs=Array.isArray(body.references)?body.references.slice(0,5):[];
    const refText=refs.length?refs.map((r,i)=>`REFERÊNCIA ${i+1}: ${String(r.title||'')} | ${String(r.grade||'')} | ${Number(r.pageCount||1)} pág.\n${String(r.text||'').slice(0,3500)}`).join('\n\n'):'Sem referências anteriores.';
    const instructions=`Você é o motor pedagógico do Marks Class Studio, uma ferramenta privada de um professor do Ensino Médio. Crie atividades originais, prontas para edição e impressão. Preserve o estilo dos exemplos sem copiar literalmente. Para Língua Inglesa, use inglês nos textos/enunciados quando pedagogicamente adequado. Para Projeto de Vida, priorize reflexão, autonomia, planejamento, competências socioemocionais e aplicação prática. Não crie cabeçalho, logomarca, nome do aluno nem numeração de página: o aplicativo faz isso. Distribua o conteúdo de forma equilibrada pelo número solicitado de páginas. Responda SOMENTE JSON válido: {"title":"...","pages":[{"html":"...","orientation":"portrait|landscape","columns":1|2|3}],"answerKeyHtml":"..."}. Use HTML simples e seguro: p,strong,em,u,ol,ul,li,br,table,tbody,tr,td,th,div. Não use markdown, scripts ou estilos inline. O gabarito deve conter respostas objetivas e, em questões abertas/reflexivas, resposta esperada ou critérios de correção.`;
    const input=`COMPONENTE: ${component}\nSÉRIE/TURMA: ${grade}\nTEMA: ${topic}\nQUESTÕES: ${count}\nTIPO: ${questionType}\nPÁGINAS: exatamente ${pageCount}\nORIENTAÇÃO PADRÃO: ${orientation}\nCOLUNAS PADRÃO: ${columns}\nGERAR GABARITO: ${includeKey?'sim':'não'}\nORIENTAÇÕES: ${notes||'Nenhuma.'}\n\nREFERÊNCIAS DO PRÓPRIO PROFESSOR:\n${refText}\n\nCrie exatamente ${pageCount} objetos no array pages, com exatamente ${count} questões ao todo. Use espaços de resposta quando necessário e tabelas apenas quando ajudarem.`;
    const model=process.env.OPENAI_MODEL||'gpt-4.1-mini';
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input})});
    const result=await response.json();if(!response.ok)return Response.json({ok:false,error:result?.error?.message||`Falha na API (${response.status}).`},{status:response.status});
    const parsed=parseJsonText(extractText(result));if(!Array.isArray(parsed?.pages))throw new Error('A IA retornou formato inesperado.');
    return Response.json({ok:true,title:String(parsed.title||''),pages:parsed.pages,answerKeyHtml:includeKey?String(parsed.answerKeyHtml||''):''});
  }catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500});}
};

export default async (req:Request)=>{const response=await handler(req);response.headers.set('Cache-Control','private, no-store');return response;};
