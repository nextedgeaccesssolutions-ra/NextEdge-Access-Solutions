import { getMkUser, can, logActivity } from "@/lib/marketing";
import { getSetting, setSetting } from "@/lib/settings";
import { bad, ok } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
const KEY = "neas_ai_workforce_config";
const LEVELS = ["observe", "draft", "recommend", "execute_approved"] as const;
type Config = { agents: { id:string; enabled:boolean; authority:(typeof LEVELS)[number] }[]; updatedAt:string|null };
const DEFAULT:Config = { agents:[], updatedAt:null };
export async function GET(){ const u=await getMkUser(); if(!u||!can(u,"admin")||u.tenant)return bad("NEAS administrator access required.",403); return ok(await getSetting<Config>(KEY,DEFAULT)); }
export async function POST(req:Request){
 const limited=rateLimitRequest(req,"ai-workforce-config",20,60000); if(limited)return limited;
 const u=await getMkUser(); if(!u||!can(u,"admin")||u.tenant)return bad("NEAS administrator access required.",403);
 const origin=req.headers.get("origin"); if(origin&&new URL(origin).host!==new URL(req.url).host&&new URL(origin).host!==req.headers.get("host"))return bad("Bad origin.",403);
 const b=await req.json().catch(()=>({})); if(!b||b.action!=="save"||!Array.isArray(b.agents)||b.agents.length>100)return bad("Invalid workforce configuration.");
 const seen=new Set<string>(); const agents:Config["agents"]=[];
 for(const a of b.agents){ if(!a||typeof a.id!=="string"||!/^[a-z0-9-]{2,64}$/.test(a.id)||seen.has(a.id))return bad("Invalid or duplicate agent identifier."); if(typeof a.enabled!=="boolean"||!LEVELS.includes(a.authority))return bad("Invalid agent permission setting."); seen.add(a.id); agents.push({id:a.id,enabled:a.enabled,authority:a.authority}); }
 const config:Config={agents,updatedAt:new Date().toISOString()}; await setSetting(KEY,config);
 await logActivity(u.id,"updated AI workforce permissions",agents.filter(a=>a.enabled).length+" agents enabled; external execution remains approval-gated",null,u.ws); return ok(config);
}