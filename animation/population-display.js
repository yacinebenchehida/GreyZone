/* Mapping the numerical population to the animals and neutral-marker overlay.
   This changes the illustration only; GreyModel remains authoritative. */
(function(root){
'use strict';
function count(total){return total<=200?Math.max(1,Math.round(total)):Math.round(200+60*Math.log10(total/200));}
function summary(settings){
  const total=count(settings.total),west=Math.round(total*settings.ratio/100);
  return {total,west,east:total-west,weight:settings.total/total,exact:settings.total<=200};
}
function markerIndices(loci){const n=Math.min(10,loci);return Array.from({length:n},(_,i)=>i);}
// Single illustrative crossings. The rate is linear in m until a visual cap.
function migrationRate(settings,generationsPerSecond){
  if(settings.m<=0||generationsPerSecond<=0)return 0;
  return Math.min(.65,settings.m*count(settings.total)*generationsPerSecond*.25);
}
function dosage(pair){return Number(pair[0])+Number(pair[1]);}
function locusState(a,b){return (a===0||a===1)&&(b===0||b===1)?(a===b?'shared-fixed':'opposite-fixed'):'segregating';}
function allelePercent(p){
  if(p===0)return '0%';if(p===1)return '100%';
  const value=100*p;
  if(value<.01)return '<0.01%';if(value>99.99)return '>99.99%';
  return value.toFixed(2).replace(/\.?0+$/,'')+'%';
}
function sorting(frequencies){
  let fixed=0,opposite=0;
  for(let i=0;i<frequencies[0].length;i++){
    const a=frequencies[0][i],b=frequencies[1][i];
    if((a===0||a===1)&&(b===0||b===1)){fixed++;if(a!==b)opposite++;}
  }
  return {fixed,opposite,total:frequencies[0].length};
}
// Palette encodes the locus's state across the two basins; halves still
// encode the two actual gene copies. No allele counts or tests are changed.
function markerPalettes(frequencies,indices){
  return indices.map(locus=>{
    const west=frequencies[0][locus],east=frequencies[1][locus];
    const state=locusState(west,east);
    if(state==='segregating')return {state:'segregating',sharedFixed:false,colors:['#f4c98b','#f4c98b']};
    if(state==='shared-fixed')return {state:'shared-fixed',sharedFixed:true,colors:['#aab0b2','#aab0b2']};
    return {state:'opposite-fixed',westAllele:Boolean(west),sharedFixed:false,colors:west===1?['#f6a183','#29d1be']:['#29d1be','#f6a183']};
  });
}
function markers(animals,frequencies,indices,seed=0){
  const result=new Map(animals.map(a=>[a.id,indices.map(()=>[false,false])]));
  for(const side of [0,1]){
    const group=animals.filter(a=>a.side===side),copies=group.length*2;
    if(!copies)continue;
    for(let marker=0;marker<indices.length;marker++){
      const locus=indices[marker],alleles=Math.round(copies*frequencies[side][locus]);
      // Stable per-copy ranks couple consecutive frequency displays. A change
      // in generation alone does not repaint the same displayed individual.
      const order=[];
      for(const a of group)for(let copy=0;copy<2;copy++){
        const r=GreyModel.rng((seed^Math.imul(a.id+1,73856093)^Math.imul(locus+1,19349663)^Math.imul(copy+1,83492791)^Math.imul(side+1,15485863))>>>0);
        order.push({id:a.id,copy,rank:r()});
      }
      order.sort((a,b)=>a.rank-b.rank||a.id-b.id||a.copy-b.copy);
      for(let i=0;i<alleles;i++){const item=order[i];result.get(item.id)[marker][item.copy]=true;}
    }
  }
  return result;
}
root.GreyDisplay={count,summary,markerIndices,migrationRate,markers,markerPalettes,sorting,dosage,locusState,allelePercent};
})(globalThis);
