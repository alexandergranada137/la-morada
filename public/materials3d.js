import { housePlans, housePerimeter, houseEntry } from './house-plans3d.js';
import * as THREE from './vendor/three/three.module.js';

const surfaceImages=new Map();
// Small, repeatable procedural materials. No external photographs or tracking requests.
export function surfaceTexture(kind) {
  if(surfaceImages.has(kind))return textureFromSurface(surfaceImages.get(kind),kind);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  let seed = kind === 'grass' ? 417 : 931;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const base = {grass:'#82934c',concrete:'#d6d2c9',wood:'#a38360',asphalt:'#858587',stone:'#c5b293',soil:'#b8ac92'};
  ctx.fillStyle = base[kind] || base.soil;
  ctx.fillRect(0, 0, 512, 512);
  // Broad variations and fine grain remain subtle at both viewing distances.
  for (let i = 0; i < 110; i++) {
    const x = random()*512, y = random()*512, radius = 18+random()*70;
    const wash = ctx.createRadialGradient(x,y,0,x,y,radius);
    wash.addColorStop(0, i%2 ? '#ffffff0b' : '#0000000b');
    wash.addColorStop(1, '#00000000');
    ctx.fillStyle = wash;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  for (let i = 0; i < 22000; i++) {
    const x = random()*512, y = random()*512;
    ctx.fillStyle = random()>.5 ? '#ffffff16' : '#00000018';
    if (kind === 'grass') {
      ctx.strokeStyle = ['#657d3f','#a3b365','#8e9e51','#5c733c'][Math.floor(random()*4)];
      ctx.lineWidth = .7;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*3,y-random()*5);ctx.stroke();
    } else if (kind === 'wood') {
      ctx.fillRect(x,y,.4+random(),4+random()*35);
    } else {
      ctx.fillRect(x,y,.3+random()*1.6,.3+random()*1.6);
    }
  }
  if (kind === 'wood') {
    ctx.strokeStyle='#57412f30';ctx.lineWidth=1;
    for (let x=0;x<512;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
  }
  if (kind === 'stone') {
    ctx.strokeStyle='#73675040';ctx.lineWidth=1.5;
    for(let y=0;y<512;y+=64) {
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();
      for(let x=(y%128?64:0);x<512;x+=128){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+64);ctx.stroke();}
    }
  }
  surfaceImages.set(kind,canvas);
  return textureFromSurface(canvas,kind);
}
function textureFromSurface(canvas,kind){
 const texture=new THREE.CanvasTexture(canvas);texture.name=kind;texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
}

const architecturalTextures=new Map();
export function architecturalMaterial(kind, color, roughness = .85) {
  if(typeof document!=='undefined'&&!architecturalTextures.has(kind)){
    const map=surfaceTexture(kind);
    const bumpMap=map.clone();
    bumpMap.colorSpace=THREE.NoColorSpace;
    architecturalTextures.set(kind,{map,bumpMap});
  }
  const {map=null,bumpMap=null}=architecturalTextures.get(kind)||{};
  return new THREE.MeshStandardMaterial({
    color, map, bumpMap, bumpScale:kind === 'wood' ? .018 : .012,
    roughness, metalness:0
  });
}

const houseTemplates = new Map();
const housePalettes = new Map();

function houseMaterials(variant) {
  if (!housePalettes.has(variant)) {
    const wall = architecturalMaterial('concrete',['#fff7e7','#f0f0e7','#f7ebd8'][variant]);
    const roof = architecturalMaterial('stone',['#ede0c9','#efeee5','#ded3bf'][variant]);
    const timber = architecturalMaterial('wood',['#ecc18f','#e4bd94','#f2cc9b'][variant],.72);
    wall.userData.seasonalRole='facades';
    roof.userData.seasonalRole='roofs';
    housePalettes.set(variant,{
      wall,roof,timber,paving:architecturalMaterial('stone','#d4c6b1'),
      frame:new THREE.MeshStandardMaterial({color:'#373d3e',roughness:.55,metalness:.2}),
      glass:new THREE.MeshStandardMaterial({color:'#64808b',roughness:.2,metalness:.25}),
    });
  }
  return housePalettes.get(variant);
}

function buildHouseTemplate(planIndex,floors,variant,mirror) {
  const {wall,roof,timber,paving,frame,glass}=houseMaterials(variant);
  const plan=housePlans[planIndex];
  const {main,wing,upper}=plan;
  const [door,entryFront]=houseEntry(plan);
  const pieces=new Map();
  function box(width,height,depth,material,x,y,z) {
    const geometry=new THREE.BoxGeometry(width,height,depth);
    geometry.translate(x*mirror,y,z);
    const triangles=geometry.toNonIndexed();
    geometry.dispose();
    if(!pieces.has(material))pieces.set(material,[]);
    pieces.get(material).push(triangles);
  }
  function volume([left,right,back,front],height,material,bottom,inset=0) {
    box(right-left-2*inset,height,front-back-2*inset,material,
      (left+right)/2,bottom+height/2,(back+front)/2);
  }
  function glazing(x,y,z,width,height,side=0) {
    if(side) {
      box(.016,height,width,frame,x,y,z);
      box(.020,height-.025,width-.026,glass,x+side*.008,y,z);
    } else {
      box(width,height,.016,frame,x,y,z);
      box(width-.026,height-.025,.020,glass,x,y,z+.008);
      box(.008,height,.019,frame,x,y,z+.019);
    }
  }
  const [left,right,back,front]=main;
  volume(main,.028,paving,0);
  volume(main,.25,wall,.028,.055);
  volume(main,.038,roof,.278,.035);
  if(wing) {
    volume(wing,.028,paving,0);
    volume(wing,.25,planIndex===1 ? timber : wall,.028,.025);
    volume(wing,.038,roof,.278,.018);
  }
  const windowOnLeft=door>(left+right)/2;
  const windowX=windowOnLeft ? left+(right-left)*.28 : right-(right-left)*.26;
  glazing(windowX,.15,front-.053,(right-left)*.30,.164);
  box(.16,.234,.017,timber,door,.146,entryFront-.021);
  box(.117,.202,.019,frame,door,.133,entryFront-.012);

  if(floors===2) {
    const [upperLeft,upperRight,upperBack,upperFront]=upper;
    const upperX=(upperLeft+upperRight)/2;
    volume(upper,.228,wall,.316,.025);
    volume(upper,.043,roof,.544);
    const upperWidth=upperRight-upperLeft;
    glazing(upperX-.09,.438,upperFront-.023,upperWidth*.48,.156);
    box(.11,.215,.020,timber,upperRight-.088,.430,upperFront-.017);
    if(planIndex===2 || planIndex===3) {
      const balconyFront=upperFront+.115;
      box(upperWidth*.82,.027,.12,timber,upperX,.331,balconyFront-.060);
      box(upperWidth*.82,.008,.012,frame,upperX,.406,balconyFront);
      for(const x of [upperX-upperWidth*.39,upperX+upperWidth*.39]) {
        box(.010,.077,.012,frame,x,.37,balconyFront);
      }
    } else {
      for(let i=0;i<4;i++)box(.010,.147,.020,timber,upperLeft+.11+i*.042,.438,upperFront);
    }
    if(planIndex===4) {
      glazing(wing[1]-.022,.149,(wing[2]+wing[3])/2,.34,.165,1);
      glazing(upperRight-.022,.438,(upperBack+upperFront)/2,.31,.155,1);
    } else if(planIndex===1) {
      glazing(wing[1]-.022,.148,(back+wing[3])/2,.24,.148,1);
    }
  }

  const meshes=[];
  for(const [material,parts] of pieces) {
    const combined=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv']) {
      const attributes=parts.map(part=>part.attributes[name]);
      const values=new Float32Array(attributes.reduce((length,attribute)=>length+attribute.array.length,0));
      let offset=0;
      for(const attribute of attributes) {
        values.set(attribute.array,offset);
        offset+=attribute.array.length;
      }
      combined.setAttribute(name,new THREE.BufferAttribute(values,attributes[0].itemSize));
    }
    for(const part of parts)part.dispose();
    const mesh=new THREE.Mesh(combined,material);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.userData.sharedHouseResources=true;
    meshes.push(mesh);
  }
  return {meshes, porch:[door*mirror,entryFront],
    perimeter:housePerimeter(housePlans[planIndex]).map(([x,z])=>[x*mirror,z])};
}

export function createHouse(size, status, floors = 1, {variant=0,cornerSide=0,plan=cornerSide ? 4 : variant,mirror=cornerSide || 1,scaleX=size,scaleZ=size} = {}) {
  const key=[plan,floors,variant,mirror].join(':');
  if(!houseTemplates.has(key))houseTemplates.set(key,buildHouseTemplate(plan,floors,variant,mirror));
  const {meshes,porch,perimeter}=houseTemplates.get(key);
  const group=new THREE.Group();
  for(const mesh of meshes)group.add(mesh.clone());
  group.scale.set(scaleX,Math.min(size,12),scaleZ);
  group.userData={
    floors:floors===2 ? 2 : 1, constructionStage:'complete', referenceModel:true,
    plan:housePlans[plan].name, porch, perimeter,
  };
  return group;
}
