import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three/three.module.js';
const canvases=[];
function context(){return {path:[],fills:[],fillStyle:'',globalAlpha:1,stack:[],setTransform(){},beginPath(){this.path=[];},moveTo(x,y){this.path.push([x,y]);},lineTo(x,y){this.path.push([x,y]);},closePath(){},fill(){this.fills.push({path:JSON.stringify(this.path),color:this.fillStyle,alpha:this.globalAlpha});},fillRect(){},stroke(){},setLineDash(){},arc(){},ellipse(){},save(){this.stack.push({fillStyle:this.fillStyle,globalAlpha:this.globalAlpha});},restore(){Object.assign(this,this.stack.pop());},clip(){},createRadialGradient(){return {addColorStop(){}};},createPattern(){return {setTransform(){}};}};}
globalThis.matchMedia=()=>({matches:true});globalThis.DOMMatrix=class{scale(){return this;}};
globalThis.document={createElement(){const ctx=context(),canvas={width:0,height:0,getContext:()=>ctx};canvases.push({canvas,ctx});return canvas;}};
const {createSurfaceAtlas}=await import('../public/landscape3d.js');
const {resolveSceneDesign}=await import('../public/scene-theme-design.js');
const bounds={xMin:0,xMax:100,yMin:0,yMax:100};
const road=[[0,40],[100,40],[100,50],[0,50]],park=[[0,0],[100,0],[100,35],[0,35]],lot=[[20,60],[40,60],[40,80],[20,80]];
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial());ground.geometry.userData.mapBounds=bounds;
const commands=[{points:park,role:'commonGround',color:'#7b9859',map:{name:'grass'},lift:.3,parent:{visible:true}},{points:road,color:'#c1ad8b',lift:.5,parent:{visible:true}}];
const originalCommands=JSON.stringify(commands),originalGeometry=ground.geometry;
const atlas=createSurfaceAtlas(ground,commands,[],[{id:'A-01',polygon:lot}],{statusFor:()=> 'available',palette:{available:'#6d9b49'},numbersVisible:()=>false});atlas.repaint();
const ctx=canvases[0].ctx;const colors=()=>({road:ctx.fills.filter(f=>f.path===JSON.stringify(road)).at(-1).color,park:ctx.fills.filter(f=>f.path===JSON.stringify(park)).at(-1).color,lot:ctx.fills.filter(f=>f.path===JSON.stringify(lot)).at(-1).color});
const initial=colors(),texture=ground.material.map;
for(const style of ['winter','autumn','spring','festive']){const theme={colors:{accent:'#ba3547',deep:'#1f5846'},scene:{style,groundCover:'snow',coverStrength:'balanced',elements:{facades:'#e4d0c0'}}};atlas.setTheme({...theme,scene:{...theme.scene,elements:resolveSceneDesign(theme)}});assert.equal(colors().road,initial.road);assert.equal(colors().lot,initial.lot);assert.notEqual(colors().park,initial.park);assert.equal(ground.geometry,originalGeometry);assert.equal(ground.material.map,texture);assert.equal(JSON.stringify(commands),originalCommands);}
atlas.setTheme(null);assert.deepEqual(colors(),initial);assert.equal(ground.geometry,originalGeometry);
assert.deepEqual(resolveSceneDesign({scene:{style:'natural'}}),{});assert.equal(resolveSceneDesign({colors:{},scene:{style:'winter',elements:{facades:'#abcdef'}}}).facades,'#abcdef');
console.log('PASS: seasonal atlas restyling preserves CAD commands, geometry, roads, lot-state colors and texture identity; removal restores original paint.');
