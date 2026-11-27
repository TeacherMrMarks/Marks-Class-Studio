// Local, rule-based recognition. Never guesses answers or removes unknown content.
export function smartImportMarkup(html:string):string{
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const p of [...doc.body.querySelectorAll<HTMLElement>('p,li')]){
  if(p.querySelector('img,table')||p.closest('.ped-answer-lines'))continue;
  const t=(p.textContent||'').trim();if(!t)continue;
  let kind='';if(/^(?:quest[aã]o\s*)?\d{1,3}\s*[.)–:-]/i.test(t))kind='question';else if(/^[A-Ja-j][.)]\s*/.test(t))kind='alternative';else if(/^[_\s]{4,}$/.test(t))kind='answer';else if(/\(\s*\)|\b(?:true|false|verdadeiro|falso)\b/i.test(t))kind='truefalse';else if(/_{3,}/.test(t))kind='gaps';else if(/\b(?:match|connect|associe|relacione|ligue)\b/i.test(t))kind='matching';else if(/\b(?:cognat|vocabulary|vocabul[aá]rio)\w*/i.test(t))kind='vocabulary';else if(/\b(?:watch|listen|ouça|escute)\b/i.test(t))kind='listening';else if(/\b(?:draw|desenhe|cole|recorte)\b/i.test(t))kind='drawing';
  if(kind)p.classList.add('mks-import-'+kind);
  if(kind==='question'){p.style.marginTop='5pt';p.style.marginBottom='3pt';}
  if(kind==='alternative'){p.style.marginTop='0';p.style.marginBottom='1pt';p.style.textAlign='left';}
  if(kind==='answer'&&p.tagName==='P'){p.classList.add('ped-answer-lines');p.replaceChildren();const span=doc.createElement('span');span.className='ped-answer-line';span.style.cssText='display:block;min-height:6mm;height:6mm;border-bottom:1px solid #333';span.innerHTML='&nbsp;';p.append(span);}
 }
 return doc.body.innerHTML;
}
type Matrix=number[];
function mul(a:Matrix,b:Matrix):Matrix{return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
// PDF.js operators: save 10, restore 11, transform 12, paintImageXObject 85,
// paintInlineImageXObject 86. Use the rendered page for image crops, never send files elsewhere.
export async function pdfImagesForImport(page:unknown,viewport:{width:number;height:number}):Promise<{x:number;y:number;width:number;src:string}[]>{
 const pg=page as any;const ops=await pg.getOperatorList();const stack:Matrix[]=[];let matrix:Matrix=[1,0,0,1,0,0];const boxes:{x:number;y:number;width:number;height:number}[]=[];const v=pg.getViewport({scale:1});
 for(let i=0;i<ops.fnArray.length;i++){
  const op=ops.fnArray[i],a=ops.argsArray[i];if(op===10)stack.push([...matrix]);else if(op===11)matrix=stack.pop()||[1,0,0,1,0,0];else if(op===12&&a?.length>=6)matrix=mul(matrix,a);else if(op===85||op===86){const pts=[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>v.convertToViewportPoint(matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]));const x=Math.max(0,Math.min(...pts.map((p:number[])=>p[0]))),y=Math.max(0,Math.min(...pts.map((p:number[])=>p[1]))),right=Math.min(viewport.width,Math.max(...pts.map((p:number[])=>p[0]))),bottom=Math.min(viewport.height,Math.max(...pts.map((p:number[])=>p[1])));if(right-x>16&&bottom-y>16&&!boxes.some(b=>Math.abs(b.x-x)<2&&Math.abs(b.y-y)<2&&Math.abs(b.width-(right-x))<2))boxes.push({x,y,width:right-x,height:bottom-y});}
 }
 if(!boxes.length)return [];const scale=1.5;const view=pg.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await pg.render({canvasContext:canvas.getContext('2d')!,viewport:view}).promise;return boxes.sort((a,b)=>a.y-b.y||a.x-b.x).map(b=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(b.width*scale));c.height=Math.max(1,Math.round(b.height*scale));c.getContext('2d')!.drawImage(canvas,b.x*scale,b.y*scale,b.width*scale,b.height*scale,0,0,c.width,c.height);return{x:b.x,y:b.y,width:b.width,src:c.toDataURL('image/jpeg',.84)};});
}
