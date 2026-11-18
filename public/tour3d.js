import {createCinematicGrade} from './cinematic-grade3d.js?v=luz-dorada1';
import {addLotLeisure} from './lot-leisure3d.js?v=scale2';
import {keepCameraAboveTerrain} from './camera-clearance3d.js';
import {createSceneTheme} from './theme3d.js?v=design1';
import {resolveLabelVisibility,stepLabelVisibility} from './label-layout.js';
import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { surfaceTexture, createHouse } from './materials3d.js?v=casas2';
import { fitLotHouse } from './house-plans3d.js';
import { heightAt, drapePolygon, groundGeometry, boundaryPoints } from './terrain3d.js';
import {extendTerrain,buildLandscape,pointInside,makeFloatingLabel} from './landscape3d.js?v=realism1';

const $ = selector => document.querySelector(selector);
const host = $('#scene'), info = $('#lotInfo'), loading = $('#loading');
const planStarted=performance.now();host.dataset.loading='true';
const currency = $('#currency'), list = $('#lotList');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileLayout=matchMedia('(max-width:760px)');
const filtersPanel=document.querySelector('.filter-disclosure');
filtersPanel.open=!mobileLayout.matches;
mobileLayout.addEventListener('change',e=>{filtersPanel.open=!e.matches;});
const catalog = new Map(), lotMeshes = new Map(), lotGroups=new Map(), pickTargets = [];
let catalogRefreshing=false,catalogReady=false,landscapeVisual=null,numbersEnabled=false;
const blockedBlocks = new Set(['B','I']);
let lots = [], selected = null, verified = false, flying = false, phase = 0, radius = 600;
let sceneWidth=1,sceneHeight=1,projectRadius=0;const blockLabels=[];
let cameraMove = null, view = 'perspective', changed = true;
const center = new THREE.Vector3();
let terrain=null;
let roadSurfaces=[];
const terrainHeight=(x,y)=>heightAt(terrain,x,y);

const scene = new THREE.Scene();
const skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=512;const skyContext=skyCanvas.getContext('2d');const skyGradient=skyContext.createLinearGradient(0,0,0,512);skyGradient.addColorStop(0,'#92b6d0');skyGradient.addColorStop(.6,'#d4dee2');skyGradient.addColorStop(1,'#f7e6ce');skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,2,512);scene.background=new THREE.CanvasTexture(skyCanvas);scene.background.colorSpace=THREE.SRGBColorSpace;scene.fog=new THREE.Fog('#f0e4d5',950,2400);
const seasonalTheme=createSceneTheme(scene,{getTerrain:()=>terrain,invalidate:()=>{changed=true;}});
const camera = new THREE.PerspectiveCamera(42,1,2,3200);
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch { loading.textContent = 'El 3D no está disponible en este dispositivo. Usa la lista para consultar los lotes.'; }
let controls, cinematicGrade;
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  cinematicGrade = createCinematicGrade(renderer);
  renderer.domElement.setAttribute('aria-label','Plano 3D. Puedes seleccionar lotes también desde la lista.');
  host.prepend(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stopTour();loading.hidden=false;loading.textContent='El visor se ha pausado. Recarga la página si no se recupera.';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{loading.hidden=true;changed=true;});
  controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = .05;
  controls.maxPolarAngle = Math.PI / 2.18;
  controls.minDistance = 35;
  controls.maxDistance = 900;
  controls.addEventListener('change',()=>{changed=true;});
  controls.addEventListener('start',()=>{stopTour();cameraMove=null;});
}
scene.add(new THREE.HemisphereLight('#f7f5ed','#9b896f',1.15));
const sun = new THREE.DirectionalLight('#fff0d8',1.65);
sun.position.set(-300,650,200);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-650;sun.shadow.camera.right=650;
sun.shadow.camera.top=650;sun.shadow.camera.bottom=-650;
sun.shadow.camera.near=10;sun.shadow.camera.far=1600;
sun.shadow.normalBias=.7;sun.shadow.bias=-.0002;scene.add(sun);
const grass = surfaceTexture('grass'), soil = surfaceTexture('soil');
soil.repeat.set(32,26);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2200,1800),new THREE.MeshStandardMaterial({map:soil,color:'#d7c7a3',roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-2;ground.receiveShadow=true;scene.add(ground);
const palette={available:'#6d9b49',separated:'#e7c642',sold:'#9c82b4',blocked:'#a1a3a1',unknown:'#b3afa3'};
const labelViewPoint=new THREE.Vector3(),labelProjection=new THREE.Vector3();
function updateFloatingLabels(now,dt){
 camera.updateMatrixWorld(true);
 const sprites=[...blockLabels,...(landscapeVisual?.labels||[])],candidates=[];
 const worldPerPixelFactor=2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/sceneHeight;
 for(let order=0;order<sprites.length;order++){
  const sprite=sprites[order],data=sprite.userData;
  data.labelState??={candidate:false,target:false,since:now,opacity:0};
  const depth=-labelViewPoint.copy(data.anchor).applyMatrix4(camera.matrixWorldInverse).z;
  sprite.position.copy(data.anchor);
  const perPixel=Math.max(.001,depth*worldPerPixelFactor);
  sprite.scale.set(data.pixelWidth*perPixel,data.pixelHeight*perPixel,1);
  labelProjection.copy(data.anchor).project(camera);
  const priority=data.block===selected?.block?3:data.block?2:1;
  candidates.push({key:sprite,order,depth,x:(labelProjection.x+1)*sceneWidth/2,y:(1-labelProjection.y)*sceneHeight/2,width:data.pixelWidth,height:data.pixelHeight,enabled:sprite.parent.visible&&labelProjection.z>=-1&&labelProjection.z<=1,priority,wasVisible:data.labelState.target});
  sprite.renderOrder=20+priority;
 }
 for (const {marker} of placeMarkers) {
   if (marker.hidden) continue;
   const rect = marker.getBoundingClientRect(), hostRect = host.getBoundingClientRect();
   candidates.push({key:marker,order:-1,depth:1,x:rect.left-hostRect.left+rect.width/2,y:rect.top-hostRect.top+rect.height/2,width:rect.width+16,height:rect.height+16,enabled:true,priority:10,wasVisible:true});
 }
 const visible=resolveLabelVisibility(candidates,{left:mobileLayout.matches?8:345,right:sceneWidth-8,top:100,bottom:sceneHeight-105});
 let animating=false;
 for(const sprite of sprites){const state=sprite.userData.labelState;animating=stepLabelVisibility(state,visible.has(sprite),now,dt,reducedMotion.matches)||animating;sprite.material.opacity=state.opacity;sprite.visible=state.opacity>0&&sprite.parent.visible;}
 return animating;
}
function lotState(lot) { return blockedBlocks.has(lot.block) ? 'blocked' : verified ? catalog.get(lot.id)?.status || 'unknown' : 'unknown'; }
const names={available:'Disponible',separated:'Separado',sold:'Vendido',blocked:'Fuera de venta',unknown:'Disponibilidad por confirmar'};
function money(cents) { return new Intl.NumberFormat('es-PE',{style:'currency',currency:currency.value}).format(cents/100); }
function element(tag,text,className) {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function applyRaisedLotMaterial(mesh){
  const bounds=ground.geometry.userData.mapBounds;if(!ground.material.map||!bounds)return;
  const positions=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+500-bounds.xMin)/(bounds.xMax-bounds.xMin),(positions.getZ(i)+380-bounds.yMin)/(bounds.yMax-bounds.yMin));
  uv.needsUpdate=true;
  const material=ground.material.clone();material.visible=true;material.onBeforeCompile=ground.material.onBeforeCompile;material.customProgramCacheKey=ground.material.customProgramCacheKey;
  mesh.material[0].dispose();mesh.material[0]=material;mesh.receiveShadow=true;
}
function buildLivingFence(points, owner, winding, entrance) {
  const shrubs = [];
  for (let i=0;i<points.length;i++) {
    const [ax,ay]=points[i], [bx,by]=points[(i+1)%points.length];
    const dx=bx-ax, dy=by-ay, length=Math.hypot(dx,dy);
    if (length<2.4) continue;
    const inward = winding*.86;
    for (let d=1.2;d<length-1.15;d+=.96) {
      if (i===entrance?.edge && Math.abs(d-entrance.distance)<1.65) continue;
      const x=ax+dx*d/length-dy/length*inward;
      const y=ay+dy*d/length+dx/length*inward;
      if (![[x,y],[x-.68,y],[x+.68,y],[x,y-.68],[x,y+.68]].every(p=>pointInside(p,points))) continue;
      shrubs.push([x,y]);
    }
  }
  if (!shrubs.length) return;
  const geometry=new THREE.IcosahedronGeometry(1,1);
  const material=new THREE.MeshStandardMaterial({color:'#879c6e',roughness:1});
  const hedge=new THREE.InstancedMesh(geometry,material,shrubs.length);
  hedge.castShadow=true;
  hedge.receiveShadow=true;
  hedge.name='Cerco vivo';
  const plant=new THREE.Object3D(), shade=new THREE.Color();
  shrubs.forEach(([x,y],i)=>{
    plant.position.set(x-500,terrainHeight(x,y)+1.35,y-380);
    plant.scale.set(.67,.78+(i%3)*.075,.67);
    plant.rotation.y=i*2.4;
    plant.updateMatrix();
    hedge.setMatrixAt(i,plant.matrix);
    hedge.setColorAt(i,shade.setHSL(.25+(i%4)*.008,.28,.35+(i%5)*.037));
  });
  owner.add(hedge);
}

function buildGardenAccess(points, owner, front, porch, variation) {
  const [ax,ay]=points[front.index], [bx,by]=points[(front.index+1)%points.length];
  const ux=(bx-ax)/front.length, uy=(by-ay)/front.length;
  const width=Math.min(.76,front.length*.16);
  const distance=THREE.MathUtils.clamp((porch[0]-ax)*ux+(porch[1]-ay)*uy,width,front.length-width);
  const gate=[ax+ux*distance,ay+uy*distance];
  const dx=porch[0]-gate[0], dy=porch[1]-gate[1], length=Math.hypot(dx,dy);
  if(length<.15)return {edge:front.index,distance};
  const direction=Math.sign(dy*ux-dx*uy)||1;
  const wx=dy/length*width*direction, wy=-dx/length*width*direction;
  // Vary direction and curvature while keeping both ends aligned to the gate and porch.
  const directionOfBend=variation%2 ? -1 : 1;
  const bends=variation%3===0 ? 2 : 1;
  let amplitude=Math.min(1.7,length*(.11+(variation%4)*.025))*directionOfBend;
  const at=(t,side=0)=>{
    const bend=Math.sin(Math.PI*t*bends)*Math.sin(Math.PI*t)*amplitude/width;
    return [gate[0]+dx*t+wx*(bend+side),gate[1]+dy*t+wy*(bend+side)];
  };
  const steps=16;
  for(let attempt=0;attempt<4;attempt++){
    const fits=Array.from({length:steps},(_,i)=>(i+1)/steps)
      .every(t=>[-1,1].every(side=>pointInside(at(t,side),points)));
    if(fits)break;
    amplitude=attempt===3?0:amplitude*.5;
  }
  const left=[ [gate[0]+ux*width,gate[1]+uy*width] ];
  const right=[ [gate[0]-ux*width,gate[1]-uy*width] ];
  for(let i=1;i<=steps;i++){
    left.push(at(i/steps,1));
    right.push(at(i/steps,-1));
  }
  const strip=[...left,...right.reverse()];
  const walkway=new THREE.Mesh(drapePolygon(strip,terrain,.94),
    new THREE.MeshStandardMaterial({color:'#e3d1b6',roughness:.95,side:THREE.DoubleSide}));
  walkway.receiveShadow=true;
  walkway.userData.reserveGardenSpace=true;
  owner.add(walkway);
  for(const side of [-1,1]){
    const garden=[];
    for(const [t,offset] of [[.19,1.55],[.67,1.55],[.62,3.9],[.25,3.9]]){
      garden.push(at(t,offset*side));
    }
    if(!garden.every(point=>pointInside(point,points)))continue;
    const lawn=new THREE.Mesh(drapePolygon(garden,terrain,.91),new THREE.MeshStandardMaterial({
      color:'#b3c486',map:surfaceTexture('grass'),roughness:1,side:THREE.DoubleSide
    }));
    lawn.receiveShadow=true;
    lawn.userData.reserveGardenSpace=true;
    owner.add(lawn);
    const plants=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),
      new THREE.MeshStandardMaterial({color:'#fff',roughness:.92}),4);
    const shrub=new THREE.Object3D();
    for(let i=0;i<4;i++){
      const t=.28+i*.10, offset=(2.35+i%2*.45)*side;
      const [x,y]=at(t,offset);
      shrub.position.set(x-500,terrainHeight(x,y)+1.18,y-380);
      shrub.scale.set(.43,.35+i%3*.07,.43);
      shrub.updateMatrix();
      plants.setMatrixAt(i,shrub.matrix);
      plants.setColorAt(i,new THREE.Color(['#7a9856','#ab7e93','#73884e','#ddd1a1'][i]));
    }
    plants.castShadow=true;
    owner.add(plants);
  }
  return {edge:front.index,distance};
}

function seatHouse(home, owner, x, y, right, forward) {
  const perimeter=home.userData.perimeter.map(([u,v])=>[
    x+right[0]*u*home.scale.x+forward[0]*v*home.scale.z,
    y+right[1]*u*home.scale.x+forward[1]*v*home.scale.z,
  ]);
  const surface=drapePolygon(perimeter,terrain,.85);
  const samples=surface.attributes.position;
  let base=terrainHeight(x,y)+.85;
  for(let i=0;i<samples.count;i++)base=Math.max(base,samples.getY(i));
  surface.dispose();
  base+=.025;
  const rim=boundaryPoints(perimeter,terrain,.79), vertices=[], indices=[];
  for(const point of rim)vertices.push(point.x,point.y,point.z,point.x,base,point.z);
  for(let i=0;i<rim.length;i++){
    const a=i*2,b=((i+1)%rim.length)*2;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const plinth=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#b7a58a',roughness:.94,side:THREE.DoubleSide}));
  plinth.receiveShadow=true;
  owner.add(plinth);
  home.position.set(x-500,base,y-380);
  home.userData.reserveGardenSpace=true;
  owner.add(home);
}

function buildLot(lot) {
  if(!renderer || !lot.polygon || lot.polygon.length<3)return;
  const group=new THREE.Group();scene.add(group);lotGroups.set(lot.id,group);
  const points=lot.polygon.filter((p,i,a)=>!i || p[0]!==a[i-1][0] || p[1]!==a[i-1][1]);
  const geometry = drapePolygon(points,terrain,.85);
  const status=lotState(lot);
  const top=new THREE.MeshStandardMaterial({map:null,color:palette[status],roughness:.98});
  const side=new THREE.MeshStandardMaterial({color:'#a2997f',roughness:1});
  top.visible=false;side.visible=false;
  const mesh=new THREE.Mesh(geometry,[top,side]);
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData=lot;
  group.add(mesh);lotMeshes.set(lot.id,mesh);pickTargets.push(mesh);
  if(landscapeVisual)applyRaisedLotMaterial(mesh);
  const rim=boundaryPoints(points,terrain,0),vertices=[],indices=[];
  for(const p of rim)vertices.push(p.x,p.y,p.z,p.x,p.y+.85,p.z);
  for(let i=0;i<rim.length;i++){const a=i*2,b=((i+1)%rim.length)*2;indices.push(a,b,a+1,b,b+1,a+1);}
  const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));wallGeometry.setIndex(indices);wallGeometry.computeVertexNormals();
  const wall=new THREE.Mesh(wallGeometry,new THREE.MeshStandardMaterial({color:'#b3ad91',roughness:1,side:THREE.DoubleSide}));group.add(wall);

  const edgePoints=boundaryPoints(points,terrain,1.4);
  const boundary=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints,true,'centripetal'),edgePoints.length,.55,4,true),new THREE.MeshBasicMaterial({color:'#ffe9a0',depthTest:false,depthWrite:false}));
  boundary.renderOrder=8;
  const highlight=new THREE.Mesh(drapePolygon(points,terrain,1.05),new THREE.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));highlight.renderOrder=7;boundary.add(highlight);
  boundary.visible=false;mesh.userData.outline=boundary;group.add(boundary);
  if(status==='sold'||status==='separated'){
    const twiceArea = points.reduce((sum,[x,y],i)=>{
      const [nx,ny]=points[(i+1)%points.length];
      return sum+x*ny-nx*y;
    },0);
    const winding = Math.sign(twiceArea);
    let entrance = null;
    const seed=lot.lot*17+lot.block.charCodeAt(0)*31;
    const placement=fitLotHouse(points,winding,Math.abs(twiceArea)/2,seed,roadSurfaces);
    if(placement) {
      const {x,y,size,front,right,forward}=placement;
      const rotation=Math.atan2(front.nx,front.ny);
      const home=createHouse(size,status,2,{...placement,variant:seed%3});
      home.rotation.y=rotation;
      seatHouse(home,group,x,y,right,forward);
      if(status==='sold' && front?.score>0) {
        const [u,v]=home.userData.porch;
        const porch=[x+u*home.scale.x*right[0]+v*home.scale.z*forward[0],
          y+u*home.scale.x*right[1]+v*home.scale.z*forward[1]];
        entrance=buildGardenAccess(points,group,front,porch,seed);
      }
    }
    if(status==='sold'){
      buildLivingFence(points,group,winding,entrance);
      addLotLeisure(group,points,terrain,seed);
    }
  }
}
const placeMarkers = [];
const placeHighlights = new Map();

function createPlaceMarkers() {
  const locations = [
    {key:'PARQUE', label:'Parque', x:428, y:503, action:'parkView', icon:'<path d="m12 3-7 8h3l-4 6h7v4h2v-4h7l-4-6h3Z"/>'},
    {key:'PORTICO', label:'Pórtico', x:627, y:410, action:'gateView', icon:'<path d="M4 21V5h16v16M2 5h20M9 21V10h6v11"/>'}
  ];
  for (const location of locations) {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'place-marker';
    marker.setAttribute('aria-label', 'Seleccionar ' + location.label);
    marker.setAttribute('aria-pressed', 'false');
    marker.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">' + location.icon + '</svg><span>' + location.label + '</span>';
    marker.addEventListener('click', () => $('#' + location.action).click());
    host.append(marker);
    const anchor = new THREE.Vector3(location.x - 500, terrainHeight(location.x, location.y) + 8, location.y - 380);
    placeMarkers.push({marker, anchor, key:location.key});
    const points = location.key === 'PARQUE' ? landscapeVisual.park : [[619,403],[639,403],[639,417],[619,417]];
    const highlight = new THREE.Mesh(drapePolygon(points, terrain, 1.2),
      new THREE.MeshBasicMaterial({color:'#e3b5ff',transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));
    highlight.renderOrder = 9;
    highlight.visible = false;
    scene.add(highlight);
    placeHighlights.set(location.key, highlight);
  }
}

const markerPosition = new THREE.Vector3();
function updatePlaceMarkers() {
  camera.updateMatrixWorld();
  for (const {marker, anchor} of placeMarkers) {
    markerPosition.copy(anchor).project(camera);
    const {x,y,z} = markerPosition;
    marker.hidden = Math.abs(x) > 1 || Math.abs(y) > 1 || z < -1 || z > 1;
    marker.style.left = (x + 1) * 50 + '%';
    marker.style.top = (1 - y) * 50 + '%';
    if (!marker.hidden) {
      const rect = marker.getBoundingClientRect(), hostRect = host.getBoundingClientRect();
      const obstacles = document.querySelectorAll('.explorer-panel,.scene-toolbar,#panoramaPicker,.mobile-selection-link,.zoom-controls,.scene-footer,.model-details');
      marker.hidden = rect.left < hostRect.left + 8 || rect.right > hostRect.right - 8 ||
        rect.top < hostRect.top + 8 || rect.bottom > hostRect.bottom - 8 ||
        [...obstacles].some(element => {
          if (getComputedStyle(element).display === 'contents') return false;
          const box = element.getBoundingClientRect();
          return box.width > 0 && rect.left < box.right + 6 && rect.right > box.left - 6 &&
            rect.top < box.bottom + 6 && rect.bottom > box.top - 6;
        });
    }
  }
}

function selectPanorama(locationKey) {
  for (const {marker,key} of placeMarkers) marker.setAttribute('aria-pressed', String(key === locationKey));
  for (const [key,highlight] of placeHighlights) highlight.visible = key === locationKey;
  if (placeHighlights.has(locationKey)) {
    for (const mesh of lotMeshes.values()) mesh.userData.outline.visible = false;
  }
  changed = true;
  document.dispatchEvent(new CustomEvent('morada:panorama-location', {detail:locationKey}));
}

function showLot(lot, updatePanorama = true) {
  if (updatePanorama) selectPanorama(lot.block);
  selected=lot;info.replaceChildren();
  document.querySelector(".explorer-panel").classList.add("has-selection");
  const status=lotState(lot),price=verified?catalog.get(lot.id):null;
  info.append(element('span',names[status],'lot-status '+status),element('h2',`Manzana ${lot.block} · Lote ${String(lot.lot).padStart(2,'0')}`));
  if(status!=='blocked'&&status!=='sold'){
    const amount=currency.value==='USD'?price?.usd_cents:price?.cents;
    const regularOffer=currency.value==='USD'?price?.offer_usd:price?.offer_pen;
    const cashOffer=currency.value==='USD'?price?.offer_cash_usd:price?.offer_cash_pen;
    const offer=(cashOffer?.savings||0)>(regularOffer?.savings||0)?cashOffer:regularOffer;
    if(offer?.savings>0){info.append(element('span','Precio de lista','price-list-label'),element('del',money(amount),'lot-original-price'),element('span',offer.promotion.payment==='cash'?'Precio con descuento · Al contado':'Precio con descuento','price-final-label'),element('div',money(Math.round(offer.total*100)),'lot-price'),element('p',`Ahorras ${money(Math.round(offer.savings*100))} · ${offer.promotion.name}`,'lot-promotion'));if(offer.promotion.terms)info.append(element('p',offer.promotion.terms));}
    else info.append(element('div',amount==null?'Precio por confirmar':money(amount),'lot-price'+(amount==null?' pending':'')));
    info.append(element('p',amount==null?'Solicita el precio vigente a nuestro equipo.':'Importe publicado por el propietario. Sin conversión de moneda.'));
    if(price?.area>0)info.append(element('div',`Área: ${new Intl.NumberFormat('es-PE').format(price.area)} m²`,'lot-facts'));
  }else info.append(element('p',status==='sold'?'Este lote ya fue vendido. Puedes consultar otras opciones disponibles.':'Esta manzana no está disponible para cotización ni separación. Puedes explorar otras manzanas.'));
  if(status==='available'||status==='unknown'){
    const link=element('a',status==='available'?'Solicitar cotización':'Consultar este lote','primary');
    link.href=`cotizacion.html?manzana=${lot.block}&lote=${lot.lot}&moneda=${currency.value}`;info.append(link);
    if(status==='available'){const hold=element('a','Solicitar separación','secondary');hold.href=link.href+'&solicitud=separacion';info.append(hold);}
    info.append(element('p','La solicitud será atendida por un asesor y no confirma una reserva automática.'));
  }
  if(status==='sold'||status==='separated'){
    const link=element('a','Consultar alternativas','primary');link.href='contacto.html';info.append(link);
  }
  const mesh=lotMeshes.get(lot.id);
  if(mesh){const focus=element('button','Ver este lote de cerca','secondary');focus.type='button';focus.onclick=()=>focusLot(lot);info.append(focus);}
  else info.append(element('p','Este lote figura en el catálogo, pero su polígono está pendiente de verificación.'));
  list.value=lot.id;
  filtersPanel.open=false;
  const url=new URL(location.href);url.searchParams.set('lote',lot.id);url.searchParams.set('moneda',currency.value);history.replaceState(null,'',url);
  const share=element('button','Copiar enlace de este lote','share-lot');share.type='button';share.onclick=async()=>{try{await navigator.clipboard.writeText(url.href);share.textContent='Enlace copiado';}catch{const field=element('input');field.value=url.href;field.readOnly=true;field.setAttribute('aria-label','Enlace del lote para copiar');info.append(field);field.select();}};info.append(share);
  for(const [id,item] of lotMeshes){item.userData.outline.visible=id===lot.id;item.userData.outline.material.color.set('#ffe9a0');}
  changed=true;
}
function updateList(){
  const search=$('#lotSearch').value.trim().toUpperCase().replace(/\s+/g,'').replace(/^([A-K])-?(\d{1,2})$/,(_,b,n)=>b+'-'+n.padStart(2,'0'));
  const block=$('#blockFilter').value,status=$('#statusFilter').value;
  const filtered=lots.filter(l=>(!block||l.block===block)&&(!status||lotState(l)===status)&&(!search||l.id.includes(search)));
  $('#filterCount').textContent=filtered.length?`${filtered.length} ${filtered.length===1?'lote coincide':'lotes coinciden'} con tu búsqueda.`:'No hay coincidencias. Prueba otra manzana o limpia los filtros.';
  $('#clearFilters').hidden=!search&&!block&&!status;
  const filteredIds=new Set(filtered.map(l=>l.id));
  list.replaceChildren(new Option(filtered.length?`Selecciona un lote (${filtered.length})`:'No hay coincidencias',''));
  for(const lot of filtered)list.add(new Option(`${lot.id} · ${names[lotState(lot)]}`,lot.id));
  if(selected && filtered.some(l=>l.id===selected.id))list.value=selected.id;
  else if(selected){selected=null;document.querySelector('.explorer-panel').classList.remove('has-selection');info.replaceChildren(element('h2','Selecciona un lote'),element('p','Utiliza los resultados del filtro o elige un lote en el plano.'));for(const mesh of lotMeshes.values())mesh.userData.outline.visible=false;}

  changed=true;
}
function moveCamera(position,target){
  if(!controls)return;
  stopTour();
  if(reducedMotion.matches){camera.position.copy(position);controls.target.copy(target);changed=true;return;}
  cameraMove={started:performance.now(),from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target};
}
function focusLot(lot){
  const mesh=lotMeshes.get(lot.id);if(!mesh)return;
  mesh.updateMatrixWorld();const box=new THREE.Box3().setFromObject(mesh);const target=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());const distance=Math.max(size.x,size.z)*2+40;
  moveCamera(target.clone().add(new THREE.Vector3(distance*.4,distance,distance*.8)),target);
}
function setView(next){view=next;$('#perspective').setAttribute('aria-pressed',String(next==='perspective'));$('#topView').setAttribute('aria-pressed',String(next==='top'));moveCamera(center.clone().add(next==='top'?new THREE.Vector3(0,radius*(mobileLayout.matches?.95:1.35),1):new THREE.Vector3(radius*.15,radius*.8,radius*.8)),center.clone());}
function stopTour(){flying=false;$('#tour').setAttribute('aria-pressed','false');$('#tour').textContent='Recorrido aéreo';}
function removeLotVisual(id){
 const group=lotGroups.get(id);if(!group)return;
 group.traverse(object=>{
   if(object.userData.sharedHouseResources)return;
   object.geometry?.dispose();
   if(object.material)for(const mat of Array.isArray(object.material)?object.material:[object.material])mat.dispose();
 });
 scene.remove(group);lotGroups.delete(id);
 const mesh=lotMeshes.get(id),index=pickTargets.indexOf(mesh);if(index>=0)pickTargets.splice(index,1);lotMeshes.delete(id);

}
async function refreshCatalog(redraw=true,initialRequest=null){
 if(catalogRefreshing)return;catalogRefreshing=true;$('#refreshCatalog').disabled=true;
 const previous=new Map(catalog),wasVerified=verified;
 try{const response=await (initialRequest||fetch('/api/catalogo',{cache:'no-store'}));if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.lots))throw new Error();catalog.clear();for(const lot of data.lots)if(lot.price)catalog.set(lot.id,lot.price);verified=true;}
 catch{verified=false;}
 finally{catalogRefreshing=false;$('#refreshCatalog').disabled=false;}
 const count={available:0,separated:0,sold:0,unknown:0,blocked:0};for(const lot of lots)count[lotState(lot)]++;
 $('#catalogStatus').textContent=verified?`${count.available} disponibles · ${count.separated} separados · ${count.sold} vendidos · ${count.unknown} por confirmar. Actualizado a las ${new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`:'No se pudo actualizar. Los estados se muestran por confirmar. Pulsa Actualizar para reintentar.';
 if(redraw&&catalogReady){
  for(const lot of lots){const oldState=blockedBlocks.has(lot.block)?'blocked':wasVerified?previous.get(lot.id)?.status||'unknown':'unknown';if(oldState!==lotState(lot)){removeLotVisual(lot.id);buildLot(lot);}}
  if(typeof seasonalTheme!=='undefined')seasonalTheme.refreshMaterials();landscapeVisual?.repaint();updateList();if(selected){const open=filtersPanel.open;showLot(selected,false);filtersPanel.open=open;}changed=true;
 }
}
$('#refreshCatalog').onclick=()=>refreshCatalog();
$('#clearFilters').onclick=()=>{selectPanorama(selected?.block || '');for(const id of ['blockFilter','statusFilter','lotSearch'])$('#'+id).value='';updateList();};
window.addEventListener('focus',()=>{if(catalogReady)refreshCatalog();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&catalogReady)refreshCatalog();});

function planStage(text){if(!renderer)return;const message=loading.querySelector('.plan-loading-copy');if(message)message.textContent=text;}
const yieldToPage=()=>new Promise(resolve=>setTimeout(resolve,0));
async function planAsset(path){const response=await fetch(path);if(!response.ok)throw new Error('No se pudo descargar '+path);return response.json();}
async function initialize(){
  try{
    planStage('Descargando lotes, relieve y vías…');
    const initialCatalog=fetch('/api/catalogo',{cache:'no-store'});initialCatalog.catch(()=>{});
    const assets=await Promise.allSettled([planAsset('lots.json'),planAsset('cad-terrain.json'),planAsset('cad-landscape.json')]);
    if(assets[0].status!=='fulfilled')throw new Error('lot catalog');
    lots=assets[0].value;await refreshCatalog(false,initialCatalog);
    for(const block of [...new Set(lots.map(l=>l.block))].sort())$('#blockFilter').add(new Option(`Manzana ${block}${blockedBlocks.has(block)?' · Fuera de venta':''}`,block));
    if(assets[1].status==='fulfilled'){terrain=extendTerrain(assets[1].value);if(renderer){const geo=groundGeometry(terrain);ground.geometry.dispose();ground.geometry=geo;ground.rotation.x=0;ground.position.y=0;}}else terrain=null;
    roadSurfaces=assets[2].status==='fulfilled'?assets[2].value.roadSurfaces||[]:[];
    for(let i=0;i<lots.length;i++){buildLot(lots[i]);if(i%12===11){planStage(`Preparando lotes: ${i+1} de ${lots.length}…`);await yieldToPage();}}
    catalogReady=true;
    if(renderer){
      planStage('Preparando el entorno y los detalles…');await yieldToPage();
      try{if(assets[2].status!=='fulfilled')throw new Error('landscape');const landscape=buildLandscape(scene,terrain,assets[2].value,lots,ground,{statusFor:lotState,palette,numbersVisible:()=>numbersEnabled,anisotropy:Math.min(8,renderer.capabilities.getMaxAnisotropy())});landscapeVisual=landscape;createPlaceMarkers();seasonalTheme.setLayout(assets[2].value,landscape);lotMeshes.forEach(applyRaisedLotMaterial);const toggle=$('#contextToggle');toggle.hidden=false;toggle.onclick=()=>{landscape.context.visible=!landscape.context.visible;toggle.setAttribute('aria-pressed',String(landscape.context.visible));landscape.repaint();changed=true;};}catch(error){console.error('Landscape loading failed',error);ground.material.map=null;ground.material.color.set('#b6a48c');ground.material.onBeforeCompile=()=>{};ground.material.customProgramCacheKey=()=> 'basic-plan-fallback';ground.material.needsUpdate=true;for(const mesh of lotMeshes.values()){mesh.material[0].visible=true;mesh.material[0].map=lotState(mesh.userData)==='available'?grass:null;mesh.material[0].needsUpdate=true;}}
    }
    if(renderer)for(const block of [...new Set(lots.map(l=>l.block))]){const points=lots.filter(l=>l.block===block&&l.polygon).flatMap(l=>l.polygon);if(!points.length)continue;const x=(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2,y=(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2;blockLabels.push(makeFloatingLabel(scene,block,x,y,terrain,{width:38,block}));}
    updateList();
    if(renderer){const bounds=new THREE.Box3();lotMeshes.forEach(m=>{m.updateMatrixWorld(true);bounds.expandByObject(m);});bounds.getCenter(center);const sphere=bounds.getBoundingSphere(new THREE.Sphere());projectRadius=sphere.radius;const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);radius=sphere.radius/Math.sin(Math.min(vertical,horizontal)/2)*.95;controls.maxDistance=mobileLayout.matches?Math.max(900,radius*1.45):900;if(!terrain){ground.position.x=center.x;ground.position.z=center.z;}sun.target.position.copy(center);scene.add(sun.target);setView('perspective');cameraMove=null;camera.position.copy(center).add(new THREE.Vector3(radius*.15,radius*.8,radius*.8));controls.target.copy(center);planStage('Preparando la vista…');await yieldToPage();if(renderer.compileAsync)await renderer.compileAsync(scene,camera);loading.hidden=true;delete host.dataset.loading;host.dataset.loadMs=String(Math.round(performance.now()-planStarted));changed=true;}
    const params=new URLSearchParams(location.search);const requestedBlock=params.get('manzana')?.toUpperCase();if(requestedBlock&&lots.some(l=>l.block===requestedBlock)){$('#blockFilter').value=requestedBlock;updateList();}if(requestedBlock)selectPanorama(requestedBlock);if(params.get('vista')==='parque')$('#parkView').click();const initial=lots.find(l=>l.id===params.get('lote'));if(initial)showLot(initial);
  }catch{loading.hidden=false;loading.replaceChildren(element('p','No pudimos cargar el plano.','plan-loading-title'),element('p','Revisa tu conexión. Puedes volver a intentarlo sin perder el lote del enlace.','plan-loading-copy'));const retry=element('button','Volver a cargar el plano');retry.type='button';retry.onclick=()=>location.reload();loading.append(retry);$('#catalogStatus').textContent='Catálogo no disponible.';}
}
list.onchange=()=>{const lot=lots.find(l=>l.id===list.value);if(lot)showLot(lot);};
for(const id of ['blockFilter','statusFilter','lotSearch'])$('#'+id).addEventListener('input',updateList);
currency.value=new URLSearchParams(location.search).get('moneda')==='USD'?'USD':'PEN';
currency.onchange=()=>{if(selected)showLot(selected,false);};
function zoomBy(factor){if(!controls)return;const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));moveCamera(controls.target.clone().add(offset),controls.target.clone());}
$('#zoomIn3d').onclick=()=>zoomBy(.76);$('#zoomOut3d').onclick=()=>zoomBy(1.3);
$('#numbersToggle').onclick=()=>{numbersEnabled=!numbersEnabled;$('#numbersToggle').setAttribute('aria-pressed',String(numbersEnabled));landscapeVisual?.repaint();changed=true;};
$('#blockFilter').addEventListener('input', event => selectPanorama(event.target.value || selected?.block || ''));
$('#gateView').onclick=()=>{const target=new THREE.Vector3(627-500,terrainHeight(627,410),410-380);selectPanorama('PORTICO');moveCamera(target.clone().add(new THREE.Vector3(55,100,85)),target);};
$('#parkView').onclick=()=>{const target=new THREE.Vector3(428-500,terrainHeight(428,503),503-380);selectPanorama('PARQUE');moveCamera(target.clone().add(new THREE.Vector3(85,155,125)),target);};
$('#perspective').onclick=()=>setView('perspective');$('#topView').onclick=()=>setView('top');$('#reset').onclick=()=>{selectPanorama('');setView(view);};
$('#tour').onclick=()=>{if(flying){stopTour();return;}if(reducedMotion.matches){$('#catalogStatus').textContent='Movimiento reducido activado: utiliza las vistas manuales.';return;}cameraMove=null;flying=true;$('#tour').textContent='Pausar recorrido';$('#tour').setAttribute('aria-pressed','true');};
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)stopTour();});
if(renderer){
 const ray=new THREE.Raycaster();let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit = ray.intersectObjects(pickTargets)[0];
   const gateHit = landscapeVisual?.gate && ray.intersectObject(landscapeVisual.gate, true)[0];
   if (gateHit && (!hit || gateHit.distance < hit.distance)) {
     $('#gateView').click();
   } else if (hit) {
     showLot(hit.object.userData);
   } else if (landscapeVisual?.park) {
     const surface = ray.intersectObject(ground, false)[0];
     if (surface && pointInside([surface.point.x + 500, surface.point.z + 380], landscapeVisual.park)) {
       $('#parkView').click();
     }
   }});
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const widthChanged=Math.abs(w-sceneWidth)>40;sceneWidth=w;sceneHeight=h;renderer.setSize(w,h);camera.aspect=w/h;if(w>760)camera.setViewOffset(w,h,-165,0,w,h);else camera.clearViewOffset();camera.updateProjectionMatrix();if(projectRadius&&widthChanged){const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);radius=projectRadius/Math.sin(Math.min(vertical,horizontal)/2)*.95;controls.maxDistance=mobileLayout.matches?Math.max(900,radius*1.45):900;if(!selected&&!flying)setView(view);}changed=true;}).observe(host);
 let last=performance.now();renderer.setAnimationLoop(t=>{const dt=Math.min((t-last)/1000,.05);last=t;if(document.hidden)return;if(cameraMove){const f=Math.min((t-cameraMove.started)/850,1),ease=1-(1-f)**3;camera.position.lerpVectors(cameraMove.from,cameraMove.to,ease);controls.target.lerpVectors(cameraMove.fromTarget,cameraMove.target,ease);if(f===1)cameraMove=null;changed=true;}if(flying){phase+=dt*.1;camera.position.set(center.x+Math.sin(phase)*radius,center.y+radius*.72,center.z+Math.cos(phase)*radius);controls.target.copy(center);changed=true;}controls.update();if(projectRadius&&scene.fog){const clearDistance=camera.position.distanceTo(center)-projectRadius*.15;scene.fog.near=Math.max(350,clearDistance);scene.fog.far=scene.fog.near+Math.max(1000,projectRadius*3.4);}if(keepCameraAboveTerrain(camera,controls,terrain))changed=true;if(changed)updatePlaceMarkers();const labelsAnimating=updateFloatingLabels(t,dt);const themeAnimating=seasonalTheme.tick(t);if(changed||labelsAnimating||themeAnimating){renderer.render(scene,camera);cinematicGrade.apply(view==='top'?.40:.86);changed=false;}});
 window.addEventListener('pagehide',()=>{seasonalTheme.dispose();renderer.setAnimationLoop(null);controls.dispose();cinematicGrade.dispose();renderer.dispose();},{once:true});
}
initialize();

window.addEventListener('morada:retry',()=>{if(catalogReady)refreshCatalog();});
