/* Decorative top-view animals. All choices share the same neutral genetic model.
   The accepted shark and original surgeonfish renderers are reused directly. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const catalogue={
  hammer:{name:'Hammerhead',singular:'hammerhead',plural:'hammerheads',portrait:1},
  classic:{name:'Classic shark',singular:'shark',plural:'sharks',portrait:1},
  turtle:{name:'Sea turtle',singular:'sea turtle',plural:'sea turtles',portrait:.76},
  surgeon:{name:'Blue tang',singular:'blue tang',plural:'blue tangs',portrait:1},
  tuna:{name:'Tuna',singular:'tuna',plural:'tuna',portrait:1},
  orca:{name:'Orca',singular:'orca',plural:'orcas',portrait:.9},
  seal:{name:'Harbour seal',singular:'seal',plural:'seals',portrait:1}
};
function info(kind){return catalogue[kind]||catalogue.hammer;}
function oval(c,x,y,rx,ry,color,angle=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fill();}
function contour(c,points){c.beginPath();const a=points[0],b=points.at(-1);c.moveTo((a.x+b.x)/2,(a.y+b.y)/2);for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}c.closePath();}
function field(a,kind){
  const phase=(a.stroke||0)*(kind==='orca'?.43:kind==='seal'?.57:1),turn=a.bend||0;
  function spine(u){const wave=kind==='orca'?Math.sin(phase-u*2)*1.25:Math.sin(u*6.3-phase)*(kind==='seal'?4:5);return{x:kind==='seal'?56-112*u:70-140*u,y:u*u*(wave+turn*(kind==='seal'?23:28))};}
  function basis(u){const p=spine(u),q=spine(u+.002);return {...p,a:Math.atan2(p.y-q.y,p.x-q.x)};}
  function at(u,r=0){const p=basis(u);return{x:p.x-Math.sin(p.a)*r,y:p.y+Math.cos(p.a)*r};}
  return {phase,spine,basis,at};
}
function body(c,at,widths,colors){
  const top=[],bottom=[];for(let i=0;i<widths.length;i++){const u=i/(widths.length-1);top.push(at(u,-widths[i]));bottom.push(at(u,widths[i]));}
  contour(c,[...top,...bottom.reverse()]);const g=c.createLinearGradient(0,-27,0,27);colors.forEach(([p,col])=>g.addColorStop(p,col));c.fillStyle=g;c.fill();c.strokeStyle=colors[0][1];c.lineWidth=.7;c.stroke();
}
function eyes(c,at,u,width,kind){for(const sign of [-1,1]){const p=at(u,sign*width);oval(c,p.x,p.y,kind==='seal'?2.2:1.9,1.6,'#101e26');oval(c,p.x+.55,p.y-.5,.65,.55,'#f4f4dc');}}
function markers(c,a,options,at){
  if(!options.snps)return;const n=Math.min(10,options.snps.length),cols=n>5?5:n;
  for(let i=0;i<n;i++){const p=at(cols===1?.4:.25+(i%cols)/(cols-1)*.35,n>5?(i<5?-5.5:5.5):0);SharkCharacter.drawMarker(c,p.x,p.y,4.3,options.snps[i],options.snpPalettes?.[i]);}
}
function wake(c,a,time,kind){
  const scale=a.scale||1,t=time+(a.phase||0),alpha=kind==='turtle'?.12:.16;
  c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(scale,scale);c.strokeStyle=`rgba(220,250,244,${alpha})`;c.lineWidth=1.2;
  for(const sign of [-1,1]){c.beginPath();c.moveTo(-40,sign*18);c.quadraticCurveTo(-74,sign*(27+Math.sin(t)*2),-105,sign*35);c.stroke();}
  if((kind==='orca'||kind==='seal')&&((a.phase||0)*4+time)%24<1.15){const q=((a.phase||0)*4+time)%24/1.15;c.strokeStyle=`rgba(237,255,251,${(1-q)*.55})`;c.lineWidth=1;c.beginPath();c.ellipse(36,0,8+q*17,5+q*10,0,0,TAU);c.stroke();}
  c.restore();
}
function drawTuna(c,a,time,options){
  const {phase,basis,at}=field(a,'tuna');c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);c.lineJoin='round';
  for(const sign of [-1,1]){const p=basis(.28);c.save();c.translate(p.x,p.y);c.rotate(p.a);c.scale(1,sign);c.fillStyle='#6b9da5';c.strokeStyle='#24526e';c.lineWidth=.6;c.beginPath();c.moveTo(9,10);c.quadraticCurveTo(-7,20,-34,31);c.quadraticCurveTo(-24,13,-6,9);c.closePath();c.fill();c.stroke();c.restore();}
  const tail=basis(1);c.save();c.translate(tail.x,tail.y);c.rotate(tail.a+Math.sin(6.3-phase)*.11);const tg=c.createLinearGradient(0,-32,0,32);tg.addColorStop(0,'#224967');tg.addColorStop(.5,'#95bdc4');tg.addColorStop(1,'#193e5d');c.fillStyle=tg;c.strokeStyle='#1e4257';c.lineWidth=.8;c.beginPath();c.moveTo(4,-2);c.bezierCurveTo(-8,-6,-29,-32,-33,-34);c.bezierCurveTo(-34,-20,-22,-6,-15,0);c.bezierCurveTo(-22,6,-34,20,-33,34);c.bezierCurveTo(-29,32,-8,6,4,2);c.closePath();c.fill();c.stroke();c.restore();
  body(c,at,[2,8,14,19,21,21,19,16,12,8,4.4,2.4,1.6,1.2],[[0,'#173d5a'],[.24,'#356d91'],[.47,'#639cb4'],[.73,'#b7ccd0'],[1,'#37667c']]);
  for(const sign of [-1,1]){for(let i=0;i<6;i++){const u=.65+i*.047,p=at(u,sign*(9-i*1.3));c.fillStyle=i%2?'#e0bf54':'#c7af57';c.beginPath();c.moveTo(p.x+2,p.y);c.lineTo(p.x-4,p.y+sign*(4-i*.25));c.lineTo(p.x-2,p.y-sign);c.closePath();c.fill();}const g=at(.2,sign*12);c.strokeStyle='#1a465f99';c.lineWidth=1;c.beginPath();c.moveTo(g.x+2,g.y-sign*4);c.quadraticCurveTo(g.x-3,g.y,g.x-4,g.y+sign*3);c.stroke();}
  const ridge=basis(.39);c.fillStyle='#365d72';c.beginPath();c.moveTo(ridge.x+11,ridge.y-1);c.quadraticCurveTo(ridge.x-3,ridge.y-11,ridge.x-10,ridge.y-8);c.lineTo(ridge.x-13,ridge.y+1);c.closePath();c.fill();
  eyes(c,at,.09,7,'tuna');markers(c,a,options,at);c.restore();
}
function drawOrca(c,a,time,options){
  const {phase,basis,at}=field(a,'orca');c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);c.lineJoin='round';
  for(const sign of [-1,1]){const p=basis(.29),beat=Math.sin(phase)*.055;c.save();c.translate(p.x,p.y);c.rotate(p.a+sign*beat);c.scale(1,sign);const g=c.createLinearGradient(4,12,-17,43);g.addColorStop(0,'#1d2931');g.addColorStop(1,'#0b151e');c.fillStyle=g;c.beginPath();c.moveTo(10,12);c.bezierCurveTo(7,25,-10,47,-20,45);c.bezierCurveTo(-30,41,-20,23,-8,13);c.closePath();c.fill();c.restore();}
  const tail=basis(1);c.save();c.translate(tail.x,tail.y);c.rotate(tail.a);c.scale(1,.74+.20*Math.sin(phase));c.fillStyle='#101f2a';c.beginPath();c.moveTo(5,-3);c.bezierCurveTo(-6,-8,-22,-26,-38,-29);c.bezierCurveTo(-35,-13,-22,-2,-13,0);c.bezierCurveTo(-22,2,-35,13,-38,29);c.bezierCurveTo(-22,26,-6,8,5,3);c.closePath();c.fill();c.strokeStyle='#4d6672';c.lineWidth=.7;c.stroke();c.restore();
  body(c,at,[8,16,22,25,25,23,20,17,13,9,5,2.6,2],[[0,'#0b1721'],[.3,'#182833'],[.48,'#354650'],[.7,'#192b36'],[1,'#0a1721']]);
  c.save();c.clip();
  for(const sign of [-1,1]){let p=at(.16,sign*15);oval(c,p.x,p.y,11,4.8,'#f1f0db',sign*.18);p=at(.59,sign*14);c.save();c.translate(p.x,p.y);c.rotate(basis(.59).a);c.scale(1,sign);c.fillStyle='#d9e3d8';c.beginPath();c.moveTo(14,2);c.bezierCurveTo(-2,-3,-23,-2,-30,4);c.quadraticCurveTo(-7,9,10,6);c.closePath();c.fill();c.restore();}
  const saddle=at(.55,0);c.fillStyle='#83929388';c.beginPath();c.moveTo(saddle.x+8,saddle.y-11);c.bezierCurveTo(saddle.x-11,saddle.y-17,saddle.x-22,saddle.y-8,saddle.x-18,saddle.y+9);c.quadraticCurveTo(saddle.x-3,saddle.y+15,saddle.x+7,saddle.y+8);c.quadraticCurveTo(saddle.x-8,saddle.y+1,saddle.x+8,saddle.y-11);c.closePath();c.fill();c.restore();const dorsal=at(.43,-1);c.fillStyle='#0b1822';c.beginPath();c.moveTo(dorsal.x+12,dorsal.y+2);c.bezierCurveTo(dorsal.x+2,dorsal.y-3,dorsal.x-7,dorsal.y-18,dorsal.x-14,dorsal.y-23);c.quadraticCurveTo(dorsal.x-14,dorsal.y-6,dorsal.x-4,dorsal.y+2);c.closePath();c.fill();
  const blow=at(.105,0);c.strokeStyle='#091117';c.lineWidth=1.5;c.beginPath();c.moveTo(blow.x-1,blow.y-2);c.quadraticCurveTo(blow.x-4,blow.y,blow.x-1,blow.y+2);c.stroke();eyes(c,at,.095,10,'orca');markers(c,a,options,at);c.restore();
}
function drawSeal(c,a,time,options){
  const {phase,basis,at}=field(a,'seal');c.save();c.translate(a.x,a.y);c.rotate(a.heading||0);c.scale(a.scale||1,a.scale||1);c.lineJoin='round';
  for(const sign of [-1,1]){const p=basis(.3);c.save();c.translate(p.x,p.y);c.rotate(p.a+Math.sin(phase+sign)*.08);c.scale(1,sign);c.fillStyle='#718582';c.beginPath();c.moveTo(8,12);c.quadraticCurveTo(6,26,-12,31);c.quadraticCurveTo(-19,27,-8,15);c.closePath();c.fill();c.strokeStyle='#425d5d';c.lineWidth=.6;c.stroke();c.restore();}
  const tail=basis(1);c.save();c.translate(tail.x,tail.y);c.rotate(tail.a);for(const sign of [-1,1]){c.save();c.scale(1,sign);c.fillStyle='#596f70';c.strokeStyle='#3f585c';c.lineWidth=.6;c.beginPath();c.moveTo(4,0);c.bezierCurveTo(-5,-2,-20,-12,-28,-15);c.quadraticCurveTo(-33,-9,-28,-1);c.quadraticCurveTo(-14,6,4,2);c.closePath();c.fill();c.stroke();for(let i=0;i<3;i++){c.strokeStyle='#acb5a47a';c.beginPath();c.moveTo(-4,1);c.lineTo(-25+i*2,-3-i*3);c.stroke();}c.restore();}c.restore();
  body(c,at,[5,10,10.8,10.4,15,20,22,21,17,11,6,3,2],[[0,'#425b5e'],[.25,'#7a918a'],[.48,'#b4bda8'],[.7,'#8a9c90'],[1,'#4b6566']]);
  // Stable speckling follows the torso rather than shimmering in screen space.
  for(let i=0;i<47;i++){const u=.3+(i*.618033%1)*.49,offset=Math.sin(i*8.3)*(7+Math.sin((u-.3)/.49*Math.PI)*7),p=at(u,offset);oval(c,p.x,p.y,1.1+(i%3)*.4,.7+(i%2)*.4,i%3?'#405c5b70':'#d2d6bd8c',i);}
  const muzzle=at(.035,0);oval(c,muzzle.x-1,muzzle.y,7,5,'#c7c9b1');oval(c,muzzle.x+4,muzzle.y,2.4,2,'#30474a');
  for(const sign of [-1,1])for(let i=0;i<3;i++){c.strokeStyle='#e1e4cfbd';c.lineWidth=.6;c.beginPath();c.moveTo(muzzle.x+1,muzzle.y+sign*2);c.quadraticCurveTo(muzzle.x+9,muzzle.y+sign*(5+i*3),muzzle.x+14-i,muzzle.y+sign*(6+i*4));c.stroke();}
  eyes(c,at,.115,7.1,'seal');markers(c,a,options,at);c.restore();
}
function drawTurtle(c,a,time,options){
  const phase=(a.stroke||0)*.22,turn=(a.bend||0)*.12;
  c.save();c.translate(a.x,a.y);c.rotate((a.heading||0)+Math.sin(phase)*.018);c.scale(a.scale||1,a.scale||1);c.lineJoin='round';
  // Long front flippers row together; smaller rear paddles steer.
  for(const sign of [-1,1]){
    c.save();c.translate(20,sign*15);c.rotate(sign*(.12+Math.sin(phase)*.3)+turn);c.scale(1,sign);const g=c.createLinearGradient(0,0,-25,42);g.addColorStop(0,'#879365');g.addColorStop(1,'#48694e');c.fillStyle=g;c.strokeStyle='#344f40';c.lineWidth=.7;c.beginPath();c.moveTo(5,-2);c.bezierCurveTo(7,9,-12,39,-29,45);c.bezierCurveTo(-37,45,-24,23,-14,13);c.quadraticCurveTo(-4,1,5,-2);c.closePath();c.fill();c.stroke();c.strokeStyle='#c2bd7b88';c.beginPath();c.moveTo(0,3);c.quadraticCurveTo(-14,22,-29,42);c.stroke();c.restore();
    c.save();c.translate(-29,sign*15);c.rotate(sign*Math.sin(phase-.6)*.12+turn);c.scale(1,sign);c.fillStyle='#657d53';c.strokeStyle='#344f40';c.lineWidth=.7;c.beginPath();c.moveTo(9,-2);c.quadraticCurveTo(-8,5,-18,20);c.quadraticCurveTo(-2,24,7,11);c.closePath();c.fill();c.stroke();c.restore();
  }
  c.fillStyle='#697d51';c.beginPath();c.moveTo(-35,-3);c.quadraticCurveTo(-52,0,-35,3);c.closePath();c.fill();
  c.save();c.translate(33,0);c.rotate(turn*.5);const neck=c.createLinearGradient(0,-8,0,8);neck.addColorStop(0,'#728256');neck.addColorStop(.5,'#c0b977');neck.addColorStop(1,'#627e53');c.fillStyle=neck;c.beginPath();c.moveTo(-9,-7);c.bezierCurveTo(0,-7,5,-11,15,-9);c.bezierCurveTo(28,-7,29,8,15,10);c.quadraticCurveTo(2,10,-9,7);c.closePath();c.fill();c.strokeStyle='#3e5f45';c.lineWidth=.7;c.stroke();
  for(const sign of [-1,1]){oval(c,16,sign*6.8,1.9,1.5,'#223d30');oval(c,16.5,sign*6.8-.45,.65,.5,'#f1eed4');}c.fillStyle='#405d3d';for(const y of [-2,2]){c.beginPath();c.arc(24,y,.7,0,TAU);c.fill();}c.restore();
  const rim=c.createRadialGradient(3,-6,2,0,0,40);rim.addColorStop(0,'#bdbb75');rim.addColorStop(.7,'#7f8b50');rim.addColorStop(1,'#3e6546');c.fillStyle=rim;c.beginPath();c.ellipse(-2,0,38,27,0,0,TAU);c.fill();c.strokeStyle='#344f35';c.lineWidth=1;c.stroke();
  const shell=c.createRadialGradient(10,-10,1,-2,0,36);shell.addColorStop(0,'#a4a76a');shell.addColorStop(.45,'#79884b');shell.addColorStop(1,'#405e38');c.fillStyle=shell;c.beginPath();c.ellipse(-2,0,34,23,0,0,TAU);c.fill();c.strokeStyle='#d4c98b';c.lineWidth=1.2;c.stroke();
  // Vertebral and costal scutes make a carapace rather than a plain oval.
  c.save();c.beginPath();c.ellipse(-2,0,33,22,0,0,TAU);c.clip();c.strokeStyle='#d0c284b3';c.lineWidth=1;
  for(let i=0;i<4;i++){const x=24-i*16;c.beginPath();c.moveTo(x,0);c.lineTo(x-8,-9);c.lineTo(x-17,0);c.lineTo(x-8,9);c.closePath();c.stroke();for(const sign of [-1,1]){c.beginPath();c.moveTo(x-8,sign*9);c.lineTo(x-11,sign*20);c.lineTo(x-24,sign*26);c.stroke();}}
  for(let i=0;i<14;i++){const ang=i/14*TAU;c.beginPath();c.moveTo(-2+Math.cos(ang)*29,Math.sin(ang)*19);c.lineTo(-2+Math.cos(ang+.03)*38,Math.sin(ang+.03)*27);c.stroke();}c.restore();
  if(options.snps){const n=Math.min(10,options.snps.length),cols=n>5?5:n;for(let i=0;i<n;i++){const x=cols===1?0:21-(i%cols)/(cols-1)*43,y=n>5?(i<5?-6:6):0;SharkCharacter.drawMarker(c,x,y,3.8,options.snps[i],options.snpPalettes?.[i]);}}
  c.restore();
}
function draw(c,a,time=0,options={}){
  const kind=options.variant||'hammer';
  if(kind==='hammer'||kind==='classic'){SharkCharacter.draw(c,a,time,options);return;}
  if(kind==='surgeon'){FishCharacter.draw(c,{...a,scale:(a.scale||1)*1.25},time,{species:'surgeon',snps:options.snps,snpPalettes:options.snpPalettes});return;}
  wake(c,a,time,kind);
  if(kind==='turtle')drawTurtle(c,a,time,options);else if(kind==='tuna')drawTuna(c,a,time,options);else if(kind==='orca')drawOrca(c,a,time,options);else if(kind==='seal')drawSeal(c,a,time,options);
}
root.SeaLife={draw,info,catalogue};
})(globalThis);
