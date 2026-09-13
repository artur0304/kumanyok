'use client';

import {useEffect,useMemo,useState} from 'react';
import {Calendar} from '@/components/ui/calendar';
import {Button} from '@/components/ui/button';
import {uk} from 'date-fns/locale';
import {CalendarDays,Check,Clock,ExternalLink,Phone,Plus,Search,Settings as SettingsIcon,X} from 'lucide-react';
import {Resource,SiteSettings,defaults,totalPrice} from '@/lib/catalog';

type Booking={id:string;resource:string;date:string;start:number;end:number;requested_start:number;requested_end:number;guests:number;name:string;phone:string;total:number;deposit:number;status:'pending'|'confirmed'|'cancelled';source?:'site'|'manual';note?:string;created:string};
type Tab='bookings'|'calendar'|'settings';
type ManualForm={resource:string;start:number;end:number;guests:number;name:string;phone:string;deposit:number;status:'pending'|'confirmed';note:string};

const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const keyDate=(value:string)=>{const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d)};
const todayKey=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Kyiv'}).format(new Date());
const formatCard=(value:string)=>value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim();
const formatDate=(value:string)=>keyDate(value).toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'});
const statusText={pending:'Очікує',confirmed:'Підтверджено',cancelled:'Скасовано'} as const;

export default function AdminPanel(){
 const [resources,setResources]=useState<Resource[]>([]);
 const [settings,setSettings]=useState<SiteSettings>(defaults);
 const [bookings,setBookings]=useState<Booking[]>([]);
 const [tab,setTab]=useState<Tab>('bookings');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [query,setQuery]=useState('');
 const [statusFilter,setStatusFilter]=useState<'all'|Booking['status']>('pending');
 const [scope,setScope]=useState<'upcoming'|'all'|'past'>('upcoming');
 const [manualDate,setManualDate]=useState<Date>(()=>keyDate(todayKey()));
 const [manual,setManual]=useState<ManualForm>({resource:'',start:defaults.open,end:defaults.open+3,guests:8,name:'',phone:'',deposit:0,status:'confirmed',note:''});

 async function load(){
  try{
   const response=await fetch('/api/admin',{cache:'no-store'});
   const data=await response.json() as {error?:string;resources:Resource[];settings:SiteSettings;bookings:Booking[]};
   if(!response.ok)throw Error(data.error||'Не вдалося завантажити дані.');
   setResources(data.resources);setSettings(data.settings);setBookings(data.bookings);
   setManual(current=>{
    const resource=data.resources.find(r=>r.id===current.resource)||data.resources[0];
    const start=Math.max(data.settings.open,Math.min(current.start,data.settings.close-1));
    const end=Math.min(data.settings.close,Math.max(start+(resource?.kind==='sauna'?3:1),current.end));
    return {...current,resource:resource?.id||'',start,end};
   });
  }catch(error){setMessage((error as Error).message)}
 }

 useEffect(()=>{load()},[]);

 async function send(data:object,success:string){
  setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const result=await response.json() as {error?:string;total?:number};
   if(!response.ok)throw Error(result.error||'Не вдалося зберегти зміни.');
   setMessage(success);await load();return result;
  }catch(error){setMessage((error as Error).message);return null}
  finally{setBusy(false)}
 }

 const today=todayKey();
 const selectedKey=dateKey(manualDate);
 const selectedResource=resources.find(r=>r.id===manual.resource);
 const manualTotal=selectedResource?totalPrice(selectedResource,selectedKey,manual.start,manual.end,manual.guests,settings):0;
 const activeBookings=bookings.filter(b=>b.status!=='cancelled');
 const confirmedBookings=bookings.filter(b=>b.status==='confirmed');
 const bookedDates=useMemo(()=>Array.from(new Set(activeBookings.map(b=>b.date))).map(keyDate),[bookings]);
 const dayBookings=activeBookings.filter(b=>b.date===selectedKey);
 const visibleBookings=useMemo(()=>{
  const needle=query.trim().toLowerCase();
  return bookings.filter(b=>{
   const matchesStatus=statusFilter==='all'||b.status===statusFilter;
   const matchesScope=scope==='all'||(scope==='upcoming'?b.date>=today:b.date<today);
   const resource=resources.find(r=>r.id===b.resource)?.name||b.resource;
   const matchesQuery=!needle||`${b.name} ${b.phone} ${b.id} ${resource}`.toLowerCase().includes(needle);
   return matchesStatus&&matchesScope&&matchesQuery;
  });
 },[bookings,query,statusFilter,scope,resources,today]);
 const pending=bookings.filter(b=>b.status==='pending').length;
 const confirmedUpcoming=bookings.filter(b=>b.status==='confirmed'&&b.date>=today).length;
 const lastDay=new Date();lastDay.setFullYear(lastDay.getFullYear()+1);
 const hours=Array.from({length:Math.max(0,settings.close-settings.open)},(_,i)=>settings.open+i);

 function chooseResource(id:string){
  const resource=resources.find(r=>r.id===id);
  setManual(current=>({...current,resource:id,start:settings.open,end:resource?.kind==='sauna'?Math.min(settings.open+3,settings.close):settings.close,guests:resource?.kind==='sauna'?8:current.guests}));
 }

 async function createManual(event:React.FormEvent){
  event.preventDefault();
  const result=await send({action:'create-booking',...manual,date:selectedKey},`Бронювання на ${formatDate(selectedKey)} додано до календаря.`);
  if(result)setManual(current=>({...current,name:'',phone:'',deposit:0,note:''}));
 }

 return <main className='admin-page'>
  <header className='admin-header'>
   <div><a className='admin-back' href='/'>kumanyok</a><h1>Панель адміністратора</h1><p>Заявки, календар і тарифи в одному місці.</p></div>
   <a className='admin-site-link' href='/' target='_blank'>Відкрити сайт <ExternalLink size={17}/></a>
  </header>

  <section className='admin-stats' aria-label='Огляд бронювань'>
   <button type='button' onClick={()=>{setStatusFilter('pending');setScope('all');setTab('bookings')}}><Clock/><span><strong>{pending}</strong> очікують рішення</span></button>
   <button type='button' onClick={()=>{setStatusFilter('confirmed');setScope('upcoming');setTab('bookings')}}><Check/><span><strong>{confirmedUpcoming}</strong> майбутніх підтверджено</span></button>
   <button type='button' onClick={()=>setTab('calendar')}><CalendarDays/><span><strong>{new Set(confirmedBookings.filter(b=>b.date>=today).map(b=>b.date)).size}</strong> дат із підтвердженням</span></button>
  </section>

  <nav className='admin-tabs' aria-label='Розділи панелі'>
   <button type='button' className={tab==='bookings'?'active':''} onClick={()=>setTab('bookings')}>Заявки {pending>0&&<span>{pending}</span>}</button>
   <button type='button' className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}>Календар і ручна бронь</button>
   <button type='button' className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>Налаштування</button>
  </nav>
  {message&&<p className='admin-message' role='status'>{message}</p>}

  {tab==='bookings'&&<section className='admin-section'>
   <div className='admin-section-title'><div><p className='eyebrow'>ЗАЯВКИ КЛІЄНТІВ</p><h2>Обробка бронювань</h2></div><Button onClick={()=>setTab('calendar')}><Plus/> Додати вручну</Button></div>
   <div className='admin-filters'>
    <label className='admin-search'><Search size={18}/><input aria-label='Пошук заявок' value={query} onChange={e=>setQuery(e.target.value)} placeholder='Ім’я, телефон, номер або місце'/></label>
    <select aria-label='Статус' value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value='all'>Усі статуси</option><option value='pending'>Очікують</option><option value='confirmed'>Підтверджені</option><option value='cancelled'>Скасовані</option></select>
    <select aria-label='Період' value={scope} onChange={e=>setScope(e.target.value as typeof scope)}><option value='upcoming'>Майбутні</option><option value='past'>Минулі</option><option value='all'>Усі дати</option></select>
   </div>
   <div className='admin-booking-list'>
    {visibleBookings.map(booking=>{
     const resource=resources.find(r=>r.id===booking.resource);
     const time=resource?.kind==='gazebo'?'На весь день':`${booking.start}:00–${booking.end}:00`;
     return <article className={`admin-booking is-${booking.status}`} key={booking.id}>
      <div className='admin-booking-main'><div className='admin-booking-meta'><span className={`status-badge ${booking.status}`}>{statusText[booking.status]}</span><span>{booking.source==='manual'?'Додано вручну':'Із сайту'}</span></div><h3>{resource?.name||booking.resource}</h3><p><strong>{formatDate(booking.date)}</strong> · {time} · {booking.guests} гостей</p>{booking.note&&<p className='booking-note'>{booking.note}</p>}</div>
      <div className='admin-guest'><strong>{booking.name}</strong><a href={'tel:'+booking.phone}><Phone size={15}/>{booking.phone}</a><small>№ {booking.id.slice(0,8)}</small></div>
      <div className='admin-payment'><span>Передоплата <strong>{booking.deposit.toLocaleString('uk-UA')} грн</strong></span><span>Усього {booking.total.toLocaleString('uk-UA')} грн</span></div>
      <div className='admin-actions'>{booking.status==='pending'&&<Button disabled={busy} onClick={()=>send({action:'status',id:booking.id,status:'confirmed'},'Заявку підтверджено.')}><Check/> Підтвердити</Button>}{booking.status!=='cancelled'&&<Button disabled={busy} variant='outline' onClick={()=>send({action:'status',id:booking.id,status:'cancelled'},'Бронювання скасовано, час знову доступний.')}><X/> Скасувати</Button>}</div>
     </article>
    })}
    {!visibleBookings.length&&<div className='admin-empty'><CalendarDays/><h3>Заявок за цими умовами немає</h3><p>Змініть фільтр або додайте бронювання вручну.</p></div>}
   </div>
  </section>}

  {tab==='calendar'&&<section className='admin-section'>
   <div className='admin-section-title'><div><p className='eyebrow'>РУЧНЕ БРОНЮВАННЯ</p><h2>Заповнити календар</h2><p>Для заявок телефоном, у повідомленнях або на місці.</p></div></div>
   <div className='admin-calendar-layout'>
    <div className='admin-calendar-card'><Calendar mode='single' required selected={manualDate} onSelect={d=>d&&setManualDate(d)} locale={uk} modifiers={{hasBookings:bookedDates}} disabled={[{before:keyDate(today)},{after:lastDay}]}/><p><span className='calendar-dot'/> На цю дату є заявка або підтверджене бронювання.</p></div>
    <form className='admin-manual-form' onSubmit={createManual}>
     <div className='manual-form-heading'><div><span>Обрана дата</span><strong>{formatDate(selectedKey)}</strong></div>{dayBookings.length>0&&<span className='day-count'>{dayBookings.length} записів</span>}</div>
     {dayBookings.length>0&&<div className='day-bookings'>{dayBookings.map(b=><div key={b.id}><span>{resources.find(r=>r.id===b.resource)?.name||b.resource} · {statusText[b.status]}</span><strong>{b.start===0?'весь день':`${b.start}:00–${b.end}:00`}</strong></div>)}</div>}
     <label>Місце<select required value={manual.resource} onChange={e=>chooseResource(e.target.value)}><optgroup label='Альтанки'>{resources.filter(r=>r.kind==='gazebo').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</optgroup><optgroup label='Баня'>{resources.filter(r=>r.kind==='sauna').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</optgroup></select></label>
     {selectedResource?.kind==='sauna'?<div className='form-row'><label>Початок<select value={manual.start} onChange={e=>{const start=+e.target.value;setManual(v=>({...v,start,end:Math.max(start+3,v.end)}))}}>{hours.filter(h=>h+3<=settings.close).map(h=><option key={h} value={h}>{h}:00</option>)}</select></label><label>Завершення<select value={manual.end} onChange={e=>setManual(v=>({...v,end:+e.target.value}))}>{Array.from({length:Math.max(0,settings.close-manual.start-2)},(_,i)=>manual.start+3+i).map(h=><option key={h} value={h}>{h}:00</option>)}</select></label></div>:<p className='manual-info'>Альтанка буде позначена зайнятою на весь обраний день.</p>}
     <div className='form-row'><label>Гостей<input type='number' min='1' max='100' required value={manual.guests} onChange={e=>setManual(v=>({...v,guests:+e.target.value}))}/></label><label>Статус<select value={manual.status} onChange={e=>setManual(v=>({...v,status:e.target.value as ManualForm['status']}))}><option value='confirmed'>Підтверджено</option><option value='pending'>Очікує оплати</option></select></label></div>
     <div className='form-row'><label>Ім’я клієнта<input required maxLength={80} value={manual.name} onChange={e=>setManual(v=>({...v,name:e.target.value}))}/></label><label>Телефон<input required type='tel' placeholder='+380' value={manual.phone} onChange={e=>setManual(v=>({...v,phone:e.target.value}))}/></label></div>
     <label>Примітка<textarea maxLength={500} rows={3} value={manual.note} onChange={e=>setManual(v=>({...v,note:e.target.value}))} placeholder='Наприклад: заявка з Instagram, потрібен мангал'/></label>
     <div className='manual-total'><div><span>Вартість за тарифом</span><strong>{manualTotal.toLocaleString('uk-UA')} грн</strong></div><label>Отримана передоплата<input type='number' min='0' max={manualTotal} value={manual.deposit} onChange={e=>setManual(v=>({...v,deposit:+e.target.value}))}/><small>0 — якщо оплати ще не було; інакше від {settings.minDeposit} грн.</small></label></div>
     <Button type='submit' size='lg' disabled={busy||!selectedResource}>{busy?'Зберігаємо…':'Додати до календаря'} <Plus/></Button>
    </form>
   </div>
  </section>}

  {tab==='settings'&&<section className='admin-section'>
   <div className='admin-section-title'><div><p className='eyebrow'>НАЛАШТУВАННЯ</p><h2>Оплата, тарифи та години</h2></div><SettingsIcon/></div>
   <form className='admin-settings-form' onSubmit={event=>{event.preventDefault();send({resources:resources.map(({id,weekday,weekend,description})=>({id,weekday,weekend,description})),settings},'Налаштування сайту збережено.')}}>
    <fieldset className='payment-settings'><legend>Реквізити оплати</legend><div className='form-row'><label>Номер картки<input inputMode='numeric' autoComplete='cc-number' required value={formatCard(settings.paymentCard)} onChange={e=>setSettings({...settings,paymentCard:e.target.value.replace(/\D/g,'').slice(0,19)})} placeholder='0000 0000 0000 0000'/><small>На цю картку клієнт отримає інструкцію переказати передоплату.</small></label><label>Мінімальна передоплата, грн<input type='number' min='1' max='100000' required value={settings.minDeposit} onChange={e=>setSettings({...settings,minDeposit:+e.target.value})}/><small>Клієнт зможе обрати суму від цього значення до повної вартості.</small></label></div></fieldset>
    <fieldset><legend>Баня та години роботи</legend><div className='form-row'><label>Відкриття<input type='number' min='0' max='21' value={settings.open} onChange={e=>setSettings({...settings,open:+e.target.value})}/></label><label>Закриття<input type='number' min='3' max='24' value={settings.close} onChange={e=>setSettings({...settings,close:+e.target.value})}/></label><label>Доплата за гостя/год<input type='number' min='0' value={settings.saunaExtra} onChange={e=>setSettings({...settings,saunaExtra:+e.target.value})}/></label></div><p className='muted'>Базова ціна бані задається нижче. Доплата нараховується за кожного гостя понад 8 за кожну годину.</p><label className='check-label'><input type='checkbox' checked={settings.hoursConfirmed} onChange={e=>setSettings({...settings,hoursConfirmed:e.target.checked})}/> Години роботи остаточно підтверджені</label></fieldset>
    <div className='admin-resources'>{resources.map((resource,index)=><fieldset key={resource.id}><legend>{resource.name}</legend><div className='form-row'><label>Будні, грн<input type='number' min='500' required value={resource.weekday} onChange={e=>setResources(items=>items.map((item,i)=>i===index?{...item,weekday:+e.target.value}:item))}/></label><label>Вихідні, грн<input type='number' min='500' required value={resource.weekend} onChange={e=>setResources(items=>items.map((item,i)=>i===index?{...item,weekend:+e.target.value}:item))}/></label></div><label>Опис<input value={resource.description} maxLength={500} onChange={e=>setResources(items=>items.map((item,i)=>i===index?{...item,description:e.target.value}:item))}/></label></fieldset>)}</div>
    <div className='admin-save-bar'><span>Зміни з’являться на сайті одразу після збереження.</span><Button type='submit' size='lg' disabled={busy||!resources.length}>{busy?'Зберігаємо…':'Зберегти налаштування'}</Button></div>
   </form>
  </section>}
 </main>;
}
