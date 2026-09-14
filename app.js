(function appInstall(){
"use strict";
const D=globalThis.PSG_DATA,E=globalThis.SleepGraderEngine,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const by=Object.fromEntries(D.pokemon.map(p=>[p.id,p])),sub=Object.fromEntries(D.subskills.map(s=>[s.id,s])),nature=Object.fromEntries(D.natures.map(n=>[n.id,n]));
const el={search:$("#pokemonSearch"),list:$("#pokemonList"),meta:$("#pokemonMeta"),level:$("#level"),levelOut:$("#levelValue"),nature:$("#nature"),skill:$("#mainSkillLevel"),subs:$$(".subskill-select"),i0:$("#ingredient0"),i30:$("#ingredient30"),i60:$("#ingredient60"),target:$("#ingredientTarget"),collect:$("#collectionHours"),fav:$("#favoriteBerry"),team:$("#teamHelpingBonus"),result:$("#resultContent"),status:$("#resultStatus"),source:$("#sourcePokemon"),share:$("#shareButton"),reset:$("#resetButton"),version:$("#dataVersion")};
const labels=new Map();let timer,config;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fTop=x=>"상위 "+x.toFixed(x<1?2:1)+"%";
const fNum=x=>x>=10000?(x/10000).toFixed(x>=100000?1:2)+"만":x>=1000?Math.round(x).toLocaleString("ko-KR"):x.toFixed(x<10?2:0);
const monLabel=p=>p.ko+" · "+p.en;
const mod=x=>({speed:"도우미 속도",ingredient:"식재료 확률",skill:"스킬 확률",energy:"기운 회복",exp:"EXP",neutral:"무보정"}[x]||x);
const natureLabel=n=>n.up==="neutral"?n.ko+" · 무보정":n.ko+" · "+mod(n.up)+"↑ / "+mod(n.down)+"↓";
function sanitize(x={}){
 const p=by[x.pokemonId]||by.RALTS||D.pokemon[0],c={...E.defaultConfig(p.id),...x};c.pokemonId=p.id;c.level=Math.min(80,Math.max(1,+c.level||1));c.mainSkillLevel=Math.min(7,Math.max(1,+c.mainSkillLevel||1));c.natureId=nature[c.natureId]?c.natureId:"HARDY";c.collectionHours=[1,4,8].includes(+c.collectionHours)?+c.collectionHours:4;c.teamHelpingBonus=Math.min(4,Math.max(0,+c.teamHelpingBonus||0));c.favoriteBerry=!!c.favoriteBerry;c.ingredients={...E.defaultIngredientIds(p),...(c.ingredients||{})};
 const a=[];(c.subskills||[]).forEach(id=>{if(sub[id]&&!a.includes(id))a.push(id)});D.subskills.forEach(s=>{if(a.length<5&&!a.includes(s.id))a.push(s.id)});c.subskills=a.slice(0,5);if(c.ingredientTarget&&!D.ingredients[c.ingredientTarget])c.ingredientTarget="";return c;
}
function hashConfig(){
 try{const raw=location.hash.slice(3).replace(/-/g,"+").replace(/_/g,"/"),pad=raw+"=".repeat((4-raw.length%4)%4);return location.hash.startsWith("#c=")?JSON.parse(decodeURIComponent([...atob(pad)].map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""))):null}catch{return null}
}
function initial(){
 const h=hashConfig();if(h)return sanitize(h);try{const s=JSON.parse(localStorage.getItem("psg-config"));if(s)return sanitize(s)}catch{}
 return sanitize({pokemonId:"RALTS",level:70,mainSkillLevel:6,natureId:"HARDY",subskills:["HB","STM","HSM","INVL","REB"],collectionHours:4});
}
function save(){try{localStorage.setItem("psg-config",JSON.stringify(config))}catch{}}
function setup(){
 D.pokemon.slice().sort((a,b)=>a.ko.localeCompare(b.ko,"ko")).forEach(p=>{const o=document.createElement("option"),l=monLabel(p);o.value=l;el.list.append(o);[l,p.ko,p.en,p.id].forEach(x=>labels.set(x.toLocaleLowerCase(),p.id))});
 D.natures.forEach(n=>{const o=new Option(natureLabel(n),n.id);el.nature.add(o)});
 for(let i=1;i<=7;i++)el.skill.add(new Option("Lv."+i,i));
 el.target.add(new Option("총 기초에너지 기준",""));Object.entries(D.ingredients).filter(x=>x[1].value>0).sort((a,b)=>a[1].ko.localeCompare(b[1].ko,"ko")).forEach(([id,x])=>el.target.add(new Option(x.ko+" 집중",id)));
}
function fillSubs(){
 el.subs.forEach((s,i)=>{s.innerHTML="";D.subskills.forEach(x=>{const o=new Option(x.ko,x.id);o.disabled=config.subskills.includes(x.id)&&config.subskills[i]!==x.id;s.add(o)});s.value=config.subskills[i];const row=s.closest(".subskill-row"),open=config.level>=D.unlocks[i];row.classList.toggle("locked",!open);row.dataset.rarity=sub[config.subskills[i]].rarity;const st=row.querySelector(".unlock-state");st.textContent=open?"적용 중":"잠김";st.className="unlock-state "+(open?"active":"")});
}
function fillIngredients(){
 const p=by[config.pokemonId];[["0",el.i0],["30",el.i30],["60",el.i60]].forEach(([k,s])=>{s.innerHTML="";const a=p.ingredients[k]||[];a.forEach(x=>s.add(new Option((D.ingredients[x.id]?.ko||x.id)+" ×"+x.amount,x.id)));if(!a.some(x=>x.id===config.ingredients[k]))config.ingredients[k]=a[0]?.id;s.value=config.ingredients[k];const box=s.closest(".ingredient-slot"),u=k==="0"?1:+k;box.classList.toggle("locked",config.level<u);box.querySelector(".slot-state").textContent=config.level>=u?"현재 적용":"Lv."+u+" 해금"});
}
function meta(){
 const p=by[config.pokemonId],r=E.getRole(p),cl=p.specialty==="berry"?"berry":p.specialty==="ingredient"?"ingredient":p.specialty==="skill"?"skill":"all",female=p.genderRatio[1],gender=p.genderRatio[0]+female===0?"성별 없음":female===1?"암컷 100%":female===0?"수컷 100%":"암컷 "+Math.round(female*1000)/10+"%";
 const sec=p.frequency,m=Math.floor(sec/60),ss=String(sec%60).padStart(2,"0");
 el.meta.innerHTML='<div class="mon-heading"><div><span class="eyebrow">No.'+String(p.pokedexNumber).padStart(4,"0")+'</span><h2>'+esc(p.ko)+'</h2><p>'+esc(p.en)+'</p></div><div class="mon-orb '+cl+'"><span>'+(cl==="berry"?"●":cl==="ingredient"?"◆":cl==="skill"?"✦":"◈")+'</span></div></div><div class="badge-row"><span class="badge '+cl+'">'+esc(r.specialtyLabel)+'</span><span class="badge neutral">'+esc(r.label)+'</span></div><div class="base-stat-grid"><div><span>기본 도움</span><strong>'+m+"분 "+ss+'초</strong></div><div><span>식재료 확률</span><strong>'+p.ingredientPercentage.toFixed(1)+'%</strong></div><div><span>스킬 확률</span><strong>'+p.skillPercentage.toFixed(1)+'%</strong></div><div><span>소지수 / 성별</span><strong>'+p.carrySize+" · "+gender+'</strong></div></div><div class="main-skill-line"><span>메인 스킬</span><strong>'+esc(r.skillName)+'</strong></div>';
 el.source.href="https://pks.raenonx.cc/kr/pokedex/"+p.pokedexNumber;el.source.textContent="RaenonX에서 "+p.ko+" 확인 ↗";
}
function sync(){
 const p=by[config.pokemonId];el.search.value=monLabel(p);el.level.value=config.level;el.levelOut.textContent="Lv."+config.level;el.nature.value=config.natureId;el.skill.value=config.mainSkillLevel;el.collect.value=config.collectionHours;el.fav.checked=config.favoriteBerry;el.team.value=config.teamHelpingBonus;el.target.value=config.ingredientTarget||"";fillSubs();fillIngredients();meta();save();schedule();
}
function read(){
 config=sanitize({...config,level:+el.level.value,natureId:el.nature.value,mainSkillLevel:+el.skill.value,subskills:el.subs.map(x=>x.value),ingredients:{"0":el.i0.value,"30":el.i30.value,"60":el.i60.value},ingredientTarget:el.target.value,collectionHours:+el.collect.value,favoriteBerry:el.fav.checked,teamHelpingBonus:+el.team.value});
}
function insights(r){
 const a=new Set(r.metrics.activeSubskills),n=nature[config.natureId],good=[],bad=[];
 if(a.has("HB"))good.push("도우미 보너스가 본인과 팀 4마리의 생산성을 함께 올립니다.");
 if(a.has("HSM"))good.push("도우미 스피드 M으로 모든 생산과 스킬 판정이 크게 늘어납니다.");
 if(a.has("BFS")&&(r.pokemon.specialty==="berry"||r.role.category==="berrySkill"))good.push("나무열매 수 S가 이 역할의 핵심 화력을 직접 끌어올립니다.");
 if((a.has("STM")||a.has("STS"))&&(r.pokemon.specialty==="skill"||r.pokemon.specialty==="all"))good.push("스킬 확률 옵션이 메인 스킬 발동을 안정적으로 늘립니다.");
 if((a.has("IFM")||a.has("IFS"))&&r.pokemon.specialty==="ingredient")good.push("식재료 확률 옵션이 식재료 타입의 본업과 정확히 맞습니다.");
 if((a.has("INVL")||a.has("INVM"))&&config.collectionHours>=4&&r.pokemon.specialty!=="berry")good.push("소지수 증가가 장시간 미접속 손실을 줄입니다.");
 if(n.up==="speed")good.push("속도 상승 성격은 거의 모든 역할에서 확실한 가점입니다.");
 if(n.up==="skill"&&(r.pokemon.specialty==="skill"||r.pokemon.specialty==="all"))good.push("스킬 상승 성격이 본업과 맞습니다.");
 if(n.down==="speed")bad.push("속도 하락 성격은 모든 생산과 발동 횟수를 깎는 큰 감점입니다.");
 if(n.down==="skill"&&(r.pokemon.specialty==="skill"||r.pokemon.specialty==="all"))bad.push("스킬 확률 하락 성격은 본업을 직접 망가뜨립니다.");
 if(n.down==="ingredient"&&r.pokemon.specialty==="ingredient")bad.push("식재료 확률 하락 성격이라 식재료형으로서는 치명적입니다.");
 if(a.has("BFS")&&r.pokemon.specialty==="ingredient"&&config.collectionHours>=8)bad.push("나무열매 수 S가 소지품을 빨리 채워 밤샘 식재료 생산을 방해할 수 있습니다.");
 if(["REB","DSB","SEB"].filter(x=>a.has(x)).length>=2)bad.push("현재 열린 칸에 직접 성능을 올리지 않는 보너스가 많습니다.");
 if(r.metrics.reliability<.82)bad.push("수확 주기에 비해 소지수가 부족해 방치 효율이 떨어집니다.");
 if(!good.length)good.push("치명적 결함은 없지만 본업을 강하게 미는 조합도 뚜렷하지 않습니다.");if(!bad.length)bad.push("현재 레벨 기준으로 눈에 띄는 치명적 감점은 없습니다.");return{good:good.slice(0,4),bad:bad.slice(0,4)};
}
function meter(name,v,t){return'<div class="meter-row"><div class="meter-copy"><span>'+esc(name)+'</span><strong>'+Math.round(v)+'</strong></div><div class="meter"><i class="'+t+'" style="width:'+Math.max(4,Math.min(100,v/1.6))+'%"></i></div></div>'}
function render(r){
 const pct=r.current.topPct,q=100-pct,idx=r.current.indices,ins=insights(r),basis=r.species.basisPokemon.id!==r.pokemon.id?r.species.basisPokemon.ko+" 진화 후 기준":r.pokemon.ko+" 기준",names=r.metrics.activeSubskills.map(x=>sub[x].ko),ings=r.futureMetrics.chosenIngredients.map(x=>(D.ingredients[x.id]?.ko||x.id)+"×"+x.amount),sg=E.gradeFromTop(r.species.topPct),line=r.ingredientLine.combinations<=1?"고정":fTop(r.ingredientLine.topPct),core=r.pokemon.specialty==="berry"?"나무열매 본업":r.pokemon.specialty==="ingredient"?"식재료 본업":r.role.label+" 본업";
 el.result.innerHTML='<div class="result-hero"><div class="grade-ring grade-'+r.current.grade.replace("+","p")+'" style="--grade-angle:'+(q*3.6)+'deg"><div><span>'+r.current.grade+'</span><small>ROLE GRADE</small></div></div><div class="result-summary"><span class="eyebrow">동일 포켓몬 조합 대비</span><h2>'+fTop(pct)+'</h2><p><strong>'+esc(r.verdict.title)+'.</strong> '+esc(r.verdict.text)+'</p></div></div>'+
 '<div class="rank-strip"><div><span>현재 Lv.'+config.level+'</span><strong>'+r.current.grade+" · "+fTop(r.current.topPct)+'</strong></div><div><span>완성형 Lv.80</span><strong>'+r.future.grade+" · "+fTop(r.future.topPct)+'</strong></div><div><span>식재료 구성</span><strong>'+line+'</strong></div></div>'+
 '<section class="result-section"><div class="section-title"><div><span class="eyebrow">PERFORMANCE</span><h3>어디서 점수를 얻었나</h3></div><span class="sample-note">3.2만 조합 추정</span></div>'+meter(core,idx.core,"mint")+meter("전체 역할 점수",idx.overall,"violet")+meter("팀 기여 지수",idx.team,"amber")+
 '<div class="metric-grid"><div><span>예상 도움</span><strong>'+r.metrics.helpsPerDay.toFixed(1)+'회/일</strong><small>만에너지 환산 지수</small></div><div><span>스킬 발동</span><strong>'+r.metrics.skillProcsDay.toFixed(2)+'회/일</strong><small>천장 보정 포함 추정</small></div><div><span>식재료 생산</span><strong>'+fNum(r.metrics.ingredientStrengthDay)+'</strong><small>기초에너지/일</small></div><div><span>소지 안정성</span><strong>'+Math.round(r.metrics.reliability*100)+'%</strong><small>약 '+r.metrics.fillHours.toFixed(1)+'시간 후 가득</small></div></div></section>'+
 '<section class="result-section split-notes"><div class="note-panel good"><h3><span>＋</span> 좋은 점</h3><ul>'+ins.good.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ul></div><div class="note-panel bad"><h3><span>−</span> 아쉬운 점</h3><ul>'+ins.bad.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ul></div></section>'+
 '<section class="result-section species-card"><div><span class="eyebrow">SPECIES POWER</span><h3>종 자체 경쟁력</h3><p>'+esc(basis)+' · 최종진화 '+esc(r.species.role.label)+" "+r.species.count+'종 비교</p></div><div class="species-rank"><span>'+sg+'</span><strong>'+fTop(r.species.topPct)+'</strong></div></section>'+
 '<section class="result-section build-summary"><div class="section-title"><div><span class="eyebrow">BUILD</span><h3>입력한 개체</h3></div></div><div class="chip-wrap">'+names.map(x=>'<span class="build-chip">'+esc(x)+'</span>').join("")+'</div><p><strong>Lv.80 식재료:</strong> '+esc(ings.join(" / "))+'</p><p><strong>실효 메인 스킬:</strong> Lv.'+r.metrics.effectiveSkillLevel+' · <strong>소지수:</strong> '+r.metrics.inventory+'</p></section><div class="result-footnote"><strong>냉정 판정 기준.</strong> 백분위는 같은 포켓몬의 성격 25종, 중복 없는 서브스킬, 가능한 식재료 구성을 역할 가중치로 비교한 독립 추정치입니다. RaenonX 공식 점수와 동일한 계산식은 아닙니다.</div>';
 el.status.hidden=true;el.result.hidden=false;
}
function schedule(){clearTimeout(timer);el.status.hidden=false;el.status.classList.add("loading");el.status.innerHTML='<span class="spinner"></span><strong>가능한 개체 조합과 비교 중…</strong><small>첫 계산만 잠깐 걸립니다.</small>';el.result.hidden=true;timer=setTimeout(()=>{try{render(E.analyze(config))}catch(err){el.status.innerHTML="<strong>계산하지 못했습니다.</strong><span>"+esc(err.message)+"</span>"}},80)}
function toast(x){const t=$("#toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function preset(k){const P={ralts:{pokemonId:"RALTS",level:70,mainSkillLevel:6,natureId:"HARDY",subskills:["HB","STM","HSM","INVL","REB"]},gardevoir:{pokemonId:"GARDEVOIR",level:70,mainSkillLevel:6,natureId:"LONELY",subskills:["INVL","STM","STS","HSM","HB"]},torterra:{pokemonId:"TORTERRA",level:70,mainSkillLevel:6,natureId:"CAREFUL",subskills:["STS","STM","HSM","IFS","HB"]},sceptile:{pokemonId:"SCEPTILE",level:66,mainSkillLevel:6,natureId:"SASSY",subskills:["BFS","INVM","HB","HSM","INVL"]}}[k];if(!P)return;config=sanitize({...E.defaultConfig(P.pokemonId),...P});sync();toast(by[P.pokemonId].ko+" 예시를 불러왔습니다.")}
function bind(){
 el.search.addEventListener("change",()=>{const v=el.search.value.trim().toLocaleLowerCase(),id=labels.get(v)||D.pokemon.find(p=>p.ko.includes(el.search.value.trim())||p.en.toLocaleLowerCase().includes(v))?.id;if(id){config.pokemonId=id;config.ingredients=E.defaultIngredientIds(by[id]);sync()}else{el.search.value=monLabel(by[config.pokemonId]);toast("목록의 포켓몬을 선택해 주세요.")}});
 [el.level,el.nature,el.skill,el.i0,el.i30,el.i60,el.target,el.collect,el.fav,el.team].forEach(x=>x.addEventListener(x.type==="range"?"input":"change",()=>{read();el.levelOut.textContent="Lv."+config.level;fillSubs();fillIngredients();save();schedule()}));
 el.subs.forEach((s,i)=>s.addEventListener("change",()=>{const v=s.value,j=config.subskills.findIndex((x,n)=>n!==i&&x===v);if(j>=0)config.subskills[j]=D.subskills.find(x=>!config.subskills.includes(x.id)).id;config.subskills[i]=v;fillSubs();save();schedule()}));
 $$(".preset-button").forEach(b=>b.addEventListener("click",()=>preset(b.dataset.preset)));
 el.share.addEventListener("click",()=>{read();const bytes=unescape(encodeURIComponent(JSON.stringify(config))),h=btoa(bytes).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");history.replaceState(null,"","#c="+h);navigator.clipboard.writeText(location.href).then(()=>toast("설정 링크를 복사했습니다.")).catch(()=>toast("주소창의 링크를 복사해 주세요."))});
 el.reset.addEventListener("click",()=>{config=sanitize(E.defaultConfig("RALTS"));localStorage.removeItem("psg-config");history.replaceState(null,"",location.pathname+location.search);sync();toast("기본값으로 되돌렸습니다.")});
}
function webMCP(){if(!navigator.modelContext?.registerTool)return;try{navigator.modelContext.registerTool({name:"pokemon_sleep_grade",description:"포켓몬 슬립 개체를 동일 포켓몬 조합과 비교해 역할별 백분위로 평가합니다.",inputSchema:{type:"object",properties:{pokemonId:{type:"string"},level:{type:"number",minimum:1,maximum:80},natureId:{type:"string"},subskills:{type:"array",items:{type:"string"},minItems:5,maxItems:5}},required:["pokemonId","level","natureId","subskills"]},execute:async x=>{const r=E.analyze(sanitize({...E.defaultConfig(x.pokemonId),...x}));return{content:[{type:"text",text:JSON.stringify({pokemon:r.pokemon.ko,role:r.role.label,grade:r.current.grade,topPercent:+r.current.topPct.toFixed(2),verdict:r.verdict.text})}]}}})}catch{}}
setup();config=initial();el.version.textContent="DATA "+D.version.replace(/-/g,".");bind();sync();webMCP();
})();
