import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three/three.module.js';
import {keepCameraAboveTerrain} from '../public/camera-clearance3d.js';
import {heightAt} from '../public/terrain3d.js';
const terrain={columns:2,rows:2,xMin:0,xMax:1000,yMin:0,yMax:1000,heights:[0,200,0,200]};
const before=JSON.stringify(terrain),camera=new THREE.PerspectiveCamera(42,1.8,2,3200),controls={target:new THREE.Vector3(0,100.6,0)};
for(const [x,y,z] of [[0,-30,0],[200,1,40],[-100,5,80]]){camera.position.set(x,y,z);camera.lookAt(controls.target);assert.equal(keepCameraAboveTerrain(camera,controls,terrain),true);assert.ok(camera.position.y>=heightAt(terrain,x+500,z+380)+5.99);}
camera.position.set(0,500,300);camera.lookAt(controls.target);const safe=camera.position.clone();assert.equal(keepCameraAboveTerrain(camera,controls,terrain),false);assert.ok(camera.position.equals(safe));
controls.target.set(200,-100,50);const targetBefore=controls.target.clone();keepCameraAboveTerrain(camera,controls,terrain);assert.ok(controls.target.y>=heightAt(terrain,targetBefore.x+500,targetBefore.z+380)+.59);assert.equal(controls.target.x,targetBefore.x);assert.equal(controls.target.z,targetBefore.z);
assert.equal(JSON.stringify(terrain),before);assert.equal(keepCameraAboveTerrain(camera,controls,null),false);
console.log('PASS: camera and near-plane clearance on slopes, safe views unchanged and original terrain immutable.');
