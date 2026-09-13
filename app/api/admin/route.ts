import {z} from 'zod';
import {admin,catalog,db,fail,sameOrigin} from '@/lib/server';
import {initialResources,totalPrice} from '@/lib/catalog';

const dateValue=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const phoneValue=z.string().trim().max(24).transform(v=>v.replace(/[\s()-]/g,'')).refine(v=>/^\+?\d{10,15}$/.test(v));
const validCard=(value:string)=>{let sum=0,double=false;for(let i=value.length-1;i>=0;i--){let digit=Number(value[i]);if(double){digit*=2;if(digit>9)digit-=9}sum+=digit;double=!double}return sum%10===0};
const cardValue=z.string().transform(v=>v.replace(/\D/g,'')).refine(v=>/^\d{16,19}$/.test(v)&&validCard(v));

const configuration=z.object({
 resources:z.array(z.object({
  id:z.string(),weekday:z.number().int().min(500).max(100000),weekend:z.number().int().min(500).max(100000),description:z.string().trim().min(1).max(500),
 })).length(initialResources.length),
 settings:z.object({
  open:z.number().int().min(0).max(21),close:z.number().int().min(3).max(24),saunaExtra:z.number().int().min(0).max(10000),extraHourly:z.boolean(),hoursConfirmed:z.boolean(),paymentCard:cardValue,minDeposit:z.number().int().min(1).max(100000),
 }).refine(s=>s.close-s.open>=3),
}).refine(b=>initialResources.every(x=>b.resources.filter(r=>r.id===x.id).length===1))
 .refine(b=>b.settings.minDeposit<=Math.min(...b.resources.map(resource=>Math.min(resource.weekday,resource.weekend)*(initialResources.find(base=>base.id===resource.id)?.kind==='sauna'?3:1))));

const statusAction=z.object({action:z.literal('status'),id:z.string().uuid(),status:z.enum(['pending','confirmed','cancelled'])});
const manualAction=z.object({
 action:z.literal('create-booking'),resource:z.string().max(30),date:dateValue,start:z.number().int().min(0).max(23),end:z.number().int().min(1).max(24),guests:z.number().int().min(1).max(100),deposit:z.number().int().min(0),status:z.enum(['pending','confirmed']),name:z.string().trim().min(1).max(80),phone:phoneValue,note:z.string().trim().max(500).default(''),
});

export async function GET(){
 try{
  if(!await admin())return Response.json({error:'Доступ лише для адміністратора'},{status:403});
  const bookings=await db().prepare("SELECT * FROM bookings ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END, date ASC, created DESC LIMIT 1000").all();
  return Response.json({...await catalog(),bookings:bookings.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}
}

export async function POST(req:Request){
 try{
  if(!sameOrigin(req)||!await admin())return Response.json({error:'Доступ заборонено'},{status:403});
  const raw=await req.json().catch(()=>null);

  const status=statusAction.safeParse(raw);
  if(status.success){
   const b=status.data;
   const result=b.status==='confirmed'
    ?await db().prepare("UPDATE bookings AS candidate SET status='confirmed' WHERE candidate.id=? AND candidate.status!='cancelled' AND NOT EXISTS (SELECT 1 FROM bookings AS occupied WHERE occupied.id!=candidate.id AND occupied.resource=candidate.resource AND occupied.date=candidate.date AND occupied.status='confirmed' AND occupied.start<candidate.end AND occupied.end>candidate.start)").bind(b.id).run()
    :await db().prepare("UPDATE bookings SET status=? WHERE id=? AND status!='cancelled'").bind(b.status,b.id).run();
   if(!result.meta.changes)return Response.json({error:b.status==='confirmed'?'Цей час уже підтверджено за іншою заявкою. Скасуйте цю заявку або оберіть інший час.':'Заявку вже скасовано або не знайдено.'},{status:409});
   return Response.json({ok:true});
  }

  const manual=manualAction.safeParse(raw);
  if(manual.success){
   const b=manual.data;
   const {resources,settings}=await catalog();
   const resource=resources.find(r=>r.id===b.resource);
   const now=new Date();
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Kyiv'}).format(now);
   const max=new Date(now);max.setFullYear(max.getFullYear()+1);
   const maxDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Kyiv'}).format(max);
   if(!resource||b.date<today||b.date>maxDate||b.start<settings.open||b.end>settings.close||b.end<=b.start||(resource.kind==='sauna'&&b.end-b.start<3))return Response.json({error:'Перевірте дату та час. Баня бронюється щонайменше на 3 години.'},{status:400});
   const total=totalPrice(resource,b.date,b.start,b.end,b.guests,settings);
   if(b.deposit>total||(b.deposit>0&&b.deposit<settings.minDeposit))return Response.json({error:`Передоплата має бути 0 або від ${settings.minDeposit} грн до повної суми.`},{status:400});
   const id=crypto.randomUUID();
   const start=resource.kind==='gazebo'?0:b.start,end=resource.kind==='gazebo'?24:b.end;
   const result=await db().prepare("INSERT INTO bookings (id,resource,date,start,end,guests,name,phone,total,deposit,status,source,note,created,requested_start,requested_end) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ?!='confirmed' OR NOT EXISTS (SELECT 1 FROM bookings WHERE resource=? AND date=? AND status='confirmed' AND start<? AND end>?)")
    .bind(id,resource.id,b.date,start,end,b.guests,b.name,b.phone,total,b.deposit,b.status,'manual',b.note,now.toISOString(),b.start,b.end,b.status,resource.id,b.date,end,start).run();
   if(result.meta.changes!==1)return Response.json({error:'Це місце або час уже зайняті.'},{status:409});
   return Response.json({ok:true,id,total},{status:201});
  }

  const parsed=configuration.safeParse(raw);
  if(!parsed.success)return Response.json({error:'Перевірте ціни, реквізити та години роботи.'},{status:400});
  const current=await catalog();
  const saved={resources:current.resources.map(base=>({...base,...parsed.data.resources.find(r=>r.id===base.id)})),settings:parsed.data.settings};
  await db().prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('catalog',JSON.stringify(saved)).run();
  return Response.json({ok:true});
 }catch(e){return fail(e)}
}
