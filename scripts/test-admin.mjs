import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';

const base='http://localhost:5173';
const auth={Cookie:'__sites_local_auth=1'};
const post=body=>fetch(base+'/api/admin',{method:'POST',headers:{...auth,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
const folder=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file=readdirSync(folder).find(value=>value.endsWith('.sqlite')&&value!=='metadata.sqlite');
assert.ok(file,'Start the local server and apply migrations first.');
const local=new DatabaseSync(resolve(folder,file));local.exec('PRAGMA busy_timeout=5000');
const previousCatalog=local.prepare("SELECT value FROM settings WHERE id='catalog'").get();
const name='ADMIN QA '+crypto.randomUUID(),ids=[];
let date;

try{
 assert.equal((await fetch(base+'/api/admin')).status,403);
 const adminResponse=await fetch(base+'/api/admin',{headers:auth});
 assert.equal(adminResponse.status,200);
 const admin=await adminResponse.json();
 assert.ok(admin.resources.length===11&&admin.settings.paymentCard);
 const changedDescription=admin.resources[0].description+' QA';
 const saved=await post({resources:admin.resources.map((resource,index)=>({id:resource.id,weekday:resource.weekday,weekend:resource.weekend,description:index===0?changedDescription:resource.description})),settings:{...admin.settings,paymentCard:'4111 1111 1111 1111'}});
 assert.equal(saved.status,200);
 const catalog=await (await fetch(base+'/api/catalog')).json();
 assert.equal(catalog.settings.paymentCard,'4111111111111111');
 assert.equal(catalog.resources[0].description,changedDescription);
 for(let offset=80;offset<120;offset++){
  const day=new Date();day.setDate(day.getDate()+offset);
  const key=day.toISOString().slice(0,10);
  const slots=(await (await fetch(base+'/api/availability?date='+key)).json()).slots;
  if(!slots.some(slot=>slot.resource==='gazebo-1'||slot.resource==='sauna')){date=key;break}
 }
 assert.ok(date,'No free local test date found.');
 const gazebo={action:'create-booking',resource:'gazebo-1',date,start:admin.settings.open,end:admin.settings.close,guests:6,deposit:0,status:'confirmed',name,phone:'+380990000000',note:'phone booking'};
 const gazeboResource=admin.resources.find(r=>r.id==='gazebo-1'),day=new Date(date+'T12:00:00Z').getUTCDay(),expectedGazeboPrice=(day===0||day>=gazeboResource.weekendStart)?gazeboResource.weekend:gazeboResource.weekday;
 const first=await post(gazebo),firstBody=await first.json();assert.equal(first.status,201);ids.push(firstBody.id);assert.equal(firstBody.total,expectedGazeboPrice);
 assert.equal((await post(gazebo)).status,409);
 const sauna={...gazebo,resource:'sauna',start:9,end:15,guests:6,note:'six hours'};
 const second=await post(sauna),secondBody=await second.json();assert.equal(second.status,201);ids.push(secondBody.id);assert.equal(secondBody.total,4800);
 const waiting={...sauna,start:10,end:13,status:'pending',phone:'+380991111111',note:'overlapping request'};
 const third=await post(waiting),thirdBody=await third.json();assert.equal(third.status,201);ids.push(thirdBody.id);
 assert.equal((await post({action:'status',id:thirdBody.id,status:'confirmed'})).status,409);
 const slots=(await (await fetch(base+'/api/availability?date='+date)).json()).slots;
 assert.ok(slots.some(slot=>slot.resource==='gazebo-1'&&slot.start===0&&slot.end===24));
 assert.ok(slots.some(slot=>slot.resource==='sauna'&&slot.start===9&&slot.end===15));
 const listed=await (await fetch(base+'/api/admin',{headers:auth})).json();
 assert.ok(listed.bookings.some(booking=>booking.id===firstBody.id&&booking.source==='manual'&&booking.guests===6));
 const cancelled=await post({action:'status',id:firstBody.id,status:'cancelled'});assert.equal(cancelled.status,200);
 const afterCancel=(await (await fetch(base+'/api/availability?date='+date)).json()).slots;
 assert.ok(!afterCancel.some(slot=>slot.resource==='gazebo-1'));
 console.log('PASS: admin auth, manual gazebo, manual sauna price, conflicts, source, listing, cancellation and availability');
}finally{
 for(const id of ids)local.prepare('DELETE FROM bookings WHERE id=? AND name=?').run(id,name);
 if(previousCatalog)local.prepare("INSERT INTO settings (id,value) VALUES ('catalog',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(previousCatalog.value);
 else local.prepare("DELETE FROM settings WHERE id='catalog'").run();
 local.close();
}
