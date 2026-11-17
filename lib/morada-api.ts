import {sha256,newTotpSecret,matchTotp,derivePassword} from "./admin-security";
import { env } from "cloudflare:workers";
import lots from "./lots.json";

type Lot = { id: string; block: string; lot: number; point: [number, number] | null; polygon: [number, number][] | null };
type Price = { id: string; block: string; lot: number; area: number; base_cents: number; discount: number; cents: number; usd_cents: number | null; currency: string; status: string; updated: string };

interface RawLotRow {
  id?: unknown;
  block?: unknown;
  lot?: unknown;
  area?: unknown;
  price?: unknown;
  basePrice?: unknown;
  base_cents?: unknown;
  discount?: unknown;
  status?: unknown;
  usdPrice?: unknown;
  confirmSoldReversal?: unknown;
}

interface ValidatedLotRow {
  id: string;
  block: string;
  lot: number;
  area: number;
  baseCents: number;
  discount: number;
  cents: number;
  currency: string;
  usdCents: number | null;
  status: string;
  updated: string;
}

const db = () => env.DB;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"same-origin" } });
const fail = (message: string, status = 400) => json({ ok: false, message }, status);
const now = () => new Date().toISOString();
const token = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
const cookie = (name: string, value: string, maxAge = 0) => `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Secure${maxAge ? `; Max-Age=${maxAge}` : "; Max-Age=0"}`;
const readCookie = (request: Request, name: string) => request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
const b64 = (bytesArray: Uint8Array) => btoa(String.fromCharCode(...bytesArray));
const bytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

async function passwordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$600000$${b64(salt)}$${b64(await derivePassword(password,salt,600000))}`;
}

async function samePassword(password: string, record: string) {
  const modern=record.startsWith('pbkdf2-sha256$');
  const parts=record.split('$'),iterations=modern?Number(parts[1]):210000;
  if(modern&&iterations!==600000)return false;
  const [saltText,hash]=modern?parts.slice(2):record.split('.');
  if(!saltText||!hash)return false;
  const a=await derivePassword(password,bytes(saltText),iterations);
  const b = bytes(hash);
  let difference=a.length^b.length;for(let i=0;i<a.length;i++)difference|=a[i]^(b[i]??0);return difference===0;
}

const SESSION_LIFETIME=90*24*60*60*1000;
async function isAdmin(request: Request) {
 const raw=readCookie(request,"morada_admin");if(!raw)return false;
 const digest=await sha256(raw),time=Date.now();
 const row=await db().prepare("SELECT token FROM sessions WHERE token=? AND expires>?").bind(digest,time).first();
 if(!row)return false;
 await db().prepare("UPDATE sessions SET last_seen=? WHERE token=?").bind(time,digest).run();return true;
}
async function auditEvent(request:Request,event:string){await db().prepare("INSERT INTO security_events(id,event,actor,created) VALUES(?,?,?,?)").bind(crypto.randomUUID(),event,(await auditActor(request)),now()).run();}
async function issueSession(request:Request){
 const raw=token(),time=Date.now();
 await db().prepare("DELETE FROM sessions WHERE expires<?").bind(time).run();
 await db().prepare("INSERT INTO sessions(token,expires,created,last_seen,agent) VALUES(?,?,?,?,?)").bind(await sha256(raw),time+SESSION_LIFETIME,time,time,(request.headers.get('user-agent')||'Dispositivo no identificado').slice(0,180)).run();
 return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie('morada_admin',raw,SESSION_LIFETIME/1000)}});
}
async function limited(key:string,max=10){const time=Date.now();await db().prepare("INSERT INTO attempts(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END").bind(key,time+900000,time,time).run();const row=await db().prepare('SELECT count FROM attempts WHERE key=?').bind(key).first<{count:number}>();return (row?.count||0)>max;}
async function mfaSetting(){const row=await db().prepare("SELECT value FROM settings WHERE key='admin_totp'").first<{value:string}>();return row?.value||'';}
async function consumeCode(key:string){const result=await db().prepare('INSERT INTO attempts(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO NOTHING').bind(key,Date.now()+86400000).run();return result.meta.changes===1;}
async function verifyMfa(code:unknown){
 const secret=await mfaSetting();if(!secret)return true;
 const counter=await matchTotp(secret,code);
 if(counter!==null)return consumeCode('used-totp:'+await sha256(secret+':'+counter));
 if(typeof code!=='string')return false;
 const normalized=code.toLowerCase().replaceAll('-','').trim();
 if(!/^[a-f0-9]{20}$/.test(normalized))return false;
 const digest=await sha256(normalized),row=await db().prepare("SELECT value FROM settings WHERE key='admin_recovery'").first<{value:string}>();
 return Boolean(row&&JSON.parse(row.value).includes(digest)&&await consumeCode('used-recovery:'+digest));
}
async function auditActor(request:Request){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(readCookie(request,"morada_admin")));
 const sessionId=Array.from(new Uint8Array(digest)).slice(0,6).map(n=>n.toString(16).padStart(2,"0")).join("");
 return "Administrador / sesión "+sessionId;
}

type SeasonalTheme={format:'la-morada-theme';version:1;id:string;name:string;colors:{accent:string;deep:string;surface:string;sky:string;background?:string};images:{hero:string;banner:string};decoration:{motif:string;animated:boolean;density:number};scene:{enabled:boolean;decorations:boolean;models:{kind:string;slot:string;scale:number}[];elements:{vegetation:string;amenities:string;trunks?:string;facades?:string;roofs?:string;furniture?:string;water?:string;commonGround?:string;surroundings?:string};style?:string;coverStrength?:string;timeOfDay?:string;weather?:string;groundCover?:string};page?:{buttonStyle:string;accents:string[]};schedule:{start:string;end:string}};
function validateTheme(input:unknown):SeasonalTheme{
 if(!input||typeof input!=='object')throw Error('Archivo de tema inválido.');
 const r=input as Record<string,unknown>,colors=r.colors as SeasonalTheme['colors'],images=r.images as SeasonalTheme['images'],decoration=r.decoration as SeasonalTheme['decoration'],scene=r.scene as SeasonalTheme['scene'],schedule=r.schedule as SeasonalTheme['schedule'];
 if(r.format!=='la-morada-theme'||r.version!==1||!/^[-a-z0-9]{1,60}$/.test(String(r.id||''))||typeof r.name!=='string'||!r.name.trim()||r.name.length>80||!colors||!images||!decoration||!scene||!schedule)throw Error('Usa la plantilla la-morada-theme versión 1.');
 for(const key of ['accent','deep','surface','sky'] as const)if(typeof colors[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(colors[key]))throw Error('Los colores deben usar seis cifras hexadecimales.');
 if(colors.background!==undefined&&!/^#[0-9a-f]{6}$/i.test(colors.background))throw Error('Color de fondo inválido.');
 const luminance=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 if(luminance(colors.surface)<.65)throw Error('Usa un fondo claro para conservar la legibilidad de la web.');
 for(const key of ['hero','banner'] as const)if(typeof images[key]!=='string'||images[key].length>310000||(images[key]&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(images[key])))throw Error('Las imágenes deben estar integradas como JPG, PNG o WebP; usa el empaquetador de temas.');
 if(!['none','stars','snow','confetti','leaves'].includes(decoration.motif)||typeof decoration.animated!=='boolean'||!Number.isInteger(decoration.density)||decoration.density<0||decoration.density>12||typeof scene.enabled!=='boolean'||typeof scene.decorations!=='boolean')throw Error('Configuración de decoración inválida.');
 const page=(r.page||{buttonStyle:'default',accents:[]}) as {buttonStyle:string;accents:string[]};
 if(!['default','pill','ticket','stone','organic'].includes(page.buttonStyle)||!Array.isArray(page.accents)||page.accents.length>3||page.accents.some(v=>!['cobwebs','zombie','flowers','ribbon'].includes(v)))throw Error('Estilo de botones o adornos de página inválidos.');
 const timeOfDay=scene.timeOfDay||'day',weather=scene.weather||'none',groundCover=scene.groundCover||'none';
 if(!['day','sunset','night'].includes(timeOfDay)||!['none','snow'].includes(weather)||!['none','snow','leaves','flowers'].includes(groundCover))throw Error('Ambientación del plano no admitida.');
 const sceneStyle=scene.style||'natural',coverStrength=scene.coverStrength||'subtle';if(!['natural','winter','autumn','spring','festive'].includes(sceneStyle)||!['subtle','balanced'].includes(coverStrength))throw Error('Diseño estacional o intensidad no admitidos.');
 const rawElements=scene.elements||{vegetation:'',amenities:''},elements:Record<string,string>={};for(const key of ['vegetation','amenities','trunks','facades','roofs','furniture','water','commonGround','surroundings']){const value=(rawElements as unknown as Record<string,unknown>)[key]??'';if(typeof value!=='string'||(value&&!/^#[0-9a-f]{6}$/i.test(value)))throw Error('Colores de elementos 3D inválidos.');elements[key]=value;}

 const models=scene.models??[];if(!Array.isArray(models)||models.length>3)throw Error('Usa hasta tres modelos temáticos.');const slots=new Set<string>();
 const cleanModels=models.map(model=>{if(!model||!['christmas-tree','gift-box','snowman','pumpkin','flag','flowers','zombie'].includes(model.kind)||!['park-north','park-center','park-south'].includes(model.slot)||slots.has(model.slot)||!Number.isFinite(model.scale)||model.scale<.5||model.scale>1.5)throw Error('Modelo, ubicación o escala fuera del catálogo compatible.');slots.add(model.slot);return {kind:model.kind,slot:model.slot,scale:model.scale};});
 for(const value of [schedule.start,schedule.end])if(typeof value!=='string'||(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)))throw Error('Fechas del tema inválidas.');
 if(schedule.start&&schedule.end&&schedule.start>schedule.end)throw Error('La fecha final debe ser posterior al inicio.');
 return {format:'la-morada-theme',version:1,id:String(r.id),name:r.name.trim(),colors:{accent:colors.accent,deep:colors.deep,surface:colors.surface,sky:colors.sky,background:colors.background||colors.surface},images:{hero:images.hero,banner:images.banner},decoration:{motif:decoration.motif,animated:decoration.animated,density:decoration.density},scene:{enabled:scene.enabled,decorations:scene.decorations,models:cleanModels,elements:elements as SeasonalTheme['scene']['elements'],style:sceneStyle,coverStrength,timeOfDay,weather,groundCover},page:{buttonStyle:page.buttonStyle,accents:[...new Set(page.accents)]},schedule:{start:schedule.start,end:schedule.end}};
}
async function themeConfig(){const row=await db().prepare("SELECT value FROM settings WHERE key='themes'").first<{value:string}>();return {raw:row?.value||'',config:row?JSON.parse(row.value):{revision:'',activeId:'',themes:[]}};}
async function activeTheme(){const {config}=await themeConfig();const theme=(config.themes as SeasonalTheme[]).find(t=>t.id===config.activeId);if(!theme)return null;const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return (!theme.schedule.start||theme.schedule.start<=today)&&(!theme.schedule.end||theme.schedule.end>=today)?theme:null;}

type Promotion={id:string;name:string;code:string;kind:'percent'|'fixed';percent:number;pen:number|null;usd:number|null;blocks:string[];lotIds:string[];start:string;end:string;active:boolean;terms:string;payment:'any'|'cash'|'installments';maxUses:number|null;used?:number};
function validatePromotions(input:unknown):Promotion[]{
 if(!Array.isArray(input)||input.length>100)throw Error('Admite hasta 100 promociones.');
 const ids=new Set<string>(),codes=new Set<string>();
 return input.map(raw=>{
  if(!raw||typeof raw!=='object')throw Error('Promoción inválida.');
  const r=raw as Record<string,unknown>,id=String(r.id||''),name=String(r.name||'').trim(),code=String(r.code||'').trim().toUpperCase(),kind=r.kind==='fixed'?'fixed':'percent';
  const payment=r.payment===undefined?'any':String(r.payment),maxUses=r.maxUses===undefined||r.maxUses===null||r.maxUses===''?null:Number(r.maxUses);
  if(!['any','cash','installments'].includes(payment)||(maxUses!==null&&(!code||!Number.isSafeInteger(maxUses)||maxUses<1||maxUses>1000000)))throw Error('Forma de pago o límite de usos inválido.');
  const percent=Number(r.percent||0),pen=r.pen===null||r.pen===''?null:Number(r.pen),usd=r.usd===null||r.usd===''?null:Number(r.usd);
  const blocks=Array.isArray(r.blocks)?[...new Set(r.blocks.map(String))]:[],lotIds=Array.isArray(r.lotIds)?[...new Set(r.lotIds.map(String))]:[];
  const start=String(r.start||''),end=String(r.end||''),terms=String(r.terms||'').trim();
  const validDate=(d:string)=>!d||(/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d);
  const validMoney=(n:number|null)=>n===null||(Number.isFinite(n)&&n>0&&Number.isSafeInteger(Math.round(n*100))&&Math.abs(n*100-Math.round(n*100))<.00001);
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||ids.has(id)||!name||name.length>100||terms.length>1000||typeof r.active!=='boolean'||(code&&!/^[A-Z0-9_-]{3,32}$/.test(code))||(code&&codes.has(code))||!validDate(start)||!validDate(end)||(start&&end&&start>end)||blocks.some(b=>!lots.some(l=>l.block===b)||['B','I'].includes(b))||lotIds.some(id=>!lots.some(l=>l.id===id)||/^[BI]-/.test(id))||(blocks.length&&lotIds.length))throw Error('Revisa nombre, código único, fechas y alcance. B e I no admiten promociones.');
  if(kind==='percent'&&(!Number.isFinite(percent)||percent<=0||percent>=100||Math.abs(percent*100-Math.round(percent*100))>.00001))throw Error('El porcentaje debe ser mayor a 0 y menor a 100, con hasta 2 decimales.');
  if(kind==='fixed'&&(!validMoney(pen)||!validMoney(usd)||(pen===null&&usd===null)))throw Error('Define al menos un importe positivo, con hasta 2 decimales.');
  ids.add(id);if(code)codes.add(code);
  return {id,name,code,kind,percent:kind==='percent'?percent:0,pen:kind==='fixed'?pen:null,usd:kind==='fixed'?usd:null,blocks,lotIds,start,end,active:r.active,terms,payment:payment as Promotion['payment'],maxUses};
 });
}
async function promotionConfig(){
 const row=await db().prepare("SELECT value FROM settings WHERE key='promotions'").first<{value:string}>();const config=row?JSON.parse(row.value):{revision:'',rules:[]};
 if(config.rules.length){const usage=await db().prepare("SELECT promotion_id,COUNT(*) AS used FROM leads WHERE promotion_id<>'' GROUP BY promotion_id").all<{promotion_id:string;used:number}>();const counts=new Map(usage.results.map(r=>[r.promotion_id,r.used]));config.rules=config.rules.map((r:Promotion)=>({...r,payment:r.payment||'any',maxUses:r.maxUses??null,used:counts.get(r.id)||0}));}
 return {raw:row?.value||'',config};
}
function promotionQuote(rules:Promotion[],price:Price,currency:string,code:string,payment='any'){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const amount=currency==='USD'?price.usd_cents!:price.cents;
 const eligible=rules.filter(r=>r.active&&(!r.payment||r.payment==='any'||r.payment===payment)&&(r.maxUses==null||(r.used||0)<r.maxUses)&&(!r.start||r.start<=today)&&(!r.end||r.end>=today)&&(!r.blocks.length||r.blocks.includes(price.block))&&(!r.lotIds.length||r.lotIds.includes(price.id)));
 const saving=(r:Promotion)=>r.kind==='percent'?Math.round(amount*r.percent/100):Math.round((currency==='USD'?r.usd||0:r.pen||0)*100);
 const valid=eligible.filter(r=>saving(r)>0&&saving(r)<amount);
 if(code&&!valid.some(r=>r.code===code))throw Error('El cupón no está vigente, alcanzó su límite o no aplica a este lote, moneda y forma de pago.');
 const candidates=valid.filter(r=>!r.code||r.code===code).sort((a,b)=>saving(b)-saving(a)||a.id.localeCompare(b.id));
 const best=candidates[0],discount=best?saving(best):0;
 return {listPrice:amount/100,total:(amount-discount)/100,savings:discount/100,discount:best?.kind==='percent'?best.percent:0,promotion:best?{id:best.id,name:best.name,terms:best.terms,end:best.end,couponApplied:Boolean(best.code),payment:best.payment||'any'}:null};
}

async function catalog(privateView=false) {
 const result=await db().prepare('SELECT * FROM prices').all<Price>();const prices=new Map(result.results.map(row=>[row.id,row]));
 const {config}=await promotionConfig();
 return (lots as Lot[]).map(lot=>{
  const blocked=['B','I'].includes(lot.block),row=prices.get(lot.id);
  if(blocked||!row)return {...lot,blocked,price:null};
  if(privateView)return {...lot,blocked,price:row};
  if(row.status==='sold')return {...lot,blocked,price:{...row,cents:null,usd_cents:null,base_cents:null}};
  return {...lot,blocked,price:{...row,offer_pen:row.status==='available'?promotionQuote(config.rules,row,'PEN',''):null,offer_usd:row.status==='available'&&row.usd_cents!==null?promotionQuote(config.rules,row,'USD',''):null,offer_cash_pen:row.status==='available'?promotionQuote(config.rules,row,'PEN','','cash'):null,offer_cash_usd:row.status==='available'&&row.usd_cents!==null?promotionQuote(config.rules,row,'USD','','cash'):null}};
 });
}

async function leadReceipt(id:string,name:string,email:string,phone:string) {
  const lead = await db().prepare('SELECT id,name,email,phone,ticket_json,advisor_id,advisor_name FROM leads WHERE id=?').bind(id).first<{id:string;name:string;email:string;phone:string;ticket_json:string;advisor_id:string;advisor_name:string}>();
  if (!lead) return null;
  if (lead.name!==name || lead.email!==email || lead.phone!==phone) return fail('Esta solicitud ya fue registrada con otros datos. Inicia una nueva consulta.',409);
  const ticket = lead.ticket_json ? JSON.parse(lead.ticket_json).text : '';
  return json({ok:true,id:lead.id,ticket,advisor:lead.advisor_id?{id:lead.advisor_id,name:lead.advisor_name}:null,whatsappUrl:ticket?'https://wa.me/51966030329?text='+encodeURIComponent(ticket):null});
}

function validateRow(raw: RawLotRow): ValidatedLotRow | null {
  const blockPart = typeof raw.block === "string" ? raw.block : "";
  const lotPart = raw.lot !== undefined ? String(raw.lot).padStart(2, "0") : "";
  const rawId = typeof raw.id === "string" && raw.id ? raw.id : (blockPart && lotPart ? `${blockPart}-${lotPart}` : "");
  const id = rawId.toUpperCase();
  const lot = (lots as Lot[]).find(x => x.id === id);
  if (lot && ["B","I"].includes(lot.block)) return null;

  const area = Number(raw.area);
  const rawBaseCents = typeof raw.base_cents === "number" ? raw.base_cents / 100 : undefined;
  const price = Number(raw.price ?? raw.basePrice ?? rawBaseCents);
  const discount = Number(raw.discount ?? 0);
  const status = String(raw.status ?? "available").toLowerCase();

  if (!lot || !Number.isFinite(area) || area <= 0 || area > 1000000 || raw.price === "" || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(Math.round(price*100)) || Math.abs(price*100-Math.round(price*100))>0.00001 || !Number.isFinite(discount) || discount < 0 || discount > 100 || !["available", "separated", "sold"].includes(status)) {
    return null;
  }

  const baseCents = Math.round(price * 100);
  return {
    id,
    block: lot.block,
    lot: lot.lot,
    area,
    baseCents,
    discount: 0,
    cents: baseCents,
    usdCents: raw.usdPrice === undefined || raw.usdPrice === "" || raw.usdPrice === null ? null : Math.round(Number(raw.usdPrice) * 100),
    currency: "PEN",
    status,
    updated: now()
  };
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

async function saveRows(rows: RawLotRow[], actor: string) {
  const normalized = rows.map(validateRow).filter(isNotNull);
  if (rows.length>200 || new Set(normalized.map(r=>r.id)).size!==normalized.length) throw new Error("El archivo contiene demasiadas filas o lotes duplicados.");
  if (normalized.length !== rows.length) throw new Error("Hay filas inválidas. No se guardó ningún cambio.");
  if (normalized.some(r => r.usdCents !== null && (!Number.isSafeInteger(r.usdCents) || r.usdCents < 0))) throw new Error("Precio en dólares inválido.");
  if (!normalized.length) throw new Error("No encontramos filas válidas. Usa manzana, lote, área, precio, descuento y estado.");
  const statements: D1PreparedStatement[] = [];
  for (const row of normalized) {
    const old = await db().prepare("SELECT * FROM prices WHERE id=?").bind(row.id).first<Price>();
    const input = rows.find(r => String(r.id).toUpperCase() === row.id);
    if (old?.status === "sold" && row.status !== "sold" && input?.confirmSoldReversal !== true) throw new Error(`El lote ${row.id} está vendido. Confirma expresamente su reapertura.`);
    statements.push(db().prepare("INSERT INTO price_history (id,lot_id,created,actor,before_json,after_json) VALUES (?,?,?,?,(SELECT json_object('id',id,'cents',cents,'usd_cents',usd_cents,'status',status,'area',area,'updated',updated) FROM prices WHERE id=?),?)").bind(crypto.randomUUID(),row.id,now(),actor,row.id,JSON.stringify(row)));
    statements.push(db().prepare("INSERT INTO prices (id,block,lot,area,base_cents,discount,cents,usd_cents,currency,status,updated,reopen_confirmed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET area=excluded.area,base_cents=excluded.base_cents,discount=excluded.discount,cents=excluded.cents,usd_cents=excluded.usd_cents,currency=excluded.currency,status=excluded.status,updated=excluded.updated,reopen_confirmed=excluded.reopen_confirmed").bind(row.id,row.block,row.lot,row.area,row.baseCents,0,row.cents,row.usdCents,"PEN",row.status,row.updated,input?.confirmSoldReversal===true?1:0));
  }
  statements.push(db().prepare("INSERT INTO revisions (id,created,rows,user) VALUES (?,?,?,?)").bind(crypto.randomUUID(),now(),normalized.length,actor));
  await db().batch(statements);
  return normalized.length;
}

async function handleGet(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/asesores')) {
    const code = url.searchParams.get('ref');
    if (code !== null) {
      if (!/^[a-f0-9]{32}$/.test(code)) return fail('Enlace de asesor inválido.',404);
      const advisor = await db().prepare('SELECT id,name FROM advisors WHERE id=? AND active=1 AND deleted=0').bind(code).first();
      return advisor ? json({ok:true,advisor}) : fail('Este enlace de asesor ya no está activo.',404);
    }
    if (!await isAdmin(request)) return json({ok:false,sessionExpired:true,message:'Inicia sesión para administrar asesores.'},401);
    const result = await db().prepare(`SELECT a.*,
      (SELECT COUNT(*) FROM leads l WHERE l.advisor_id=a.id) AS clients,
      (SELECT COUNT(*) FROM leads l WHERE l.advisor_id=a.id AND l.stage='new') AS new_clients
      FROM advisors a WHERE a.deleted=0 ORDER BY a.name,a.id`).all();
    const report = await db().prepare(`SELECT COALESCE(a.id,l.advisor_id,'') AS id,
      COALESCE(a.name, NULLIF(MAX(l.advisor_name),''),'Atención directa') AS name,
      COALESCE(a.deleted,0) AS deleted,COALESCE(a.active,0) AS active,
      COUNT(l.id) AS requests,COUNT(DISTINCT lower(l.email)) AS clients,
      COALESCE(SUM(l.stage='new'),0) AS new_clients,
      COALESCE(SUM(l.stage='contacted'),0) AS contacted,
      COALESCE(SUM(l.stage='visit'),0) AS visits,
      COALESCE(SUM(l.stage='closed'),0) AS closed
      FROM (SELECT id,name,active,deleted FROM advisors
        UNION ALL SELECT '', 'Atención directa',1,0) a
      LEFT JOIN leads l ON l.advisor_id=a.id GROUP BY a.id ORDER BY requests DESC,name`).all();
    return json({ok:true,items:result.results,report:report.results});
  }
  if (url.pathname.endsWith("/config")) {
    const row=await db().prepare("SELECT value FROM settings WHERE key='site_config'").first<{value:string}>();
    return json({ok:true,config:{...(row?JSON.parse(row.value):{}),theme:await activeTheme()}});
  }
  if (url.pathname.endsWith("/contenido")) {
    const admin = url.searchParams.get("scope")==="admin" && await isAdmin(request);
    if(url.searchParams.get("scope")==="admin" && !admin)return json({ok:false,sessionExpired:true,message:"Tu sesión venció. Vuelve a ingresar."},401);
    const result = await db().prepare(admin ? "SELECT * FROM content ORDER BY created DESC LIMIT 20" : "SELECT * FROM content WHERE published=1 ORDER BY created DESC LIMIT 20").all();
    return json({ok:true,items:result.results});
  }
  if (url.pathname.endsWith("/historial")) {
    if (!(await isAdmin(request))) return json({ok:false,sessionExpired:true,message:"Tu sesión venció. Vuelve a ingresar."},401);
    return json({ok:true,items:(await db().prepare("SELECT * FROM price_history ORDER BY created DESC LIMIT 100").all()).results});
  }
  if (url.pathname.endsWith("/clientes")) {
    if (!(await isAdmin(request))) return json({ok:false,sessionExpired:true,message:"Tu sesión venció. Vuelve a ingresar."},401);
    return json({ok:true,items:(await db().prepare("SELECT * FROM leads ORDER BY created DESC LIMIT 200").all()).results});
  }
  if (url.pathname.endsWith("/catalogo")) return json({ ok: true, lots: await catalog() });
  if (url.pathname.endsWith("/admin")) {
    if (url.searchParams.get('view') === 'activity') {
      if (!await isAdmin(request)) return json({ok:false,sessionExpired:true,message:'Tu sesión venció. Vuelve a ingresar.'},401);
      const cursor = (key:string) => Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number(url.searchParams.get(key))||0));
      const initial = !url.searchParams.has('leads');
      const sources = [
        {key:'leads',table:'leads',fields:'rowid AS cursor,id,name,advisor_name,created'},
        {key:'events',table:'security_events',fields:'rowid AS cursor,id,event,actor,created'},
        {key:'revisions',table:'revisions',fields:'rowid AS cursor,id,rows,created'},
      ];
      const activity:Record<string,unknown> = {};
      const cursors:Record<string,number> = {};
      for (const source of sources) {
        const result = initial ? [] : (await db().prepare(`SELECT ${source.fields} FROM ${source.table} WHERE rowid>? ORDER BY rowid LIMIT 30`).bind(cursor(source.key)).all<{cursor:number}>()).results;
        activity[source.key] = result;
        cursors[source.key] = initial ? (await db().prepare(`SELECT COALESCE(MAX(rowid),0) AS cursor FROM ${source.table}`).first<{cursor:number}>())!.cursor : result.at(-1)?.cursor ?? cursor(source.key);
      }
      return json({ok:true,activity,cursors});
    }
    const passwordSet = Boolean(await db().prepare("SELECT value FROM settings WHERE key='admin_password'").first());
    const authenticated = await isAdmin(request);
    if(url.searchParams.get('view')==='themes'){
      if(!authenticated)return json({ok:false,sessionExpired:true,message:'Tu sesión venció. Vuelve a ingresar.'},401);
      return json({ok:true,...(await themeConfig()).config});
    }
    if(url.searchParams.get('view')==='promotions'){
      if(!authenticated)return json({ok:false,sessionExpired:true,message:'Tu sesión venció. Vuelve a ingresar.'},401);
      const {config}=await promotionConfig();return json({ok:true,...config});
    }
    if(url.searchParams.get('view')==='security'){
      if(!authenticated)return json({ok:false,sessionExpired:true,message:'Tu sesión venció. Vuelve a ingresar.'},401);
      const active=await db().prepare('SELECT created,last_seen,agent,expires,token FROM sessions WHERE expires>? ORDER BY created DESC').bind(Date.now()).all<{created:number;last_seen:number;agent:string;expires:number;token:string}>();
      const current=await sha256(readCookie(request,'morada_admin'));
      return json({ok:true,mfaEnabled:Boolean(await mfaSetting()),sessionDays:90,sessions:active.results.map(row=>({created:row.created,lastSeen:row.last_seen,expires:row.expires,agent:row.agent,current:row.token===current})),events:(await db().prepare('SELECT event,actor,created FROM security_events ORDER BY created DESC LIMIT 50').all()).results});
    }
    return json({ ok: true, authenticated, passwordSet, mfaEnabled:authenticated?Boolean(await mfaSetting()):undefined, catalog: authenticated ? await catalog(true) : [] });
  }
  return fail("Ruta no encontrada", 404);
}

async function handlePost(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin) return fail("Origen de solicitud no permitido.",403);
  if(request.headers.get("Sec-Fetch-Site")==="cross-site")return fail("Origen no permitido.",403);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("Usa JSON.",415);
  if (Number(request.headers.get("content-length") || 0) > 1000000) return fail("Solicitud demasiado grande.",413);
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > 1000000) return fail("Solicitud demasiado grande.",413);
    const parsed=JSON.parse(text);
    if(!parsed || typeof parsed!=="object" || Array.isArray(parsed)) return fail("Solicitud inválida.");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("Solicitud inválida");
  }

  if (url.pathname.endsWith('/asesores')) {
    if (!await isAdmin(request)) return json({ok:false,sessionExpired:true,message:'Inicia sesión para administrar asesores.'},401);
    if (body.action==='delete') {
      const id=String(body.id||'');
      const advisor=await db().prepare('SELECT id,name FROM advisors WHERE id=? AND deleted=0').bind(id).first<{id:string;name:string}>();
      if(!advisor)return fail('Asesor no encontrado.',404);
      await db().prepare('UPDATE advisors SET active=0,deleted=1,updated=? WHERE id=?').bind(now(),id).run();
      await auditEvent(request,'Enlace de asesor eliminado: '+advisor.name);
      return json({ok:true});
    }
    const name = String(body.name||'').trim();
    const id = body.id === undefined ? crypto.randomUUID().replaceAll('-','') : String(body.id);
    if (!/^[a-f0-9]{32}$/.test(id) || !name || name.length>100 || typeof body.active!=='boolean') return fail('Escribe el nombre del asesor, de hasta 100 caracteres.');
    if (body.id !== undefined && !await db().prepare('SELECT id FROM advisors WHERE id=? AND deleted=0').bind(id).first()) return fail('Asesor no encontrado.',404);
    const updated = now();
    await db().prepare('INSERT INTO advisors(id,name,active,created,updated) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active,updated=excluded.updated').bind(id,name,body.active?1:0,updated,updated).run();
    await auditEvent(request,'Asesor '+(body.active?'activo':'desactivado')+': '+name);
    return json({ok:true,id});
  }

  if (url.pathname.endsWith("/config")) {
    if (!(await isAdmin(request))) return json({ok:false,sessionExpired:true,message:"Tu sesión venció. Vuelve a ingresar."},401);
    const ga4=String(body.ga4||""),pixel=String(body.pixel||""),verification=String(body.verification||"");
    if ((ga4&&!/^G-[A-Z0-9]{4,20}$/.test(ga4))||(pixel&&!/^\d{5,25}$/.test(pixel))||(verification&&!/^[A-Za-z0-9_-]{10,200}$/.test(verification)))return fail("Identificadores de integración inválidos.");
    await db().prepare("INSERT INTO settings (key,value) VALUES ('site_config',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({ga4,pixel,verification})).run();
    return json({ok:true});
  }
  if (url.pathname.endsWith("/clientes")) {
    if(body.action==='update'){
      if(!(await isAdmin(request)))return json({ok:false,sessionExpired:true,message:'Tu sesión venció. Vuelve a ingresar.'},401);
      const id=String(body.id||''),stage=String(body.stage||''),notes=String(body.notes||'').trim();
      if(!['new','contacted','visit','closed'].includes(stage)||notes.length>2000)return fail('Estado o notas inválidos.');
      if(!await db().prepare('SELECT id FROM leads WHERE id=?').bind(id).first())return fail('Solicitud no encontrada',404);
      await db().prepare('UPDATE leads SET stage=?,notes=?,updated=? WHERE id=?').bind(stage,notes,now(),id).run();await auditEvent(request,'Solicitud actualizada');return json({ok:true});
    }
    const name=String(body.name||"").trim(), email=String(body.email||"").trim(), phone=String(body.phone||"").trim();
    if (!name || name.length>120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || phone.length>40 || body.consent!==true) return fail("Completa tus datos y autoriza la atención de tu solicitud.");
    const id=String(body.lotId||"");
    if (/^[BI]-/.test(id)) return fail("Esta manzana está fuera de venta.",409);
    if(id && !(lots as Lot[]).some(l=>l.id===id))return fail("Lote no reconocido.");
    if(body.purpose==="hold"){
      const lotPrice=await db().prepare("SELECT status FROM prices WHERE id=?").bind(id).first<{status:string}>();
      if(lotPrice?.status!=="available")return fail("El lote no tiene disponibilidad confirmada para solicitar separación.",409);
    }
    const requestId=typeof body.requestId==="string"&&/^[a-f0-9-]{36}$/i.test(body.requestId)?body.requestId:crypto.randomUUID();
    const receipt=await leadReceipt(requestId,name,email,phone);
    if(receipt)return receipt;
    const referral=String(body.ref||'');
    const advisor=referral&&/^[a-f0-9]{32}$/.test(referral)?await db().prepare('SELECT id,name FROM advisors WHERE id=? AND active=1 AND deleted=0').bind(referral).first<{id:string;name:string}>():null;
    const currency=body.currency==='USD'?'USD':'PEN';
    let verifiedQuote:(ReturnType<typeof promotionQuote>&{area:number})|null=null;
    let promotionId='',promotionLimit:number|null=null;
    let promotionMessage='';if(body.coupon&&!id)return fail('Selecciona un lote para aplicar un cupón.');
    if(id){const price=await db().prepare('SELECT * FROM prices WHERE id=?').bind(id).first<Price>();if(price?.status==='available'&&(body.currency!=='USD'||price.usd_cents!==null)){try{const {config}=await promotionConfig();const q=promotionQuote(config.rules,price,body.currency==='USD'?'USD':'PEN',String(body.coupon||'').trim().toUpperCase(),body.paymentMethod==='cash'?'cash':body.paymentMethod==='installments'?'installments':'any');verifiedQuote={...q,area:price.area};if(q.promotion){promotionId=q.promotion.id;promotionLimit=(config.rules as Promotion[]).find(r=>r.id===promotionId)?.maxUses??null;}if(q.promotion)promotionMessage=`\nPromoción verificada al solicitar: ${q.promotion.name}. Moneda: ${body.currency==='USD'?'USD':'PEN'}. Precio publicado: ${q.listPrice}. Descuento: ${q.savings}. Total referencial: ${q.total}. Condiciones: ${q.promotion.terms}. Vigencia: ${q.promotion.end||'sin fecha final'}.`; }catch{return fail('El cupón o promoción cambió. Revisa tu cotización antes de enviar.',409);}}else if(body.coupon)return fail('No se puede aplicar el cupón a este lote.',409);}
    const key="lead:"+(request.headers.get("CF-Connecting-IP")||"local");
    await db().prepare("INSERT INTO attempts (key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN excluded.until ELSE until END").bind(key,Date.now()+3600000,Date.now(),Date.now()).run();
    if (((await db().prepare("SELECT count FROM attempts WHERE key=?").bind(key).first<{count:number}>())?.count||0)>10) return fail("Límite de solicitudes alcanzado. Inténtalo más tarde.",429);
    const created=now();
    const downPct=[30,40,50,70].includes(Number(body.downPct))?Number(body.downPct):30;
    const months=[12,24,36].includes(Number(body.months))?Number(body.months):36;
    const money=(amount:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency}).format(amount);
    const lines=[
      'LA MORADA · TICKET DE SOLICITUD',
      'Ticket: '+requestId,
      'Fecha: '+new Date(created).toLocaleString('es-PE',{timeZone:'America/Lima'}),
      'Solicitud: '+(body.purpose==='hold'?'Separación':id?'Cotización':'Visita o información'),
      'Nombre: '+name,'Correo: '+email,'Teléfono: '+(phone||'No indicado'),
      'Asesor: '+(advisor?.name||'Atención directa'),
      advisor?'Referencia de asesor: '+advisor.id:'',
      id?'Lote: '+id:'',
      verifiedQuote?'Área: '+verifiedQuote.area+' m²':'',
      verifiedQuote?'Precio de lista: '+money(verifiedQuote.listPrice):id?'Precio por confirmar con el equipo':'',
      verifiedQuote?.savings?'Descuento: '+money(verifiedQuote.savings):'',
      verifiedQuote?'Precio final: '+money(verifiedQuote.total):'',
      verifiedQuote?.promotion?'Promoción: '+verifiedQuote.promotion.name+' · '+verifiedQuote.promotion.terms:'',
      verifiedQuote?.promotion?.end?'Vigencia: '+verifiedQuote.promotion.end:'',
      body.paymentMethod==='cash'?'Forma de pago: Al contado':body.paymentMethod==='installments'?'Forma de pago: En cuotas':'',
      verifiedQuote&&body.paymentMethod==='installments'?'Inicial estimada ('+downPct+'%): '+money(verifiedQuote.total*downPct/100):'',
      verifiedQuote&&body.paymentMethod==='installments'?'Cuota estimada ('+months+' meses): '+money(verifiedQuote.total*(1-downPct/100)/months):'',
      'Consulta: '+(String(body.message||'').slice(0,1000)||'Deseo coordinar mi cotización y las condiciones de pago.'),
      'Solicitud registrada con autorización de contacto. Disponibilidad, separación y condiciones de pago sujetas a confirmación del equipo.',
    ];
    const ticket=JSON.stringify({text:lines.filter(Boolean).join('\n'),quote:verifiedQuote,paymentMethod:body.paymentMethod,downPct,months});
    const inserted=await db().prepare("INSERT INTO leads (id,name,email,phone,lot_id,currency,message,created,consent_version,promotion_id,advisor_id,advisor_name,ticket_json) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (? IS NULL OR (SELECT COUNT(*) FROM leads WHERE promotion_id=?) < ?) ON CONFLICT(id) DO NOTHING").bind(requestId,name,email,phone,id,currency,(body.purpose==="hold"?"Solicitud de separación: ":"Cotización: ")+(body.paymentMethod==="cash"?"Pago al contado. ":body.paymentMethod==="installments"?"Pago en cuotas. ":"")+(String(body.message||"").slice(0,1000)+promotionMessage).slice(0,2000),created,"solicitud-v1",promotionId,advisor?.id||'',advisor?.name||'',ticket,promotionLimit,promotionId,promotionLimit).run();
    if(!inserted.meta.changes){const existing=await leadReceipt(requestId,name,email,phone);if(existing)return existing;return fail('El cupón alcanzó su límite de usos. Revisa tu cotización.',409);}
    return (await leadReceipt(requestId,name,email,phone))!;
  }
  if (url.pathname.endsWith("/contenido")) {
    if (!(await isAdmin(request))) return json({ok:false,sessionExpired:true,message:"Tu sesión venció. Vuelve a ingresar."},401);
    if(body.action==="trash"||body.action==="restore"){
      const id=String(body.id||"");if(!id||id.length>120)return fail("Publicación inválida.");
      const item=await db().prepare("SELECT id FROM content WHERE id=?").bind(id).first();if(!item)return fail("Publicación no encontrada.",404);
      await db().prepare("UPDATE content SET published=? WHERE id=?").bind(body.action==="trash"?-1:0,id).run();
      await auditEvent(request,body.action==="trash"?'Publicación enviada a papelera':'Publicación restaurada');
      return json({ok:true});
    }
    const title=String(body.title||"").trim(), text=String(body.text||"").trim(), image=String(body.image||"");
    if (!title || title.length>180 || text.length>10000 || image.length>500000 || (image && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) return fail("Título o imagen inválidos. Usa JPG, PNG o WebP de hasta 350 KB.");
    if(body.kind==="owner" && body.imageConsent!==true) return fail("Confirma la autorización de publicación de la fotografía.");
    const id=typeof body.id==="string"?body.id:crypto.randomUUID();
    await db().prepare("INSERT INTO content (id,kind,title,body,image,published,created) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,image=excluded.image,published=excluded.published").bind(id,body.kind==="owner"?"owner":"news",title,text,image,body.published===true?1:0,now()).run();
    return json({ok:true,id});
  }
  if (url.pathname.endsWith("/cotizar")) {
    const requestedLot = (lots as Lot[]).find(l => l.id === String(body.id ?? "").toUpperCase());
    if (requestedLot && ["B","I"].includes(requestedLot.block)) return fail("Esta manzana está fuera de venta.",409);
    const price = await db().prepare("SELECT * FROM prices WHERE id=?").bind(String(body.id ?? "").toUpperCase()).first<Price>();
    if (!price) return fail("Este lote aún no tiene una cotización publicada.", 404);
    if (price.status !== "available") return fail(price.status === "sold" ? "Este lote ya fue vendido." : "Este lote está separado.", 409);
    const currency = body.currency === "USD" ? "USD" : "PEN";
    if (currency === "USD" && price.usd_cents === null) return fail("Precio en dólares pendiente de publicación.",409);
    const amount = currency === "USD" ? price.usd_cents! : price.cents;
    if(await limited('quote:'+(request.headers.get('CF-Connecting-IP')||'local'),100))return fail('Demasiadas consultas. Inténtalo más tarde.',429);
    const code=String(body.coupon||'').trim().toUpperCase();if(code.length>32)return fail('Cupón inválido.');
    try{const {config}=await promotionConfig();return json({ok:true,quote:{id:price.id,area:price.area,currency,...promotionQuote(config.rules,price,currency,code,body.paymentMethod==='cash'?'cash':body.paymentMethod==='installments'?'installments':'any')}});}catch(error){return fail(error instanceof Error?error.message:'No se pudo validar la promoción.');}
  }

  if (!url.pathname.endsWith("/admin")) return fail("Ruta no encontrada", 404);

  const action = body.action;
  for(const value of [body.password,body.currentPassword])if(value!==undefined&&(typeof value!=="string"||value.length>1024))return fail("Credenciales inválidas.");
  const passwordSetting = await db().prepare("SELECT value FROM settings WHERE key='admin_password'").first<{ value: string }>();

  if (action === "setup") {
    const setupSecret = (env as unknown as { ADMIN_SETUP_TOKEN?: string }).ADMIN_SETUP_TOKEN;
    const localActivation = await db().prepare("SELECT value FROM settings WHERE key='local_activation'").first<{value:string}>();
    let authorized = Boolean(setupSecret && body.setupToken === setupSecret);
    if (!authorized && import.meta.env.DEV && ["127.0.0.1","localhost"].includes(url.hostname) && localActivation && typeof body.setupToken === "string") {
      const activation=JSON.parse(localActivation.value) as {hash:string;expires:number};
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(body.setupToken)))).map(v=>v.toString(16).padStart(2,"0")).join("");
      authorized=Date.now()<activation.expires && digest===activation.hash;
    }
    if (!authorized) return fail("La clave de activación es incorrecta o venció.",403);
    if (passwordSetting) return fail("La contraseña ya fue configurada.", 409);
    if (typeof body.password !== "string" || body.password.length < 12) return fail("La contraseña debe tener al menos 12 caracteres.");
    await db().prepare("INSERT INTO settings (key,value) VALUES ('admin_password',?)").bind(await passwordRecord(body.password)).run();
    await db().prepare("DELETE FROM settings WHERE key='local_activation'").run();
    await auditEvent(request,'Acceso administrativo configurado');return issueSession(request);
  }

  if (action === "login") {
    const key='login:'+(request.headers.get('CF-Connecting-IP')||'local');
    if(await limited(key))return fail('Demasiados intentos. Espera 15 minutos.',429);
    if(!passwordSetting||typeof body.password!=='string'||!await samePassword(body.password,passwordSetting.value)){await auditEvent(request,'Intento de acceso rechazado');return fail('Credenciales incorrectas.',401);}
    if(!await verifyMfa(body.code)){await auditEvent(request,'Segundo factor rechazado');return json({ok:false,mfaRequired:true,message:'Introduce un código nuevo de tu autenticador o un código de recuperación.'},401);}
    await db().prepare('DELETE FROM attempts WHERE key=?').bind(key).run();await auditEvent(request,'Inicio de sesión');return issueSession(request);
  }

  if (action === "logout") {
    await db().prepare("DELETE FROM sessions WHERE token=?").bind(await sha256(readCookie(request,"morada_admin"))).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": cookie("morada_admin", "") } });
  }

  if (!(await isAdmin(request))) return json({ok:false,sessionExpired:true,message:"Tu sesión venció. Vuelve a ingresar."},401);

  if(action==='themes-save'){
    if(!Array.isArray(body.themes)||body.themes.length>12)return fail('La biblioteca admite hasta 12 temas.');
    let themes:SeasonalTheme[];try{themes=body.themes.map(validateTheme);}catch(error){return fail(error instanceof Error?error.message:'Tema inválido.');}
    const ids=new Set(themes.map(t=>t.id)),activeId=String(body.activeId||'');
    if(ids.size!==themes.length||(activeId&&!ids.has(activeId))||JSON.stringify(themes).length>850000)return fail('Identificadores duplicados o biblioteca demasiado grande. Usa imágenes WebP más ligeras.');
    const {raw,config}=await themeConfig();if(String(body.revision||'')!==config.revision)return fail('Otra sesión cambió los temas. Recarga antes de guardar.',409);
    const next={revision:crypto.randomUUID(),activeId,themes,updated:now()};
    const result=await db().prepare("INSERT INTO settings(key,value) VALUES('themes',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value=?").bind(JSON.stringify(next),raw).run();
    if(!result.meta.changes)return fail('La biblioteca cambió. Recarga antes de guardar.',409);
    await auditEvent(request,activeId?'Tema seleccionado: '+activeId:'Diseño normal restaurado');return json({ok:true,...next});
  }
  if(action==='promotions-save'){
    let rules:Promotion[];try{rules=validatePromotions(body.rules);}catch(error){return fail(error instanceof Error?error.message:'Promoción inválida.');}
    const {raw,config}=await promotionConfig();if(String(body.revision||'')!==config.revision)return fail('Otra sesión modificó las promociones. Recarga antes de guardar.',409);
    const next={revision:crypto.randomUUID(),rules,updated:now(),actor:await auditActor(request)};
    const result=await db().prepare("INSERT INTO settings(key,value) VALUES('promotions',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value=?").bind(JSON.stringify(next),raw).run();
    if(!result.meta.changes)return fail('Las promociones cambiaron. Recarga antes de guardar.',409);
    await auditEvent(request,'Promociones actualizadas: '+rules.length+' reglas. Revisión '+next.revision);
    return json({ok:true,...(await promotionConfig()).config});
  }
  if(action==='ping')return json({ok:true});
  if(action==='revoke-others'){
    await db().prepare('DELETE FROM sessions WHERE token<>?').bind(await sha256(readCookie(request,'morada_admin'))).run();await auditEvent(request,'Otras sesiones revocadas');return json({ok:true});
  }
  if(action==='mfa-enable'){
    if(await mfaSetting())return fail('El segundo factor ya está activo.',409);
    const key='mfa_pending:'+await sha256(readCookie(request,'morada_admin'));
    const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value:string}>();
    const pending=row?JSON.parse(row.value):null;
    if(await limited('mfa-confirm:'+await sha256(readCookie(request,'morada_admin')),5))return fail('Espera 15 minutos antes de volver a intentarlo.',429);
    if(!pending||pending.expires<Date.now()||await matchTotp(pending.secret,body.code)===null)return fail('Código inválido o configuración vencida.');
    const recovery=Array.from({length:8},()=>token().slice(0,20)),hashes=await Promise.all(recovery.map(sha256));
    await db().batch([db().prepare("INSERT INTO settings(key,value) VALUES('admin_totp',?)").bind(pending.secret),db().prepare("INSERT INTO settings(key,value) VALUES('admin_recovery',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(hashes)),db().prepare('DELETE FROM settings WHERE key=?').bind(key),db().prepare('DELETE FROM sessions WHERE token<>?').bind(await sha256(readCookie(request,'morada_admin')))]);
    const enrollmentCounter=await matchTotp(pending.secret,body.code);if(enrollmentCounter!==null)await consumeCode('used-totp:'+await sha256(pending.secret+':'+enrollmentCounter));
    await auditEvent(request,'Segundo factor activado');return json({ok:true,recoveryCodes:recovery});
  }
  if(action==='mfa-begin'||action==='mfa-disable'||action==='change-password'){
    if(await limited('reauth:'+(request.headers.get('CF-Connecting-IP')||'local')))return fail('Demasiados intentos. Espera 15 minutos.',429);
    if(typeof body.currentPassword!=='string'||!passwordSetting||!await samePassword(body.currentPassword,passwordSetting.value)||!await verifyMfa(body.code))return fail('Confirma tu contraseña y el segundo factor si está activo.',401);
    if(action==='mfa-begin'){
      if(await mfaSetting())return fail('El segundo factor ya está activo.',409);
      const secret=newTotpSecret();await db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('mfa_pending:'+await sha256(readCookie(request,'morada_admin')),JSON.stringify({secret,expires:Date.now()+300000})).run();
      return json({ok:true,secret});
    }
    if(action==='mfa-disable'){
      await db().batch([db().prepare("DELETE FROM settings WHERE key IN ('admin_totp','admin_recovery')"),db().prepare('DELETE FROM sessions')]);await auditEvent(request,'Segundo factor desactivado');return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie('morada_admin','')}});
    }
    if(typeof body.password!=='string'||body.password.length<12)return fail('Usa una contraseña de al menos 12 caracteres.');
    await db().batch([db().prepare('DELETE FROM sessions'),db().prepare("UPDATE settings SET value=? WHERE key='admin_password'").bind(await passwordRecord(body.password))]);await auditEvent(request,'Contraseña cambiada; sesiones cerradas');return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie('morada_admin','')}});
  }
  if (action === "save") {
    try {
      return json({ ok: true, saved: await saveRows(Array.isArray(body.rows) ? (body.rows as RawLotRow[]) : [], await auditActor(request)) });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "No se pudo guardar.");
    }
  }

  return fail("Acción no reconocida.");
}

export async function GET(request:Request) {
  try {return await handleGet(request);}
  catch(error) {console.error('La Morada GET failed',new URL(request.url).pathname,error);return fail('No pudimos completar la consulta. Vuelve a intentarlo.',500);}
}
export async function POST(request:Request) {
  try {return await handlePost(request);}
  catch(error) {console.error('La Morada POST failed',new URL(request.url).pathname,error);return fail('No pudimos guardar los datos. Vuelve a intentarlo.',500);}
}
