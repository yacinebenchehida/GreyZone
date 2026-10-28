/* Top-view humpback whale and harbour porpoise. Shapes follow a shared curved spine.
   Flukes beat vertically, expressed by foreshortening, rather than a fish-like sideways wag. */
(function(root){
'use strict';
const TAU=Math.PI*2;
function field(a,kind){
  const whale=kind==='whale',phase=(a.stroke||0)*(whale?.29:.48),bend=a.bend||0;
  const spine=u=>({x:(whale?79:63)-(whale?169:132)*u,y:bend*(whale?31:24)*u*u+Math.sin(phase-u*1.4)*u*u*.65});
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
  const whale=options.variant==='whale',{phase,basis,at}=field(a,options.variant);
  c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);c.lineJoin='round';
  // Long, narrow humpback pectorals contrast with the porpoise's small swept flippers.
  for(const sign of [-1,1]){
    const p=basis(whale?.29:.32);c.save();c.translate(p.x,p.y);c.rotate(p.a+sign*Math.sin(phase-.4)*.035);c.scale(1,sign);
    const g=c.createLinearGradient(5,12,-27,whale?57:31);g.addColorStop(0,whale?'#425b64':'#536772');g.addColorStop(1,whale?'#b4c4c1':'#304b59');c.fillStyle=g;c.strokeStyle='#2c4752';c.lineWidth=.8;
    c.beginPath();c.moveTo(8,whale?16:12);
    if(whale){c.bezierCurveTo(2,24,-7,40,-22,57);c.quadraticCurveTo(-28,63,-29,57);c.bezierCurveTo(-29,48,-19,28,-9,16);}else{c.bezierCurveTo(4,19,-9,29,-17,31);c.quadraticCurveTo(-20,27,-10,14);}
    c.closePath();c.fill();c.stroke();
    if(whale){c.strokeStyle='#dbe5dd';c.lineWidth=2;c.beginPath();c.moveTo(3,22);c.quadraticCurveTo(-6,41,-24,57);c.stroke();}
    c.restore();
  }
  // Broad bilateral flukes, swept leading edges and a distinct central trailing notch.
  const t=basis(1),span=whale?36:23,rear=whale?31:22;
  c.save();c.translate(t.x,t.y);c.rotate(t.a);c.scale(1,.80+.17*Math.sin(phase));
  const tail=c.createLinearGradient(3,-span,-rear,span);tail.addColorStop(0,'#536e78');tail.addColorStop(.55,'#2a4654');tail.addColorStop(1,'#6d858b');c.fillStyle=tail;c.strokeStyle='#294651';c.lineWidth=.8;
  c.beginPath();c.moveTo(5,-2);c.bezierCurveTo(-4,-5,-13,-span+3,-rear,-span);c.quadraticCurveTo(-rear+1,-span*.55,-rear+7,-span*.31);c.quadraticCurveTo(-rear+10,-3,-rear+5,0);c.quadraticCurveTo(-rear+10,3,-rear+7,span*.31);c.quadraticCurveTo(-rear+1,span*.55,-rear,span);c.bezierCurveTo(-13,span-3,-4,5,5,2);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#a5bab766';c.lineWidth=.65;for(const sign of [-1,1]){c.beginPath();c.moveTo(-4,sign*3);c.quadraticCurveTo(-16,sign*14,-rear+3,sign*(span-4));c.stroke();}c.restore();
  const widths=whale?[7,14,19,21,21,19.5,17,14,10.5,7,4,2.3,1.8]:[5.8,9.3,13.5,16.5,17.8,17,15,12,9,6,3.6,2.1,1.5];
  outline(c,at,widths);const skin=c.createLinearGradient(0,-23,0,23);
  for(const [stop,color]of (whale?[[0,'#253f4d'],[.22,'#3e5b68'],[.45,'#6b8791'],[.65,'#496773'],[1,'#263f4e']]:[[0,'#718d94'],[.23,'#48636f'],[.46,'#607e89'],[.72,'#3e5a68'],[1,'#849c9d']]))skin.addColorStop(stop,color);
  c.fillStyle=skin;c.fill();c.strokeStyle='#294853';c.lineWidth=.8;c.stroke();
  c.save();c.clip();
  // The pale porpoise flanks are subtle, leaving a dark recognisable dorsal surface.
  if(!whale)for(const sign of [-1,1]){c.beginPath();const p=at(.25,sign*15);c.moveTo(p.x,p.y);for(let i=0;i<9;i++){const u=.25+i*.055,q=at(u,sign*(17-i*1.25));c.lineTo(q.x,q.y);}c.lineTo(-22,sign*19);c.closePath();c.fillStyle='#cfdbd16b';c.fill();}
  // Humpback rostrum tubercles and longitudinal head ridges remain understated at small scale.
  if(whale){for(let row=-1;row<=1;row++)for(let i=0;i<4;i++){const p=at(.035+i*.045,row*(4+i*1.5));ellipse(c,p.x,p.y,1.25,1,'#a1b4b1');}c.strokeStyle='#b1c6c133';c.lineWidth=.9;for(const offset of [-7,7]){c.beginPath();for(let i=0;i<8;i++){const p=at(.2+i*.045,offset);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.stroke();}}
  c.restore();
  // A low humpback dorsal fin sits far aft; the porpoise has a compact triangular fin.
  const dorsal=basis(whale?.66:.48);c.save();c.translate(dorsal.x,dorsal.y);c.rotate(dorsal.a);c.fillStyle=whale?'#304d5c':'#3a5462';c.strokeStyle='#263f4d';c.lineWidth=.65;
  c.beginPath();c.moveTo(10,1.8);c.quadraticCurveTo(0,-3,-7,whale?-10:-13);c.quadraticCurveTo(-11,-5,-8,2);c.closePath();c.fill();c.stroke();c.strokeStyle='#a7bdb566';c.beginPath();c.moveTo(8,0);c.lineTo(-5,-6);c.stroke();c.restore();
  const blow=at(whale?.13:.14);c.strokeStyle='#203744';c.lineWidth=1.2;
  // Paired blowholes in the baleen whale, one crescent in the toothed porpoise.
  for(const off of whale?[-1.5,1.5]:[0]){c.beginPath();c.moveTo(blow.x+1,blow.y+off-1);c.quadraticCurveTo(blow.x-2,blow.y+off,blow.x,blow.y+off+1);c.stroke();}
  for(const sign of [-1,1]){const eye=at(whale?.18:.17,sign*(whale?15:10));ellipse(c,eye.x,eye.y,1.3,.9,'#152c37');ellipse(c,eye.x+.35,eye.y-.2,.4,.3,'#cbdcd4');}
  if(options.snps){const n=Math.min(10,options.snps.length),cols=Math.min(5,n);for(let i=0;i<n;i++){const p=at(cols===1?.4:.25+(i%cols)/(cols-1)*.35,n>5?(i<5?-5.5:5.5):0);SharkCharacter.drawMarker(c,p.x,p.y,4.3,options.snps[i],options.snpPalettes?.[i]);}}
  c.restore();
}
function surface(c,a,time,kind){
  const {at}=field(a,kind),cycle=(time+(a.phase||0)*7)%(kind==='whale'?21:15),duration=kind==='whale'?1.15:.65;
  if(cycle>duration)return;
  const q=cycle/duration,p=at(.13),whale=kind==='whale';c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);c.strokeStyle=`rgba(234,253,248,${(1-q)*.52})`;c.lineWidth=1.1;
  c.beginPath();c.ellipse(p.x,p.y,7+q*16,3+q*8,0,0,TAU);c.stroke();
  if(whale)for(const sign of [-1,1]){c.strokeStyle=`rgba(240,255,251,${Math.sin(q*Math.PI)*.75})`;c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo(p.x+4+q*12,p.y+sign*(5+q*8),p.x+q*8,p.y+sign*(7+q*11));c.stroke();}
  c.restore();
}
root.CetaceanCharacter={draw,field,surface};
})(globalThis);
