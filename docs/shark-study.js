(function(){
'use strict';
const canvas=document.getElementById('shark-sea'),c=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let w=1100,h=480,t=0,last=0,paused=reduced.matches,group=false,variant='classic',water;
let seed=8124;function random(){let q=seed+=0x6D2B79F5;q=Math.imul(q^q>>>15,q|1);q^=q+Math.imul(q^q>>>7,q|61);return((q^q>>>14)>>>0)/4294967296;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const sharks=Array.from({length:3},(_,i)=>({x:w*(.32+i*.17),y:h*(i===1?.68:.40),heading:i*.9,stroke:i*1.7,bend:0,effort:.8,wanderTarget:null}));
function paintWater(){const bg=document.createElement('canvas');bg.width=w;bg.height=h;const q=bg.getContext('2d'),g=q.createLinearGradient(0,0,w,h);g.addColorStop(0,'#258d9f');g.addColorStop(.45,'#55bdb9');g.addColorStop(1,'#207e9a');q.fillStyle=g;q.fillRect(0,0,w,h);for(let i=0;i<18;i++){const y=(i*.618%1)*h;q.strokeStyle='#ddf5dd16';q.lineWidth=.8;q.beginPath();q.moveTo(0,y);q.bezierCurveTo(w*.25,y-17,w*.6,y+16,w,y-4);q.stroke();}water=bg;}
function resize(){const box=canvas.getBoundingClientRect(),oldW=w,oldH=h;w=box.width;h=box.height;const d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);c.setTransform(d,0,0,d,0,0);for(const a of sharks){a.x=a.x/oldW*w;a.y=a.y/oldH*h;a.wanderTarget=null;}paintWater();renderCards();}
function renderCards(){for(const key of Object.keys(SharkCharacter.profiles)){const card=document.getElementById('design-'+key),box=card.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);card.width=Math.round(box.width*d);card.height=Math.round(box.height*d);const q=card.getContext('2d');q.setTransform(d,0,0,d,0,0);const scale=Math.min((box.width-12)/200,(box.height-12)/(105));SharkCharacter.draw(q,{x:box.width*.60,y:box.height*.52,scale,heading:0,stroke:.2,effort:.5},0,{variant:key});}}
function frame(now){const dt=last?Math.min(.04,(now-last)/1000):0;last=now;if(!paused)t+=dt;
  c.clearRect(0,0,w,h);c.drawImage(water,0,0,w,h);
  const pace=Number(document.getElementById('travel-speed').value),shown=group?sharks:[sharks[0]];
  for(const [i,a]of shown.entries()){
    const scale=clamp(w/1000,.55,1.10)*(group?.90:1.25)*(1-i*.04),margin=Math.min(w*.24,118*scale),vertical=Math.min(h*.38,118*scale);
    const bounds=()=>[margin,w-margin],yMin=vertical,yMax=h-vertical,speed=w*.049*pace*(1-i*.04);
    if(!paused){
      const goal=FreeSwim.goal(a,{x:a.x,y:a.y,speed,time:t,random,bounds,yMin,yMax});
      const wall=FreeSwim.avoid({x:a.x,y:a.y,heading:a.heading,speed,bounds,yMin,yMax});
      let fx=0,fy=0;
      for(const b of shown)if(a!==b){const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d>0&&d<110*scale){const force=(110*scale-d)/(110*scale);fx+=dx/d*force*2;fy+=dy/d*force*2;}}
      const target=Math.atan2(goal.y-a.y,goal.x-a.x),desired=Math.atan2(Math.sin(target)+wall.y+fy,Math.cos(target)+wall.x+fx);
      const turn=clamp(delta(a.heading,desired),-dt*2.2,dt*2.2);a.heading+=turn;SharkCharacter.followTurn(a,dt,scale,speed);
      a.x+=Math.cos(a.heading)*speed*dt;a.y+=Math.sin(a.heading)*speed*dt;a.x=clamp(a.x,margin,w-margin);a.y=clamp(a.y,yMin,yMax);a.stroke+=dt*4.2;
    }
    c.save();c.translate(a.x+9,a.y+15);c.rotate(a.heading);c.scale(scale,scale*.42);const g=c.createRadialGradient(-12,0,1,-12,0,100);g.addColorStop(0,'#18556b40');g.addColorStop(1,'#18556b00');c.fillStyle=g;c.beginPath();c.arc(-12,0,100,0,Math.PI*2);c.fill();c.restore();
    SharkCharacter.draw(c,{...a,scale},t,{variant});
  }
  requestAnimationFrame(frame);
}
function sync(){document.getElementById('pause').textContent=paused?'Resume':'Pause';document.getElementById('pause').setAttribute('aria-pressed',String(paused));document.getElementById('group').textContent=group?'Show one shark':'Show three sharks';document.getElementById('group').setAttribute('aria-pressed',String(group));document.getElementById('variant-name').textContent=SharkCharacter.profiles[variant].name.toUpperCase();document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===variant)));}
document.querySelectorAll('[data-variant]').forEach(b=>{b.onclick=()=>{variant=b.dataset.variant;sync();if(matchMedia('(max-width: 760px)').matches)canvas.scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'center'});};});
document.getElementById('pause').onclick=()=>{paused=!paused;sync();};document.getElementById('group').onclick=()=>{group=!group;sharks.forEach(a=>a.wanderTarget=null);sync();};
document.addEventListener('visibilitychange',()=>{last=0;});reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});new ResizeObserver(resize).observe(canvas);resize();sync();requestAnimationFrame(frame);
})();
