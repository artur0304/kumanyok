export type Resource={id:string; name:string; weekday:number; weekend:number; weekendStart:number; kind:'gazebo'|'sauna'; photo:string; description:string};
export const initialResources:Resource[] = [[1600,1800],[1600,1800],[1500,1700],[1600,1800],[2900,3400],[2000,2300],[2400,2700],[2400,2600],[1600,1600],[2400,2900]].map((p,i)=>({id:`gazebo-${i+1}`,name:`Альтанка №${i+1}`,weekday:p[0],weekend:p[1],weekendStart:i===9?5:6,kind:'gazebo',photo:'',description:'Оберіть день для відпочинку вашою компанією.'}));
initialResources.push({id:'sauna',name:'Баня',weekday:1000,weekend:1000,weekendStart:6,kind:'sauna',photo:'/images/sauna.jpg',description:'Від 3 годин · до 8 гостей у базовому тарифі'});
export const defaults={open:9,close:22,saunaExtra:100,extraHourly:false,hoursConfirmed:false};
export function totalPrice(r:Resource,date:string,start:number,end:number,guests:number,settings=defaults){const day=new Date(date+'T12:00:00Z').getUTCDay();const price=(day===0||day>=r.weekendStart)?r.weekend:r.weekday;return r.kind==='sauna'?price*(end-start)+Math.max(0,guests-8)*settings.saunaExtra*(settings.extraHourly?end-start:1):price;}

