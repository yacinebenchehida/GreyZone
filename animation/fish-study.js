/* A small visual study, separate from the population-genetics simulation. */
(function(){
'use strict';
const canvas=document.getElementById('fish-sea'),c=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let w=1000,h=570,t=0,travelTime=0,last=0,paused=reduced.matches,solo=false,pace=Number(document.getElementById('pace').value),water;
const fish=Array.from({length:4},(_,i)=>({id:i,x:0,y:0,heading:0,bend:0,stroke:i*1.83,effort:1,scale:1,previousHeading:null}));
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function resize(){const b=canvas.getBoundingClientRect();w=b.width;h=b.height;const d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);c.setTransform(d,0,0,d,0,0);makeWater();}
function makeWater(){
  water=document.createElement('canvas');water.width=w;water.height=h;const q=water.getContext('2d');
  const g=q.createLinearGradient(0,0,w,h);g.addColorStop(0,'#217f94');g.addColorStop(.38,'#4bb7b5');g.addColorStop(.72,'#36a9b1');g.addColorStop(1,'#146a8d');q.fillStyle=g;q.fillRect(0,0,w,h);
  const light=q.createRadialGradient(w*.38,h*.35,0,w*.45,h*.45,w*.7);light.addColorStop(0,'#b5e4c747');light.addColorStop(1,'#76cdbb00');q.fillStyle=light;q.fillRect(0,0,w,h);
  let seed=702;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<2200;i++){q.fillStyle=i%3?'#d4f5d80a':'#134b7010';q.beginPath();q.ellipse(rnd()*w,rnd()*h,.3+rnd()*.9,.3+rnd()*.5,0,0,Math.PI*2);q.fill();}
}
function route(u,index){
  const lag=solo?0:index*.36,ang=u*.17-lag;
  const spread=solo?0:[-1,1,-.65,.65][index]*Math.min(32,w*.035);
  const x=w*.50+Math.sin(ang)*w*.37,y=h*.50+Math.cos(ang)*h*.31;
  const dx=Math.cos(ang)*w*.37,dy=-Math.sin(ang)*h*.31,heading=Math.atan2(dy,dx);
  return {x:x-Math.sin(heading)*spread,y:y+Math.cos(heading)*spread,heading,speed:Math.hypot(dx,dy)*.17};
}
function waterLight(){
  c.save();c.lineWidth=.8;
  for(let j=0;j<9;j++){
    c.beginPath();
    for(let x=-30;x<w+30;x+=9){const y=h*j/8+Math.sin(x*.013+j*2+t*.22)*9+Math.sin(x*.031-j+t*.13)*4;x===-30?c.moveTo(x,y):c.lineTo(x,y);}
    c.strokeStyle='#d7f5d517';c.stroke();
  }
  for(let i=0;i<28;i++){
    const x=(i*.618033%1)*w,y=(i*.38197%1)*h,alpha=(.5+.5*Math.sin(t*.55+i*2))*.14;
    c.fillStyle=`rgba(228,255,223,${alpha})`;c.beginPath();c.ellipse(x+Math.sin(t*.15+i)*4,y,1.7,.6,-.3,0,Math.PI*2);c.fill();
  }c.restore();
}
function frame(now){
  const dt=last?Math.min(.04,(now-last)/1000):0;last=now;
  // Travel and body animation have independent clocks.
  if(!paused){t+=dt;travelTime+=dt*pace;}
  c.clearRect(0,0,w,h);c.drawImage(water,0,0,w,h);waterLight();
  for(const f of fish){
    const p=route(travelTime,f.id),ahead=route(travelTime+.03,f.id),heading=Math.atan2(ahead.y-p.y,ahead.x-p.x);
    const next=route(travelTime+.08,f.id),future=route(travelTime+.11,f.id),nextHeading=Math.atan2(future.y-next.y,future.x-next.x);
    f.x=p.x;f.y=p.y;f.heading=heading;f.bend=Math.max(-.7,Math.min(.7,delta(heading,nextHeading)*4));
    f.scale=Math.max(.70,Math.min(1.38,w/800))*(solo?1.35:1)*(1-f.id*.035);
    f.effort=.6+.4*(.5+.5*Math.sin(t*.45+f.id));
    if(!paused)f.stroke+=dt*(4.5+f.effort*1.8);
  }
  const shown=solo?[fish[0]]:fish;
  // Shadows sit on the seabed below the animals, with soft edges.
  for(const f of shown){c.save();c.translate(f.x+10,f.y+15);c.rotate(f.heading);c.scale(f.scale,f.scale);const shadow=c.createRadialGradient(-4,0,2,-4,0,59);shadow.addColorStop(0,'#0b52674d');shadow.addColorStop(.65,'#125b6e1c');shadow.addColorStop(1,'#125b6e00');c.fillStyle=shadow;c.scale(1,.42);c.beginPath();c.arc(-4,0,59,0,Math.PI*2);c.fill();c.restore();}
  for(const f of shown)FishCharacter.draw(c,f,t);
  requestAnimationFrame(frame);
}
const pause=document.getElementById('pause'),group=document.getElementById('group');
function sync(){pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));group.textContent=solo?'Watch the school':'Watch one fish';group.setAttribute('aria-pressed',String(solo));}
pause.onclick=()=>{paused=!paused;sync();};group.onclick=()=>{solo=!solo;sync();};
document.getElementById('pace').onchange=e=>{pace=Number(e.target.value);};
reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
document.addEventListener('visibilitychange',()=>{last=0;});
new ResizeObserver(resize).observe(canvas);resize();sync();requestAnimationFrame(frame);
})();
