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
    actor.wanderTarget=target={x:gx,y:gy,until:time+7+random()*5};
  }
  return target;
}
function avoid({x,y,heading,speed,bounds,yMin,yMax}){
  const here=bounds(y),width=here[1]-here[0];
  const look=clamp(speed*.40,12,Math.max(12,Math.min(65,width*.30))),px=x+Math.cos(heading)*look,py=y+Math.sin(heading)*look;
  const limits=bounds(clamp(py,yMin,yMax)),pad=Math.min(16,width*.14);
  let fx=0,fy=0;
  if(px<limits[0]+pad)fx+=(limits[0]+pad-px)/20;
  if(px>limits[1]-pad)fx-=(px-limits[1]+pad)/20;
  if(py<yMin+pad)fy+=(yMin+pad-py)/20;
  if(py>yMax-pad)fy-=(py-yMax+pad)/20;
  return {x:fx,y:fy};
}
// Ease angular velocity as well as heading, so changing destination or passing
// another animal produces an arc rather than an instantaneous pivot.
function steer(actor,desired,dt,maxRate=2.2){
  const error=Math.atan2(Math.sin(desired-actor.heading),Math.cos(desired-actor.heading));
  const wanted=clamp(error*2.6,-maxRate,maxRate),previous=actor.turnRate||0;
  const change=clamp((wanted-previous)*(1-Math.exp(-dt/.18)),-dt*6,dt*6);
  actor.turnRate=previous+change;
  actor.heading+=(previous+actor.turnRate)*.5*dt;
}
root.FreeSwim={goal,avoid,steer};
})(globalThis);
