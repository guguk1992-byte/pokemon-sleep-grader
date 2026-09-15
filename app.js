(function appInstall(){
"use strict";
const D=globalThis.PSG_DATA,E=globalThis.SleepGraderEngine,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const by=Object.fromEntries(D.pokemon.map(p=>[p.id,p])),sub=Object.fromEntries(D.subskills.map(s=>[s.id,s])),nature=Object.fromEntries(D.natures.map(n=>[n.id,n]));
const el={search:$("#pokemonSearch"),selected:$("#selectedPokemon"),list:$("#pokemonList"),meta:$("#pokemonMeta"),level:$("#level"),levelExact:$("#levelExact"),levelButtons:$$(".level-shortcuts button"),levelOut:$("#levelValue"),nature:$("#nature"),skill:$("#mainSkillLevel"),versatileField:$("#versatileField"),versatile:$("#versatileSkill"),subs:$$(".subskill-select"),i0:$("#ingredient0"),i30:$("#ingredient30"),i60:$("#ingredient60"),target:$("#ingredientTarget"),collect:$("#collectionHours"),fav:$("#favoriteBerry"),team:$("#teamHelpingBonus"),result:$("#resultContent"),status:$("#resultStatus"),source:$("#sourcePokemon"),share:$("#shareButton"),reset:$("#resetButton"),install:$("#installButton"),version:$("#dataVersion")};
const labels=new Map();let timer,config,installPrompt;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fTop=x=>"상위 "+x.toFixed(x<1?2:1)+"%";
const fNum=x=>x>=10000?(x/10000).toFixed(x>=100000?1:2)+"만":x>=1000?Math.round(x).toLocaleString("ko-KR"):x.toFixed(x<10?2:0);
const monLabel=p=>p.ko+" · "+p.en;
const mod=x=>({speed:"도우미 속도",ingredient:"식재료 확률",skill:"스킬 확률",energy:"기운 회복",exp:"EXP",neutral:"무보정"}[x]||x);
const natureLabel=n=>n.up==="neutral"?n.ko+" · 무보정":n.ko+" · "+mod(n.up)+"↑ / "+mod(n.down)+"↓";
function sanitize(x={}){
 const p=by[x.pokemonId]||by.RALTS||D.pokemon[0],c={...E.defaultConfig(p.id),...x},hours=+c.collectionHours,level=Number(c.level);c.pokemonId=p.id;c.level=Number.isFinite(level)?Math.min(80,Math.max(1,Math.round(level))):70;c.mainSkillLevel=Math.min(7,Math.max(1,+c.mainSkillLevel||1));c.natureId=nature[c.natureId]?c.natureId:"HARDY";c.collectionHours=Number.isInteger(hours)&&hours>=1&&hours<=8?hours:4;c.teamHelpingBonus=Math.min(4,Math.max(0,+c.teamHelpingBonus||0));c.favoriteBerry=!!c.favoriteBerry;c.ingredients={...E.defaultIngredientIds(p),...(c.ingredients||{})};c.versatileSkill=E.versatileOptions.some(v=>v.id===c.versatileSkill)?c.versatileSkill:"Metronome";
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
 E.versatileOptions.forEach(x=>el.versatile.add(new Option(x.ko+" · 기본 발동률 "+x.rate+"%",x.id)));
 el.target.add(new Option("총 기초에너지 기준",""));Object.entries(D.ingredients).filter(x=>x[1].value>0).sort((a,b)=>a[1].ko.localeCompare(b[1].ko,"ko")).forEach(([id,x])=>el.target.add(new Option(x.ko+" 집중",id)));
}
function fillSubs(){
 el.subs.forEach((s,i)=>{s.innerHTML="";D.subskills.forEach(x=>s.add(new Option(x.ko,x.id)));s.value=config.subskills[i];const row=s.closest(".subskill-row"),open=config.level>=D.unlocks[i];row.classList.toggle("locked",!open);row.dataset.rarity=sub[config.subskills[i]].rarity;const st=row.querySelector(".unlock-state");st.textContent=open?"적용 중":"미적용 · 편집";st.title=open?"현재 레벨에서 적용 중입니다.":"Lv."+D.unlocks[i]+"부터 적용되지만, 지금도 스킬과 위치를 변경할 수 있습니다.";st.className="unlock-state "+(open?"active":"")});
}
function fillIngredients(){
 const p=by[config.pokemonId];[["0",el.i0],["30",el.i30],["60",el.i60]].forEach(([k,s])=>{s.innerHTML="";const a=p.ingredients[k]||[];a.forEach(x=>s.add(new Option((D.ingredients[x.id]?.ko||x.id)+" ×"+x.amount,x.id)));if(!a.some(x=>x.id===config.ingredients[k]))config.ingredients[k]=a[0]?.id;s.value=config.ingredients[k];const box=s.closest(".ingredient-slot"),u=k==="0"?1:+k;box.classList.toggle("locked",config.level<u);box.querySelector(".slot-state").textContent=config.level>=u?"현재 적용":"Lv."+u+" 해금"});
}
function meta(){
 const p=by[config.pokemonId],r=E.getRole(p,config.versatileSkill),cl=p.specialty==="berry"?"berry":p.specialty==="ingredient"?"ingredient":p.specialty==="skill"?"skill":"all",female=p.genderRatio[1],gender=p.genderRatio[0]+female===0?"성별 없음":female===1?"암컷 100%":female===0?"수컷 100%":"암컷 "+Math.round(female*1000)/10+"%";
 const sec=p.frequency,m=Math.floor(sec/60),ss=String(sec%60).padStart(2,"0");
 el.meta.innerHTML='<div class="mon-heading"><div><span class="eyebrow">No.'+String(p.pokedexNumber).padStart(4,"0")+'</span><h2>'+esc(p.ko)+'</h2><p>'+esc(p.en)+'</p></div><div class="mon-orb '+cl+'"><span>'+(cl==="berry"?"●":cl==="ingredient"?"◆":cl==="skill"?"✦":"◈")+'</span></div></div><div class="badge-row"><span class="badge '+cl+'">'+esc(r.specialtyLabel)+'</span><span class="badge neutral">'+esc(r.label)+'</span></div><div class="base-stat-grid"><div><span>기본 도움</span><strong>'+m+"분 "+ss+'초</strong></div><div><span>식재료 확률</span><strong>'+p.ingredientPercentage.toFixed(1)+'%</strong></div><div><span>스킬 확률</span><strong>'+E.getSkillRate(p,config.versatileSkill).toFixed(2).replace(/0+$/,"").replace(/\.$/,"")+'%</strong></div><div><span>소지수 / 성별</span><strong>'+p.carrySize+" · "+gender+'</strong></div></div><div class="main-skill-line"><span>메인 스킬</span><strong>'+esc(p.skill==="Versatile"?"올마이티 → "+r.skillName:r.skillName)+'</strong></div>';
 el.source.href="https://pks.raenonx.cc/kr/pokedex/"+p.pokedexNumber;el.source.textContent="RaenonX에서 "+p.ko+" 확인 ↗";
}
function syncRange(){
 const min=Number(el.level.min),max=Number(el.level.max),span=max-min||1,position=value=>(Number(value)-min)/span*100;el.level.style.setProperty("--range-progress",position(el.level.value)+"%");$$(".range-marks span").forEach(mark=>mark.style.setProperty("--range-position",position(mark.dataset.value)+"%"));el.levelButtons.forEach(button=>button.setAttribute("aria-pressed",+button.dataset.level===+el.level.value?"true":"false"));
}
function sync(){
 const p=by[config.pokemonId];el.search.value="";el.search.placeholder="현재 "+p.ko+" · 새 포켓몬 이름 입력";el.selected.textContent="현재: "+p.ko;el.level.value=config.level;el.levelExact.value=config.level;syncRange();el.levelOut.textContent="Lv."+config.level;el.nature.value=config.natureId;el.skill.value=config.mainSkillLevel;el.versatile.value=config.versatileSkill;el.versatileField.hidden=p.skill!=="Versatile";el.collect.value=config.collectionHours;el.fav.checked=config.favoriteBerry;el.team.value=config.teamHelpingBonus;el.target.value=config.ingredientTarget||"";fillSubs();fillIngredients();meta();save();schedule();
}
function setLevel(raw){
 const next=Number(raw);
 if(String(raw).trim()===""||!Number.isInteger(next)){el.levelExact.value=config.level;toast("레벨은 1~80 사이의 정수로 입력해 주세요.");return}
 const level=Math.min(80,Math.max(1,next));if(level!==next)toast("레벨은 1~80까지만 설정할 수 있어요.");
 const changed=level!==config.level;config.level=level;el.level.value=level;el.levelExact.value=level;el.levelOut.textContent="Lv."+level;syncRange();
 if(changed){fillSubs();fillIngredients();meta();save();schedule()}
}
function read(){
 config=sanitize({...config,level:+el.level.value,natureId:el.nature.value,mainSkillLevel:+el.skill.value,versatileSkill:el.versatile.value,subskills:el.subs.map(x=>x.value),ingredients:{"0":el.i0.value,"30":el.i30.value,"60":el.i60.value},ingredientTarget:el.target.value,collectionHours:+el.collect.value,favoriteBerry:el.fav.checked,teamHelpingBonus:+el.team.value});
}
function meter(name,v,t){return'<div class="meter-row"><div class="meter-copy"><span>'+esc(name)+'</span><strong>'+Math.round(v)+'</strong></div><div class="meter"><i class="'+t+'" style="width:'+Math.max(4,Math.min(100,v/1.6))+'%"></i></div></div>'}
function render(r){
 const pct=r.current.topPct,q=100-pct,idx=r.current.indices,ins=E.getInsights(config,r),basis=r.species.basisPokemon.id!==r.pokemon.id?r.species.basisPokemon.ko+" 진화 후 기준":r.pokemon.ko+" 기준",names=r.metrics.activeSubskills.map(x=>sub[x].ko),ings=r.futureMetrics.chosenIngredients.map(x=>(D.ingredients[x.id]?.ko||x.id)+"×"+x.amount),sg=E.gradeFromTop(r.species.topPct),line=r.ingredientLine.combinations<=1?"고정":fTop(r.ingredientLine.topPct),core=r.pokemon.specialty==="berry"?"나무열매 본업":r.pokemon.specialty==="ingredient"?"식재료 본업":r.role.label+" 본업",versatileLine=r.pokemon.skill==="Versatile"?'<p><strong>올마이티 메인 스킬:</strong> '+esc(r.role.skillName)+'</p>':"";
 el.result.innerHTML='<div class="result-hero"><div class="grade-ring grade-'+r.current.grade.replace("+","p")+'" style="--grade-angle:'+(q*3.6)+'deg"><div><span>'+r.current.grade+'</span><small>ROLE GRADE</small></div></div><div class="result-summary"><span class="eyebrow">동일 포켓몬 조합 대비</span><h2>'+fTop(pct)+'</h2><p><strong>'+esc(r.verdict.title)+'.</strong> '+esc(r.verdict.text)+'</p></div></div>'+
 '<div class="rank-strip"><div><span>현재 Lv.'+config.level+'</span><strong>'+r.current.grade+" · "+fTop(r.current.topPct)+'</strong></div><div><span>완성형 Lv.80</span><strong>'+r.future.grade+" · "+fTop(r.future.topPct)+'</strong></div><div><span>식재료 구성</span><strong>'+line+'</strong></div></div>'+
 '<section class="result-section"><div class="section-title"><div><span class="eyebrow">PERFORMANCE</span><h3>어디서 점수를 얻었나</h3></div><span class="sample-note">3.2만 조합 추정</span></div>'+meter(core,idx.core,"mint")+meter("전체 역할 점수",idx.overall,"violet")+meter("팀 기여 지수",idx.team,"amber")+
 '<div class="metric-grid"><div><span>예상 도움</span><strong>'+r.metrics.helpsPerDay.toFixed(1)+'회/일</strong><small>만에너지 환산 지수</small></div><div><span>스킬 발동</span><strong>'+r.metrics.skillProcsDay.toFixed(2)+'회/일</strong><small>천장 보정 포함 추정</small></div><div><span>식재료 생산</span><strong>'+fNum(r.metrics.ingredientStrengthDay)+'</strong><small>기초에너지/일</small></div><div><span>소지 안정성</span><strong>'+Math.round(r.metrics.reliability*100)+'%</strong><small>약 '+r.metrics.fillHours.toFixed(1)+'시간 후 가득</small></div></div></section>'+
 '<section class="result-section split-notes"><div class="note-panel good"><h3><span>＋</span> 좋은 점</h3><ul>'+ins.good.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ul></div><div class="note-panel bad"><h3><span>−</span> 아쉬운 점</h3><ul>'+ins.bad.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ul></div></section>'+
 '<section class="result-section species-card"><div><span class="eyebrow">SPECIES POWER</span><h3>종 자체 경쟁력</h3><p>'+esc(basis)+' · 최종진화 '+esc(r.species.role.label)+" "+r.species.count+'종 비교</p></div><div class="species-rank"><span>'+sg+'</span><strong>'+fTop(r.species.topPct)+'</strong></div></section>'+
 '<section class="result-section build-summary"><div class="section-title"><div><span class="eyebrow">BUILD</span><h3>입력한 개체</h3></div></div><div class="chip-wrap">'+names.map(x=>'<span class="build-chip">'+esc(x)+'</span>').join("")+'</div>'+versatileLine+'<p><strong>Lv.80 식재료:</strong> '+esc(ings.join(" / "))+'</p><p><strong>실효 메인 스킬:</strong> Lv.'+r.metrics.effectiveSkillLevel+' · <strong>소지수:</strong> '+r.metrics.inventory+'</p></section><div class="result-footnote"><strong>냉정 판정 기준.</strong> 백분위는 같은 포켓몬의 성격 25종, 중복 없는 서브스킬, 가능한 식재료 구성을 역할 가중치로 비교한 독립 추정치입니다. RaenonX 공식 점수와 동일한 계산식은 아닙니다.</div>';
 const caveat=document.createElement("p");caveat.className="team-footnote";caveat.textContent="도우미 보너스의 팀 가치는 팀원 4마리의 생산성이 같고 속도 상한에 닿지 않았다고 가정한 근사치입니다. 실제 팀 구성에 따라 달라집니다.";
 el.result.querySelector(".result-footnote").append(caveat);
 el.status.hidden=true;el.result.hidden=false;
}
function schedule(){clearTimeout(timer);el.status.hidden=false;el.status.classList.add("loading");el.status.innerHTML='<span class="spinner"></span><strong>가능한 개체 조합과 비교 중…</strong><small>첫 계산만 잠깐 걸립니다.</small>';el.result.hidden=true;timer=setTimeout(()=>{try{render(E.analyze(config))}catch(err){el.status.innerHTML="<strong>계산하지 못했습니다.</strong><span>"+esc(err.message)+"</span>"}},80)}
function toast(x){const t=$("#toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function bind(){
 el.search.addEventListener("change",()=>{const value=el.search.value.trim();if(!value)return;const v=value.toLocaleLowerCase(),id=labels.get(v)||D.pokemon.find(p=>p.ko.includes(value)||p.en.toLocaleLowerCase().includes(v))?.id;if(id){if(config.pokemonId!==id){config.pokemonId=id;config.versatileSkill=E.defaultConfig(id).versatileSkill;config.ingredients=E.defaultIngredientIds(by[id]);sync()}else el.search.value=""}else{el.search.value="";toast("목록의 포켓몬을 선택해 주세요.")}});
 el.search.addEventListener("keydown",event=>{if(event.key==="Enter")el.search.blur()});
 el.level.addEventListener("input",()=>setLevel(el.level.value));
 el.levelExact.addEventListener("change",()=>setLevel(el.levelExact.value));
 el.levelExact.addEventListener("keydown",event=>{if(event.key==="Enter")el.levelExact.blur()});
 el.levelButtons.forEach(button=>button.addEventListener("click",()=>setLevel(button.dataset.level)));
 [el.nature,el.skill,el.versatile,el.i0,el.i30,el.i60,el.target,el.collect,el.fav,el.team].forEach(x=>x.addEventListener("change",()=>{read();syncRange();el.levelOut.textContent="Lv."+config.level;fillSubs();fillIngredients();meta();save();schedule()}));
 el.subs.forEach((s,i)=>s.addEventListener("change",()=>{const v=s.value,other=config.subskills.findIndex((x,n)=>n!==i&&x===v),previous=config.subskills[i];if(previous===v)return;config.subskills=E.placeSubskill(config.subskills,i,v);fillSubs();save();schedule();if(other>=0)toast("Lv."+D.unlocks[i]+"과 Lv."+D.unlocks[other]+"의 스킬 위치를 교환했어요.")}));
 el.share.addEventListener("click",()=>{read();const bytes=unescape(encodeURIComponent(JSON.stringify(config))),h=btoa(bytes).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");history.replaceState(null,"","#c="+h);navigator.clipboard.writeText(location.href).then(()=>toast("설정 링크를 복사했습니다.")).catch(()=>toast("주소창의 링크를 복사해 주세요."))});
 el.reset.addEventListener("click",()=>{config=sanitize(E.defaultConfig("RALTS"));localStorage.removeItem("psg-config");history.replaceState(null,"",location.pathname+location.search);sync();toast("기본값으로 되돌렸습니다.")});
}
function webMCP(){if(!navigator.modelContext?.registerTool)return;try{navigator.modelContext.registerTool({name:"pokemon_sleep_grade",description:"포켓몬 슬립 개체를 동일 포켓몬 조합과 비교해 역할별 백분위로 평가합니다.",inputSchema:{type:"object",properties:{pokemonId:{type:"string"},level:{type:"number",minimum:1,maximum:80},natureId:{type:"string"},versatileSkill:{type:"string",description:"뮤의 올마이티로 배운 메인 스킬"},subskills:{type:"array",items:{type:"string"},minItems:5,maxItems:5}},required:["pokemonId","level","natureId","subskills"]},execute:async x=>{const r=E.analyze(sanitize({...E.defaultConfig(x.pokemonId),...x}));return{content:[{type:"text",text:JSON.stringify({pokemon:r.pokemon.ko,role:r.role.label,mainSkill:r.role.skillName,grade:r.current.grade,topPercent:+r.current.topPct.toFixed(2),verdict:r.verdict.text})}]}}})}catch{}}
function installPWA(){
 if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
 addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event;el.install.hidden=false});
 el.install.addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=undefined;el.install.hidden=true;if(choice.outcome==="accepted")toast("앱 설치를 시작했습니다.")});
 addEventListener("appinstalled",()=>{installPrompt=undefined;el.install.hidden=true;toast("포슬립 감정기를 설치했습니다.")});
 if(matchMedia("(display-mode: standalone)").matches)el.install.hidden=true;
}
setup();config=initial();el.version.textContent="DATA "+D.version.replace(/-/g,".");bind();sync();webMCP();installPWA();
})();
