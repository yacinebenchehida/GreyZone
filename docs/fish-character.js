/* Decorative top-view fish. Shape and palette are independent of schooling.
   The centreline drives the torso, fins, markings and tail together. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const profiles={surgeon:{body:'#237ac8',light:'#73d7ed',edge:'#123b73',ink:'#173f71',tail:'#f4d45a',fin:'#85dbe1',width:1}};
const defaultWidths=[2,6.4,10.4,13.1,14.2,14,12.9,11.1,9.0,6.9,5.1,3.6,2.5,1.7,1.3,1.1];
function path(c,pts,close=true){c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x,pts[i].y);if(close)c.closePath();}
function ellipse(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function draw(c,fish,time,options={}){
  const style=profiles[options.species||'surgeon'],phase=fish.stroke||0;
  const widths=style.widths||defaultWidths;
  const effort=fish.effort===undefined?1:fish.effort,turn=fish.bend||0;
  // The wave grows toward the tail, with a nearly steady head.
  function spine(u){return {x:45-92*u,y:Math.pow(u,1.9)*(Math.sin(u*6.3-phase)*(3+effort*4)+turn*15)};}
  function basis(u){const p=spine(u),q=spine(u+.002),a=Math.atan2(p.y-q.y,p.x-q.x);return {...p,a};}
  function point(u,offset){const p=basis(u);return{x:p.x-Math.sin(p.a)*offset,y:p.y+Math.cos(p.a)*offset};}
  const top=[],bottom=[];
  for(let i=0;i<widths.length;i++){const u=i/(widths.length-1),r=widths[i]*style.width;top.push(point(u,-r));bottom.push(point(u,r));}
  const body=[...top,...bottom.reverse()];
  c.save();c.translate(fish.x,fish.y);c.rotate(fish.heading);c.scale(fish.scale||1,fish.scale||1);
  c.lineJoin='round';c.lineCap='round';
  // Pectoral fins turn from their shoulders and overlap the torso.
  for(const side of [-1,1]){
    const p=basis(.29),beat=Math.sin(phase*.53+side*.65);
    c.save();c.translate(p.x,p.y);c.rotate(p.a);c.scale(1,side);
    c.rotate(beat*.10);c.fillStyle='#65bfc77a';c.strokeStyle='#b2e9cf88';c.lineWidth=.7;
    c.beginPath();c.moveTo(4,8);c.bezierCurveTo(-1,17,-12,28+beat*3,-20,26+beat*3);c.quadraticCurveTo(-23,22,-13,12);c.quadraticCurveTo(-4,8,4,8);c.fill();c.stroke();
    c.strokeStyle='#c8f2d37a';c.lineWidth=.5;
    for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,11);c.quadraticCurveTo(-9,15+i*2,-18+i*2,24+i*.3+beat*2);c.stroke();}
    c.restore();
  }
  // An attached, forked caudal fin follows the final spine segment.
  const tail=basis(1);
  c.save();c.translate(tail.x,tail.y);c.rotate(tail.a+Math.sin(6.3-phase)*.13);
  const tg=c.createLinearGradient(1,0,-24,0);tg.addColorStop(0,'#ccac31');tg.addColorStop(.3,style.tail);tg.addColorStop(1,'#ffe798');
  c.fillStyle=tg;c.strokeStyle='#445e5480';c.lineWidth=.65;
  c.beginPath();c.moveTo(3,-1.7);c.bezierCurveTo(-5,-2,-16,-11,-24,-17);c.quadraticCurveTo(-25,-9,-16,0);c.quadraticCurveTo(-25,9,-24,17);c.bezierCurveTo(-16,11,-5,2,3,1.7);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#917c3266';c.lineWidth=.45;
  for(const side of [-1,1])for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,side);c.quadraticCurveTo(-11,side*(3+i),-22+i*1.6,side*(14-i*3));c.stroke();}
  c.restore();
  // A closed, curved torso is redrawn along the same spine on every frame.
  path(c,body);const g=c.createLinearGradient(0,-17,0,17);
  g.addColorStop(0,'#164c85');g.addColorStop(.23,style.body);g.addColorStop(.43,style.light);g.addColorStop(.65,'#319bd4');g.addColorStop(1,'#163f76');
  c.fillStyle=g;c.fill();c.strokeStyle='#164578';c.lineWidth=.75;c.stroke();
  c.save();path(c,body);c.clip();
  // Sweeping flank markings are attached to the deforming body, not a decal.
  for(const side of [-1,1]){
    const pts=[];for(let i=0;i<25;i++){const u=.23+i/24*.66;pts.push(point(u,side*(3.6+Math.sin((u-.23)/.66*Math.PI)*3.6)));}
    for(let i=24;i>=0;i--){const u=.23+i/24*.66;pts.push(point(u,side*(1.8+Math.sin((u-.23)/.66*Math.PI)*2.6)));}
    path(c,pts);c.fillStyle=style.ink;c.globalAlpha=.8;c.fill();
  }
  c.globalAlpha=1;
  const ridge=[];for(let i=0;i<40;i++)ridge.push(point(.12+i/39*.78,-.9));path(c,ridge,false);c.strokeStyle='#b9f3e5b3';c.lineWidth=1.1;c.stroke();
  // Soft shifting caustic highlights integrate the fish into the water.
  c.strokeStyle='#ddfff322';c.lineWidth=3;
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(-48+i*34+Math.sin(time*.3)*7,-22);c.bezierCurveTo(-35+i*34,0,-45+i*34,6,-28+i*34,22);c.stroke();}
  c.restore();
  // Two small lateral eyes and gill covers give the head a finished shape.
  for(const side of [-1,1]){
    const p=point(.105,side*7.1);
    ellipse(c,p.x,p.y,2.6,2,'#133454');ellipse(c,p.x+.2,p.y-side*.2,1.55,1.4,'#16262d');ellipse(c,p.x+.65,p.y-.55,.55,.45,'#e6f4db');
    const a=point(.22,side*10.6),b=point(.27,side*12.6);
    c.strokeStyle='#11437688';c.lineWidth=.7;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(b.x-2,b.y,b.x,b.y);c.stroke();
    const spineMark=point(.91,side*2);c.strokeStyle='#e9d267';c.lineWidth=1.3;c.beginPath();c.moveTo(spineMark.x-2,spineMark.y);c.lineTo(spineMark.x+2,spineMark.y);c.stroke();
  }
  const nose=spine(0);c.strokeStyle='#23547d';c.lineWidth=.7;c.beginPath();c.moveTo(nose.x-.5,nose.y-1.5);c.quadraticCurveTo(nose.x+1,nose.y,nose.x-.5,nose.y+1.5);c.stroke();
  c.restore();
}
root.FishCharacter={draw,profiles};
})(globalThis);
