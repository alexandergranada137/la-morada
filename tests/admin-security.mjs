import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256 as nobleSha256} from '@noble/hashes/sha2.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
function statement(sql,args=[]){return {bind(...next){return statement(sql,next)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const result=sqlite.prepare(sql).run(...args);return {...result,meta:{changes:Number(result.changes)}}},sql,args};}
const DB={prepare:sql=>statement(sql),async batch(statements){sqlite.exec('BEGIN');try{for(const s of statements)sqlite.prepare(s.sql).run(...s.args);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const lots=JSON.parse(fs.readFileSync('lib/lots.json','utf8'));
let source=fs.readFileSync('lib/morada-api.ts','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.env.DEV','false');
source=ts.transpile(source,{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022});
const security={};new Function('exports','pbkdf2Async','nobleSha256',ts.transpile(fs.readFileSync('lib/admin-security.ts','utf8').replace(/^import .*;\r?\n/gm,''),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(security,pbkdf2Async,nobleSha256);
new Function('exports',ts.transpile(fs.readFileSync('lib/youtube.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(security);
const api={};new Function('exports','env','lots',...Object.keys(security),source)(api,{DB},lots,...Object.values(security));
sqlite.prepare('INSERT INTO sessions(token,expires,created,last_seen) VALUES (?,?,?,?)').run(await security.sha256('test-session'),Date.now()+60000,Date.now(),Date.now());
const request=(path,body,auth=true,origin='https://morada.test')=>new Request('https://morada.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:origin,...(auth?{Cookie:'morada_admin=test-session'}:{})},...(body?{body:JSON.stringify(body)}:{})});
async function post(path,body,auth=true,code=200){const r=await api.POST(request(path,body,auth));assert.equal(r.status,code);return r.json();}
async function get(path,auth=true,code=200){const r=await api.GET(request(path,null,auth));assert.equal(r.status,code);return r.json();}

const nativeDerive=crypto.subtle.deriveBits.bind(crypto.subtle);
const sampleSalt=new Uint8Array(16).fill(7),expected=await security.derivePassword('platform-test',sampleSalt,1001);
crypto.subtle.deriveBits=async()=>{throw new DOMException('Hosted iteration cap','NotSupportedError');};
try{assert.deepEqual(await security.derivePassword('platform-test',sampleSalt,1001),expected,'Fallback preserves standard PBKDF2 output');}finally{crypto.subtle.deriveBits=nativeDerive;}
const password='isolated-test-password-not-for-production';
const salt=crypto.getRandomValues(new Uint8Array(16)),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},key,256));
const b64=value=>Buffer.from(value).toString('base64');
sqlite.prepare("INSERT INTO settings(key,value) VALUES('admin_password',?)").run(b64(salt)+'.'+b64(derived));
async function send(body,cookie='',ip='security-test'){
 return api.POST(new Request('https://morada.test/api/admin',{method:'POST',headers:{Origin:'https://morada.test','Content-Type':'application/json','CF-Connecting-IP':ip,...(cookie?{Cookie:'morada_admin='+cookie}:{})},body:JSON.stringify(body)}));
}
const sessionFrom=response=>response.headers.get('set-cookie')?.match(/^morada_admin=([^;]+)/)?.[1];
assert.equal(await security.totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',1,8),'94287082','RFC 6238 test vector');
assert.equal((await send({action:'login',password:'wrong'})).status,401);
let response=await send({action:'login',password});assert.equal(response.status,200);
assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Secure/);
assert.equal(response.headers.get('cache-control'),'no-store');
let session=sessionFrom(response);assert.ok(session);
assert.equal(sqlite.prepare('SELECT token FROM sessions WHERE token=?').get(session),undefined,'Never store bearer session token');
assert.ok(sqlite.prepare('SELECT token FROM sessions WHERE token=?').get(await security.sha256(session)));
assert.equal((await send({action:'mfa-begin',currentPassword:'wrong'},session)).status,401);
response=await send({action:'mfa-begin',currentPassword:password},session);const enrollment=await response.json();assert.ok(enrollment.secret);
const otp=await security.totpCode(enrollment.secret,Math.floor(Date.now()/30000));
response=await send({action:'mfa-enable',code:otp},session);assert.equal(response.status,200);const recovery=(await response.json()).recoveryCodes;assert.equal(recovery.length,8);
response=await api.GET(new Request('https://morada.test/api/admin?view=security',{headers:{Cookie:'morada_admin='+session}}));const state=await response.json();assert.equal(state.mfaEnabled,true);assert.ok(!JSON.stringify(state).includes(enrollment.secret));
response=await send({action:'login',password});assert.equal(response.status,401);assert.equal((await response.json()).mfaRequired,true);
assert.equal((await send({action:'login',password,code:otp})).status,401,'Enrollment OTP cannot be replayed for login');
const loginOtp=await security.totpCode(enrollment.secret,Math.floor(Date.now()/30000)+1);
response=await send({action:'login',password,code:loginOtp});assert.equal(response.status,200);
assert.equal((await send({action:'login',password,code:loginOtp})).status,401,'Reject OTP replay');
response=await send({action:'login',password,code:recovery[0]});assert.equal(response.status,200);session=sessionFrom(response);
assert.equal((await send({action:'login',password,code:recovery[0]})).status,401,'Recovery codes are single use');
response=await send({action:'revoke-others'},session);assert.equal(response.status,200);assert.equal(sqlite.prepare('SELECT count(*) n FROM sessions').get().n,1);
sqlite.prepare('UPDATE sessions SET last_seen=?').run(Date.now()-31*60000);
assert.equal((await send({action:'ping'},session)).status,200,'Remembered devices remain signed in after inactivity');
sqlite.prepare('UPDATE sessions SET expires=?').run(Date.now()-1);
assert.equal((await send({action:'ping'},session)).status,401,'Server rejects expired persistent sessions');
response=await send({action:'login',password,code:recovery[1]});session=sessionFrom(response);assert.ok(session);
assert.equal((await send({action:'mfa-disable',currentPassword:password,code:recovery[2]},session)).status,200);
assert.equal(sqlite.prepare('SELECT count(*) n FROM sessions').get().n,0);
response=await send({action:'login',password});session=sessionFrom(response);assert.ok(session);
assert.equal((await send({action:'change-password',currentPassword:password,password:'another-isolated-test-password'},session)).status,200);
assert.equal((await send({action:'ping'},session)).status,401,'Password changes revoke every session');
assert.equal((await send({action:'login',password})).status,401);
assert.equal((await send({action:'login',password:'another-isolated-test-password'})).status,200);
for(let n=0;n<10;n++)assert.equal((await send({action:'login',password:'wrong'},'','rate-test')).status,401);
assert.equal((await send({action:'login',password:'wrong'},'','rate-test')).status,429);
assert.equal((await send({action:'login',password:'a'.repeat(1025)})).status,400);
await post('clientes',{action:'update',id:'missing',stage:'closed',notes:''},false,401);
console.log('PASS: hashed sessions, persistent device expiry, cookie security, RFC TOTP, enrollment, replay prevention, recovery, session revocation, password rotation, rate limiting and private lead tools.');
sqlite.close();
