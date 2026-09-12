export type Resource={id:string; name:string; weekday:number; weekend:number; weekendStart:number; kind:'gazebo'|'sauna'; photo:string; photos:string[]; description:string};
const gazeboPhotos=[
 '/images/gazebo-1.jpg','/images/gazebo-2.jpg','/images/gazebo-3.jpg','/images/gazebo-4.jpg',
 '/images/gazebo-5.jpg','/images/gazebo-10-clean.jpg','/images/gazebo-7.jpg','/images/gazebo-8.jpg',
 '/images/gazebo-10-clean.jpg','/images/gazebo-10.jpg'
];
const gazeboDescriptions=[
 'До 15 гостей · вихід до води · мангал і світло',
 'До 15 гостей · вихід до води · мангал і світло',
 'До 10 гостей · вихід до води · мангал і світло',
 'До 15 гостей · вихід до води · мангал і світло',
 'До 40 гостей · простір для великої компанії',
 'Фото локації; точний вид альтанки уточніть у адміністратора',
 'До 10 гостей · вихід до води · мангал і світло',
 'До 15 гостей · альтанка на воді · вихід до води',
 'Фото локації; точний вид альтанки уточніть у адміністратора',
 'До 25 гостей · вихід до води · мангал і світло'
];
const photoCounts:Record<string,number>={'gazebo-2':8,'gazebo-3':8,'gazebo-4':7,'gazebo-5':8,'gazebo-7':8,'gazebo-8':8,'gazebo-9':8,'gazebo-10':8,sauna:10};
const photosFor=(id:string,fallback:string)=>photoCounts[id]?Array.from({length:photoCounts[id]},(_,i)=>`/images/places/${id}/${String(i+1).padStart(2,'0')}.jpg`):[fallback];
export const initialResources:Resource[] = [[1600,1800],[1600,1800],[1500,1700],[1600,1800],[2900,3400],[2000,2300],[2400,2700],[2400,2600],[1600,1600],[2400,2900]].map((p,i)=>{const id=`gazebo-${i+1}`,photo=gazeboPhotos[i];return {id,name:`Альтанка №${i+1}`,weekday:p[0],weekend:p[1],weekendStart:i===9?5:6,kind:'gazebo',photo:photosFor(id,photo)[0],photos:photosFor(id,photo),description:gazeboDescriptions[i]}});
initialResources.push({id:'sauna',name:'Баня',weekday:800,weekend:800,weekendStart:6,kind:'sauna',photo:'/images/places/sauna/01.jpg',photos:photosFor('sauna','/images/sauna.jpg'),description:'Від 3 годин · 800 грн/год до 8 гостей'});
export const defaults={open:9,close:22,saunaExtra:100,extraHourly:true,hoursConfirmed:false};
export function totalPrice(r:Resource,date:string,start:number,end:number,guests:number,settings=defaults){const day=new Date(date+'T12:00:00Z').getUTCDay();const price=(day===0||day>=r.weekendStart)?r.weekend:r.weekday;const hours=end-start;return r.kind==='sauna'?(price+Math.max(0,guests-8)*settings.saunaExtra)*hours:price;}

