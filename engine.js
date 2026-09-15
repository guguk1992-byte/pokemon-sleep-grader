(function install(root){
"use strict";
const SAMPLE=32000,CACHE=new Map(),D=root.PSG_DATA;
const VERSATILE_OPTIONS=Object.freeze([
 {id:"ChargeStrengthSRange",ko:"에너지 차지S (#1 ~ #2)",rate:6.4},
 {id:"ChargeEnergyS",ko:"기력 차지S",rate:6.4},
 {id:"EnergizingCheerS",ko:"기력 응원S",rate:4.39},
 {id:"ChargeStrengthM",ko:"에너지 차지M",rate:4},
 {id:"DreamShardMagnetSRange",ko:"꿈의조각 획득S (#1 ~ #2)",rate:4},
 {id:"ExtraHelpfulS",ko:"도우미 서포트S",rate:4},
 {id:"IngredientMagnetS",ko:"식재료 획득S",rate:4},
 {id:"CookingPowerUpS",ko:"요리 파워 업S",rate:4},
 {id:"Metronome",ko:"손가락흔들기",rate:4},
 {id:"TastyChanceS",ko:"요리 찬스S",rate:4},
 {id:"EnergyForEveryoneS",ko:"기력 올S",rate:3.37},
 {id:"BerryBurst",ko:"나무열매 버스트",rate:2.84}
]);
const versatileOption=id=>VERSATILE_OPTIONS.find(x=>x.id===id);
const resolvedSkill=(p,id)=>p?.skill==="Versatile"&&versatileOption(id)?id:p?.skill||"";
const skillRate=(p,id)=>p?.skill==="Versatile"?(versatileOption(id)?.rate??p.skillPercentage):p?.skillPercentage||0;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mon=id=>D.pokemon.find(p=>p.id===id);
const nat=id=>D.natures.find(n=>n.id===id)||D.natures.find(n=>n.id==="HARDY");
const activeCount=l=>D.unlocks.filter(x=>x<=l).length;
function role(p,versatileSkill){
 const s=resolvedSkill(p,versatileSkill),pick=p.skill==="Versatile"?versatileOption(versatileSkill):null;let category="other",label="기타 스킬",skillName=s;
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
 else if(/Versatile/.test(s)){category="versatile";label="올라운더";skillName="올마이티"}
 if(pick)skillName=pick.ko;
 const labs={berry:"나무열매 타입",ingredient:"식재료 타입",skill:"스킬 타입",all:"올라운더"};
 if(p.specialty!=="skill"&&p.specialty!=="all")label=labs[p.specialty];
 return{category,label,skillName,specialtyLabel:labs[p.specialty]||"기타",selectedSkill:s,isVersatile:p.skill==="Versatile"};
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
 const raw=clamp(skillRate(p,c.versatileSkill)/100*n.skill*(1+(set.has("STM")?.36:0)+(set.has("STS")?.18:0)),0,.9);
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
 return{pokemon:p,role:role(p,c.versatileSkill),level,activeSubskills:[...set],interval,helpsPerDay:helps,ingredientChance:ingChance,skillChance,berryCount,inventory,fillHours,reliability:Math.min(ingRel,skillRel),berryStrengthDay,ingredientStrengthDay,skillProcsDay,skillOutput,effectiveSkillLevel,utilityIndex,chosenIngredients:sets};
}
function weights(p,c){
 const r=role(p,c?.versatileSkill);if(p.specialty==="berry")return{b:.8,i:.07,s:.08,u:.05,core:"b"};
 if(p.specialty==="ingredient")return{b:.1,i:.75,s:.08,u:.07,core:"i"};
 if(p.specialty==="all"&&(p.skill!=="Versatile"||r.category==="random"||r.category==="versatile"))return{b:.31,i:.29,s:.32,u:.08,core:"x"};
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
 const p=mon(c.pokemonId),w=weights(p,c),base=metrics({...c,natureId:"HARDY",subskills:filler(),ingredients:defaultIngredients(p)});
 const ratio=(x,y)=>y>0?x/y:1;
 function parts(x){const m=metrics(x);return{m,b:ratio(m.berryStrengthDay,base.berryStrengthDay),i:ratio(m.ingredientStrengthDay,base.ingredientStrengthDay),s:ratio(m.skillOutput,base.skillOutput),u:ratio(m.utilityIndex,base.utilityIndex)}}
 function score(x){const q=parts(x);return w.b*q.b+w.i*q.i+w.s*q.s+w.u*q.u}
 function indices(x){const q=parts(x),b=q.b*100,i=q.i*100,s=q.s*100;return{overall:score(x)*100,core:w.core==="b"?b:w.core==="i"?i:w.core==="x"?w.b*b+w.i*i+w.s*s:s,berry:b,ingredient:i,skill:s,team:q.m.utilityIndex*100}}
 return{score,indices};
}
function hash(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function random(seed){let x=seed||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function randIng(p,r){const o={};["0","30","60"].forEach(k=>{const a=p.ingredients[k]||[];if(a.length)o[k]=a[Math.floor(r()*a.length)].id});return o}
function key(c){return[c.pokemonId,c.level,c.mainSkillLevel,c.collectionHours,c.favoriteBerry?1:0,c.teamHelpingBonus||0,c.ingredientTarget||"",c.versatileSkill||""].join("|")}
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
function speciesRank(c){const entered=mon(c.pokemonId),p=finalMon(entered),r=role(p,c.versatileSkill),group=D.pokemon.filter(x=>x.remainingEvolutions===0&&x.specialty===p.specialty&&((p.specialty!=="skill"&&p.specialty!=="all")||role(x,c.versatileSkill).category===r.category));const val=x=>{const z={...c,pokemonId:x.id,natureId:"HARDY",subskills:filler(),ingredients:defaultIngredients(x)};return scalar(metrics(z),x.specialty,role(x,c.versatileSkill).category)},a=group.map(val).sort((x,y)=>x-y),v=val(p),lo=lower(a,v-1e-9),hi=upper(a,v+1e-9),top=a.length<=1?50:((a.length-hi)+(hi-lo)*.5)/a.length*100;return{topPct:clamp(top,.1,99.9),count:a.length,basisPokemon:p,role:r}}
function verdict(x){return x<=1?{title:"종결급",text:"더 좋은 개체를 기다릴 이유가 거의 없습니다. 바로 투자해도 됩니다."}:x<=5?{title:"최상급",text:"메인 스킬 씨앗까지 투자할 가치가 높은 개체입니다."}:x<=12?{title:"상급",text:"본업 핵심 옵션이 잘 모였습니다. 적극 육성권입니다."}:x<=22?{title:"준수한 상급",text:"실전에서 오래 쓸 수 있습니다. 역할에 맞으면 투자해도 좋습니다."}:x<=35?{title:"쓸 만함",text:"분명 평균 이상이지만 종결 개체는 아닙니다. 자원이 넉넉하면 육성하세요."}:x<=50?{title:"평균 이상",text:"당장 쓸 수는 있으나 비싼 씨앗 투자는 한 번 더 생각하는 편이 낫습니다."}:x<=65?{title:"평범함",text:"임시 사용은 가능하지만 장기 투자 대상으로는 애매합니다."}:x<=80?{title:"아쉬움",text:"본업 옵션이 부족합니다. 대체 개체를 계속 찾는 편이 좋습니다."}:{title:"교체 후보",text:"솔직히 고투자는 손해에 가깝습니다. 최소 투자로만 쓰세요."}}
const subName=id=>D.subskills.find(x=>x.id===id)?.ko||id;
const ingredientName=id=>D.ingredients[id]?.ko||id;
const gainPct=(base,next)=>base?Math.max(0,(next/base-1)*100):0;
function bestNatureChange(c){
 const sc=scorer(c),base=sc.score(c);let best={id:c.natureId,value:base};
 D.natures.forEach(x=>{const value=sc.score({...c,natureId:x.id});if(value>best.value)best={id:x.id,value}});
 return{...best,gain:gainPct(base,best.value)};
}
function bestSubskillChange(c,level){
 const x={...c,level},p=mon(c.pokemonId),sc=scorer(x),base=sc.score(x),selected=(c.subskills||[]).slice(0,5),count=activeCount(level);let best=null;
 for(let slot=0;slot<count;slot++)for(const candidate of D.subskills){
  // A non-berry specialist's BFS is a second source of berry energy, not an empty role slot.
  // Compare its berry/skill tradeoff separately instead of recommending a one-axis swap.
  if(selected[slot]==="BFS"&&p.specialty!=="berry")continue;
  if(candidate.id===selected[slot]||selected.includes(candidate.id))continue;
  const next=selected.slice();next[slot]=candidate.id;const value=sc.score({...x,subskills:next});
  if(!best||value>best.value)best={slot,from:selected[slot],to:candidate.id,value};
 }
 return best?{...best,gain:gainPct(base,best.value),level:D.unlocks[best.slot]}:null;
}
function bestIngredientChange(c){
 const p=mon(c.pokemonId),x={...c,level:80},sc=scorer(x),base=sc.score(x),selected={...defaultIngredients(p),...(c.ingredients||{})};let best=null;
 for(const key of["0","30","60"])for(const candidate of p.ingredients[key]||[]){
  if(candidate.id===selected[key])continue;
  const value=sc.score({...x,ingredients:{...selected,[key]:candidate.id}});
  if(!best||value>best.value)best={key,from:selected[key],to:candidate.id,value};
 }
 return best?{...best,gain:gainPct(base,best.value),level:best.key==="0"?1:+best.key}:null;
}
function berryFindingImpact(c,level=c.level){
 const p=mon(c.pokemonId);if(!p)throw Error("포켓몬을 찾을 수 없습니다.");
 const slot=(c.subskills||[]).indexOf("BFS");
 if(slot<0||D.unlocks[slot]>level)return null;
 const x={...c,level},withBerry=metrics(x),withoutBerry=metrics({...x,subskills:c.subskills.map(id=>id==="BFS"?"":id)});
 const percentage=(a,b)=>b>0?Math.max(0,(b-a)/b*100):0;
 return{
  berryEnergyGain:withBerry.berryStrengthDay-withoutBerry.berryStrengthDay,
  berryGainPct:gainPct(withoutBerry.berryStrengthDay,withBerry.berryStrengthDay),
  skillLossPct:percentage(withBerry.skillProcsDay,withoutBerry.skillProcsDay),
  ingredientLossPct:percentage(withBerry.ingredientStrengthDay,withoutBerry.ingredientStrengthDay),
  fillHours:withBerry.fillHours,fillHoursWithout:withoutBerry.fillHours
 };
}
function insights(c,report){
 const p=mon(c.pokemonId);if(!p)throw Error("포켓몬을 찾을 수 없습니다.");
 const r=report||analyze(c),m=r.metrics,n=nat(c.natureId),active=new Set(m.activeSubskills),selected=(c.subskills||[]).slice(0,5),good=[],issues=[];
 const skillFocused=p.specialty==="skill"||p.specialty==="all",berryImpact=active.has("BFS")?berryFindingImpact(c):null,add=(priority,key,text)=>{if(!issues.some(x=>x.key===key))issues.push({priority,key,text})};
 if(berryImpact){
  const gain=Math.round(berryImpact.berryEnergyGain).toLocaleString("ko-KR"),pct=berryImpact.berryGainPct.toFixed(0);
  const source=r.role.category==="berrySkill"?"메인 스킬의 발동 효과가 아닌 일반 도움의 나무열매를 늘려":"일반 도움으로 얻는 나무열매를 늘려";
  good.push("나무열매 수 S는 "+source+" 열매 기초에너지 약 "+gain+"/일(+"+pct+"%)을 더 얻습니다"+(c.favoriteBerry?"(좋아하는 나무열매 2배 반영)":"")+". 스킬 확률과는 별개로 실제 열매 기여가 있습니다.");
 }
 if(active.has("HB"))good.push("도우미 보너스가 본인과 팀 4마리의 생산성을 함께 올립니다.");
 if(active.has("HSM"))good.push("도우미 스피드 M으로 모든 생산과 스킬 판정이 크게 늘어납니다.");
 if((active.has("STM")||active.has("STS"))&&skillFocused)good.push("스킬 확률 옵션이 메인 스킬 발동을 안정적으로 늘립니다.");
 if((active.has("IFM")||active.has("IFS"))&&p.specialty==="ingredient")good.push("식재료 확률 옵션이 식재료 타입의 본업과 정확히 맞습니다.");
 if((active.has("INVL")||active.has("INVM"))&&+c.collectionHours>=4&&p.specialty!=="berry")good.push("소지수 증가가 장시간 미접속 손실을 줄입니다.");
 if(n.up==="speed")good.push("속도 상승 성격은 거의 모든 역할에서 확실한 가점입니다.");
 if(n.up==="skill"&&skillFocused)good.push("스킬 상승 성격이 본업과 맞습니다.");
 if(n.up==="ingredient"&&p.specialty==="ingredient")good.push("식재료 상승 성격이 식재료 생산량을 직접 높입니다.");
 if(n.up==="neutral")good.push("무보정 성격이라 본업을 직접 깎는 성격 감점은 없습니다.");
 if(m.effectiveSkillLevel>=7&&skillFocused)good.push("실효 메인 스킬이 최대 Lv.7이라 1회 발동 효과를 온전히 냅니다.");

 let harmfulNature=false;
 if(n.down==="speed"){add(100,"nature","속도 하락 성격은 모든 생산과 발동 횟수를 깎는 큰 감점입니다.");harmfulNature=true}
 else if(n.down==="skill"&&skillFocused){add(98,"nature","스킬 확률 하락 성격은 이 포켓몬의 본업을 직접 망가뜨립니다.");harmfulNature=true}
 else if(n.down==="ingredient"&&p.specialty==="ingredient"){add(98,"nature","식재료 확률 하락 성격이라 식재료형으로서는 치명적입니다.");harmfulNature=true}
 else if(n.down==="energy"){add(62,"nature-energy","기운 회복 하락 성격은 하루 도움 횟수의 안정성을 조금 낮춥니다.");harmfulNature=true}
 else if(n.down==="exp")add(38,"nature-exp","EXP 하락 성격은 완성 성능을 깎지는 않지만 육성 시간이 더 듭니다.");

 const coreGap=(ids,key,label,priority)=>{
  if(ids.some(id=>active.has(id)))return;
  const slot=selected.findIndex(id=>ids.includes(id));
  if(slot>=0&&D.unlocks[slot]>c.level)add(priority,key,label+"이 Lv."+D.unlocks[slot]+"에 있어 현재는 아직 적용되지 않습니다.");
  else add(priority,key,"현재 열린 서브스킬에 "+label+"이 없어 본업 상한이 낮습니다.");
 };
 if(c.level<10)add(90,"locked-all","Lv.10 전이라 서브스킬 보정이 아직 하나도 적용되지 않습니다.");
 else{
  if(p.specialty==="berry")coreGap(["BFS"],"core-berry","나무열매 수 S",88);
  if(p.specialty==="ingredient")coreGap(["IFM","IFS"],"core-ingredient","식재료 확률 업",86);
  if(skillFocused&&active.has("BFS")&&!active.has("STM")&&!active.has("STS"))add(80,"core-skill","스킬 확률 업은 없어 메인 스킬 발동 자체는 더 높일 수 있지만, 나무열매 수 S의 열매 이득과 별개로 비교해야 합니다.");
  else if(skillFocused)coreGap(["STM","STS"],"core-skill","스킬 확률 업",90);
  coreGap(["HSM","HSS","HB"],"core-speed","속도 보정",72);
 }
 if(skillFocused&&m.effectiveSkillLevel<7)add(78-m.effectiveSkillLevel*2,"skill-level","실효 메인 스킬이 Lv."+m.effectiveSkillLevel+"이라 Lv.7 대비 1회 발동 효과가 낮습니다.");
 if(berryImpact&&p.specialty!=="berry"&&(berryImpact.skillLossPct>=2||berryImpact.ingredientLossPct>=2)){
  const loss=skillFocused?berryImpact.skillLossPct:berryImpact.ingredientLossPct,label=skillFocused?"스킬 발동":"식재료 생산";
  if(loss>=2)add(82,"bfs-inventory","앱 확인 주기 "+c.collectionHours+"시간에서는 나무열매 수 S로 소지품이 약 "+berryImpact.fillHours.toFixed(1)+"시간 만에 차면서 "+label+"이 약 "+loss.toFixed(1)+"% 감소할 수 있습니다. 열매 이득도 있으니 확인 주기·소지수와 함께 보세요.");
 }
 if(["REB","DSB","SEB"].filter(x=>active.has(x)).length>=2)add(70,"indirect","현재 열린 칸에 직접 성능을 올리지 않는 보너스가 많습니다.");
 if(m.reliability<.95)add(70+(1-m.reliability)*50,"inventory","약 "+m.fillHours.toFixed(1)+"시간이면 소지품이 차서 설정한 "+c.collectionHours+"시간 수확 주기에서 효율이 "+Math.round(m.reliability*100)+"%까지 떨어집니다.");
 if(p.specialty==="ingredient"&&r.ingredientLine.combinations>1&&r.ingredientLine.topPct>50)add(58,"ingredient-line","식재료 구성만 비교하면 상위 "+r.ingredientLine.topPct.toFixed(1)+"%로, 같은 종의 좋은 식재료 조합보다 불리합니다.");

 if(!harmfulNature){const change=bestNatureChange(c),best=nat(change.id);if(change.id!==c.natureId&&change.gain>=1)add(60+Math.min(20,change.gain),"nature-opportunity",n.ko+" 성격보다 "+best.ko+" 성격이면 현재 역할 점수가 약 "+change.gain.toFixed(1)+"% 높습니다.")}
 const currentSwap=bestSubskillChange(c,c.level),futureSwap=c.level<80?bestSubskillChange(c,80):currentSwap;
 const swap=[currentSwap,futureSwap].filter(Boolean).sort((x,y)=>y.gain-x.gain)[0];
 if(swap&&swap.gain>=1)add(64+Math.min(18,swap.gain),"subskill-swap","Lv."+swap.level+"의 "+subName(swap.from)+" 대신 "+subName(swap.to)+"이면 "+(swap.level>c.level?"Lv.80 ":"현재 ")+"역할 점수가 약 "+swap.gain.toFixed(1)+"% 높습니다.");
 const ingredientSwap=bestIngredientChange(c);
 if(ingredientSwap&&ingredientSwap.gain>=1&&(p.specialty==="ingredient"||c.ingredientTarget))add(54+Math.min(16,ingredientSwap.gain),"ingredient-swap","Lv."+ingredientSwap.level+" 식재료를 "+ingredientName(ingredientSwap.from)+" 대신 "+ingredientName(ingredientSwap.to)+"로 고르면 완성형 역할 점수가 약 "+ingredientSwap.gain.toFixed(1)+"% 높습니다.");

 if(!good.length)good.push("현재 설정에는 본업을 직접 깎는 옵션이 적지만, 강한 가점도 제한적입니다.");
 if(!issues.length){const label=p.specialty==="berry"?"나무열매·속도":p.specialty==="ingredient"?"식재료·속도":"스킬 확률·속도";add(1,"near-perfect",label+" 핵심 조건이 잘 갖춰져 있어 뚜렷한 구조적 약점은 없습니다. 현재 동일 종 상위 "+r.current.topPct.toFixed(1)+"%입니다.")}
 issues.sort((x,y)=>y.priority-x.priority);
 return{good:good.slice(0,4),bad:issues.slice(0,4).map(x=>x.text)};
}
function analyze(c){const p=mon(c.pokemonId);if(!p)throw Error("올바른 포켓몬을 선택해 주세요.");const current=rank(c),futureConfig={...c,level:80},future=rank(futureConfig);return{pokemon:p,role:role(p,c.versatileSkill),current,future,metrics:metrics(c),futureMetrics:metrics(futureConfig),ingredientLine:ingredientRank(futureConfig),species:speciesRank(c),verdict:verdict(current.topPct)}}
function defaultConfig(id="RALTS"){const p=mon(id)||D.pokemon[0];return{pokemonId:p.id,level:70,mainSkillLevel:1,natureId:"HARDY",subskills:["HB","STM","HSM","INVL","BFS"],ingredients:defaultIngredients(p),collectionHours:4,favoriteBerry:false,teamHelpingBonus:0,ingredientTarget:"",versatileSkill:"Metronome"}}
root.SleepGraderEngine={analyze,metrics,getInsights:insights,getBerryFindingImpact:berryFindingImpact,rankCandidate:rank,gradeFromTop:grade,getPokemon:mon,getNature:nat,getRole:role,getSkillRate:skillRate,versatileOptions:VERSATILE_OPTIONS,defaultConfig,defaultIngredientIds:defaultIngredients,activeCount,version:"1.3.0"};
})(globalThis);
