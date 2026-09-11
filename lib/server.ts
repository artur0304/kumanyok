import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {initialResources,defaults,Resource} from './catalog';
export function db(){if(!env.DB)throw Error('База даних тимчасово недоступна');return env.DB;}
export async function catalog(){const row=await db().prepare('SELECT value FROM settings WHERE id = ?').bind('catalog').first<{value:string}>();return row?JSON.parse(row.value) as {resources:Resource[];settings:typeof defaults}:{resources:initialResources,settings:defaults};}
export async function admin(){const u=await getChatGPTUser();const allowed=(env as unknown as {ADMIN_EMAIL?:string}).ADMIN_EMAIL;return !!u&&!!allowed&&u.email.toLowerCase()===allowed.toLowerCase();}
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
export function fail(e:unknown){console.error(e);return Response.json({error:'Не вдалося виконати запит. Спробуйте ще раз або зателефонуйте адміністратору.'},{status:503});}
