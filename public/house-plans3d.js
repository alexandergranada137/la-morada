import { pointInside } from './landscape3d.js';

// Each footprint is in house-local units, with the street toward positive Z.
// The side wing shares a wall with the main volume and can face either way.
export const housePlans = [
  {name:'Compacta', main:[-.51,.51,-.41,.45], wing:null, upper:[-.40,.37,-.37,.31], door:.28},
  {name:'En L', main:[-.47,.16,-.49,.48], wing:[.16,.53,-.49,.14], upper:[-.44,.10,-.44,.33], door:-.19},
  {name:'Con terraza', main:[-.52,.18,-.39,.44], wing:[.18,.52,-.20,.44], upper:[-.40,.40,-.19,.29], door:.34},
  {name:'De fondo largo', main:[-.36,.36,-.56,.52], wing:null, upper:[-.33,.31,-.49,.16], door:.15},
  {name:'Doble fachada', main:[-.50,.16,-.43,.49], wing:[.16,.53,-.37,.32], upper:[-.46,.45,-.34,.25], door:-.18},
];

export function houseEntry({main,wing,door}) {
  return [door,wing && door>=wing[0] ? wing[3] : main[3]];
}

export function housePerimeter({main:[left,right,back,front],wing}) {
  if (!wing) return [[left,back],[right,back],[right,front],[left,front]];
  const [,outer,wingBack,wingFront] = wing;
  const perimeter = [[left,back],[right,back],[right,wingBack],[outer,wingBack],
    [outer,wingFront],[right,wingFront],[right,front],[left,front]];
  return perimeter.filter(([x,z],index) => {
    const [px,pz]=perimeter[(index+perimeter.length-1)%perimeter.length];
    return x!==px || z!==pz;
  });
}

function segmentHitsRect([x,z],[endX,endZ],[left,right,back,front]) {
  let start=0,end=1;
  for(const [value,delta,low,high] of [[x,endX-x,left,right],[z,endZ-z,back,front]]) {
    if(!delta) {
      if(value<low || value>high) return false;
      continue;
    }
    const a=(low-value)/delta,b=(high-value)/delta;
    start=Math.max(start,Math.min(a,b));
    end=Math.min(end,Math.max(a,b));
    if(start>end) return false;
  }
  return true;
}

export function fitHouse(points, right, forward, area, seed, cornerSide=0, street=null) {
  const [originX,originY]=points[0];
  const local=([x,y])=>[
    (x-originX)*right[0]+(y-originY)*right[1],
    (x-originX)*forward[0]+(y-originY)*forward[1],
  ];
  const parcel=points.map(local);
  const streetEdge=street?.map(local);
  const edges=parcel.map((point,i)=>[point,parcel[(i+1)%parcel.length]]);
  const xs=parcel.map(point=>point[0]),zs=parcel.map(point=>point[1]);
  const left=Math.min(...xs),rightEdge=Math.max(...xs),back=Math.min(...zs),front=Math.max(...zs);
  const width=rightEdge-left,depth=front-back;
  const fractions=[.32,.41,.50,.59,.68];
  const fits=rect=>pointInside([(rect[0]+rect[1])/2,(rect[2]+rect[3])/2],parcel)
    && edges.every(edge=>!segmentHitsRect(...edge,rect));
  const preferred=seed%4;
  let best=null;
  for(const [index,plan] of housePlans.entries()){
    if(index===4 && !cornerSide)continue;
    const mirror=cornerSide || (seed%2 ? -1 : 1);
    const footprint=[plan.main,...(plan.wing ? [plan.wing] : [])];
    const footprintArea=footprint.reduce((sum,[a,b,c,d])=>sum+(b-a)*(d-c),0);
    const [door,entryFront]=houseEntry(plan);
    for(const aspect of [.78,1,1.23]){
      const maxSize=Math.min(18,Math.sqrt(area*.48/footprintArea),width/(aspect*.74),depth*aspect/.78);
      for(const fraction of [1,.91,.82,.73,.64,.55,.46,.36]){
        const size=maxSize*fraction;
        const scaleX=size*aspect,scaleZ=size/aspect;
        const margin=Math.min(1.5,size*.13);
        const rects=footprint.map(([a,b,c,d])=>[
          Math.min(a*mirror,b*mirror)*scaleX-margin,Math.max(a*mirror,b*mirror)*scaleX+margin,
          c*scaleZ-margin,d*scaleZ+margin,
        ]);
        const [u0,u1,v0,v1]=rects.reduce(([a,b,c,d],rect)=>[
          Math.min(a,rect[0]),Math.max(b,rect[1]),Math.min(c,rect[2]),Math.max(d,rect[3]),
        ],[Infinity,-Infinity,Infinity,-Infinity]);
        if(u1-u0>=width || v1-v0>=depth)continue;
        const score=footprintArea*size*size*(index===4 ? 1.30 : index===preferred ? 1.28 : 1);
        if(best && score<=best.score)break;
        let placed=false;
        for(const vFraction of [.40,.50,.30,.60,.70]){
          const v=back-v0+(depth-v1+v0)*vFraction;
          for(const uFraction of fractions){
            const u=left-u0+(width-u1+u0)*uFraction;
            if(!rects.every(([a,b,c,d])=>fits([a+u,b+u,c+v,d+v])))continue;
            if(streetEdge) {
              const [[a,gateZ],[b]]=streetEdge;
              const width=Math.min(.76,Math.abs(b-a)*.16);
              const porchU=u+door*mirror*scaleX,porchV=v+entryFront*scaleZ;
              const gateU=Math.max(Math.min(a,b)+width,Math.min(Math.max(a,b)-width,porchU));
              const pathFits=[.05,.15,.30,.45,.60,.75,.90].every(t=>
                pointInside([gateU+(porchU-gateU)*t,gateZ+(porchV-gateZ)*t],parcel));
              if(!pathFits)continue;
            }
            best={plan:index,mirror,size,scaleX,scaleZ,score,
              x:originX+u*right[0]+v*forward[0],y:originY+u*right[1]+v*forward[1]};
            placed=true;
            break;
          }
          if(placed)break;
        }
        if(placed)break;
      }
    }
  }
  return best;
}

function streetFrontages(points, winding, roadSurfaces) {
  return points.map(([ax,ay], index) => {
    const [bx,by]=points[(index+1)%points.length];
    const length=Math.hypot(bx-ax,by-ay);
    if (!length) return null;
    const nx=(by-ay)/length*winding, ny=-(bx-ax)/length*winding;
    let score=0;
    for (const fraction of [.2,.4,.6,.8]) {
      for (const offset of [1,2.5,4]) {
        const p=[ax+(bx-ax)*fraction+nx*offset,ay+(by-ay)*fraction+ny*offset];
        if (roadSurfaces.some(road=>pointInside(p,road.points)&&!road.holes?.some(hole=>pointInside(p,hole)))) {
          score+=1/offset;
          break;
        }
      }
    }
    return {index,nx,ny,length,score};
  }).filter(Boolean).sort((a,b)=>b.score*b.length-a.score*a.length||b.length-a.length);
}

export function fitLotHouse(points,winding,area,seed,roadSurfaces) {
  const fronts=streetFrontages(points,winding,roadSurfaces);
  if(!fronts.length)return null;
  const roadside=fronts.filter(front=>front.score>0);
  for(const front of roadside.length ? roadside : fronts.slice(0,1)) {
    const right=[front.ny,-front.nx],forward=[front.nx,front.ny];
    const corner=roadside.find(side=>side.score>=1 && side.length>=3
      && Math.abs(side.nx*front.nx+side.ny*front.ny)<.55);
    const cornerSide=corner ? Math.sign(corner.nx*right[0]+corner.ny*right[1]) : 0;
    const street=front.score>0 ? [points[front.index],points[(front.index+1)%points.length]] : null;
    const placement=fitHouse(points,right,forward,area,seed,cornerSide,street);
    if(placement)return {...placement,front,right,forward};
  }
  return null;
}
