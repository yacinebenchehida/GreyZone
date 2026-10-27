/* A rounded illustrated whale, animated with a continuous mesh.
   Decorative movement; population genetics lives in model.js.
   The original transparent artwork is preserved in assets/whale-round.png. */
(function(root){
'use strict';
const TAU=Math.PI*2,COUNT=40,W=360,H=200,PAD=24;
const script=document.currentScript,artwork=new Image(),frames=[];
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
let source;

// A shared deformation field keeps all appendages attached to the body.
function vertex(x,y,phase){
  const u=x/W,v=y/H,beat=Math.sin(phase);
  const tail=smooth(.58,.87,u);
  let dx=tail*3*Math.sin(phase+.6);
  let dy=tail*(11*beat+(v-.35)*7*Math.sin(phase+.4));
  const near=smooth(.61,.86,v)*Math.exp(-Math.pow((u-.58)/.13,4));
  const far=smooth(.63,.84,v)*Math.exp(-Math.pow((u-.12)/.10,4));
  dx+=near*5*Math.sin(phase+.8)-far*2*Math.sin(phase+1.2);
  dy+=near*6*Math.sin(phase+.8)+far*4*Math.sin(phase+1.2);
  return [x+PAD+dx,y+PAD+dy];
}

function triangle(c,s0,s1,s2,d0,d1,d2){
  const sw=s1[0]-s0[0],sh=s2[1]-s0[1];
  const a=(d1[0]-d0[0])/sw,b=(d1[1]-d0[1])/sw;
  const cc=(d2[0]-d0[0])/sh,d=(d2[1]-d0[1])/sh;
  c.save();c.beginPath();
  const mx=(d0[0]+d1[0]+d2[0])/3,my=(d0[1]+d1[1]+d2[1])/3;
  for(const [i,p]of [d0,d1,d2].entries()){
    const dx=p[0]-mx,dy=p[1]-my,k=1.3/Math.max(1,Math.hypot(dx,dy));
    const x=p[0]+dx*k,y=p[1]+dy*k;
    i?c.lineTo(x,y):c.moveTo(x,y);
  }
  c.closePath();c.clip();
  c.setTransform(a,b,cc,d,d0[0]-a*s0[0]-cc*s0[1],d0[1]-b*s0[0]-d*s0[1]);
  c.drawImage(source,0,0);c.restore();
}

function makeFrame(index){
  const canvas=document.createElement('canvas');canvas.width=W+PAD*2;canvas.height=H+PAD*2;
  const c=canvas.getContext('2d'),phase=index/COUNT*TAU,nx=24,ny=12,sx=W/nx,sy=H/ny;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const x=i*sx,y=j*sy,a=[x,y],b=[x+sx,y],d=[x,y+sy],e=[x+sx,y+sy];
    const aa=vertex(...a,phase),bb=vertex(...b,phase),dd=vertex(...d,phase),ee=vertex(...e,phase);
    triangle(c,a,b,d,aa,bb,dd);triangle(c,e,d,b,ee,dd,bb);
  }
  frames[index]=canvas;
}

artwork.onload=()=>{
  source=document.createElement('canvas');source.width=W;source.height=H;
  source.getContext('2d').drawImage(artwork,0,0,W,H);
  let next=0;
  function build(){makeFrame(next++);if(next<COUNT)requestAnimationFrame(build);}
  build();
};
artwork.src=new URL('assets/whale-round.png',script?script.src:document.baseURI).href;

function splash(c,progress){
  const rise=Math.sin(Math.min(1,progress*2)*Math.PI/2),fade=1-progress;
  const x=-8.7,y=-25.5;
  c.save();c.translate(x,y);c.globalAlpha*=fade*.85;c.lineCap='round';
  c.strokeStyle='#e2fbff';c.lineWidth=2;
  c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-1,-9*rise,0,-19*rise);c.stroke();
  c.strokeStyle='#a8e8f7';c.lineWidth=2.5;
  for(const side of [-1,1]){
    c.beginPath();c.moveTo(0,-12*rise);c.quadraticCurveTo(side*5,-30*rise,side*12,-22*rise+progress*8);c.stroke();
  }
  for(let i=0;i<5;i++){
    const side=i%2?1:-1,dx=side*(5+i*3)*rise,dy=-(28-i*2)*rise+progress*progress*16;
    c.fillStyle=i%2?'#f0fdff':'#a6e4fa';c.beginPath();c.ellipse(dx,dy,1.25,2,side*.45,0,TAU);c.fill();
  }
  c.restore();
}

function draw(c,whale,time=0,pose={}){
  if(!source)return;
  const phase=whale.phase||0,still=!!pose.still,heading=whale.heading||0;
  const cycle=still?0:(time*2.15+phase)%TAU,index=Math.floor(cycle/TAU*COUNT),frame=frames[index];
  c.save();c.translate(whale.x,whale.y);
  // Keep the face readable, with a small bank into turns and mirrored headings.
  const right=Math.cos(heading)>=0;
  c.rotate(Math.sin(heading)*.24*(right?1:-1));
  const scale=whale.scale||1;c.scale(scale,scale);if(right)c.scale(-1,1);
  c.translate(0,still?0:Math.sin(cycle)*.9);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const unit=120/W;
  if(frame)c.drawImage(frame,(-W*.40-PAD)*unit,(-H*.50-PAD)*unit,(W+PAD*2)*unit,(H+PAD*2)*unit);
  else c.drawImage(source,-48,-H*unit/2,120,H*unit);
  if(pose.alleles){
    for(let i=0;i<2;i++){
      const x=2+i*8,y=-14;c.beginPath();c.arc(x,y,3.1,0,TAU);
      c.fillStyle=pose.alleles[i]?'#29d1be':'#f6a183';c.fill();
      c.strokeStyle='#f3ffeb';c.lineWidth=.9;c.stroke();
      if(pose.alleles[i]){c.strokeStyle='#216c75';c.lineWidth=.9;c.beginPath();c.moveTo(x-1.5,y-1.5);c.lineTo(x+1.5,y+1.5);c.stroke();}
    }
  }
  const breath=(time+phase*3.6)%18;
  if(!still&&breath<1.45)splash(c,breath/1.45);
  c.restore();
}
root.WhaleCharacter={draw};
})(typeof globalThis!=='undefined'?globalThis:this);
