import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {heightAt,drapePolygon} from '../public/terrain3d.js';
const terrain=JSON.parse(readFileSync('public/cad-terrain.json','utf8'));
const lots=JSON.parse(readFileSync('public/lots.json','utf8'));
const area=points=>Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p[0]*q[1]-q[0]*p[1]},0))/2;
let triangles=0;
for(const lot of lots){
 if(!lot.polygon?.length)continue;
 const geo=drapePolygon(lot.polygon,terrain,.25),p=geo.attributes.position;
 let total=0;
 for(let i=0;i<p.count;i+=3){
  const tri=[0,1,2].map(j=>[p.getX(i+j)+500,p.getZ(i+j)+380]);
  total+=area(tri);triangles++;
  const x=tri.reduce((s,v)=>s+v[0],0)/3,y=tri.reduce((s,v)=>s+v[1],0)/3;
  const z=[0,1,2].reduce((s,j)=>s+p.getY(i+j),0)/3;
  assert.ok(Math.abs(z-heightAt(terrain,x,y)-.25)<.0001,`${lot.id}: surface penetration`);
  assert.ok(geo.attributes.normal.getY(i)>.01,`${lot.id}: inverted surface`);
 }
 assert.ok(Math.abs(total-area(lot.polygon))<.01,`${lot.id}: changed lot boundary area`);
 geo.dispose();
}
const saddle={columns:2,rows:2,xMin:0,xMax:10,yMin:0,yMax:10,heights:[0,20,20,0]};
const g=drapePolygon([[0,0],[10,0],[10,10],[0,10]],saddle);
for(let i=0;i<g.attributes.position.count;i+=3){
 const p=g.attributes.position;
 const x=[0,1,2].reduce((s,j)=>s+p.getX(i+j)+500,0)/3,y=[0,1,2].reduce((s,j)=>s+p.getZ(i+j)+380,0)/3;
 const z=[0,1,2].reduce((s,j)=>s+p.getY(i+j),0)/3;
 assert.ok(Math.abs(z-heightAt(saddle,x,y)-.25)<.0001);
}
console.log(`Geometry OK: ${lots.filter(l=>l.polygon?.length).length} lot boundaries, ${triangles} triangles, shared terrain clearance and upward normals; saddle regression passed.`);
