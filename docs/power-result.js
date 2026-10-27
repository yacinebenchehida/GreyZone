/* Live batch estimates: no future search and no extrapolated probabilities. */
(function(root){
'use strict';
function summary(data){
  if(!data?.points?.length)return {status:'pending'};
  const nullRate=data.points[0].power;
  if(nullRate>.12)return {status:'uncalibrated',nullRate};
  const first=data.points.find(p=>p.t>0&&p.power>=.8);
  return first?{status:'reached',generation:first.t}:{status:'not-yet',limit:data.points.at(-1).t};
}
function at(points,generation){
  return points?.find(p=>p.t===generation)?.power??null;
}
root.PowerResult={summary,at};
})(globalThis);
