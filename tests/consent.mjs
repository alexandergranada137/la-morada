import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.nodes=new Map();this.checked=false;}
 append(...items){this.children.push(...items);}
 setAttribute(){}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector);}
 addEventListener(name,fn){this[name]=fn;}
 remove(){this.removed=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.close?.handler?.();this.removed=true;}
}
async function fixture(prior){
 const events={};const nodes=[];const writes=[];let stored=prior?JSON.stringify(prior):null;let reloaded=false;
 const body=new Element(),head=new Element(),footer=new Element();let cookies='_ga=old; _fbp=old; morada_admin=secret';
 const document={body,head,referrer:'https://example.invalid/private?email=hidden',createElement(tag){const n=new Element(tag);nodes.push(n);return n;},getElementById:()=>null,querySelectorAll:()=>[],querySelector:s=>s==='footer'?footer:null,addEventListener:(n,f)=>{events['document:'+n]=f;}};
 Object.defineProperty(document,'cookie',{get:()=>cookies,set:v=>writes.push(v)});
 const window={addEventListener:(n,f)=>{(events[n]??=[]).push(f);},dispatchEvent:e=>{for(const f of events[e.type]||[])f(e);}};
 const context=vm.createContext({window,document,localStorage:{getItem:()=>stored,setItem:(k,v)=>{stored=v;}},location:{hostname:'la-morada.test',origin:'https://la-morada.test',pathname:'/cotizacion.html',reload:()=>{reloaded=true;}},URL,Date,Event:class{constructor(type){this.type=type;}},fetch:async()=>({ok:true,json:async()=>({config:{ga4:'G-NVF3B4C6W0',pixel:'1944226796957252'}})})});
 vm.runInContext(fs.readFileSync('public/consent.js','utf8'),context);vm.runInContext(fs.readFileSync('public/measurement.js','utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 return {context,head,nodes,writes,window,choice:()=>JSON.parse(stored||'{}'),reloaded:()=>reloaded};
}
const initial=await fixture();assert.equal(initial.head.children.length,0);const banner=initial.nodes.find(n=>n.className==='cookie-banner');assert.ok(banner);banner.querySelector('[data-choice="reject"]').onclick();assert.equal(initial.head.children.length,0);assert.equal(initial.choice().analytics,false);assert.ok(initial.writes.some(v=>v.startsWith('_ga=')));assert.ok(initial.writes.every(v=>!v.startsWith('morada_admin=')));
const accepted=await fixture();const accept=accepted.nodes.find(n=>n.className==='cookie-banner');accept.querySelector('[data-choice="accept"]').onclick();assert.equal(accepted.head.children.length,2);assert.equal(accepted.choice().version,2);accepted.window.dispatchEvent({type:'morada:lead',detail:{currency:'USD',name:'secret',email:'secret@example.test'}});assert.ok(JSON.stringify(accepted.context.window.dataLayer).includes('generate_lead'));assert.ok(!JSON.stringify(accepted.context.window.dataLayer).includes('secret@example'));
const prior={version:2,analytics:true,marketing:false,expires:Date.now()+100000};const analytic=await fixture(prior);assert.equal(analytic.head.children.length,1);assert.match(analytic.head.children[0].src,/googletagmanager/);assert.equal(analytic.context.window.fbq,undefined);
const expired=await fixture({...prior,expires:Date.now()-100});assert.equal(expired.head.children.length,0);
const legacy=await fixture({analytics:true,marketing:true});assert.equal(legacy.head.children.length,0);
const pixel=await fixture({...prior,analytics:false,marketing:true});assert.equal(pixel.head.children.length,1);assert.match(pixel.head.children[0].src,/connect.facebook.net/);assert.equal(pixel.context.window.gtag,undefined);
console.log('PASS: optional tags blocked before consent and after reject/expiry, independent categories, real cookie removal preserving admin session, explicit consent and PII-free lead events.');
