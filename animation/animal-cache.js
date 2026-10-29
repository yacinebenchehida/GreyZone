/* Reuse poses from the original renderers on devices that miss the draw budget.
   No population data, animal positions or genetic state are stored in this cache. */
(function(root){
'use strict';
const TAU=Math.PI*2,phases=24,bends=7;
const rates={hammer:1,classic:1,tuna:1,surgeon:1,turtle:.22,orca:.43,seal:.57,whale:.29,porpoise:.48};
class AnimalPoseCache{
  constructor(){this.kind=null;this.images=new Map();}
  pose(animal,kind){
    const rate=rates[kind]||1,phase=((animal.stroke||0)*rate%TAU+TAU)%TAU;
    const p=Math.round(phase/TAU*phases)%phases;
    const b=Math.round((Math.max(-.72,Math.min(.72,animal.bend||0))+.72)/1.44*(bends-1));
    return {key:p+':'+b+(kind==='whale'&&CetaceanCharacter.textured()?':skin':''),stroke:p/phases*TAU/rate,bend:-.72+b/(bends-1)*1.44,effort:.85,phase:0};
  }
  draw(c,animal,time,options){
    const kind=options.variant||'hammer';
    if(this.kind!==kind){this.kind=kind;this.images.clear();}
    const pose=this.pose(animal,kind);let image=this.images.get(pose.key);
    if(!image){
      image=document.createElement('canvas');image.width=128;image.height=80;
      const paint=image.getContext('2d');if(!paint)return false;
      paint.setTransform(.5,0,0,.5,64,40);
      SeaLife.draw(paint,{...pose,x:0,y:0,heading:0,scale:1},0,{variant:kind,skipWake:true});
      this.images.set(pose.key,image);
    }
    c.save();c.translate(animal.x,animal.y);c.rotate(animal.heading||0);c.scale(animal.scale||1,animal.scale||1);
    c.drawImage(image,-128,-80,256,160);
    if(kind==='whale'||kind==='porpoise'){c.restore();CetaceanCharacter.surface(c,animal,time,kind);c.save();c.translate(animal.x,animal.y);c.rotate(animal.heading||0);c.scale(animal.scale||1,animal.scale||1);}
    if(options.snps)SeaLife.drawMarkers(c,pose,options);
    c.restore();return true;
  }
}
root.AnimalPoseCache=AnimalPoseCache;
})(globalThis);
