import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {runInNewContext} from "node:vm";
await import("../data.js");
await import("../engine.js");

const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
const css=await readFile(new URL("../ui.css",import.meta.url),"utf8");
const serviceWorker=await readFile(new URL("../service-worker.js",import.meta.url),"utf8");

test("collection interval offers and preserves every whole hour from 1 to 8",()=>{
  const select=html.match(/<select id="collectionHours">([\s\S]*?)<\/select>/)?.[1]||"";
  const values=[...select.matchAll(/<option value="(\d+)"/g)].map(x=>Number(x[1]));
  assert.deepEqual(values,[1,2,3,4,5,6,7,8]);
  assert.match(app,/Number\.isInteger\(hours\)&&hours>=1&&hours<=8\?hours:4/);
});
test("exact level and unlock-level shortcuts are present and cached for offline installs",()=>{
  const levels=[...html.matchAll(/<button type="button" data-level="(\d+)"/g)].map(x=>Number(x[1]));
  assert.deepEqual(levels,[1,10,25,30,50,60,70,80]);
  assert.match(html,/<input id="levelExact"[^>]*type="number"[^>]*min="1" max="80" step="1"/);
  assert.match(html,/href="ui\.css\?v=9"/);
  assert.match(serviceWorker,/"\.\/ui\.css\?v=9"/);
  assert.match(css,/\.subskill-row\.locked\{opacity:1/);
});
test("Helping Bonus team-model assumptions are visible and cached app files refresh",()=>{
  assert.doesNotMatch(html,/class="team-model-note"/);
  assert.match(html,/src="app\.js\?v=10" defer/);
  assert.match(html,/src="engine\.js\?v=10" defer/);
  assert.match(app,/<p class="team-footnote">도우미 보너스의 팀 가치는 팀원 4마리/);
  assert.match(css,/\.result-footnote \.team-footnote\{[^}]*font-size:inherit/);
  assert.match(html,/35% 상한/);
  assert.match(serviceWorker,/pokemon-sleep-grader-v10/);
  assert.match(serviceWorker,/"\.\/engine\.js\?v=10"/);
  assert.match(serviceWorker,/"\.\/app\.js\?v=10"/);
});

function appHarness(){
  function makeElement(){
    const listeners=new Map(),classes=new Set();
    return{
      value:"",dataset:{},options:[],textContent:"",placeholder:"",hidden:false,
      style:{setProperty(){}},classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},toggle(x,on){if(on)classes.add(x);else classes.delete(x)},contains(x){return classes.has(x)}},
      addEventListener(type,fn){listeners.set(type,fn)},fire(type,event={}){listeners.get(type)?.(event)},setAttribute(name,value){this[name]=value},
      add(option){this.options.push(option)},append(option){this.options.push(option)},
      set innerHTML(value){this.html=value;if(value==="")this.options=[]},get innerHTML(){return this.html||""}
    };
  }
  const ids=["pokemonSearch","selectedPokemon","pokemonList","pokemonMeta","level","levelExact","levelValue","nature","natureNote","mainSkillLevel","versatileField","versatileSkill","ingredient0","ingredient30","ingredient60","ingredientTarget","collectionHours","favoriteBerry","teamHelpingBonus","resultContent","resultStatus","sourcePokemon","shareButton","resetButton","installButton","dataVersion","toast"],elements=Object.fromEntries(ids.map(id=>[id,makeElement()]));
  elements.level.min="1";elements.level.max="80";elements.level.type="range";
  const subs=Array.from({length:5},()=>makeElement()),rows=subs.map(()=>makeElement()),ingredientBoxes=["ingredient0","ingredient30","ingredient60"].map(()=>makeElement());
  subs.forEach((select,i)=>{rows[i].status=makeElement();rows[i].querySelector=()=>rows[i].status;select.closest=()=>rows[i]});
  ["ingredient0","ingredient30","ingredient60"].forEach((id,i)=>{ingredientBoxes[i].status=makeElement();ingredientBoxes[i].querySelector=()=>ingredientBoxes[i].status;elements[id].closest=()=>ingredientBoxes[i]});
  const marks=[1,30,60,80].map(value=>{const element=makeElement();element.dataset.value=String(value);return element});
  const shortcuts=[...html.matchAll(/<button type="button" data-level="(\d+)"/g)].map(x=>{const element=makeElement();element.dataset.level=x[1];return element});
  const saved=new Map(),timers=new Map();let nextTimer=0;
  const context={
    PSG_DATA:globalThis.PSG_DATA,SleepGraderEngine:globalThis.SleepGraderEngine,
    document:{querySelector(selector){return elements[selector.slice(1)]},querySelectorAll(selector){return selector===".subskill-select"?subs:selector===".range-marks span"?marks:selector===".level-shortcuts button"?shortcuts:[]},createElement(){return makeElement()}},
    Option:function Option(text,value){return{text,value,disabled:false}},
    localStorage:{getItem(key){return saved.get(key)||null},setItem(key,value){saved.set(key,value)},removeItem(key){saved.delete(key)}},
    location:{hash:"",pathname:"/",search:"",href:"https://example.test/"},history:{replaceState(){}},navigator:{},
    matchMedia(){return{matches:false}},addEventListener(){},setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}
  };
  runInNewContext(app,context,{filename:"app.js"});
  return{elements,subs,rows,shortcuts,renderPending(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn())},getSaved:()=>JSON.parse(saved.get("psg-config"))};
}

test("the team assumption renders inside the existing verdict footnote",()=>{
  const ui=appHarness();ui.renderPending();
  assert.equal(ui.elements.resultContent.hidden,false);
  const result=ui.elements.resultContent.innerHTML;
  assert.match(result,/<div class="result-footnote">[\s\S]*<p class="team-footnote">도우미 보너스의 팀 가치는 팀원 4마리의 생산성이 같고 속도 상한에 닿지 않았다고 가정한 근사치입니다\. 실제 팀 구성에 따라 달라집니다\.<\/p><\/div>$/);
  assert.equal((result.match(/도우미 보너스의 팀 가치는/g)||[]).length,1);
});

test("Mew and Darkrai display no nature and omit nature comparisons",()=>{
  const ui=appHarness(),search=ui.elements.pokemonSearch,nature=ui.elements.nature,note=ui.elements.natureNote;
  assert.equal(nature.disabled,false);
  assert.equal(nature.options.length,25);
  for(const [name,id] of[["뮤","MEW"],["다크라이","DARKRAI"]]){
    search.value=name;search.fire("change");
    assert.equal(ui.getSaved().pokemonId,id);
    assert.equal(ui.getSaved().natureId,"HARDY");
    assert.equal(nature.disabled,true);
    assert.equal(nature.options.length,1);
    assert.equal(nature.options[0].text,"성격 없음");
    assert.equal(note.hidden,false);
  }
  ui.renderPending();
  assert.match(ui.elements.resultContent.innerHTML,/같은 포켓몬의 성격 없이, 중복 없는 서브스킬/);
  assert.doesNotMatch(ui.elements.resultContent.innerHTML,/성격보다/);
  search.value="랄토스";search.fire("change");
  assert.equal(nature.disabled,false);
  assert.equal(nature.options.length,25);
  assert.equal(note.hidden,true);
});

test("changing Pokémon never requires erasing the previously selected name",()=>{
  const ui=appHarness(),search=ui.elements.pokemonSearch;
  assert.equal(search.value,"");
  assert.match(ui.elements.selectedPokemon.textContent,/랄토스/);
  search.value="가디안";search.fire("change");
  assert.equal(ui.getSaved().pokemonId,"GARDEVOIR");
  assert.equal(search.value,"");
  assert.match(ui.elements.selectedPokemon.textContent,/가디안/);
  search.value="";search.fire("change");
  assert.equal(ui.getSaved().pokemonId,"GARDEVOIR");
  search.value="나무킹";search.fire("change");
  assert.equal(ui.getSaved().pokemonId,"SCEPTILE");
  assert.equal(search.value,"");
});
test("number entry and shortcuts keep slider, saved level, and locked slots in sync",()=>{
  const ui=appHarness(),exact=ui.elements.levelExact;
  exact.value="66";exact.fire("change");
  assert.equal(ui.getSaved().level,66);
  assert.equal(+ui.elements.level.value,66);
  assert.equal(ui.elements.levelValue.textContent,"Lv.66");
  ui.shortcuts.find(x=>x.dataset.level==="25").fire("click");
  assert.equal(ui.getSaved().level,25);
  assert.equal(+exact.value,25);
  assert.equal(ui.rows[4].classList.contains("locked"),true);
  assert.equal(ui.rows[4].status.textContent,"미적용 · 편집");
  exact.value="";exact.fire("change");
  assert.equal(ui.getSaved().level,25);
  assert.equal(+exact.value,25);
  ui.shortcuts.find(x=>x.dataset.level==="80").fire("click");
  assert.equal(ui.getSaved().level,80);
  assert.equal(ui.rows[4].classList.contains("locked"),false);
});
test("selecting a subskill from a locked slot swaps both positions immediately",()=>{
  const ui=appHarness();
  ui.shortcuts.find(x=>x.dataset.level==="25").fire("click");
  const before=ui.getSaved().subskills;
  assert.equal(before[0],"HB");
  assert.equal(before[4],"REB");
  assert.equal(ui.rows[4].classList.contains("locked"),true);
  ui.subs[4].value="BFS";ui.subs[4].fire("change");
  assert.equal(ui.getSaved().subskills[4],"BFS");
  assert.ok(ui.subs[0].options.some(o=>o.value==="BFS"&&!o.disabled));
  ui.subs[0].value="BFS";ui.subs[0].fire("change");
  const after=ui.getSaved().subskills;
  assert.equal(after[0],"BFS");
  assert.equal(after[4],"HB");
  assert.equal(new Set(after).size,5);
  assert.equal(ui.subs[4].value,"HB");
  assert.equal(ui.rows[4].classList.contains("locked"),true);
  assert.ok(ui.subs[4].options.every(o=>!o.disabled));
});
