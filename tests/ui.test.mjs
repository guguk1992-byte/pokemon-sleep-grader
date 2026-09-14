import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const app=await readFile(new URL("../app.js",import.meta.url),"utf8");

test("collection interval offers and preserves every whole hour from 1 to 8",()=>{
  const select=html.match(/<select id="collectionHours">([\s\S]*?)<\/select>/)?.[1]||"";
  const values=[...select.matchAll(/<option value="(\d+)"/g)].map(x=>Number(x[1]));
  assert.deepEqual(values,[1,2,3,4,5,6,7,8]);
  assert.match(app,/Number\.isInteger\(hours\)&&hours>=1&&hours<=8\?hours:4/);
});
