import {catalog,fail} from '@/lib/server';
export async function GET(){try{return Response.json(await catalog(),{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}
