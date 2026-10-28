/* Prepared binomial sampling for repeated studies of one live population pair. */
(function(root){
'use strict';
const M=typeof module!=='undefined'&&module.exports?require('./model.js'):root.GreyModel;
const cutoffs=new Map(); // Cache the existing test's 5% cutoff by degrees of freedom.
function critical(df){
  if(!df)return Infinity; // Shared monomorphic samples supply no test information.
  if(cutoffs.has(df))return cutoffs.get(df);
  let low=0,high=df+10*Math.sqrt(2*df)+20; // Bracket the upper 5% chi-square tail.
  while(M.gammaQ(df/2,high/2)>.05)high*=2;
  for(let i=0;i<64;i++){ // Invert the same gamma-tail function used by the reference test.
    const middle=(low+high)/2;
    if(middle===low||middle===high)break;
    if(M.gammaQ(df/2,middle/2)<=.05)high=middle;else low=middle;
  }
  cutoffs.set(df,high);
  return high;
}
function create(s){
  const [n1,n2]=M.sizes(s),n=Math.min(s.sample,n1,n2),g=2*n,width=g+1,loci=s.loci;
  const tables=2*loci,prob=new Float64Array(tables*width),alias=new Uint16Array(tables*width);
  const fixed=new Int16Array(tables),flip=new Uint8Array(tables);
  const weights=new Float64Array(width),small=new Uint16Array(width),large=new Uint16Array(width);
  const chi=new Float64Array(width*width),hw=new Float64Array(width*width),hb=new Float64Array(width*width);
  const informative=new Uint8Array(width*width);
  for(let a=0;a<=g;a++)for(let b=0;b<=g;b++){ // Reuse count-pair contributions across every SNP and study.
    const index=a*width+b,x=a/g,y=b/g,p=(x+y)/2;
    if(p>0&&p<1){chi[index]=(x-y)*(x-y)/(p*(1-p)*2/g);informative[index]=1;}
    hw[index]=(x*(1-x)+y*(1-y))*g/(g-1);
    hb[index]=x+y-2*x*y;
  }
  let population=null,prepared=0;
  const result={fst:0,significant:false,chi:0,df:0,n}; // Reuse a scalar result instead of allocating study arrays.
  function begin(pop){population=pop;prepared=0;}
  function prepareNext(){
    if(prepared===tables)return; // Preparation is incremental so Pause remains responsive.
    const table=prepared++,p=(table%2?population.b:population.a)[table>>1],offset=table*width;
    if(p<=0||p>=1){fixed[table]=p>=1?g:0;flip[table]=0;return;}
    fixed[table]=-1;flip[table]=p>.5?1:0;
    const q=Math.min(p,1-p),mode=Math.floor((g+1)*q),odds=q/(1-q);
    weights.fill(0);weights[mode]=1; // Start at the mode to avoid underflow in the distribution's tails.
    let sum=1;
    for(let k=mode;k>0;k--){weights[k-1]=weights[k]*k/(g-k+1)/odds;sum+=weights[k-1];}
    for(let k=mode;k<g;k++){weights[k+1]=weights[k]*(g-k)/(k+1)*odds;sum+=weights[k+1];}
    let smallCount=0,largeCount=0;
    for(let k=0;k<width;k++){ // Walker alias tables preserve the binomial probabilities.
      weights[k]*=width/sum;
      if(weights[k]<1)small[smallCount++]=k;else large[largeCount++]=k;
    }
    while(smallCount&&largeCount){
      const a=small[--smallCount],b=large[--largeCount];
      prob[offset+a]=weights[a];alias[offset+a]=b;
      weights[b]-=1-weights[a];
      if(weights[b]<1)small[smallCount++]=b;else large[largeCount++]=b;
    }
    while(largeCount){const k=large[--largeCount];prob[offset+k]=1;alias[offset+k]=k;}
    while(smallCount){const k=small[--smallCount];prob[offset+k]=1;alias[offset+k]=k;}
  }
  function prepare(pop){begin(pop);while(prepared<tables)prepareNext();}
  function draw(table,r){
    if(fixed[table]>=0)return fixed[table]; // Fixed loci require no random draw.
    const u=r()*width,k=Math.floor(u),index=table*width+k;
    const value=u-k<prob[index]?k:alias[index];
    return flip[table]?g-value:value;
  }
  function sample(r){
    let statistic=0,df=0,within=0,between=0;
    for(let i=0;i<loci;i++){ // Accumulate directly; every selected marker contributes.
      const a=draw(2*i,r),b=draw(2*i+1,r),index=a*width+b;
      statistic+=chi[index];df+=informative[index];within+=hw[index];between+=hb[index];
    }
    result.fst=between?1-within/between:0;
    result.significant=df>0&&statistic>=critical(df);
    result.chi=statistic;result.df=df;
    return result;
  }
  return {begin,prepareNext,prepare,ready:()=>prepared===tables,sample};
}
const api={create,critical};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudySampler=api;
})(typeof globalThis!=='undefined'?globalThis:this);
