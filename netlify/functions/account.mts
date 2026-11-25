import { authorize } from '../shared/auth.mjs';
const handler = async(req:Request)=>{const denied=await authorize(req);if(denied)return denied;return Response.json({ok:true,email:process.env.MCS_OWNER_EMAIL},{headers:{'Cache-Control':'no-store'}});};

export default async (req:Request)=>{const response=await handler(req);response.headers.set('Cache-Control','private, no-store');return response;};
