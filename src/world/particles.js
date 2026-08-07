/* ============================================================
   src/world/particles.js — quality-aware particles
   ============================================================ */
import * as THREE from 'three';
import { scene } from './scene.js';

export let starsPoints, dustPoints, crowdMesh, userOrb;

export function buildStars(quality='high') {
  const count = quality==='low' ? 800 : quality==='medium' ? 1500 : 3000;
  const pos=new Float32Array(count*3), col=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r=600+Math.random()*400, t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(p)*Math.cos(t); pos[i*3+1]=r*Math.sin(p)*Math.sin(t); pos[i*3+2]=r*Math.cos(p);
    const b=0.5+Math.random()*0.5; col[i*3]=b; col[i*3+1]=b; col[i*3+2]=b+Math.random()*0.3;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  starsPoints=new THREE.Points(geo,new THREE.PointsMaterial({size:0.8,vertexColors:true,transparent:true,opacity:0.9}));
  scene.add(starsPoints);
  return starsPoints;
}

export function buildDust(quality='high') {
  if(quality==='low') return;
  const count=quality==='medium'?300:800;
  const pos=new Float32Array(count*3);
  for(let i=0;i<count;i++){pos[i*3]=(Math.random()-0.5)*60;pos[i*3+1]=Math.random()*160;pos[i*3+2]=(Math.random()-0.5)*60;}
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  dustPoints=new THREE.Points(geo,new THREE.PointsMaterial({color:0x4488ff,size:0.12,transparent:true,opacity:0.4}));
  scene.add(dustPoints);
  return dustPoints;
}

export function buildCrowdOrbs(quality='high') {
  const count=quality==='low'?200:quality==='medium'?500:1000;
  const dummy=new THREE.Object3D();
  crowdMesh=new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.18,quality==='low'?4:6,quality==='low'?4:6),
    new THREE.MeshStandardMaterial({color:0x1a4a8a,emissive:0x0033aa,emissiveIntensity:0.6,roughness:0.3,metalness:0.8}),
    count
  );
  for(let i=0;i<count;i++){
    const ring=Math.floor(i/80),angle=(i%80)/80*Math.PI*2,r=2+ring*0.9;
    dummy.position.set(Math.cos(angle)*r,108+Math.sin(i*0.4)*0.3,Math.sin(angle)*r);
    dummy.scale.setScalar(1); dummy.updateMatrix(); crowdMesh.setMatrixAt(i,dummy.matrix);
    crowdMesh.setColorAt(i,new THREE.Color(Math.random()<0.05?0xff3030:0x1a4a8a));
  }
  crowdMesh.instanceMatrix.needsUpdate=true; crowdMesh.instanceColor.needsUpdate=true;
  crowdMesh.visible=false; scene.add(crowdMesh);

  userOrb=new THREE.Mesh(
    new THREE.SphereGeometry(0.28,12,12),
    new THREE.MeshStandardMaterial({color:0xfbbf24,emissive:0xfbbf24,emissiveIntensity:2.0,roughness:0,metalness:0})
  );
  userOrb.position.set(2,108,0); userOrb.visible=false; scene.add(userOrb);
  userOrb.add(new THREE.PointLight(0xfbbf24,3,5));
  return {crowdMesh,userOrb};
}

let confettiMesh=null;
const confettiV=[];
export function triggerConfetti(){
  const count=150, pos=new Float32Array(count*3), col=new Float32Array(count*3);
  const colors=[[1,0.73,0.14],[0,0.83,1],[0.25,1,0.5],[1,0.25,0.4]];
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-0.5)*8; pos[i*3+1]=112+Math.random()*2; pos[i*3+2]=(Math.random()-0.5)*8;
    const c=colors[Math.floor(Math.random()*colors.length)];
    col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2];
    confettiV.push({x:(Math.random()-0.5)*0.15,y:0.05+Math.random()*0.1,z:(Math.random()-0.5)*0.15});
  }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  if(confettiMesh)scene.remove(confettiMesh);
  confettiMesh=new THREE.Points(geo,new THREE.PointsMaterial({size:0.3,vertexColors:true,transparent:true}));
  scene.add(confettiMesh);
  setTimeout(()=>{if(confettiMesh){scene.remove(confettiMesh);confettiMesh=null;}confettiV.length=0;},4000);
}

export function animateParticles(delta){
  if(dustPoints){
    dustPoints.rotation.y+=delta*0.01;
    const p=dustPoints.geometry.attributes.position.array;
    for(let i=1;i<p.length;i+=3){p[i]+=delta*0.4;if(p[i]>160)p[i]=0;}
    dustPoints.geometry.attributes.position.needsUpdate=true;
  }
  if(confettiMesh&&confettiV.length){
    const p=confettiMesh.geometry.attributes.position.array;
    for(let i=0;i<confettiV.length;i++){p[i*3]+=confettiV[i].x;p[i*3+1]+=confettiV[i].y;p[i*3+2]+=confettiV[i].z;confettiV[i].y-=delta*0.08;}
    confettiMesh.geometry.attributes.position.needsUpdate=true;
  }
}
