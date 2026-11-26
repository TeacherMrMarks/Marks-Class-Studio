// Geração local: todas as palavras são colocadas ou a operação falha explicitamente.
export type WordPlacement={word:string;row:number;col:number;dr:number;dc:number};
export type WordPuzzle={grid:string[][];placements:WordPlacement[]};
export function normalizeWords(input:string){return [...new Set(input.split(/[\n,;]+/).map(s=>s.trim().toUpperCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[^A-Z]/g,'')).filter(Boolean))];}
export function generateWordSearch(words:string[],requested:number,random:()=>number=Math.random):WordPuzzle{
 if(!words.length||words.length>25||words.some(w=>!/^[A-Z]{2,25}$/.test(w)))throw new Error('Informe de 1 a 25 palavras distintas, com 2 a 25 letras.');
 const n=Math.max(6,Math.min(30,Math.ceil(requested)||12),...words.map(w=>w.length));
 const sorted=[...new Set(words)].sort((a,b)=>b.length-a.length);const dirs=[[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
 const attempt=(size:number,fallback=false):WordPuzzle|null=>{const grid=Array.from({length:size},()=>Array<string>(size).fill(''));const placements:WordPlacement[]=[];
 for(const [idx,word] of sorted.entries()){let candidates:WordPlacement[]=[];if(fallback)candidates=[{word,row:idx,col:0,dr:0,dc:1}];else for(let r=0;r<size;r++)for(let c=0;c<size;c++)for(const [dr,dc] of dirs){const er=r+dr*(word.length-1),ec=c+dc*(word.length-1);if(er<0||er>=size||ec<0||ec>=size)continue;if([...word].every((ch,k)=>!grid[r+dr*k][c+dc*k]||grid[r+dr*k][c+dc*k]===ch))candidates.push({word,row:r,col:c,dr,dc});}
 if(!candidates.length)return null;const p=candidates[Math.floor(random()*candidates.length)];[...word].forEach((ch,k)=>grid[p.row+p.dr*k][p.col+p.dc*k]=ch);placements.push(p);}
 for(const row of grid)for(let c=0;c<size;c++)if(!row[c])row[c]=String.fromCharCode(65+Math.floor(random()*26));return {grid,placements};};
 for(let size=n;size<=30;size++){const p=attempt(size);if(p&&verifyWordSearch(p,sorted))return p;}
 const p=attempt(Math.max(n,sorted.length),true);if(!p||!verifyWordSearch(p,sorted))throw new Error('Não foi possível encaixar todas as palavras.');return p;
}
export function verifyWordSearch(p:WordPuzzle,words:string[]){return words.every(w=>p.placements.some(a=>a.word===w&&[...w].every((ch,k)=>p.grid[a.row+a.dr*k]?.[a.col+a.dc*k]===ch)));}
export function puzzleMarkup(p:WordPuzzle){const size=p.grid.length;return `<table class="editor-table word-search-grid" style="border-collapse:collapse;table-layout:fixed;width:100%;max-width:100%;margin:6pt 0;font-family:Arial,sans-serif;font-size:${size>20?9:11}pt;line-height:1.15;text-align:center"><tbody>${p.grid.map(row=>`<tr>${row.map(ch=>`<td style="border:1px solid #555;padding:0;vertical-align:middle;text-align:center;height:${size>20?4.5:6}mm">${ch}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
