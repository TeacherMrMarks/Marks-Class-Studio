type PageIn={orientation?:string;columns?:number;text?:string;html?:string};
const extractText=(json:any)=>{if(typeof json?.output_text==='string')return json.output_text;const out:string[]=[];for(const item of json?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')out.push(c.text);return out.join('\n');};
const parse=(s:string)=>JSON.parse(s.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
export default async(req:Request)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return Response.json({ok:false,error:'IA não configurada.'},{status:503});
  try{
    const body=await req.json() as {component?:string;sourceName?:string;pages?:PageIn[]};const pages=Array.isArray(body.pages)?body.pages.slice(0,12):[];
    const payload=pages.map((p,i)=>`PÁGINA ${i+1}\nORIENTAÇÃO DETECTADA: ${p.orientation||'portrait'}\nCOLUNAS ESTIMADAS: ${p.columns||1}\nTEXTO:\n${String(p.text||'').slice(0,9000)}\nHTML DE ORIGEM (pode conter estrutura útil):\n${String(p.html||'').replace(/data:[^\"']+/g,'[imagem incorporada]').slice(0,9000)}`).join('\n\n---\n\n');
    const instructions=`Você reorganiza documentos escolares importados no Marks Class Studio. Preserve a ordem, o conteúdo e a divisão original de páginas. Reconheça títulos, questões, alternativas, listas, tabelas e possíveis blocos em duas colunas. Não invente conteúdo novo. Limpe artefatos de PDF, recomponha linhas quebradas e deixe HTML editável. Responda SOMENTE JSON válido: {"pages":[{"html":"...","orientation":"portrait|landscape","columns":1|2|3}]}. Use apenas p,strong,em,u,ol,ul,li,br,table,tbody,tr,td,th,div.`;
    const input=`ARQUIVO: ${String(body.sourceName||'').slice(0,200)}\nCOMPONENTE: ${body.component==='life-project'?'Projeto de Vida':'Língua Inglesa'}\nNÚMERO DE PÁGINAS: ${pages.length}\n\n${payload}`;
    const model=process.env.OPENAI_MODEL||'gpt-6-luna';const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,instructions,input})});const json=await r.json();if(!r.ok)return Response.json({ok:false,error:json?.error?.message||'Falha na API.'},{status:r.status});const parsed=parse(extractText(json));if(!Array.isArray(parsed?.pages))throw new Error('Formato inesperado.');return Response.json({ok:true,pages:parsed.pages});
  }catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500});}
};
