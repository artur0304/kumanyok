import {z} from 'zod';
import {db,catalog,fail,sameOrigin} from '@/lib/server';
import {totalPrice} from '@/lib/catalog';

const booking=z.object({
 resource:z.string().max(30),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),
 start:z.number().int().min(0).max(23),end:z.number().int().min(1).max(24),
 guests:z.number().int().min(1).max(100),deposit:z.number().int().min(500),
 expectedTotal:z.number().int().min(500),name:z.string().trim().min(1).max(80),
 phone:z.string().trim().max(24).transform(v=>v.replace(/[\s()-]/g,'')).refine(v=>/^\+?\d{10,15}$/.test(v)),
});

export async function POST(req:Request){
 try{
  if(!sameOrigin(req))return Response.json({error:'Недозволений запит'},{status:403});
  const parsed=booking.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'Перевірте дату, час, кількість гостей та контакти.'},{status:400});
  const b=parsed.data;
  const {resources,settings}=await catalog();
  const r=resources.find(r=>r.id===b.resource);
  const now=new Date();
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Kyiv'}).format(now);
  const currentHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Kyiv',hour:'2-digit',hourCycle:'h23'}).format(now));
  const max=new Date(now);max.setFullYear(max.getFullYear()+1);
  if(!r||b.date<today||b.date>max.toISOString().slice(0,10)||b.start<settings.open||b.end>settings.close||b.end-b.start<(r.kind==='sauna'?3:1)||(b.date===today&&b.start<=currentHour)){
   return Response.json({error:'Оберіть майбутній час. Баня — щонайменше 3 години.'},{status:400});
  }
  const total=totalPrice(r,b.date,b.start,b.end,b.guests,settings);
  if(b.expectedTotal!==total)return Response.json({error:'Тариф змінився. Оновіть сторінку та перевірте нову суму перед бронюванням.'},{status:409});
  if(b.deposit>total)return Response.json({error:'Передоплата не може перевищувати повну суму.'},{status:400});
  const id=crypto.randomUUID();
  const start=r.kind==='gazebo'?0:b.start,end=r.kind==='gazebo'?24:b.end;
  // One atomic statement holds the full gazebo day or the chosen sauna interval.
  const result=await db().prepare("INSERT INTO bookings (id,resource,date,start,end,guests,name,phone,total,deposit,status,created,requested_start,requested_end) SELECT ?,?,?,?,?,?,?,?,?,?,'pending',?,?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE resource=? AND date=? AND status!='cancelled' AND start<? AND end>?)")
   .bind(id,r.id,b.date,start,end,b.guests,b.name,b.phone,total,b.deposit,now.toISOString(),b.start,b.end,r.id,b.date,end,start).run();
  if(result.meta.changes!==1)return Response.json({error:'Цей час уже зайнято. Оберіть інший час або день.'},{status:409});
  return Response.json({id,total,deposit:b.deposit},{status:201});
 }catch(e){return fail(e)}
}
