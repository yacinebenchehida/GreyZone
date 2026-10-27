/* Decorative free swimming. Goals are random positions in the available water;
   there is no orbit, centre-seeking force, or fixed route. */
(function(root){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function goal(actor,{x,y,speed,time,random,bounds,yMin,yMax}){
  let target=actor.wanderTarget;
  const current=target&&bounds(target.y);
  const valid=target&&target.y>=yMin&&target.y<=yMax&&target.x>=current[0]&&target.x<=current[1];
  if(!valid||time>target.until||Math.hypot(target.x-x,target.y-y)<Math.max(28,speed*.40)){
    let gx=x,gy=y;
    const here=bounds(y),distance=Math.hypot(here[1]-here[0],yMax-yMin)*.24;
    for(let attempt=0;attempt<12;attempt++){
      gy=yMin+random()*(yMax-yMin);const limits=bounds(gy);
      const pad=Math.min(14,(limits[1]-limits[0])*.12);
      gx=limits[0]+pad+random()*Math.max(1,limits[1]-limits[0]-2*pad);
      if(Math.hypot(gx-x,gy-y)>distance)break;
    }
    actor.wanderTarget=target={x:gx,y:gy,until:time+2.0+random()*3.5};
  }
  return target;
}
function avoid({x,y,heading,speed,bounds,yMin,yMax}){
  const look=clamp(speed*.55,24,90),px=x+Math.cos(heading)*look,py=y+Math.sin(heading)*look;
  const limits=bounds(clamp(py,yMin,yMax)),pad=20;
  let fx=0,fy=0;
  if(px<limits[0]+pad)fx+=(limits[0]+pad-px)/24;
  if(px>limits[1]-pad)fx-=(px-limits[1]+pad)/24;
  if(py<yMin+pad)fy+=(yMin+pad-py)/24;
  if(py>yMax-pad)fy-=(py-yMax+pad)/24;
  return {x:fx,y:fy};
}
root.FreeSwim={goal,avoid};
})(globalThis);
