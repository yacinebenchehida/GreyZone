/* Top-view shark design studies. All parts follow one continuous spine.
   These are illustrative designs, not anatomical measurements. */
(function(root){
'use strict';
const TAU=Math.PI*2;
const profiles={
  classic:{name:'Classic shark',top:'#626262',body:'#989898',light:'#cdcdcd',edge:'#484848',fin:'#858585',tip:'#333333',width:1,wing:33,sweep:34,tail:1},
  slender:{name:'Slender shark',top:'#595959',body:'#939393',light:'#c6c6c6',edge:'#454545',fin:'#7c7c7c',tip:'#484848',width:.86,wing:34,sweep:34,tail:1.06},
  hammer:{name:'Hammerhead',top:'#686868',body:'#a3a3a3',light:'#d1d1d1',edge:'#4d4d4d',fin:'#888888',tip:'#555555',width:.95,wing:29,sweep:30,tail:.94,hammer:true}
};
const half=[2.4,5.8,9.5,13.2,16.0,18.1,19.1,19.4,18.9,18,16.6,14.8,12.8,10.8,8.8,7,5.4,4,2.9,2.1,1.7];
function contour(c,points){
  c.beginPath();const first=points[0],last=points.at(-1);c.moveTo((first.x+last.x)/2,(first.y+last.y)/2);
  for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}c.closePath();
}
function oval(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function draw(c,animal,time=0,options={}){
  const style=profiles[options.variant||animal.variant||'classic'],phase=animal.stroke||0,bend=animal.bend||0;
  function spine(u){return{x:74-142*u,y:Math.pow(u,2.25)*(Math.sin(u*5.5-phase)*(3+(animal.effort||.8)*3)+bend*18)};}
  function basis(u){const p=spine(u),q=spine(u+.002);return{...p,a:Math.atan2(p.y-q.y,p.x-q.x)};}
  function at(u,r){const p=basis(u);return{x:p.x-Math.sin(p.a)*r,y:p.y+Math.cos(p.a)*r};}
  const upper=[],lower=[];for(let i=style.hammer?2:0;i<half.length;i++){const u=i/(half.length-1),r=half[i]*style.width;upper.push(at(u,-r));lower.push(at(u,r));}
  const body=[...upper,...lower.reverse()];
  c.save();c.translate(animal.x,animal.y);c.rotate(animal.heading||0);c.scale(animal.scale||1,animal.scale||1);c.lineJoin='round';c.lineCap='round';
  // Broad-based pectoral fins and smaller pelvic fins, attached below the torso.
  for(const side of [-1,1]){
    const shoulder=basis(.29);c.save();c.translate(shoulder.x,shoulder.y);c.rotate(shoulder.a);c.scale(1,side);
    c.rotate(Math.sin(phase*.45+side)*.022);
    const fin=new Path2D();fin.moveTo(10,10);fin.bezierCurveTo(-2,18,-style.sweep*.60,style.wing*.78,-style.sweep,style.wing);fin.quadraticCurveTo(-style.sweep-3,style.wing-2,-style.sweep+9,style.wing-14);fin.bezierCurveTo(-20,22,-14,13,-12,10);fin.closePath();
    const fg=c.createLinearGradient(0,9,-style.sweep,style.wing);fg.addColorStop(0,style.body);fg.addColorStop(.6,style.fin);fg.addColorStop(1,style.tip);c.fillStyle=fg;c.strokeStyle=style.edge;c.lineWidth=.65;c.fill(fin);c.stroke(fin);
    c.save();c.clip(fin);if(style===profiles.classic){c.fillStyle=style.tip;c.beginPath();c.moveTo(-style.sweep-5,style.wing-14);c.lineTo(-style.sweep+13,style.wing-7);c.lineTo(-style.sweep+4,style.wing+6);c.closePath();c.fill();}c.restore();
    c.strokeStyle='#eeeeee4d';c.lineWidth=.8;c.beginPath();c.moveTo(5,12);c.quadraticCurveTo(-15,24,-style.sweep+4,style.wing-3);c.stroke();c.restore();
    const pelvic=basis(.70);c.save();c.translate(pelvic.x,pelvic.y);c.rotate(pelvic.a);c.scale(1,side);c.fillStyle=style.fin;c.strokeStyle=style.edge;c.lineWidth=.55;c.beginPath();c.moveTo(5,5);c.quadraticCurveTo(-1,12,-18,20);c.quadraticCurveTo(-20,18,-12,8);c.lineTo(-7,5);c.closePath();c.fill();c.stroke();c.restore();
  }
  // A gently banked projection makes the unequal tail lobes legible from above.
  const tail=basis(.995);c.save();c.translate(tail.x,tail.y);c.rotate(tail.a+Math.sin(5.5-phase)*.10);c.scale(style.tail,1);
  const tg=c.createLinearGradient(-4,-17,-28,16);tg.addColorStop(0,style.light);tg.addColorStop(.4,style.fin);tg.addColorStop(1,style.top);c.fillStyle=tg;c.strokeStyle=style.edge;c.lineWidth=.7;
  c.beginPath();c.moveTo(4,-2);c.bezierCurveTo(-8,-4,-29,-15,-45,-19);c.quadraticCurveTo(-49,-19,-42,-12);c.quadraticCurveTo(-31,-2,-20,1);c.quadraticCurveTo(-28,8,-31,15);c.quadraticCurveTo(-32,18,-27,16);c.quadraticCurveTo(-11,6,4,2);c.closePath();c.fill();c.stroke();
  if(style===profiles.classic){c.fillStyle=style.tip;c.beginPath();c.moveTo(-45,-19);c.lineTo(-34,-15);c.lineTo(-38,-10);c.lineTo(-45,-16);c.closePath();c.fill();}
  c.strokeStyle='#eeeeee52';c.lineWidth=.8;c.beginPath();c.moveTo(-1,0);c.quadraticCurveTo(-25,-7,-43,-17);c.stroke();c.restore();
  // Smooth shaded fusiform body, with pale edges and a dorsal highlight.
  contour(c,body);const volume=c.createLinearGradient(0,-21,0,21);volume.addColorStop(0,style.edge);volume.addColorStop(.18,style.top);volume.addColorStop(.42,style.body);volume.addColorStop(.52,style.light);volume.addColorStop(.70,style.body);volume.addColorStop(1,style.edge);c.fillStyle=volume;c.fill();c.strokeStyle=style.edge;c.lineWidth=.65;c.stroke();
  c.save();contour(c,body);c.clip();
  for(const side of [-1,1]){c.beginPath();for(let i=0;i<50;i++){const u=.08+i/49*.81,ix=u*(half.length-1),lo=Math.floor(ix),r=(half[lo]+(half[Math.min(lo+1,half.length-1)]-half[lo])*(ix-lo))*style.width*.92,p=at(u,side*r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.strokeStyle='#eeeeee94';c.lineWidth=1.15;c.stroke();}
  c.restore();
  // Five short gill slits on each flank, behind the eyes.
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const u=.18+i*.026,r=(11.3+i*1.25)*style.width,p=at(u,side*r);c.strokeStyle='#3c3c3ca0';c.lineWidth=.65;c.beginPath();c.moveTo(p.x+1,p.y-side*2.4);c.quadraticCurveTo(p.x-1,p.y-side*.7,p.x-.8,p.y+side*.8);c.stroke();
  }
  // The dorsal fin is raised above its contact shadow on the back.
  function dorsal(u,size){const p=basis(u);c.save();c.translate(p.x,p.y);c.rotate(p.a);c.scale(size,size);oval(c,-5,3,14,4,'#2525252d');const dg=c.createLinearGradient(7,0,-12,-20);dg.addColorStop(0,style.body);dg.addColorStop(.6,style.top);dg.addColorStop(1,style.tip);c.fillStyle=dg;c.strokeStyle=style.edge;c.lineWidth=.6;c.beginPath();c.moveTo(12,1);c.bezierCurveTo(6,-5,3,-16,-4,-22);c.quadraticCurveTo(-7,-23,-7,-18);c.quadraticCurveTo(-8,-7,-17,-1);c.quadraticCurveTo(-5,2,12,1);c.fill();c.stroke();if(style===profiles.classic){c.fillStyle=style.tip;c.beginPath();c.moveTo(-4,-22);c.lineTo(-.8,-17);c.lineTo(-7.8,-12);c.lineTo(-7,-18);c.closePath();c.fill();}c.strokeStyle='#dddddd6b';c.lineWidth=.7;c.beginPath();c.moveTo(10,0);c.quadraticCurveTo(1,-12,-4,-21);c.stroke();c.restore();}
  dorsal(style===profiles.slender?.46:.39,1);dorsal(.79,.32);
  if(style.hammer){
    c.save();const p=basis(.095);c.translate(p.x,p.y);c.rotate(p.a);
    const hg=c.createLinearGradient(0,-32,0,32);hg.addColorStop(0,style.top);hg.addColorStop(.4,style.light);hg.addColorStop(.7,style.body);hg.addColorStop(1,style.top);c.fillStyle=hg;c.strokeStyle=style.edge;c.lineWidth=.7;
    c.beginPath();c.moveTo(6,-5);c.bezierCurveTo(10,-17,12,-28,8,-33);c.quadraticCurveTo(4,-36,0,-31);c.quadraticCurveTo(-6,-20,-7,-8);c.quadraticCurveTo(-10,0,-7,8);c.quadraticCurveTo(-6,20,0,31);c.quadraticCurveTo(4,36,8,33);c.bezierCurveTo(12,28,10,17,6,5);c.quadraticCurveTo(8,0,6,-5);c.closePath();c.fill();c.stroke();
    for(const side of [-1,1]){oval(c,5,side*31,2.1,1.65,'#303030');oval(c,5.6,side*31-.4,.65,.55,'#dddddd');}c.restore();
  }else{
    for(const side of [-1,1]){const p=at(.105,side*7.9*style.width);oval(c,p.x,p.y,2.2,1.8,'#454545');oval(c,p.x+.1,p.y,1.5,1.4,'#202020');oval(c,p.x+.65,p.y-.55,.6,.48,'#eeeeee');}
    c.fillStyle='#45454540';for(let i=0;i<6;i++){const p=at(.04+i*.006,(i%2?1:-1)*(2+i*.65));c.beginPath();c.arc(p.x,p.y,.38,0,TAU);c.fill();}
  }
  c.restore();
}
root.SharkCharacter={draw,profiles};
})(globalThis);
