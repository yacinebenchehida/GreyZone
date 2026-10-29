/* Ocean with scaled population counts, migration and neutral-marker colours;
   population genetics is calculated separately in model.js. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
class OceanScene{
  constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.w=1000;this.h=540;this.clock=0;this.last=0;this.wasSplit=false;this.raised=0;this.selected=-1;this.hover=-1;this.detail='full';this.slowDraws=0;this.pendingLite=false;this.poseCache=new AnimalPoseCache();this.reduced=matchMedia('(prefers-reduced-motion: reduce)');canvas.addEventListener('pointermove',e=>{const b=canvas.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;let best=34;this.hover=-1;for(const a of this.animals||[]){const d=Math.hypot(a.x*this.w-x,a.y*this.h-y);if(d<best){best=d;this.hover=a.id;}}canvas.style.cursor=this.hover<0?'default':'pointer';this.onInspect?.();});canvas.addEventListener('pointerleave',()=>{this.hover=-1;this.onInspect?.();});canvas.addEventListener('click',()=>{this.selected=this.selected===this.hover?-1:this.hover;this.onInspect?.();});}
  reset(settings){
    this.settings=settings;this.random=GreyModel.rng(settings.displaySeed??8102);this.wasSplit=false;this.raised=0;this.selected=-1;this.clock=0;this.last=0;this.migrationBudget=0;this.migrationStarts=0;this.nextMigration=0;this.markerCache=null;this.frozenKey=null;
    this.travelPace=this.travelPace||.95;
    this.display=GreyDisplay.summary(settings);
    const r=this.random,n=this.display.total,left=this.display.west;
    this.animals=Array.from({length:n},(_,i)=>{
      const side=i<left?0:1;
      return {id:i,side,x:.08+r()*.84,y:.15+r()*.70,
        heading:r()*TAU,
        phase:r()*TAU,stroke:r()*TAU,effort:.8,speed:.045+r()*.01,size:.87+r()*.18,cross:null};
    });
    this.sparks=Array.from({length:90},()=>({x:r(),y:r(),phase:r()*TAU,size:.5+r()}));this.resize();
  }
  resize(){this.frozenKey=null;const b=this.canvas.getBoundingClientRect();this.w=b.width||1000;this.h=b.height||540;this.dpr=Math.min(this.detail==='lite'?1.25:2,devicePixelRatio||1);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.c.setTransform(this.dpr,0,0,this.dpr,0,0);this.makeWater();}
  coast(y,growth=1){const f=y/this.h;return {x:this.w*(.5+.027*Math.sin(f*5.6-.8)+.016*Math.sin(f*12+1)),half:this.w*(.043+.018*Math.sin(f*7+.3)**2+.018*Math.exp(-(((f-.27)/.17)**2)))*growth};}
  gap(){const m=this.settings.m||0;return {y:this.h*.565,half:this.h*(.053+.022*Math.min(1,Math.log1p(m*1000)/Math.log(501)))};}
  landPath(c,y0,y1,growth,pad=0){
    const ys=[];for(let y=y0;y<=y1;y+=5)ys.push(y);if(ys.at(-1)!==y1)ys.push(y1);
    const edge=(y,sign)=>{const b=this.coast(y,growth),jag=sign<0?Math.sin(y*.071)*2+Math.cos(y*.123)*1.3:Math.cos(y*.064)*2+Math.sin(y*.147)*1.5;return b.x+sign*(b.half+pad)+jag*growth;};
    c.beginPath();ys.forEach((y,i)=>i?c.lineTo(edge(y,-1),y):c.moveTo(edge(y,-1),y));
    if(y1<this.h)c.quadraticCurveTo(this.coast(y1,growth).x,y1-12,edge(y1,1),y1);else c.lineTo(edge(y1,1),y1);
    for(let i=ys.length-2;i>=0;i--)c.lineTo(edge(ys[i],1),ys[i]);
    if(y0>0)c.quadraticCurveTo(this.coast(y0,growth).x,y0+12,edge(y0,-1),y0);
    c.closePath();
  }
  makeWater(){const bg=document.createElement('canvas');bg.width=this.w;bg.height=this.h;const c=bg.getContext('2d'),w=this.w,h=this.h,g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#217f94');g.addColorStop(.38,'#4bb7b5');g.addColorStop(.7,'#36a9b1');g.addColorStop(1,'#146a8d');c.fillStyle=g;c.fillRect(0,0,w,h);for(const [x,y,r,col] of [[.14,.23,.55,'#b5e4c733'],[.74,.68,.48,'#97d8c333'],[.95,.03,.35,'#14718b33'],[.2,.95,.3,'#1b778d33']]){const a=c.createRadialGradient(w*x,h*y,0,w*x,h*y,w*r);a.addColorStop(0,col);a.addColorStop(1,'#16889900');c.fillStyle=a;c.fillRect(0,0,w,h);}const random=GreyModel.rng(7721);for(let i=0;i<1350;i++){const x=random()*w,y=random()*h;c.strokeStyle=i%4?'#8ddbd30c':'#031f4211';c.lineWidth=.6+random();c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+7,y-2,x+10+random()*22,y+random()*3);c.stroke();}this.water=bg;}
  assignSides(){
    this.markerCache=null;
    const ordered=[...this.animals].sort((a,b)=>a.x-b.x),west=Math.round(ordered.length*this.settings.ratio/100);
    ordered.forEach((a,i)=>{
      a.side=i<west?0:1;a.wanderTarget=null;
      const bounds=this.waterBounds(a.y*this.h,a,true),end=clamp(a.x*this.w,bounds[0]+18,bounds[1]-18)/this.w;
      if(this.reduced.matches)a.x=end;
      else if(Math.abs(end-a.x)>.003)a.settle={from:a.x,to:end,elapsed:0};
    });
  }
  update(dt,state){
    if(this.reduced.matches)return;
    const w=this.w,h=this.h,gap=this.gap(),animals=this.animals,pace=this.travelPace,whale=this.variant==='whale';
    if(state.split&&this.clock-this.raised>1.7&&this.clock>=this.nextMigration){
      const rate=GreyDisplay.migrationRate(this.settings,state.generationRate||0);
      this.migrationBudget=Math.min(1,this.migrationBudget+rate*dt);
      if(rate>0&&this.migrationBudget>=1&&animals.filter(a=>a.cross).length<3){
        // Alternate directions to preserve the settled population ratio.
        const side=this.migrationStarts%2,coast=this.coast(gap.y),entry=coast.x+(side?1:-1)*(coast.half+58);
        let chosen=null,best=Infinity;
        for(const a of animals)if(a.side===side&&!a.cross&&!a.settle){const d=Math.hypot(a.x*w-entry,a.y*h-gap.y);if(d<best){best=d;chosen=a;}}
        if(chosen){chosen.cross={side:1-side,stage:0};chosen.wanderTarget=null;this.migrationStarts++;this.migrationBudget=0;this.nextMigration=this.clock+.5;}
      }
    }
    // A spatial grid keeps spacing local even with hundreds of representatives.
    const cell=Math.max(14,70*this.actorScale({size:1.1})),grid=new Map();
    for(const a of animals){const key=Math.floor(a.x*w/cell)+','+Math.floor(a.y*h/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push({id:a.id,side:a.side,x:a.x*w,y:a.y*h,cross:!!a.cross,settle:!!a.settle});}
    for(const a of animals){
      const x=a.x*w,y=a.y*h,scale=this.actorScale(a),pad=Math.max(46,118*scale),yMin=Math.max(55,pad),yMax=h-Math.max(45,pad),boundsAt=yy=>this.waterBounds(yy,a,state.split);
      let cruise=a.speed*w*pace;
      if(whale)cruise=CetaceanCharacter.propel(a,dt,cruise,pace);
      else{a.effort=.7+.25*(.5+.5*Math.sin(this.clock*.45+a.phase));a.stroke+=dt*(4.5+a.effort*1.8);}
      if(a.settle){
        const q=a.settle;q.elapsed+=dt;const u=clamp(q.elapsed/1.45,0,1),ease=u*u*(3-2*u);a.x=q.from+(q.to-q.from)*ease;
        if(whale){const limits=boundsAt(y);CetaceanCharacter.steer(a,q.to>q.from?0:Math.PI,dt,cruise,211*scale,Math.min(limits[1]-limits[0],yMax-yMin));}
        else{FreeSwim.steer(a,q.to>q.from?0:Math.PI,dt);SharkCharacter.followTurn(a,dt,scale,a.speed*w*pace);}
        if(u>=1)a.settle=null;continue;
      }
      const target=FreeSwim.goal(a,{x,y,speed:cruise,time:this.clock,random:this.random,bounds:boundsAt,yMin,yMax});
      let tx=target.x,ty=target.y;
      let fx=0,fy=0;
      const gx=Math.floor(x/cell),gy=Math.floor(y/cell),spacing=70*scale;
      for(let ix=gx-1;ix<=gx+1;ix++)for(let iy=gy-1;iy<=gy+1;iy++)for(const b of grid.get(ix+','+iy)||[]){
        if(a.id===b.id||(state.split&&a.side!==b.side)||a.cross||b.cross||b.settle)continue;
        const dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);
        if(d>0&&d<spacing){const force=(spacing-d)/spacing;fx+=dx/d*force*.65;fy+=dy/d*force*.65;}
      }
      let desired=Math.atan2(ty-y,tx-x),speed=cruise;
      if(a.cross){
        const sign=a.cross.side?1:-1,coast=this.coast(gap.y),clearance=Math.max(58,pad+12),entry=coast.x-sign*(coast.half+clearance),exit=coast.x+sign*(coast.half+clearance);
        ty=gap.y;
        if(a.cross.stage===0){tx=entry;const distance=Math.hypot(tx-x,ty-y);speed*=1.2;if(distance<Math.max(20,speed*dt*2))a.cross.stage=1;}
        if(a.cross.stage===1){speed*=1.2;tx=exit;if(sign*(x-exit)>-7){a.side=a.cross.side;a.cross=null;a.wanderTarget=null;this.markerCache=null;}}
        desired=Math.atan2(ty-y,tx-x);
      }else{
        const wall=(whale?CetaceanCharacter:FreeSwim).avoid({x,y,heading:a.heading,speed,bounds:boundsAt,yMin,yMax,bodyLength:211*scale});
        fx+=wall.x;fy+=wall.y;
        desired=Math.atan2(Math.sin(desired)+fy,Math.cos(desired)+fx);
      }
      if(whale){
        const limits=boundsAt(y),span=Math.min(limits[1]-limits[0],yMax-yMin);
        CetaceanCharacter.steer(a,desired,dt,speed,211*scale,span);
        if(!a.cross){
          // Ease forward momentum before a tight coastal turn, giving the
          // slower angular response room to finish without pinning at a wall.
          const dx=Math.cos(a.heading),dy=Math.sin(a.heading);
          const clearance=Math.min((dx<0?x-limits[0]:limits[1]-x)/Math.max(.05,Math.abs(dx)),(dy<0?y-yMin:yMax-y)/Math.max(.05,Math.abs(dy)));
          speed*=.28+.72*clamp(clearance/(speed*2.8+211*scale*.35),0,1);
        }
      }else{FreeSwim.steer(a,desired,dt);SharkCharacter.followTurn(a,dt,scale,speed);}
      // Whales coast between strokes; the accepted shark cadence stays unchanged.
      a.x+=Math.cos(a.heading)*speed*dt/w;a.y+=Math.sin(a.heading)*speed*dt/h;
      a.y=clamp(a.y,yMin/h,yMax/h);
      if(a.cross&&a.cross.stage===1){a.y=clamp(a.y,(gap.y-gap.half+12)/h,(gap.y+gap.half-12)/h);}
      else{const bounds=boundsAt(a.y*h);a.x=clamp(a.x,bounds[0]/w,bounds[1]/w);}
      a.x=clamp(a.x,18/w,1-18/w);
    }
  }
  actorScale(a){return a.size*clamp(this.w/1750,.30,.60)*Math.min(1,Math.sqrt(72/Math.min(400,this.animals.length)));}
  waterBounds(y,a,split){
    const pad=Math.max(46,118*this.actorScale(a));
    if(!split)return[pad,this.w-pad];
    const coast=this.coast(y);
    return a.side?[coast.x+coast.half+pad,this.w-pad]:[pad,coast.x-coast.half-pad];
  }
  bounds(y,side){const b=this.coast(y);return side?[b.x+b.half+46,this.w-44]:[44,b.x-b.half-46];}
  drawWater(){const c=this.c,w=this.w,h=this.h,t=this.clock;c.drawImage(this.water,0,0,w,h);c.lineWidth=.8;for(let i=0;i<18;i++){const y=(i*.1637%1)*h+Math.sin(t*.2+i)*8,x=(i*.271%1)*w+Math.cos(t*.12+i)*15;c.strokeStyle='#b2efe51a';c.beginPath();c.moveTo(x-55,y);c.bezierCurveTo(x-20,y-9,x+12,y+9,x+70,y-1);c.stroke();}for(const s of this.sparks){const pulse=Math.max(0,Math.sin(t*.75+s.phase)-.65)/.35;if(pulse<=0)continue;c.fillStyle=`rgba(213,249,233,${pulse*.46})`;c.beginPath();c.ellipse(s.x*w,s.y*h,s.size*2.6,s.size*.45,-.2,0,TAU);c.fill();}}
  drawLand(state,progress){if(!this.island)this.island=new IslandScene();this.island.draw(this,state,progress);}
  prepareMarkers(state){
    if(!state.markers&&this.selected<0)return;
    const old=this.markerCache;
    if(old&&old.generation===state.generation&&old.p1===state.p1&&old.p2===state.p2)return;
    const indices=GreyDisplay.markerIndices(state.p1.length);
    this.markerCache={generation:state.generation,p1:state.p1,p2:state.p2,indices,palettes:GreyDisplay.markerPalettes([state.p1,state.p2],indices),data:GreyDisplay.markers(this.animals,[state.p1,state.p2],indices,this.settings.displaySeed||0)};
  }
  markerCopies(a){return this.markerCache.data.get(a.id);}
  drawShark(a,state){
    const c=this.c,x=a.x*this.w,y=a.y*this.h,scale=this.actorScale(a);
    if(this.detail!=='lite'){c.save();c.translate(x+8,y+11);c.rotate(a.heading);c.scale(scale,scale*.43);
    const shadow=c.createRadialGradient(-15,0,3,-15,0,85);shadow.addColorStop(0,'#0b52674d');shadow.addColorStop(1,'#125b6e00');
    c.fillStyle=shadow;c.beginPath();c.arc(-15,0,85,0,TAU);c.fill();c.restore();}
    const actor={x,y,heading:a.heading,scale,stroke:a.stroke,effort:a.effort,bend:a.bend,phase:a.phase,id:a.id},options={variant:this.variant||'hammer',snps:state.markers?this.markerCopies(a):null,snpPalettes:state.markers?this.markerCache.palettes:null};
    if(this.detail!=='lite'||!this.poseCache.draw(c,actor,this.clock,options))SeaLife.draw(c,actor,this.clock,options);
    if(a.id===this.selected||a.id===this.hover){c.save();c.strokeStyle='#e3f8daaa';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.arc(x,y,48*scale,0,TAU);c.stroke();c.restore();}
  }
  drawPortrait(a,state){
    const c=this.c,indices=this.markerCache.indices,pairs=this.markerCopies(a),columns=Math.min(5,indices.length),rows=Math.ceil(indices.length/5);
    const w=Math.min(290,this.w-24),h=rows>1?300:244;
    const top=Math.min(112,Math.max(12,this.h-h-65));
    const x=clamp(a.x*this.w+25,w/2+12,this.w-w/2-12),y=clamp(a.y*this.h-160,top,Math.max(top,this.h-h-65));
    c.save();c.shadowColor='#002e4a33';c.shadowBlur=12;c.shadowOffsetY=5;c.fillStyle='#f4f4e9fa';c.strokeStyle='#c3d8cb';c.lineWidth=1;c.beginPath();c.roundRect(x-w/2,y,w,h,14);c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.stroke();
    c.fillStyle='#31575c';c.font='13px Georgia, serif';c.textAlign='center';c.fillText(SeaLife.info(this.variant).name+', up close',x,y+24);
    c.fillStyle='#72877f';c.font='10px Arial, sans-serif';c.fillText(`${a.side?'Eastern':'Western'} sea · ${SeaLife.info(this.variant).singular} ${a.id+1} · ${indices.length}/${state.p1.length} SNPs`,x,y+43);
    SeaLife.draw(c,{x:x+18,y:y+89,scale:.90*SeaLife.info(this.variant).portrait,heading:0,stroke:a.stroke,effort:a.effort,bend:a.bend,phase:a.phase,id:a.id},this.clock,{variant:this.variant||'hammer',snps:pairs,snpPalettes:this.markerCache.palettes});
    c.fillStyle='#31575c';c.font='10px Arial, sans-serif';c.fillText('Genotype = 0, 1 or 2 copies of allele A',x,y+139);
    const cw=Math.min(52,(w-24)/columns),start=x-columns*cw/2;
    for(let i=0;i<indices.length;i++){
      const cx=start+(i%5)*cw+cw/2,cy=y+153+Math.floor(i/5)*56,dose=GreyDisplay.dosage(pairs[i]);
      c.fillStyle='#e9eee2';c.beginPath();c.roundRect(cx-cw/2+2,cy,cw-4,54,5);c.fill();
      c.fillStyle='#31575c';c.font='9px Arial, sans-serif';c.fillText(`SNP ${indices[i]+1}`,cx,cy+14);
      SharkCharacter.drawMarker(c,cx-10,cy+31,6,pairs[i],this.markerCache.palettes[i]);
      c.fillStyle='#173e46';c.font='bold 17px Arial, sans-serif';c.fillText(String(dose),cx+10,cy+37);
      c.font='9px Arial, sans-serif';c.fillText(['B/B','A/B','A/A'][dose],cx,cy+49);
    }
    const order=indices.length>5?`SNPs 1–5 left · 6–${indices.length} right · head → tail`:indices.length>1?`SNPs 1–${indices.length} · centreline · head → tail`:'SNP 1 · centreline';
    c.fillStyle='#72877f';c.font='9px Arial, sans-serif';c.fillText(order,x,y+h-24);c.fillText(`Click the ${SeaLife.info(this.variant).singular} again to close this panel.`,x,y+h-10);c.restore();
  }

  draw(state){
    const started=performance.now(),now=started/1000;
    // A long suspension is bounded, but ordinary dropped frames keep elapsed
    // time. Substeps keep turning and barrier avoidance stable at low FPS.
    const dt=this.last?clamp(now-this.last,0,.5):0;this.last=now;if(!this.animals)return;
    if(this.pendingLite&&!state.paused){this.pendingLite=false;this.detail='lite';this.resize();}
    const frozenKey=[state.split,state.generation,state.m,state.markers,this.selected,this.hover,this.variant,this.w,this.h].join('|');
    if(state.paused&&this.frozenKey===frozenKey)return;
    this.frozenKey=state.paused?frozenKey:null;
    if(!this.reduced.matches&&!state.paused)this.clock+=dt;
    if(state.split&&!this.wasSplit){this.raised=this.clock;this.assignSides();}
    if(!state.split)this.raised=0;this.wasSplit=state.split;
    if(!state.paused){
      const end=this.clock,steps=Math.max(1,Math.ceil(dt/.05-1e-9));
      for(let i=0;i<steps;i++){
        if(steps>1&&!this.reduced.matches)this.clock=end-dt+(i+1)*dt/steps;
        this.update(dt/steps,state);
      }
      this.clock=end;
    }
    this.prepareMarkers(state);this.c.clearRect(0,0,this.w,this.h);this.drawWater();
    for(const a of this.animals)this.drawShark(a,state);
    if(state.split){const progress=this.reduced.matches?1:clamp((this.clock-this.raised)/4.8,0,1);this.drawLand(state,progress);}
    const selected=this.animals.find(a=>a.id===this.selected);if(selected)this.drawPortrait(selected,state);
    // Eight over-budget draws are required; one expensive startup frame never
    // changes a fast device. The existing full-detail renderer is the default.
    if(!state.paused&&dt>0&&this.detail==='full'){
      const cost=performance.now()-started;this.slowDraws=Math.max(0,this.slowDraws+(cost>20?1:-1));
      if(this.slowDraws>=8)this.pendingLite=true;
    }
  }

}
root.OceanScene=OceanScene;
})(typeof globalThis!=='undefined'?globalThis:this);
