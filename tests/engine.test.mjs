import test from "node:test";
import assert from "node:assert/strict";
await import("../data.js");
await import("../engine.js");
const D=globalThis.PSG_DATA,E=globalThis.SleepGraderEngine;

test("247 Pokémon records are complete and unique",()=>{
  assert.equal(D.pokemon.length,247);
  assert.equal(new Set(D.pokemon.map(p=>p.id)).size,247);
  for(const p of D.pokemon){assert.ok(p.frequency>0,p.id);assert.ok(p.ingredients["0"].length,p.id);assert.ok(p.skill,p.id)}
});
test("helping speed and Berry Finding S affect output",()=>{
  const r=E.defaultConfig("RALTS");r.level=50;r.subskills=["REB","DSB","SEB","ERB","INVS"];const slow=E.metrics(r);r.subskills=["HSM","DSB","SEB","ERB","INVS"];assert.ok(E.metrics(r).helpsPerDay>slow.helpsPerDay);
  const s=E.defaultConfig("SCEPTILE");s.level=10;s.subskills=["REB","DSB","SEB","ERB","INVS"];const plain=E.metrics(s);s.subskills=["BFS","DSB","SEB","ERB","INVS"];const bfs=E.metrics(s);assert.equal(bfs.berryCount,plain.berryCount+1);assert.ok(bfs.berryStrengthDay>plain.berryStrengthDay);
});
test("a role-correct Ralts outranks a bad healer",()=>{
  const good={...E.defaultConfig("RALTS"),level:70,mainSkillLevel:6,natureId:"HARDY",subskills:["HB","STM","HSM","INVL","REB"]};
  const bad={...E.defaultConfig("RALTS"),level:70,mainSkillLevel:6,natureId:"NAIVE",subskills:["REB","DSB","SEB","ERB","INVS"]};
  const a=E.analyze(good),b=E.analyze(bad);assert.ok(a.current.topPct<b.current.topPct);assert.ok(a.current.topPct<15);assert.ok(b.current.topPct>85);assert.equal(a.species.basisPokemon.id,"GARDEVOIR");
});
test("representative outputs are finite",()=>{
  for(const id of["GARDEVOIR","TORTERRA","SCEPTILE","MEW","MEWTWO"]){const r=E.analyze(E.defaultConfig(id));assert.ok(Number.isFinite(r.current.topPct),id)}
});
test("Mew supports every Almighty main-skill choice from RaenonX",()=>{
  assert.equal(E.versatileOptions.length,12);
  assert.equal(new Set(E.versatileOptions.map(x=>x.id)).size,12);
  const base=E.defaultConfig("MEW");
  assert.equal(base.versatileSkill,"Metronome");
  const metronome=E.metrics(base);
  const healer=E.metrics({...base,versatileSkill:"EnergyForEveryoneS"});
  const berry=E.metrics({...base,versatileSkill:"BerryBurst"});
  assert.equal(metronome.role.category,"random");
  assert.equal(healer.role.category,"healerAll");
  assert.equal(healer.role.skillName,"기력 올S");
  assert.equal(berry.role.category,"berrySkill");
  assert.equal(E.getSkillRate(metronome.pokemon,"Metronome"),4);
  assert.equal(E.getSkillRate(metronome.pokemon,"EnergyForEveryoneS"),3.37);
  assert.equal(E.getSkillRate(metronome.pokemon,"BerryBurst"),2.84);
  assert.ok(metronome.skillProcsDay>healer.skillProcsDay);
  assert.ok(healer.skillProcsDay>berry.skillProcsDay);
});
