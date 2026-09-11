import {requireChatGPTUser} from '../chatgpt-auth';
import {admin} from '@/lib/server';
import AdminPanel from './panel';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');if(!await admin())return <main className='admin-page'><h1>Доступ адміністратора</h1><p>Цей обліковий запис не має доступу. Власник має вказати свою пошту в налаштуванні ADMIN_EMAIL.</p><a href='/'>На головну</a></main>;return <AdminPanel/>}
