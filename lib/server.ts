import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {initialResources,defaults,Resource} from './catalog';
export function db(){if(!env.DB)throw Error('База даних тимчасово недоступна');return env.DB;}
export async function catalog(){const row=await db().prepare('SELECT value FROM settings WHERE id = ?').bind('catalog').first<{value:string}>();if(!row)return {resources:initialResources,settings:defaults};const saved=JSON.parse(row.value) as {resources?:Resource[];settings?:Partial<typeof defaults>};return {resources:initialResources.map(base=>({...base,...saved.resources?.find(r=>r.id===base.id),photo:base.photo,photos:base.photos})),settings:{...defaults,...saved.settings}};}
export async function admin(){const u=await getChatGPTUser();const allowed=(env as unknown as {ADMIN_EMAIL?:string}).ADMIN_EMAIL;return !!u&&!!allowed&&u.email.toLowerCase()===allowed.toLowerCase();}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
export function fail(e:unknown){console.error(e);return Response.json({error:'Не вдалося виконати запит. Спробуйте ще раз або зателефонуйте адміністратору.'},{status:503});}
