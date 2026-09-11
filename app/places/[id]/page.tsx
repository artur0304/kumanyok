import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,Check,Phone} from 'lucide-react';
import {initialResources} from '@/lib/catalog';
import {PlaceGallery} from '@/components/place-gallery';

export function generateStaticParams(){return initialResources.map(({id})=>({id}))}
export default async function PlacePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,place=initialResources.find(r=>r.id===id);if(!place)notFound();
 return <><header><a href='/' className='brand'>kumanyok<span>відпочинок біля води</span></a><a className='header-phone' href='tel:+380995175555'><Phone size={17}/> +380 99 517 55 55</a></header><main className='place-page'><a href='/#booking' className='back-link'><ArrowLeft/> Усі варіанти</a><div className='place-hero'><PlaceGallery photos={place.photos} name={place.name}/><div className='place-copy'><p className='eyebrow'>{place.kind==='sauna'?'ТЕПЛО ТА ВІДНОВЛЕННЯ':'ВІДПОЧИНОК БІЛЯ ВОДИ'}</p><h1>{place.name}</h1><p className='place-lead'>{place.description}</p><ul><li><Check/> Власний простір для вашої компанії</li><li><Check/> Бронювання на обрану дату</li><li><Check/> Підтвердження адміністратором</li></ul><div className='place-price'><span>від</span><strong>{place.weekday.toLocaleString('uk-UA')} ₴</strong><small> / {place.kind==='sauna'?'година':'день'}</small></div><a className='book-place' href={'/?place='+place.id+'#booking'}>Обрати дату й забронювати <ArrowUpRight/></a><p className='muted'>Передоплата від 500 грн. Остаточну суму сайт розрахує за датою, часом і кількістю гостей.</p></div></div></main><footer id='contacts'><a className='brand' href='/'>kumanyok<span>залишайте час для своїх</span></a><a className='footer-phone' href='tel:+380995175555'>+380 99 517 55 55 <ArrowUpRight/></a></footer></>
}
