/* Interpret the simulated power curve without extrapolating beyond its range. */
(function(root){
'use strict';
function summary(data){
  if(!data||!data.complete)return {status:'pending'};
  const limit=data.max??data.points.at(-1).t,nullRate=data.points[0]?.power||0;
  if(nullRate>.12)return {status:'uncalibrated',limit,nullRate};
  const first=data.points.find(p=>p.power>=.8);
  return first?{status:'reached',generation:first.t,limit}:{status:'not-reached',limit};
}
function at(points,generation){
  if(!points?.length||generation<points[0].t||generation>points.at(-1).t)return null;
  const right=points.findIndex(p=>p.t>=generation);
  if(right===0)return points[0].power;
  const a=points[right-1],b=points[right],f=(generation-a.t)/(b.t-a.t);
  return a.power+f*(b.power-a.power);
}
root.PowerResult={summary,at};
})(globalThis);
