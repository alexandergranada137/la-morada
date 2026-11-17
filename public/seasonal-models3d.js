import * as THREE from './vendor/three/three.module.js';
// Built-in low-poly props. Themes select safe types instead of executing model code.
export function buildSeasonalModel(kind,colors){
 const group=new THREE.Group();group.name='seasonal-'+kind;
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
 const accent=mat(colors.accent),deep=mat(colors.deep),white=mat('#f7f4ee'),brown=mat('#795337'),gold=mat('#edc96a');
 function add(geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
 const box=(w,h,d,m,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const sphere=(r,m,x,y,z)=>add(new THREE.SphereGeometry(r,10,8),m,x,y,z);
 if(kind==='zombie'){
  const skin=mat('#819667');box(1.7,2.8,.9,deep,0,3.2,0);box(.65,2.2,.7,brown,-.55,1.1,.25);box(.65,2.2,.7,brown,.55,1.1,-.2);box(1.8,1.8,1.4,skin,0,5.5,0);box(1.85,.35,1.45,brown,0,6.4,0);box(.4,.3,.05,white,-.4,5.7,.72);box(.4,.3,.05,white,.4,5.5,.72);box(.75,.15,.05,brown,.1,5,.73);const arm=box(.5,2.4,.5,skin,1.4,3.3,.1);arm.rotation.z=.4;box(.5,2.2,.5,skin,-1.3,3.6,.1);box(.35,1.5, .15,accent,0,3.9,.56);
 }else if(kind==='christmas-tree'){
  add(new THREE.CylinderGeometry(.35,.45,1.6,8),brown,0,.8,0);
  for(let i=0;i<3;i++)add(new THREE.ConeGeometry(2.3-i*.6,3.3-i*.35,10),deep,0,2.4+i*1.65,0);
  for(let i=0;i<12;i++){const angle=i*2.4,h=2+(i%4)*1.15,r=2-(h-2)*.28;sphere(.22,i%2?accent:gold,Math.cos(angle)*r,h,Math.sin(angle)*r);}sphere(.45,gold,0,7.3,0);
 }else if(kind==='gift-box'){
  box(3.3,2.7,3.3,accent,0,1.35,0);box(.42,2.8,3.4,gold,0,1.4,0);box(3.4,2.8,.42,gold,0,1.4,0);for(const x of [-.6,.6]){const ring=add(new THREE.TorusGeometry(.58,.15,5,12),gold,x,3,0);ring.rotation.y=.3;}
 }else if(kind==='snowman'){
  sphere(1.8,white,0,1.8,0);sphere(1.3,white,0,4,0);sphere(.95,white,0,5.8,0);add(new THREE.CylinderGeometry(1,1,.2,12),deep,0,6.75,0);add(new THREE.CylinderGeometry(.65,.65,.9,12),deep,0,7.2,0);add(new THREE.CylinderGeometry(1.36,1.36,.35,12),accent,0,4.8,0);box(.4,1.8,.2,accent,.6,4.05,1.15);sphere(.1,brown,-.3,6, .84);sphere(.1,brown,.3,6,.84);const nose=add(new THREE.ConeGeometry(.17,.7,8),mat('#df8b3d'),0,5.75,1.1);nose.rotation.x=Math.PI/2;
 }else if(kind==='pumpkin'){
  const orange=mat('#d58439');for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const lobe=sphere(1.35,orange,Math.cos(a)*.5,1.4,Math.sin(a)*.5);lobe.scale.set(.8,1,.8);}add(new THREE.CylinderGeometry(.2,.3,.8,7),brown,0,3,0);box(.5,.45,.06,deep,-.55,1.85,1.59);box(.5,.45,.06,deep,.55,1.85,1.59);box(1.2,.22,.06,deep,0,1.1,1.7);
 }else if(kind==='flag'){
  add(new THREE.CylinderGeometry(.12,.16,7,8),brown,0,3.5,0);box(3.6,2,.12,accent,1.8,5.7,0);box(1.2,2,.16,white,1.8,5.7,0);
 }else if(kind==='flowers'){
  add(new THREE.CylinderGeometry(1.45,1.1,1.7,10),brown,0,.85,0);for(let i=0;i<5;i++){const a=i*2.4,x=Math.cos(a)*.75,z=Math.sin(a)*.75;add(new THREE.CylinderGeometry(.07,.07,2.5,5),deep,x,2.4,z);for(let j=0;j<5;j++){const b=j*Math.PI*2/5;sphere(.32,accent,x+Math.cos(b)*.4,3.8+Math.sin(b)*.4,z);}sphere(.22,gold,x,3.8,z);}
 }
 // Remove unused materials from this small procedural palette.
 const used=new Set();group.traverse(node=>{if(node.material)used.add(node.material);});for(const material of [accent,deep,white,brown,gold])if(!used.has(material))material.dispose();return group;
}
export function seasonalSlots(park,centerAt,models){
 const inside=([x,y])=>{let hit=false;for(let i=0,j=park.length-1;i<park.length;j=i++){const a=park[i],b=park[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const yFor={'park-north':451,'park-center':489,'park-south':520};const placed=[];
 for(const model of models){const point=centerAt(park,yFor[model.slot]);if(!point)continue;const radius=2.5*model.scale;let target;
  for(const shift of [-3,3,0]){const candidate=[point[0]+shift,point[1]];if(Array.from({length:16},(_,i)=>inside([candidate[0]+Math.cos(i*Math.PI/8)*radius,candidate[1]+Math.sin(i*Math.PI/8)*radius])).every(Boolean)){target=candidate;break;}}
  if(target)placed.push({...model,point:target});
 }return placed;
}
