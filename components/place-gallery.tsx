'use client';
import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

export function PlaceGallery({photos,name,compact=false}:{photos:string[];name:string;compact?:boolean}){
 const [index,setIndex]=useState(0),count=photos.length;
 const move=(step:number)=>setIndex(v=>(v+step+count)%count);
 return <div className={'place-gallery '+(compact?'compact':'')} onClick={e=>e.stopPropagation()}>
  <img src={photos[index]} alt={`${name} — фото ${index+1} з ${count}`} loading={compact?'lazy':'eager'} decoding='async'/>
  {count>1&&<><button type='button' className='gallery-prev' onClick={()=>move(-1)} aria-label='Попереднє фото'><ChevronLeft/></button><button type='button' className='gallery-next' onClick={()=>move(1)} aria-label='Наступне фото'><ChevronRight/></button><span className='gallery-count'>{index+1} / {count}</span></>}
 </div>
}
