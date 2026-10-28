/* Five consecutive live-generation estimates confirm a grey-zone exit. */
(function(root){
'use strict';
const threshold=.8,required=5;
function tracker(){return {threshold,required,first:null,confirmedAt:null,start:null,streak:0,last:null};}
function record(state,point){
  if(state.last!==null&&point.t<=state.last)return state;
  if(point.t>0&&point.power>=threshold){
    if(state.streak===0||point.t!==state.last+1){state.start=point.t;state.streak=1;}
    else state.streak++;
    if(state.first===null&&state.streak>=required){state.first=state.start;state.confirmedAt=point.t;}
  }else{state.start=null;state.streak=0;}
  state.last=point.t;return state;
}
function summary(data){
  if(!data?.points?.length)return {status:'pending'};
  const nullRate=data.points[0].power;
  if(nullRate>.12)return {status:'uncalibrated',nullRate};
  // The worker tracks every generation before chart thinning. Fallback is for
  // complete, unthinned point arrays; missing generations cannot form a streak.
  const state=data.detection?.required===required&&data.detection.threshold===threshold?data.detection:data.points.reduce(record,tracker());
  if(state.first!==null)return {status:'reached',generation:state.first,confirmedAt:state.confirmedAt};
  if(state.streak)return {status:'confirming',generation:state.start,count:state.streak,required};
  return {status:'not-yet',limit:data.points.at(-1).t};
}
function at(points,generation){return points?.find(p=>p.t===generation)?.power??null;}
root.PowerResult={summary,at,tracker,record,threshold,required};
})(globalThis);
