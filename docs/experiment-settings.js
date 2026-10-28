/* Versioned experiment settings. Scientific RNG streams remain independent of playback. */
(function(root){
  'use strict';
  const engine='prepared-studies-23'; // Record the sampling algorithm needed for exact replay.
  const totals=[10,20,50,100,200,500,1000,2000,5000,10000,20000,50000,100000,200000,500000];
  const migrations=[0,.000001,.00001,.0001,.001,.005,.01,.05,.1,.25,.5];
  const loci=[1,5,10,20,50,100,200,500,750,1000];
  function seed(value){
    if(!/^\d{1,10}$/.test(String(value)))throw new Error('Use a whole-number seed from 0 to 4,294,967,295.');
    const n=Number(value);
    if(n>4294967295)throw new Error('Use a whole-number seed from 0 to 4,294,967,295.');
    return n;
  }
  function validate(data){
    if(!data||data.format!=='greyzone-experiment'||data.version!==1)throw new Error('This is not a supported GreyZone settings file.');
    if(data.engine!==engine)throw new Error('These settings use a different simulation version.');
    const s=data.settings,v=data.view;
    if(!s||!totals.includes(s.total)||!Number.isInteger(s.ratio)||s.ratio<10||s.ratio>90||s.ratio%10||!migrations.includes(s.m)||!loci.includes(s.loci))throw new Error('The population settings are not supported.');
    const west=Math.round(s.total*s.ratio/100),cap=Math.min(150,west,s.total-west);
    if(!Number.isInteger(s.sample)||s.sample<1||s.sample>cap)throw new Error('The sample size exceeds the population or supported range.');
    if(!v||!['hammer','classic','turtle','surgeon','tuna','orca','seal','whale','porpoise'].includes(v.animal)||![.6,.95,1.6].includes(v.travelSpeed)||![1.5,6,25].includes(v.generationSpeed)||typeof v.showMarkers!=='boolean')throw new Error('The display settings are not supported.');
    return {format:'greyzone-experiment',version:1,engine,seed:seed(data.seed),settings:{total:s.total,ratio:s.ratio,m:s.m,sample:s.sample,loci:s.loci},view:{animal:v.animal,travelSpeed:v.travelSpeed,generationSpeed:v.generationSpeed,showMarkers:v.showMarkers}};
  }
  function create(settings,runSeed,view){return validate({format:'greyzone-experiment',version:1,engine,seed:runSeed,settings,view});}
  function parse(text){
    if(typeof text!=='string'||text.length>10000)throw new Error('The settings file is too large.');
    let data;
    try{data=JSON.parse(text);}catch(error){throw new Error('The settings file is not valid JSON.');}
    return validate(data);
  }
  function link(data,base){
    const url=new URL(base);
    url.searchParams.set('experiment',btoa(JSON.stringify(validate(data))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));
    url.hash='simulator';
    return url.href;
  }
  function fromUrl(base){
    const encoded=new URL(base).searchParams.get('experiment');
    if(encoded===null)return null;
    if(encoded.length>14000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw new Error('The experiment link is invalid.');
    let text;
    try{text=atob(encoded.replace(/-/g,'+').replace(/_/g,'/'));}catch(error){throw new Error('The experiment link is invalid.');}
    return parse(text);
  }
  const api={seed,create,validate,parse,link,fromUrl};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GreyExperiment=api;
})(typeof globalThis!=='undefined'?globalThis:this);
