/* Top-view fin whale and harbour porpoise. Shapes follow a shared curved spine.
   Flukes beat vertically, expressed by foreshortening, rather than a fish-like sideways wag. */
(function(root){
'use strict';
const TAU=Math.PI*2;
let texture=null;
function textured(){
  if(!texture&&typeof Image==='function'){texture=new Image();texture.decoding='async';texture.src='assets/atlas/fin-whale.webp?v=fin-whale-27';}
  return Boolean(texture&&texture.complete&&texture.naturalWidth);
}
function drawTexture(c,a,options){
  const {at,basis,phase}=field(a,'whale'),sourceLeft=47,sourceWidth=2052,k=211/sourceWidth,strips=36;
  c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);
  // Bend the detailed skin along the same spine as the fins, flukes and genotype markers.
  for(let i=0;i<strips;i++){
    const sx=sourceLeft+i*sourceWidth/strips,sw=sourceWidth/strips,x=-121+(i+.5)*211/strips,u=(90-x)/180,p=basis(u);
    const tail=Math.max(0,Math.min(1,(u-.89)/.22)),foreshorten=1-tail*(.12+.12*Math.sin(phase));
    c.save();c.translate(p.x,p.y);c.rotate(p.a);c.scale(1,foreshorten);
    c.drawImage(texture,sx,0,sw+1,731,-211/strips/2,-365.5*k,211/strips+k,731*k);c.restore();
  }
  if(options.snps){const n=Math.min(10,options.snps.length),cols=Math.min(5,n);for(let i=0;i<n;i++){const p=at(cols===1?.4:.25+(i%cols)/(cols-1)*.35,n>5?(i<5?-5.5:5.5):0);SharkCharacter.drawMarker(c,p.x,p.y,4.3,options.snps[i],options.snpPalettes?.[i]);}}
  c.restore();
}
function field(a,kind){
  const whale=kind==='whale',phase=(a.stroke||0)*(whale?.29:.48),bend=a.bend||0;
  const spine=u=>({x:(whale?90:63)-(whale?180:132)*u,y:bend*(whale?31:24)*u*u+Math.sin(phase-u*1.4)*u*u*.65});
  const basis=u=>{const p=spine(u),q=spine(u+.002);return {...p,a:Math.atan2(p.y-q.y,p.x-q.x)};};
  const at=(u,offset=0)=>{const p=basis(u);return{x:p.x-Math.sin(p.a)*offset,y:p.y+Math.cos(p.a)*offset};};
  return {phase,basis,at};
}
function ellipse(c,x,y,rx,ry,color,angle=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill();}
function outline(c,at,widths){
  const points=[];
  for(let i=0;i<widths.length;i++)points.push(at(i/(widths.length-1),-widths[i]));
  for(let i=widths.length-1;i>=0;i--)points.push(at(i/(widths.length-1),widths[i]));
  c.beginPath();const last=points.at(-1),first=points[0];c.moveTo((last.x+first.x)/2,(last.y+first.y)/2);
  points.forEach((p,i)=>{const q=points[(i+1)%points.length];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);});c.closePath();
}
function draw(c,a,time,options){
  if(options.variant==='whale'&&textured()){drawTexture(c,a,options);return;}
  const whale=options.variant==='whale',{phase,basis,at}=field(a,options.variant);
  c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);c.lineJoin='round';
  // Fin-whale pectorals are short and narrow, swept back along the streamlined torso.
  for(const sign of [-1,1]){
    const p=basis(whale?.29:.32);c.save();c.translate(p.x,p.y);c.rotate(p.a+sign*Math.sin(phase-.4)*.035);c.scale(1,sign);
    const g=c.createLinearGradient(5,12,-23,whale?35:31);g.addColorStop(0,whale?'#425b64':'#536772');g.addColorStop(1,whale?'#58666b':'#304b59');c.fillStyle=g;c.strokeStyle='#2c4752';c.lineWidth=.8;
    c.beginPath();c.moveTo(7,whale?13:12);
    if(whale){c.bezierCurveTo(1,19,-11,30,-22,35);c.quadraticCurveTo(-25,35,-22,30);c.bezierCurveTo(-18,23,-11,16,-6,13);}else{c.bezierCurveTo(4,19,-9,29,-17,31);c.quadraticCurveTo(-20,27,-10,14);}
    c.closePath();c.fill();c.stroke();
    if(whale){c.strokeStyle='#97a3a266';c.lineWidth=.7;c.beginPath();c.moveTo(3,16);c.quadraticCurveTo(-8,27,-21,33);c.stroke();}
    c.restore();
  }
  // Broad bilateral flukes, swept leading edges and a distinct central trailing notch.
  const t=basis(1),span=whale?28:23,rear=whale?31:22;
  c.save();c.translate(t.x,t.y);c.rotate(t.a);c.scale(1,.80+.17*Math.sin(phase));
  const tail=c.createLinearGradient(3,-span,-rear,span);tail.addColorStop(0,'#536e78');tail.addColorStop(.55,'#2a4654');tail.addColorStop(1,'#6d858b');c.fillStyle=tail;c.strokeStyle='#294651';c.lineWidth=.8;
  c.beginPath();c.moveTo(5,-2);c.bezierCurveTo(-4,-5,-13,-span+3,-rear,-span);c.quadraticCurveTo(-rear+1,-span*.55,-rear+7,-span*.31);c.quadraticCurveTo(-rear+10,-3,-rear+5,0);c.quadraticCurveTo(-rear+10,3,-rear+7,span*.31);c.quadraticCurveTo(-rear+1,span*.55,-rear,span);c.bezierCurveTo(-13,span-3,-4,5,5,2);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#a5bab766';c.lineWidth=.65;for(const sign of [-1,1]){c.beginPath();c.moveTo(-4,sign*3);c.quadraticCurveTo(-16,sign*14,-rear+3,sign*(span-4));c.stroke();}c.restore();
  const widths=whale?[2.2,6.3,10.5,14.3,16.2,16,14.5,12.5,10,7,4.1,2.3,1.6]:[5.8,9.3,13.5,16.5,17.8,17,15,12,9,6,3.6,2.1,1.5];
  outline(c,at,widths);const skin=c.createLinearGradient(0,-23,0,23);
  for(const [stop,color]of (whale?[[0,'#343f44'],[.22,'#4a565c'],[.43,'#758084'],[.59,'#566367'],[.83,'#39474c'],[1,'#89938f']]:[[0,'#718d94'],[.23,'#48636f'],[.46,'#607e89'],[.72,'#3e5a68'],[1,'#849c9d']]))skin.addColorStop(stop,color);
  c.fillStyle=skin;c.fill();c.strokeStyle='#294853';c.lineWidth=.8;c.stroke();
  c.save();c.clip();
  // The pale porpoise flanks are subtle, leaving a dark recognisable dorsal surface.
  if(!whale)for(const sign of [-1,1]){c.beginPath();const p=at(.25,sign*15);c.moveTo(p.x,p.y);for(let i=0;i<9;i++){const u=.25+i*.055,q=at(u,sign*(17-i*1.25));c.lineTo(q.x,q.y);}c.lineTo(-22,sign*19);c.closePath();c.fillStyle='#cfdbd16b';c.fill();}
  // Species-specific markings: pale right lower-jaw rim and soft shoulder chevrons.
  if(whale){
    c.fillStyle='#c7cec3';c.beginPath();let p=at(.025,2);c.moveTo(p.x,p.y);
    for(let i=0;i<=12;i++){const u=.025+i*.021,q=at(u,2+u*49);c.lineTo(q.x,q.y);}
    for(let i=12;i>=0;i--){const u=.025+i*.021,q=at(u,1+u*41);c.lineTo(q.x,q.y);}c.closePath();c.fill();
    // A low-contrast, uneven V-shaped blaze, not a geometric band across the whole back.
    const left=at(.24,-13),centre=at(.38,0),right=at(.29,14),outer=at(.33,14),inner=at(.405,0),end=at(.265,-13);
    c.beginPath();c.moveTo(left.x,left.y);c.quadraticCurveTo(centre.x+10,centre.y-3,centre.x,centre.y);c.quadraticCurveTo(right.x-8,right.y-2,right.x,right.y);c.lineTo(outer.x,outer.y);c.quadraticCurveTo(inner.x+6,inner.y+1,inner.x,inner.y);c.quadraticCurveTo(end.x-10,end.y+3,end.x,end.y);c.closePath();c.fillStyle='#c6ccc01d';c.fill();
    // Restrained texture stays on the skin rather than flickering in screen space.
    for(let i=0;i<23;i++){const u=.27+(i*.618033%1)*.49,off=Math.sin(i*7.13)*8,p=at(u,off);c.strokeStyle=i%3?'#d6d8c810':'#182f3717';c.lineWidth=.45;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-2.2,p.y+.3);c.stroke();}
    c.strokeStyle='#c0c8c440';c.lineWidth=.7;c.beginPath();for(let i=0;i<11;i++){const p=at(.68+i*.027,0);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.stroke();
  }
  c.restore();
  // The fin whale has a swept, falcate dorsal at about two-thirds body length.
  const dorsal=basis(whale?.66:.48);c.save();c.translate(dorsal.x,dorsal.y);c.rotate(dorsal.a);c.fillStyle=whale?'#304d5c':'#3a5462';c.strokeStyle='#263f4d';c.lineWidth=.65;
  c.beginPath();c.moveTo(10,1.8);if(whale){c.bezierCurveTo(2,-1,-2,-9,-9,-12);c.quadraticCurveTo(-6,-7,-8,-4);c.quadraticCurveTo(-9,-1,-12,2);}else{c.quadraticCurveTo(0,-3,-7,-13);c.quadraticCurveTo(-11,-5,-8,2);}c.closePath();c.fill();c.stroke();c.strokeStyle='#a7bdb566';c.beginPath();c.moveTo(8,0);c.lineTo(-5,-6);c.stroke();c.restore();
  const blow=at(whale?.19:.14);c.strokeStyle='#203744';c.lineWidth=1.2;
  // Paired blowholes in the baleen whale, one crescent in the toothed porpoise.
  for(const off of whale?[-1.5,1.5]:[0]){c.beginPath();c.moveTo(blow.x+1,blow.y+off-1);c.quadraticCurveTo(blow.x-2,blow.y+off,blow.x,blow.y+off+1);c.stroke();}
  for(const sign of [-1,1]){const eye=at(whale?.23:.17,sign*(whale?12:10));ellipse(c,eye.x,eye.y,1.3,.9,'#152c37');ellipse(c,eye.x+.35,eye.y-.2,.4,.3,'#cbdcd4');}
  if(options.snps){const n=Math.min(10,options.snps.length),cols=Math.min(5,n);for(let i=0;i<n;i++){const p=at(cols===1?.4:.25+(i%cols)/(cols-1)*.35,n>5?(i<5?-5.5:5.5):0);SharkCharacter.drawMarker(c,p.x,p.y,4.3,options.snps[i],options.snpPalettes?.[i]);}}
  c.restore();
}
function surface(c,a,time,kind){
  const whale=kind==='whale',{at}=field(a,kind),cycle=(time+(a.phase||0)*7)%(whale?21:15),duration=whale?1.9:.65;
  if(cycle>duration)return;
  const q=cycle/duration,p=at(whale?.19:.13),heading=a.heading||0,scale=a.scale||1;
  const x=a.x+(Math.cos(heading)*p.x-Math.sin(heading)*p.y)*scale,y=a.y+(Math.sin(heading)*p.x+Math.cos(heading)*p.y)*scale;
  c.save();c.translate(x,y);c.scale(scale,scale);
  c.strokeStyle=`rgba(232,253,247,${(1-q)*.35})`;c.lineWidth=.9;c.beginPath();c.ellipse(0,0,5+q*18,2.5+q*8,heading,0,TAU);c.stroke();
  if(whale){
    // A paired baleen-whale blowhole makes one narrow, rising mist column.
    // The screen-space drift conveys a little height in the overhead view.
    const rise=30*(1-Math.exp(-q*7)),wind=7*q,fade=Math.sin(Math.PI*q)**.8;
    if(q<.72){
      const jet=c.createLinearGradient(0,0,wind,-rise);jet.addColorStop(0,'rgba(246,255,251,0)');jet.addColorStop(.15,`rgba(245,255,250,${fade*.42})`);jet.addColorStop(.65,`rgba(248,255,252,${fade*.8})`);jet.addColorStop(1,'rgba(248,255,252,0)');
      c.fillStyle=jet;c.beginPath();c.moveTo(-.8,0);c.bezierCurveTo(-1,-10,wind-3,-rise*.8,wind-5,-rise);c.quadraticCurveTo(wind,-rise-5,wind+5,-rise);c.bezierCurveTo(wind+2,-rise*.7,1,-8,.8,0);c.closePath();c.fill();
    }
    // Soft overlapping puffs disperse, with no hard circular outline or toy fountain.
    for(let i=0;i<3;i++){
      const px=wind+(i-1)*(2+q*4),py=-rise+(i%2)*3,r=3.5+q*(5+i);
      const mist=c.createRadialGradient(px,py,0,px,py,r);mist.addColorStop(0,`rgba(249,255,252,${fade*.44})`);mist.addColorStop(.4,`rgba(237,253,248,${fade*.28})`);mist.addColorStop(1,'rgba(235,255,247,0)');c.fillStyle=mist;c.beginPath();c.arc(px,py,r,0,TAU);c.fill();
    }
    for(let i=0;i<8;i++){
      const spread=(i-3.5)*q*1.65,fall=q*q*(8+(i%3)*3),px=wind+spread,py=-rise+fall-((i*7)%9)*q;
      ellipse(c,px,py,.35+(i%2)*.23,.5+(i%3)*.2,`rgba(245,255,250,${fade*.62})`,-.2);
    }
  }
  c.restore();
}
root.CetaceanCharacter={draw,field,surface,textured};
})(globalThis);
