// Activity-level curriculum links. Seed IDs are stable across releases; no document HTML is changed.
const suggestions:Record<string,Record<string,string[]>>={
 'mcs-v25-black-awareness':{'1':['EM13LGG110MG','EM13LGG201','EM13LGG102'],'2':['EM13LGG102'],'3':['EM13LGG103']},
 'mcs-v25-starter-anytime':{'1':['EM13LGG103','EM13LGG110MG'],'2':['EM13LGG403'],'3':['EM13LGG103']},
 'mcs-v25-listening-sara':{'1':['EM13LGG103','EM13LGG110MG'],'2':[],'3':['EM13LGG107MG','EM13LGG109MG']}
};
export function defaultActivitySkills(id:string,component:string,grade:string):string[]|undefined{
 const entry=suggestions[id];if(!entry||component!=='english')return undefined;
 const year=grade.match(/\b([123])\s*[º°ª]?\s*(?:ano|série)/i)?.[1]||'1';
 return (entry[year]||[]).map(code=>`2026-english-${year}-1-${code}`);
}
export function activitySkillIds(raw:unknown,id:string,component:string,grade:string):string[]|undefined{
 // An explicit empty list is an intentional removal, never reseed it.
 if(Array.isArray(raw))return [...new Set(raw.filter((x):x is string=>typeof x==='string'&&x.length>0&&x.length<=180))];
 return defaultActivitySkills(id,component,grade);
}
