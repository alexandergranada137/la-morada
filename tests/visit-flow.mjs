import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.hidden=false;this.checked=false;this.disabled=false;this.attributes={};}
 append(...items){this.children.push(...items);}
 setAttribute(key,value){this.attributes[key]=value;}
 focus(){this.focused=true;}
 after(element){this.following=element;}
 remove(){this.removed=true;}
}
function fixture(fetch){
 const ids=['visitDate','visitForm','visitStatus','visitName','visitEmail','visitPhone','visitTime','visitConsent'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const submit=new Element('button');submit.textContent='Solicitar visita';
 nodes.visitForm.querySelector=()=>submit;
 nodes.visitForm.reset=()=>{for(const id of ['visitName','visitEmail','visitPhone','visitDate','visitTime'])nodes[id].value='';nodes.visitConsent.checked=false;};
 nodes.visitName.value='Prueba aislada';nodes.visitEmail.value='test@example.test';nodes.visitPhone.value='999999999';nodes.visitConsent.checked=true;
 const events=[];
 const context=vm.createContext({document:{querySelector:s=>nodes[s.slice(1)],createElement:t=>new Element(t)},crypto:{randomUUID},Date,Intl,fetch,window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,details){this.type=type;Object.assign(this,details);}}});
 vm.runInContext(fs.readFileSync('public/contact.js','utf8'),context);
 return {nodes,submit,events,send:()=>nodes.visitForm.onsubmit({preventDefault(){}})};
}
// A failed request keeps contact details, and retry uses the same idempotency key.
const requests=[];let fail=true;
const f=fixture(async(_url,options)=>{requests.push(JSON.parse(options.body));if(fail)throw Error('Sin conexión');return {ok:true,json:async()=>({ok:true})};});
await f.send();assert.equal(f.nodes.visitForm.hidden,false);assert.equal(f.nodes.visitName.value,'Prueba aislada');assert.equal(f.submit.disabled,false);assert.equal(f.nodes.visitStatus.className,'form-message error');
fail=false;await f.send();assert.equal(requests[0].requestId,requests[1].requestId);assert.equal(f.nodes.visitForm.hidden,true);assert.equal(f.nodes.visitForm.following.focused,true);assert.equal(f.events.length,1);
f.nodes.visitForm.following.children.at(-1).onclick();assert.equal(f.nodes.visitForm.hidden,false);assert.equal(f.nodes.visitName.value,'');assert.equal(f.nodes.visitName.focused,true);
// A second click while waiting cannot create a second network request.
let resolve,count=0;const pending=new Promise(r=>resolve=r);
const g=fixture(async()=>{count++;await pending;return {ok:true,json:async()=>({ok:true})};});
const first=g.send();await g.send();assert.equal(count,1);assert.equal(g.submit.disabled,true);resolve();await first;assert.equal(g.submit.disabled,false);
console.log('PASS: visit failure preserves inputs, retry is idempotent, duplicate clicks are blocked and success gives an explicit next step.');
