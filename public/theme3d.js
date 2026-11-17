import {resolveSceneDesign} from './scene-theme-design.js';
import {addSeasonalWeather} from './theme-weather3d.js';
import {buildSeasonalModel,seasonalSlots} from './seasonal-models3d.js';
import * as THREE from './vendor/three/three.module.js';
import {heightAt} from './terrain3d.js';
import {parkCenterAt} from './amenities3d.js';
// Temporary decoration only: no modifications to survey geometry or lot materials.
export function createSceneTheme(scene,{getTerrain,invalidate}){
 const originalColors=new Map(),originalLights=new Map();
 const originalBackground=scene.background,originalFog=scene.fog?.color.clone();let temporarySky=null,group=null,layout=null,appearance=null,theme=window.MoradaTheme||null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches||!theme?.decoration.animated;
 function clear(){appearance?.setTheme?.(null);for(const [light,value] of originalLights){light.intensity=value.intensity;light.color.copy(value.color);}originalLights.clear();for(const [material,color] of originalColors)material.color.copy(color);originalColors.clear();if(group){scene.remove(group);const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material){materials.add(node.material);if(node.material.map)textures.add(node.material.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group=null;}if(temporarySky){temporarySky.dispose();temporarySky=null;}scene.background=originalBackground;if(originalFog)scene.fog.color.copy(originalFog);}
 function apply(){
  clear();if(!theme?.scene.enabled){invalidate();return;}
  const canvas=document.createElement('canvas');canvas.width=2;canvas.height=256;const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,theme.colors.sky);gradient.addColorStop(1,theme.scene.timeOfDay==='night'?'#29364e':theme.scene.timeOfDay==='sunset'?'#edc4a7':theme.colors.surface);ctx.fillStyle=gradient;ctx.fillRect(0,0,2,256);temporarySky=new THREE.CanvasTexture(canvas);temporarySky.colorSpace=THREE.SRGBColorSpace;scene.background=temporarySky;if(scene.fog)scene.fog.color.set(theme.colors.sky);
  scene.traverse(light=>{if(!light.isLight)return;originalLights.set(light,{intensity:light.intensity,color:light.color.clone()});if(theme.scene.timeOfDay==='night'){light.intensity*=light.isDirectionalLight ? .22 : .75;}else if(theme.scene.timeOfDay==='sunset'&&light.isDirectionalLight){light.intensity*=.8;light.color.set('#ffd7ac');}});
  refreshMaterials();
  appearance?.setTheme?.({...theme,scene:{...theme.scene,elements:resolveSceneDesign(theme)}});
  const park=layout?.parks?.[0]?.points;if(!park||(!theme.scene.decorations&&!(theme.scene.models||[]).length&&(!theme.scene.weather||theme.scene.weather==='none')&&(!theme.scene.groundCover||theme.scene.groundCover==='none'))){invalidate();return;}
  group=new THREE.Group();group.name='temporary-seasonal-decoration';scene.add(group);
  const ys=park.map(p=>p[1]),low=Math.min(...ys),high=Math.max(...ys),count=theme.scene.decorations&&theme.decoration.motif!=='none'?Math.min(theme.decoration.density,12):0;
  let geometry;
  if(theme.decoration.motif==='stars'){const shape=new THREE.Shape();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,r=i%2?1:2.3;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}shape.closePath();geometry=new THREE.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:false});}
  else if(theme.decoration.motif==='snow')geometry=new THREE.SphereGeometry(1.4,8,6);
  else if(theme.decoration.motif==='leaves')geometry=new THREE.ConeGeometry(1.5,4,6);
  else geometry=new THREE.BoxGeometry(2.2,3.8,.45);
  const materials=[new THREE.MeshBasicMaterial({color:theme.colors.accent}),new THREE.MeshBasicMaterial({color:theme.colors.deep})];
  for(let i=0;i<count;i++){const point=parkCenterAt(park,low+(high-low)*(.15+.7*(i+.5)/count));if(!point)continue;const object=new THREE.Mesh(geometry,materials[i%2]);object.position.set(point[0]-500,heightAt(getTerrain(),...point)+18,point[1]-380);object.userData.baseHeight=object.position.y;object.rotation.y=i*.6;group.add(object);}
  for(const item of seasonalSlots(park,parkCenterAt,theme.scene.models||[])){const model=buildSeasonalModel(item.kind,theme.colors);model.scale.setScalar(item.scale);model.position.set(item.point[0]-500,heightAt(getTerrain(),...item.point),item.point[1]-380);model.userData.stationary=true;group.add(model);}
  addSeasonalWeather(group,theme,getTerrain(),park);
  invalidate();
 }
 function refreshMaterials(){if(!theme?.scene.enabled)return;const palette=resolveSceneDesign(theme);scene.traverse(node=>{const materials=Array.isArray(node.material)?node.material:[node.material];for(const material of materials){const role=material?.userData?.seasonalRole,color=palette[role];if(color&&material.color){if(!originalColors.has(material))originalColors.set(material,material.color.clone());material.color.set(color);}}});invalidate();}
 const onTheme=event=>{theme=event.detail;paused=matchMedia('(prefers-reduced-motion: reduce)').matches||!theme?.decoration.animated;apply();};
 const onMotion=event=>{paused=event.detail.paused;invalidate();};window.addEventListener('morada:theme',onTheme);window.addEventListener('morada:theme-motion',onMotion);
 apply();return {setLayout(data,surfaceAppearance=null){layout=data;appearance=surfaceAppearance;apply();},refreshMaterials,tick(time){if(!group||paused||!group.children.some(object=>!object.userData.stationary))return false;group.children.forEach((object,i)=>{if(object.userData.stationary)return;if(object.userData.weather){const positions=object.geometry.attributes.position,weather=object.userData.weather;for(let n=0;n<positions.count;n++)positions.setY(n,weather.base[n]+180-((weather.phase[n]+time*.004)%150));positions.needsUpdate=true;return;}object.rotation.y=time*.00015+i*.6;object.position.y=object.userData.baseHeight+Math.sin(time*.0007+i)*1.2;});return true;},dispose(){window.removeEventListener('morada:theme',onTheme);window.removeEventListener('morada:theme-motion',onMotion);clear();}};
}
