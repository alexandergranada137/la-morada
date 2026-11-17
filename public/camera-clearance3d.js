import * as THREE from './vendor/three/three.module.js';
import {heightAt} from './terrain3d.js';
const forward=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),point=new THREE.Vector3();
// Camera-only clearance. Never modifies the terrain or lot geometry.
export function keepCameraAboveTerrain(camera,controls,terrain,clearance=6){
 if(!terrain||!controls)return false;
 let changed=false;
 const targetFloor=heightAt(terrain,controls.target.x+500,controls.target.z+380)+.6;
 if(controls.target.y<targetFloor){const rise=targetFloor-controls.target.y;controls.target.y+=rise;camera.position.y+=rise;changed=true;}
 camera.updateMatrixWorld();camera.getWorldDirection(forward);right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
 const near=Math.max(camera.near||2,2),halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov||42)/2)*near,halfWidth=halfHeight*(camera.aspect||1);
 let lift=Math.max(0,heightAt(terrain,camera.position.x+500,camera.position.z+380)+clearance-camera.position.y);
 // Include the center and four corners of the near plane, not just the eye.
 for(const [x,y] of [[0,0],[-1,-1],[-1,1],[1,-1],[1,1]]){point.copy(camera.position).addScaledVector(forward,near).addScaledVector(right,x*halfWidth).addScaledVector(up,y*halfHeight);lift=Math.max(lift,heightAt(terrain,point.x+500,point.z+380)+2-point.y);}
 if(lift>.001){camera.position.y+=lift;changed=true;}
 if(changed){camera.lookAt(controls.target);camera.updateMatrixWorld();}
 return changed;
}
