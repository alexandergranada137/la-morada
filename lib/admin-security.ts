import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256 as nobleSha256} from '@noble/hashes/sha2.js';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export async function sha256(value:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');}
export function newTotpSecret(){const bytes=crypto.getRandomValues(new Uint8Array(20));let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){result+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)result+=alphabet[(value<<(5-bits))&31];return result;}
function decode32(secret:string){let bits=0,value=0;const out=[];for(const c of secret.toUpperCase()){const index=alphabet.indexOf(c);if(index<0)throw new Error('Invalid authenticator secret');value=(value<<5)|index;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return new Uint8Array(out);}
export async function totpCode(secret:string,counter:number,digits=6){const bytes=new Uint8Array(8);new DataView(bytes.buffer).setBigUint64(0,BigInt(counter));const key=await crypto.subtle.importKey('raw',decode32(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes));const offset=signature[19]&15;const binary=((signature[offset]&127)<<24)|(signature[offset+1]<<16)|(signature[offset+2]<<8)|signature[offset+3];return String(binary%10**digits).padStart(digits,'0');}
export async function matchTotp(secret:string,code:unknown,time=Date.now()){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const step=Math.floor(time/30000);for(const offset of [0,-1,1]){const counter=step+offset;if(await totpCode(secret,counter)===code)return counter;}return null;}

// Preserve PBKDF2 outputs when the hosted runtime caps native iterations.
export async function derivePassword(password:string,salt:Uint8Array,iterations:number){
 try{
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt as unknown as BufferSource,iterations},key,256));
 }catch(error){
  if(!(error instanceof Error)||error.name!=='NotSupportedError')throw error;
  return pbkdf2Async(nobleSha256,new TextEncoder().encode(password),salt,{c:iterations,dkLen:32,asyncTick:10});
 }
}
