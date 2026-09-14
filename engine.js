(function install(root){
"use strict";
const SAMPLE=32000,CACHE=new Map(),D=root.PSG_DATA;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mon=id=>D.pokemon.find(p=>p.id===id);
const nat=id=>D.natures.find(n=>n.id===id)||D.natures.find(n=>n.id==="HARDY");
const activeCount=l=>D.unlocks.filter(x=>x<=l).length;
function role(p){
 const s=p.skill||"";let category="other",label="기타 스킬",skillName=s;
 if(/EnergyForEveryone/.test(s)){category="healerAll";label="전체 회복 힐러";skillName="모두의 기운 올S"}
 else if(/EnergizingCheer/.test(s)){category="healerSingle";label="단일 회복 힐러";skillName=/HealPulse/.test(s)?"힐 펄스":/Nuzzle/.test(s)?"볼부비부비":"기운 응원S"}
 else if(/BerryZone/.test(s)){category="berrySkill";label="나무열매 강화형";skillName="사이코브레이크(나무열매 존)"}
 else if(/BerryBurst/.test(s)){category="berrySkill";label="나무열매 폭발형";skillName=/DracoMeteor/.test(s)?"용성군":/Disguise/.test(s)?"탈·나무열매 버스트":"나무열매 버스트"}
 else if(/IngredientMagnet/.test(s)){category="ingredientSkill";label="식재료 수급형";skillName="식재료 획득S"}
 else if(/IngredientDraw/.test(s)){category="ingredientSkill";label="식재료 선택형";skillName="식재료 셀렉트S"}
 else if(/CookingPowerUp/.test(s)){category="cooking";label="냄비 확장형";skillName="요리 파워 업S"}
 else if(/CookingAssist/.test(s)){category="cooking";label="요리 지원형";skillName="요리 서포트S"}
 else if(/TastyChance/.test(s)){category="cooking";label="대성공 지원형";skillName="요리 대성공S"}
 else if(/ExtraHelpful|HelperBoost/.test(s)){category="support";label="도우미 지원형";skillName=/HelperBoost/.test(s)?"도우미 부스트":"도우미 서포트S"}
 else if(/DreamShard/.test(s)){category="dream";label="꿈의조각 수급형";skillName="꿈의조각 획득S"}
 else if(/ChargeStrength/.test(s)){category="strength";label="직접 에너지형";skillName=/BadDreams/.test(s)?"악몽의 힘":/M/.test(s)?"에너지 차지M":"에너지 차지S"}
 else if(/ChargeEnergy/.test(s)){category="sustain";label="자기 회복형";skillName=/Moonlight/.test(s)?"달빛":"기운 차지S"}
 else if(/Metronome/.test(s)){category="random";label="랜덤 스킬형";skillName="손가락흔들기"}
 else if(/SkillCopy/.test(s)){category="copy";label="스킬 복사형";skillName="스킬 카피"}
 else if(/Versatile/.test(s)){category="versatile";label="올라운더";skillName="변환"}
 const labs={berry:"나무열매 타입",ingredient:"식재료 타입",skill:"스킬 타입",all:"올라운더"};
 if(p.specialty!=="skill"&&p.specialty!=="all")label=labs[p.specialty];
 return{category,label,skillName,specialtyLabel:labs[p.specialty]||"기타"};
}
function defaultIngredients(p){const r={};["0","30","60"].forEach(k=>{if(p.ingredients[k]?.[0])r[k]=p.ingredients[k][0].id});return r}
function chosen(p,ids,level){const out=[];[["0",1],["30",30],["60",60]].forEach(([k,u])=>{if(level>=u){const a=p.ingredients[k]||[];out.push(a.find(x=>x.id===ids?.[k])||a[0])}});return out.filter(Boolean)}
function metrics(c,override){
 const p=override||mon(c.pokemonId);if(!p)throw Error("포켓몬을 찾을 수 없습니다.");
 const level=clamp(+c.level||1,1,80),n=nat(c.natureId),set=new Set((c.subskills||[]).slice(0,activeCount(level)));
 const hbs=Math.min(5,clamp(+c.teamHelpingBonus||0,0,4)+(set.has("HB")?1:0));
 const speedFactor=Math.max(.65,1-(set.has("HSM")?.14:0)-(set.has("HSS")?.07:0)-hbs*.05);
 const interval=Math.max(300,Math.floor(p.frequency*(1-.002*(level-1))*speedFactor/n.speed));
 const energy=n.energy<1?.94:n.energy>1?1.04:1,helps=86400/interval*energy;
 const ingChance=clamp(p.ingredientPercentage/100*n.ingredient*(1+(set.has("IFM")?.36:0)+(set.has("IFS")?.18:0)),0,.9);
 const raw=clamp(p.skillPercentage/100*n.skill*(1+(set.has("STM")?.36:0)+(set.has("STS")?.18:0)),0,.9);
 const pity=(p.specialty==="skill"||p.specialty==="all")?Math.floor(144000/p.frequency):78;
 const skillChance=raw?raw/(1-Math.pow(1-raw,pity+1)):0,sets=chosen(p,c.ingredients||{},level),target=c.ingredientTarget||"";
 let dropStrength=0,dropAmount=0;
 sets.forEach(x=>{const im=D.ingredients[x.id]||{value:0};dropStrength+=x.amount*im.value*(target?(x.id===target?1:.18):1);dropAmount+=x.amount});
 dropStrength/=Math.max(1,sets.length);dropAmount/=Math.max(1,sets.length);
 const berryCount=((p.specialty==="berry"||p.specialty==="all")?2:1)+(set.has("BFS")?1:0);
 const inventory=p.carrySize+(set.has("INVS")?6:0)+(set.has("INVM")?12:0)+(set.has("INVL")?18:0);
 const items=(1-ingChance)*berryCount+ingChance*dropAmount,fillHours=items?inventory/items*interval/3600:24;
 const collect=clamp(+c.collectionHours||4,.5,12),pressure=clamp((collect-fillHours)/collect,0,1),ingRel=1-pressure*.45,skillRel=1-pressure*.3;
 const berryValue=Math.max(p.berryValue+level-1,Math.round(Math.pow(1.025,level-1)*p.berryValue));
 const berryStrengthDay=helps*(1-ingChance)*berryCount*berryValue*(c.favoriteBerry?2:1);
 const growth=1+.000000398*level**3+.000159*level**2+.00367*level-.00609;
 const ingredientStrengthDay=helps*ingChance*dropStrength*growth*ingRel;
 const bonus=(set.has("SLUM")?2:0)+(set.has("SLUS")?1:0),effectiveSkillLevel=clamp((+c.mainSkillLevel||1)+bonus,1,7);
 const levels=[1,1.24,1.53,1.86,2.23,2.63,3.06],skillProcsDay=helps*skillChance*skillRel,skillOutput=skillProcsDay*levels[effectiveSkillLevel-1];
 let utilityIndex=1;if(set.has("HB"))utilityIndex+=.2;if(set.has("ERB"))utilityIndex+=.045;if(set.has("SEB"))utilityIndex+=.06;if(set.has("DSB"))utilityIndex+=.035;if(set.has("REB"))utilityIndex+=.03;
 return{pokemon:p,role:role(p),level,activeSubskills:[...set],interval,helpsPerDay:helps,ingredientChance:ingChance,skillChance,berryCount,inventory,fillHours,reliability:Math.min(ingRel,skillRel),berryStrengthDay,ingredientStrengthDay,skillProcsDay,skillOutput,effectiveSkillLevel,utilityIndex,chosenIngredients:sets};
}
function weights(p){
 const r=role(p);if(p.specialty==="berry")return{b:.8,i:.07,s:.08,u:.05,core:"b"};
 if(p.specialty==="ingredient")return{b:.1,i:.75,s:.08,u:.07,core:"i"};
 if(p.specialty==="all")return{b:.31,i:.29,s:.32,u:.08,core:"x"};
 if(/^healer/.test(r.category))return{b:.04,i:.04,s:.78,u:.14,core:"s"};
 if(r.category==="berrySkill")return{b:.38,i:.04,s:.52,u:.06,core:"s"};
 if(r.category==="ingredientSkill")return{b:.06,i:.29,s:.57,u:.08,core:"s"};
 if(r.category==="cooking")return{b:.06,i:.1,s:.72,u:.12,core:"s"};
 if(r.category==="support")return{b:.06,i:.06,s:.68,u:.2,core:"s"};
 if(r.category==="dream")return{b:.08,i:.05,s:.57,u:.3,core:"s"};
 if(r.category==="strength")return{b:.17,i:.05,s:.7,u:.08,core:"s"};
 return{b:.16,i:.13,s:.61,u:.1,core:"s"};
}
const filler=()=>["REB","DSB","SEB","ERB","INVS"];
function scorer(c){
 const p=mon(c.pokemonId),w=weights(p),base=metrics({...c,natureId:"HARDY",subskills:filler(),ingredients:defaultIngredients(p)});
 const ratio=(x,y)=>y>0?x/y:1;
 function parts(x){const m=metrics(x);return{m,b:ratio(m.berryStrengthDay,base.berryStrengthDay),i:ratio(m.ingredientStrengthDay,base.ingredientStrengthDay),s:ratio(m.skillOutput,base.skillOutput),u:ratio(m.utilityIndex,base.utilityIndex)}}
 function score(x){const q=parts(x);return w.b*q.b+w.i*q.i+w.s*q.s+w.u*q.u}
 function indices(x){const q=parts(x),b=q.b*100,i=q.i*100,s=q.s*100;return{overall:score(x)*100,core:w.core==="b"?b:w.core==="i"?i:w.core==="x"?w.b*b+w.i*i+w.s*s:s,berry:b,ingredient:i,skill:s,team:q.m.utilityIndex*100}}
 return{score,indices};
}
function hash(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function random(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function randIng(p,r){const o={};["0","30","60"].forEach(k=>{const a=p.ingredients[k]||[];if(a.length)o[k]=a[Math.floor(r()*a.length)].id});return o}
function key(c){return[c.pokemonId,c.level,c.mainSkillLevel,c.collectionHours,c.favoriteBerry?1:0,c.teamHelpingBonus||0,c.ingredientTarget||""].join("|")}
function distribution(c){
 const k0=key(c);if(CACHE.has(k0))return CACHE.get(k0);const p=mon(c.pokemonId),sc=scorer(c),r=random(hash(k0)),ids=D.subskills.map(x=>x.id),k=activeCount(c.level),a=new Array(SAMPLE);
 for(let i=0;i<SAMPLE;i++){const pool=ids.slice();for(let j=0;j<k;j++){const z=j+Math.floor(r()*(pool.length-j));[pool[j],pool[z]]=[pool[z],pool[j]]}a[i]=sc.score({...c,natureId:D.natures[Math.floor(r()*D.natures.length)].id,subskills:pool.slice(0,k),ingredients:randIng(p,r)})}
 a.sort((x,y)=>x-y);if(CACHE.size>=18)CACHE.delete(CACHE.keys().next().value);CACHE.set(k0,a);return a;
}
function lower(a,v){let l=0,h=a.length;while(l<h){const m=l+h>>>1;if(a[m]<v)l=m+1;else h=m}return l}
function upper(a,v){let l=0,h=a.length;while(l<h){const m=l+h>>>1;if(a[m]<=v)l=m+1;else h=m}return l}
function grade(x){return x<=1?"S+":x<=5?"S":x<=12?"A+":x<=22?"A":x<=35?"B+":x<=50?"B":x<=65?"C+":x<=80?"C":x<=92?"D":"E"}
function rank(c){const sc=scorer(c),v=sc.score(c),a=distribution(c),e=Math.max(1e-10,Math.abs(v)*1e-9),lo=lower(a,v-e),hi=upper(a,v+e),top=clamp(((a.length-hi)+(hi-lo)*.5)/a.length*100,.1,99.9);return{topPct:top,grade:grade(top),score:v,samples:a.length,indices:sc.indices(c)}}
function ingredientRank(c){const p=mon(c.pokemonId),sc=scorer(c),keys=[["0",1],["30",30],["60",60]].filter(x=>c.level>=x[1]).map(x=>x[0]),a=[];function walk(i,x){if(i===keys.length){a.push(sc.score({...c,ingredients:{...c.ingredients,...x}}));return}const k=keys[i];(p.ingredients[k]||[]).forEach(o=>walk(i+1,{...x,[k]:o.id}))}walk(0,{});a.sort((x,y)=>x-y);const v=sc.score(c),lo=lower(a,v-1e-9),hi=upper(a,v+1e-9),top=a.length<=1?50:((a.length-hi)+(hi-lo)*.5)/a.length*100;return{topPct:clamp(top,.1,99.9),combinations:a.length}}
function finalMon(p){if(!p||p.remainingEvolutions===0)return p;const i=p.ingredients["0"]?.[0]?.id;return D.pokemon.filter(x=>x.remainingEvolutions===0&&x.specialty===p.specialty&&x.skill===p.skill&&x.pokedexNumber>=p.pokedexNumber&&x.pokedexNumber<=p.pokedexNumber+20&&x.ingredients["0"]?.[0]?.id===i).sort((a,b)=>a.pokedexNumber-b.pokedexNumber)[0]||p}
function scalar(m,s,c){if(s==="berry")return m.berryStrengthDay+m.ingredientStrengthDay*.08;if(s==="ingredient")return m.ingredientStrengthDay+m.berryStrengthDay*.08;if(s==="all")return m.berryStrengthDay+m.ingredientStrengthDay+m.skillOutput*6000;if(c==="berrySkill")return m.skillOutput*.68+m.berryStrengthDay/15000*.32;if(c==="ingredientSkill")return m.skillOutput*.72+m.ingredientStrengthDay/12000*.28;return m.skillOutput}
function speciesRank(c){const entered=mon(c.pokemonId),p=finalMon(entered),r=role(p),group=D.pokemon.filter(x=>x.remainingEvolutions===0&&x.specialty===p.specialty&&((p.specialty!=="skill"&&p.specialty!=="all")||role(x).category===r.category));const val=x=>{const z={...c,pokemonId:x.id,natureId:"HARDY",subskills:filler(),ingredients:defaultIngredients(x)};return scalar(metrics(z),x.specialty,role(x).category)},a=group.map(val).sort((x,y)=>x-y),v=val(p),lo=lower(a,v-1e-9),hi=upper(a,v+1e-9),top=a.length<=1?50:((a.length-hi)+(hi-lo)*.5)/a.length*100;return{topPct:clamp(top,.1,99.9),count:a.length,basisPokemon:p,role:r}}
function verdict(x){return x<=1?{title:"종결급",text:"더 좋은 개체를 기다릴 이유가 거의 없습니다. 바로 투자해도 됩니다."}:x<=5?{title:"최상급",text:"메인 스킬 씨앗까지 투자할 가치가 높은 개체입니다."}:x<=12?{title:"상급",text:"본업 핵심 옵션이 잘 모였습니다. 적극 육성권입니다."}:x<=22?{title:"준수한 상급",text:"실전에서 오래 쓸 수 있습니다. 역할에 맞으면 투자해도 좋습니다."}:x<=35?{title:"쓸 만함",text:"분명 평균 이상이지만 종결 개체는 아닙니다. 자원이 넉넉하면 육성하세요."}:x<=50?{title:"평균 이상",text:"당장 쓸 수는 있으나 비싼 씨앗 투자는 한 번 더 생각하는 편이 낫습니다."}:x<=65?{title:"평범함",text:"임시 사용은 가능하지만 장기 투자 대상으로는 애매합니다."}:x<=80?{title:"아쉬움",text:"본업 옵션이 부족합니다. 대체 개체를 계속 찾는 편이 좋습니다."}:{title:"교체 후보",text:"솔직히 고투자는 손해에 가깝습니다. 최소 투자로만 쓰세요."}}
function analyze(c){const p=mon(c.pokemonId);if(!p)throw Error("올바른 포켓몬을 선택해 주세요.");const current=rank(c),futureConfig={...c,level:80},future=rank(futureConfig);return{pokemon:p,role:role(p),current,future,metrics:metrics(c),futureMetrics:metrics(futureConfig),ingredientLine:ingredientRank(futureConfig),species:speciesRank(c),verdict:verdict(current.topPct)}}
function defaultConfig(id="RALTS"){const p=mon(id)||D.pokemon[0];return{pokemonId:p.id,level:70,mainSkillLevel:1,natureId:"HARDY",subskills:["HB","STM","HSM","INVL","BFS"],ingredients:defaultIngredients(p),collectionHours:4,favoriteBerry:false,teamHelpingBonus:0,ingredientTarget:""}}
root.SleepGraderEngine={analyze,metrics,rankCandidate:rank,gradeFromTop:grade,getPokemon:mon,getNature:nat,getRole:role,defaultConfig,defaultIngredientIds:defaultIngredients,activeCount,version:"1.0.0"};
})(globalThis);
