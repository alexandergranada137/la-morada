import assert from 'node:assert/strict';
import {resolveLabelVisibility,stepLabelVisibility} from '../public/label-layout.js';
import {createHouse} from '../public/materials3d.js';
import * as THREE from '../public/vendor/three/three.module.js';
const viewport={left:0,right:1000,top:0,bottom:700};
const a={key:'A',x:400,y:300,width:40,height:30,priority:2,depth:200,enabled:true,order:0,wasVisible:true};
const b={...a,key:'park',width:110,priority:1,order:1,wasVisible:false,x:430};
assert.deepEqual([...resolveLabelVisibility([a,b],viewport)],['A']);
assert.equal(b.x,430,'Collision handling must never move an anchor');
assert.equal(resolveLabelVisibility([a],viewport,[{left:370,right:440,top:270,bottom:330}]).size,0,'Open menus must always exclude labels, even previously visible ones');
assert.equal(resolveLabelVisibility([a],viewport,[{left:0,right:200,top:0,bottom:100}]).has('A'),true,'Controls must not hide unrelated map labels');
const state={candidate:true,target:true,since:0,opacity:1};
for(let t=16;t<1000;t+=16)stepLabelVisibility(state,t%64<32,t,.016);
assert.equal(state.target,true,'Rapid collisions must not flash a visible label');
for(let t=1000;t<2500;t+=16)stepLabelVisibility(state,false,t,.016);
assert.equal(state.opacity,0,'Hidden labels must settle completely');
for(let t=2500;t<4000;t+=16)stepLabelVisibility(state,true,t,.016);
assert.equal(state.opacity,1,'Visible labels must settle completely');
assert.equal(stepLabelVisibility(state,true,4100,.016),false,'Idle labels must stop requesting frames');
for(const status of ['sold','separated']){
 const house=createHouse(13,status);house.updateMatrixWorld(true);
 let maxRadius=0;const point=new THREE.Vector3();
 house.traverse(mesh=>{if(!mesh.geometry)return;const vertices=mesh.geometry.attributes.position;for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);maxRadius=Math.max(maxRadius,Math.hypot(point.x,point.z));}});
 assert.ok(maxRadius<13*.82,'Model must stay within lot clearance');
 assert.equal(house.userData.constructionStage,'complete');
}
console.log('PASS: anchored labels, collision hysteresis, fade settling and construction model clearance.');
