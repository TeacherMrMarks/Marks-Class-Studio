import {activitySeedsV25} from './activity-seed-v25';

// Only recognize the three V25 imports; never replace a saved activity with the seed.
const sources=new Map(activitySeedsV25.map(s=>[s.id,s]));
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
const txt=(el:Element)=>el.textContent?.replace(/\s+/g,' ').trim()||'';
const same=(a:Element,b:Element)=>a.outerHTML===b.outerHTML;
const numbered=/^(?:\d+\s*[.)]|[a-zA-Z]\s*[.)]|\(\s*[a-zA-Z0-9]*\s*\)|[•\uf0b7])/;
const linesOnly=(el:HTMLElement)=>el.tagName==='DIV'&&el.style.minHeight!==''&&el.style.textAlign==='left'&&el.style.lineHeight==='1.08'&&el.style.display!=='flex'&&el.childElementCount>0&&[...el.children].every(c=>c.tagName==='SPAN'||['B','STRONG','I','EM','U','FONT'].includes(c.tagName))&&!!txt(el);
function semanticSpans(root:HTMLElement){
 for(const span of [...root.querySelectorAll<HTMLSpanElement>('span')]){
  // The converter put normal weight/style on every PDF line. Remove only these
  // explicit defaults; preserve meaningful emphasis and other formatting.
  const s=span.style;
  s.removeProperty('margin-left');s.removeProperty('padding-left');
  if(s.fontWeight==='normal'||s.fontWeight==='400')s.removeProperty('font-weight');
  if(s.fontStyle==='normal')s.removeProperty('font-style');
  if(s.fontWeight==='bold'||s.fontWeight==='700'){const b=span.ownerDocument.createElement('strong');b.append(...span.childNodes);span.append(b);s.removeProperty('font-weight');}
  if(s.fontStyle==='italic'){const i=span.ownerDocument.createElement('em');i.append(...span.childNodes);span.append(i);s.removeProperty('font-style');}
  // Use the paragraph's font settings, so toolbar font and size can override.
  if(s.fontFamily.replace(/\s/g,'').toLowerCase()==='arial,sans-serif')s.removeProperty('font-family');
  if(s.color==='rgb(0, 0, 0)')s.removeProperty('color');
 }
}
function editableParagraphs(parent:HTMLElement){
 const doc=parent.ownerDocument;let last:HTMLParagraphElement|null=null,lastIndent=0,lastSize=0,lastBold=false;
 for(const node of [...parent.children] as HTMLElement[]){
  if(!linesOnly(node)){
   last=null;
   if(node.querySelector(':scope > div'))editableParagraphs(node);
   continue;
  }
  const text=txt(node),gap=parseFloat(node.style.marginTop)||0,indent=parseFloat(node.style.paddingLeft)||0;
  const spans=[...node.querySelectorAll<HTMLSpanElement>(':scope > span')];const size=parseFloat(spans[0]?.style.fontSize||'0')||10;
  const bold=spans.length>0&&spans.every(s=>s.style.fontWeight==='bold'||s.style.fontWeight==='700');
  const individual=numbered.test(text)||/_|^(?:Crush|Spoiler|Enter|Like|Food delivery|Hot dog):/i.test(text)||text===text.toUpperCase()||text.length<12;
  const previous=last?txt(last):'';
  const join:boolean=!!last&&!individual&&gap<=3.2&&Math.abs(indent-lastIndent)<2&&Math.abs(size-lastSize)<.7&&bold===lastBold&&previous.length>30&&!/_{2,}|[:?]$/.test(previous)&&!last!.dataset.single;
  const p:HTMLParagraphElement=join?last!:doc.createElement('p');
  if(!join){p.style.fontSize=`${size}pt`;p.style.lineHeight='1.12';p.style.margin=`${Math.min(8,gap)}pt 0 0`;p.style.textAlign=bold&&indent>20?'center':'left';if(indent>0&&p.style.textAlign!=='center')p.style.marginLeft=`${Math.min(indent,36)}pt`;if(individual)p.dataset.single='1';node.replaceWith(p);}else{p.append(doc.createTextNode(' '));node.remove();}
  for(const span of spans){if(Math.abs((parseFloat(span.style.fontSize)||size)-size)<.05)span.style.removeProperty('font-size');}
  p.append(...node.childNodes);last=p;lastIndent=indent;lastSize=size;lastBold=bold;
 }
}
export function adaptV25Page(id:string,html:string,index:number):{html:string;changed:boolean}{
 const source=sources.get(id);if(!source||!html.includes('mcs25-import'))return {html,changed:false};
 const doc=parse(html),original=source.pages[index]?parse(source.pages[index]).querySelector('.mcs25-import'):null;
 const wrappers=[...doc.querySelectorAll<HTMLElement>('.mcs25-import')];if(!wrappers.length)return {html,changed:false};
 for(const wrap of wrappers){
  const kids=[...wrap.children],orig=original?[...original.children]:[];
  // Match the original header/footer nodes, not position alone; user-added content survives.
  if(id.endsWith('black-awareness')){
   for(const node of kids)if(node.matches('table')&&/ATIVIDADE DE INGLÊS/.test(txt(node))&&/ESTUDANTE:/.test(txt(node))&&/PROFESSOR\(A\):/.test(txt(node))&&orig.some(x=>same(node,x)))node.remove();
  }else{
   const first=orig[0];if(first){const header=kids.find(x=>same(x,first));if(header)header.remove();}
   if(id.endsWith('starter-anytime')&&index===0){for(const node of kids.slice(1,4))if(orig.some(x=>same(node,x))&&/^(STARTER UNIT ANYTIME|Componente Curricular:|Teacher:)/.test(txt(node)))node.remove();}
   if(id.endsWith('listening-sara')){for(const node of kids.slice(0,3))if(orig.some(x=>same(node,x))&&/^(MÓDULO 3|PRESENT SIMPLE)$/.test(txt(node)))node.remove();}
   const foot=orig.at(-1);if(foot&&foot.tagName==='P'&&/^\d+$/.test(txt(foot))){const node=kids.find(x=>same(x,foot));node?.remove();}
  }
  // The cloze passage was split into flex boxes by the PDF converter. Keep its
  // editable inline content, but remove positioning before justification.
  if(id.endsWith('listening-sara')&&index===0){
   const children=[...wrap.children] as HTMLElement[];
   const start=children.findIndex(x=>/^She\s+_+\s+makes coffee/i.test(txt(x)));
   const end=children.findIndex((x,i)=>i>start&&/Now answer:/i.test(txt(x)));
   if(start>=0&&end>start){
    const p=doc.createElement('p');p.style.cssText='font-family:Arial,sans-serif;font-size:12pt;line-height:1.15;text-align:justify;margin:6pt 0';
    for(const row of children.slice(start,end)){
     // Do not discard user-added images or other non-text blocks.
     if(row.querySelector('img,table,svg,video,audio')||!txt(row))continue;
     if(p.childNodes.length)p.append(doc.createTextNode(' '));
     const pieces=row.style.display==='flex'?[...row.children]:[row];
     for(const [i,piece] of pieces.entries()){
      if(i)p.append(doc.createTextNode(' '));
      for(const span of piece.querySelectorAll<HTMLElement>('span,font')){span.style.removeProperty('font-size');span.style.removeProperty('margin-left');span.style.removeProperty('padding-left');}
      p.append(...piece.childNodes);
     }
     if(row===children[start])row.replaceWith(p);else row.remove();
    }
   }
  }
  // Rebuild the PDF's individual line fragments into ordinary editable paragraphs.
  editableParagraphs(wrap);semanticSpans(wrap);
  wrap.querySelectorAll('[data-single]').forEach(x=>x.removeAttribute('data-single'));
  wrap.classList.remove('mcs25-import');wrap.classList.add('mcs26-import');
  wrap.style.removeProperty('text-align');
  // Trim PDF positioning margins on image rows and retain the source images.
  for(const row of wrap.querySelectorAll<HTMLElement>('div[style]')){
   if(row.style.display==='flex'&&row.querySelector('img')){row.style.minHeight='';row.style.marginTop=`${Math.min(8,parseFloat(row.style.marginTop)||0)}pt`;}
  }
  // Unwrap the page-level container so the regular editor can paginate its blocks.
  for(const child of [...wrap.children] as HTMLElement[]){if(!child.style.fontFamily)child.style.fontFamily='Arial, sans-serif';if(!child.style.fontSize)child.style.fontSize='10pt';}
  wrap.replaceWith(...wrap.childNodes);
 }
 return {html:doc.body.innerHTML,changed:true};
}
export function importedActivityName(id:string){return sources.get(id)?.name;}
