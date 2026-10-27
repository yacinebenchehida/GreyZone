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
// Each rear section follows the preceding section's earlier heading.
// Delay scales with body length and forward speed; the tail follows last.
function followTurn(animal,dt,scale,speed){
  const count=8,delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  if(!animal.jointHeadings)animal.jointHeadings=Array(count).fill(animal.heading);
  const previous=animal.jointHeadings.slice();
  const delay=Math.max(.055,Math.min(.125,142*scale/Math.max(45,speed)/(count-1)*.72));
  const blend=1-Math.exp(-dt/delay);
  animal.jointHeadings[0]=animal.heading;
  for(let i=1;i<count;i++){
    const target=i===1?animal.heading:previous[i-1];
    animal.jointHeadings[i]+=delta(animal.jointHeadings[i],target)*blend;
    // Keep accumulated lag away from the angle wrap during tight, slow turns.
    const lag=delta(animal.heading,animal.jointHeadings[i]);
    animal.jointHeadings[i]=animal.heading+Math.max(-2.2,Math.min(2.2,lag));
  }
  animal.turnPose=animal.jointHeadings.map((angle,i)=>{
    const limit=.90*Math.pow(i/(count-1),.9);
    return Math.max(-limit,Math.min(limit,delta(animal.heading,angle)));
  });
}
function makeSpine(animal){
  const phase=animal.stroke||0,pose=animal.turnPose,steps=64,base=[{x:74,y:0}];
  function angle(u){
    if(!pose)return -(animal.bend||0)*u*.65;
    const v=Math.max(0,Math.min(pose.length-1,u*(pose.length-1))),i=Math.min(pose.length-2,Math.floor(v));
    return pose[i]+(pose[i+1]-pose[i])*(v-i);
  }
  // Integrating constant-length sections bends the torso without stretching it.
  for(let i=1;i<=steps;i++){
    const a=angle((i-.5)/steps),last=base[i-1];
    base.push({x:last.x-Math.cos(a)*142/steps,y:last.y-Math.sin(a)*142/steps});
  }
  const points=base.map((p,i)=>{
    const u=i/steps,a=angle(u),wave=Math.pow(u,2.25)*Math.sin(u*5.5-phase)*(3+(animal.effort||.8)*3);
    return {x:p.x-Math.sin(a)*wave,y:p.y+Math.cos(a)*wave};
  });
  function spine(u){const v=Math.max(0,u*steps),i=Math.min(steps-1,Math.floor(v)),f=v-i;return{x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};}
  function basis(u){const p=spine(u),q=spine(u+.002);return{...p,a:Math.atan2(p.y-q.y,p.x-q.x)};}
  function at(u,r){const p=basis(u);return{x:p.x-Math.sin(p.a)*r,y:p.y+Math.cos(p.a)*r};}
  return {spine,basis,at};
}
function draw(c,animal,time=0,options={}){
  const style=profiles[options.variant||animal.variant||'classic'],phase=animal.stroke||0;
  const {spine,basis,at}=makeSpine(animal);
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
  if(options.alleles){
    for(let i=0;i<2;i++){
      const p=at(.40+i*.06,0);oval(c,p.x,p.y,3.0,3.0,options.alleles[i]?'#29d1be':'#f6a183');
      c.strokeStyle='#effff1';c.lineWidth=.8;c.stroke();
      if(options.alleles[i]){c.strokeStyle='#216c75';c.lineWidth=.8;c.beginPath();c.moveTo(p.x-1.4,p.y-1.4);c.lineTo(p.x+1.4,p.y+1.4);c.stroke();}
    }
  }
  // Five short gill slits on each flank, behind the eyes.
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const u=.18+i*.026,r=(11.3+i*1.25)*style.width,p=at(u,side*r);c.strokeStyle='#3c3c3ca0';c.lineWidth=.65;c.beginPath();c.moveTo(p.x+1,p.y-side*2.4);c.quadraticCurveTo(p.x-1,p.y-side*.7,p.x-.8,p.y+side*.8);c.stroke();
  }
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
root.SharkCharacter={draw,profiles,followTurn,makeSpine};
})(globalThis);
