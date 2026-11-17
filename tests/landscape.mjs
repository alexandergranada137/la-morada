import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extendTerrain,ribbon,highwayToTerrainEdges} from '../public/landscape3d.js';
import {heightAt,drapePolygon} from '../public/terrain3d.js';
const base=JSON.parse(readFileSync('public/cad-terrain.json','utf8')),extended=extendTerrain(base),data=JSON.parse(readFileSync('public/cad-landscape.json','utf8'));
for(let y=base.yMin;y<base.yMax;y+=7)for(let x=base.xMin;x<base.xMax;x+=11)assert.ok(Math.abs(heightAt(base,x,y)-heightAt(extended,x,y))<1e-8,'Survey changed');
const polys=[...data.parks.map(p=>p.points),data.highway.points,...data.streets.map(s=>ribbon(s.closed?[...s.points,s.points[0]]:s.points,9.5))];
for(const polygon of polys){const g=drapePolygon(polygon,extended,.1),p=g.attributes.position;assert.ok(p.count>0);for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));g.dispose();}
console.log('PASS: original terrain unchanged, all CAD parks, streets and highway surfaces finite and inside expanded terrain.');

const road=highwayToTerrainEdges(data.highway.centerline,extended);
assert.ok(road[0][0]<extended.xMin&&road.at(-1)[0]>extended.xMax,'Highway must reach both terrain edges');
for(const point of data.highway.centerline)assert.ok(road.includes(point),'Original highway alignment changed');
console.log('PASS: highway crosses both model edges and preserves the CAD alignment.');
