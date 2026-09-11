import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {initialResources,defaults,totalPrice} from '../lib/catalog.ts';

const base='http://localhost:5173';
const post=body=>fetch(base+'/api/bookings',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});
assert.equal(totalPrice(initialResources[9],'2026-12-04',9,12,8),2900);
assert.equal(totalPrice(initialResources[9],'2026-12-03',9,12,8),2400);
assert.equal(totalPrice(initialResources[8],'2026-12-05',9,12,8),1600);
assert.equal(totalPrice(initialResources[10],'2026-12-05',9,12,10),3200);
assert.equal(totalPrice(initialResources[10],'2026-12-05',9,12,10,{...defaults,extraHourly:true}),3600);

// Use the local database only to remove this run's own test records in finally.
const folder=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file=readdirSync(folder).find(x=>x.endsWith('.sqlite')&&x!=='metadata.sqlite');
assert.ok(file,'Start the local server and apply its migrations first.');
const local=new DatabaseSync(resolve(folder,file));local.exec('PRAGMA busy_timeout=5000');
const testName='LOCAL QA '+crypto.randomUUID();
const ids=[];
let date;
for(let i=45;i<75;i++){
 const day=new Date();day.setDate(day.getDate()+i);
 const key=day.toISOString().slice(0,10);
 const available=await (await fetch(base+'/api/availability?date='+key)).json();
 if(!available.slots.some(s=>s.resource==='sauna'||s.resource==='gazebo-9')){date=key;break}
}
assert.ok(date,'No free local test date found.');
const b={resource:'sauna',date,start:9,end:12,guests:10,deposit:500,expectedTotal:3200,name:testName,phone:'+380 (00) 000-00-00'};
try{
 assert.equal((await post({...b,end:11})).status,400);
 assert.equal((await post({...b,deposit:499})).status,400);
 assert.equal((await post({...b,deposit:4000})).status,400);
 assert.equal((await post({...b,date:'2027-02-31'})).status,400);
 assert.equal((await post({...b,phone:'------------'})).status,400);
 assert.equal((await post({...b,expectedTotal:3100})).status,409);
 assert.equal((await fetch(base+'/api/bookings',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{'})).status,400);
 const results=await Promise.all([post(b),post(b)]);
 const responses=await Promise.all(results.map(async r=>({status:r.status,body:await r.json()})));
 responses.filter(x=>x.status===201).forEach(x=>ids.push(x.body.id));
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 assert.equal(responses.find(r=>r.status===201).body.total,3200);
 const adjacent=await post({...b,start:12,end:15});const a=await adjacent.json();if(adjacent.status===201)ids.push(a.id);assert.equal(adjacent.status,201);
 const gazebo=await post({...b,resource:'gazebo-9',expectedTotal:1600});const g=await gazebo.json();if(gazebo.status===201)ids.push(g.id);assert.equal(gazebo.status,201);
 assert.equal((await post({...b,resource:'gazebo-9',start:16,end:18,expectedTotal:1600})).status,409);
 assert.equal((await fetch(base+'/api/admin')).status,403);
 const slots=await (await fetch(base+'/api/availability?date='+date)).json();
 assert.equal(slots.slots.filter(x=>x.resource==='sauna').length,2);
 assert.ok(slots.slots.every(x=>x.phone===undefined&&x.name===undefined));
 console.log('PASS: pricing, duration, deposits, phone, changed quote, malformed JSON, concurrent overlap, adjacent slots, whole-day gazebo, admin protection, privacy');
}finally{
 for(const id of ids)local.prepare('DELETE FROM bookings WHERE id=? AND name=?').run(id,testName);
 local.close();
}
