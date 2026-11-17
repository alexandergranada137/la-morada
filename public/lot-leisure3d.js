import * as THREE from './vendor/three/three.module.js';
import { drapePolygon, heightAt } from './terrain3d.js';
import { pointInside } from './landscape3d.js?v=performance1';

const features = [
  {type:'Piscina', width:5.2, depth:3.6},
  {type:'Zona de juego', width:3.8, depth:3.4},
  {type:'Parrilla', width:3.5, depth:2.8}
];

function edgeDistance(x,y,polygon) {
  let distance=Infinity;
  for(let i=0;i<polygon.length;i++){
    const [ax,ay]=polygon[i], [bx,by]=polygon[(i+1)%polygon.length];
    const dx=bx-ax,dy=by-ay;
    const t=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1),0,1);
    distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return distance;
}

export function addLotLeisure(owner, polygon, terrain, seed) {
  // Vary the selected lots and amenity consistently across page reloads.
  if(seed%5===0)return;
  owner.updateMatrixWorld(true);
  const obstacles=owner.children
    .filter(child=>child.userData.reserveGardenSpace)
    .map(child=>new THREE.Box3().setFromObject(child));
  const house=owner.children.find(child=>child.userData.referenceModel);
  const houseSize=house && new THREE.Box3().setFromObject(house).getSize(new THREE.Vector3());
  const xMin=Math.min(...polygon.map(point=>point[0])),xMax=Math.max(...polygon.map(point=>point[0]));
  const yMin=Math.min(...polygon.map(point=>point[1])),yMax=Math.max(...polygon.map(point=>point[1]));
  for(let offset=0;offset<features.length;offset++){
    const feature=features[(seed+offset)%features.length];
    const scale=houseSize ? Math.min(1,
      Math.max(houseSize.x,houseSize.z)*.72/feature.width,
      Math.min(houseSize.x,houseSize.z)*.72/feature.depth) : 1;
    if(scale<.72)continue;
    const width=feature.width*scale,depth=feature.depth*scale;
    const clearance=Math.hypot(width,depth)/2+1.7;
    let best=null;
    for(let x=xMin+clearance;x<=xMax-clearance;x+=1.5){
      for(let y=yMin+clearance;y<=yMax-clearance;y+=1.5){
        if(!pointInside([x,y],polygon)||edgeDistance(x,y,polygon)<clearance)continue;
        const X=x-500,Z=y-380;
        const spacing=Math.min(...obstacles.map(box=>Math.hypot(
          Math.max(box.min.x-X-width/2,X-width/2-box.max.x,0),
          Math.max(box.min.z-Z-depth/2,Z-depth/2-box.max.z,0)
        )));
        if(spacing<1.4)continue;
        const heights=[];
        for(const u of [-width/2,0,width/2])for(const v of [-depth/2,0,depth/2]){
          heights.push(heightAt(terrain,x+u,y+v)+.85);
        }
        const low=Math.min(...heights),high=Math.max(...heights);
        if(high-low>1.15)continue;
        const score= Math.min(spacing,5) + edgeDistance(x,y,polygon)*.22 - (high-low);
        if(!best||score>best.score)best={x,y,low,high,score};
      }
    }
    if(best){
      // Sample the same triangulated surface the parcel uses, including breaks in the slope.
      const {x,y}=best;
      const corners=[[x-width/2,y-depth/2],[x+width/2,y-depth/2],
        [x+width/2,y+depth/2],[x-width/2,y+depth/2]];
      const ground=drapePolygon(corners,terrain,.85);
      const positions=ground.attributes.position;
      for(let i=0;i<positions.count;i++){
        const height=positions.getY(i);
        best.low=Math.min(best.low,height);
        best.high=Math.max(best.high,height);
      }
      ground.dispose();
      if(best.high-best.low>.8)continue;
      buildFeature(owner,feature,best,scale);
      return;
    }
  }
}

function buildFeature(owner,{type,width,depth},{x,y,low,high},scale) {
  const group=new THREE.Group();
  group.name=type+' · referencia';
  group.position.set(x-500,high+.025,y-380);
  group.scale.setScalar(scale);
  const materials=new Map();
  function box(w,h,d,x,y,z,color,roughness=.9){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness}));
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials.get(color));
    mesh.position.set(x,y,z);
    mesh.castShadow=h>.18;
    mesh.receiveShadow=true;
    group.add(mesh);
    return mesh;
  }
  const base=(high-low+.10)/scale;
  box(width,base,depth,0,-base/2,0,type==='Zona de juego'?'#abb496':'#d9c9ae');
  if(type==='Piscina'){
    const water='#4c9eae',stone='#efe2ca';
    box(width-.65,.05,depth-.65,0,.035,0,water,.3);
    for(const sign of [-1,1]){
      box(width,.13,.27,0,.065,sign*(depth/2-.135),stone);
      box(.27,.13,depth-.54,sign*(width/2-.135),.065,0,stone);
    }
  } else if(type==='Zona de juego'){
    const wood='#a57f56',steel='#586b66';
    for(const sign of [-1,1])box(.13,1.75,.13,sign*1.08,.875,-.45,wood);
    box(2.3,.13,.13,0,1.76,-.45,wood);
    for(const x of [-.3,.3])box(.033,1.15,.033,x,1.15,-.45,steel);
    box(.7,.07,.33,0,.56,-.45,steel);
  } else {
    const stone='#c5af90',metal='#575451',wood='#a67e58';
    box(1.05,.7,.57,-.95,.35,-.68,stone);
    box(1.07,.09,.6,-.95,.74,-.68,metal);
    box(1.3,.09,.58,.52,.72,.28,wood);
    for(const x of [.03,1.01])box(.11,.72,.11,x,.36,.28,metal);
    box(1.25,.09,.26,.52,.40,.89,wood);
    for(const x of [.04,1])box(.10,.36,.10,x,.18,.89,metal);
  }
  owner.add(group);
}
