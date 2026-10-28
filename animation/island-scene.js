/* A rising sand ridge, shallows, surf and coconut palms.
   Decorative only: coast() and gap() still define the simulation's water. */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function smooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
class IslandScene{
  constructor(){this.layer=null;}
  parts(scene,state){const gap=scene.gap();return state.m?[[-18,gap.y-gap.half],[gap.y+gap.half,scene.h+18]]:[[-18,scene.h+18]];}
  base(scene,state,p,g){
    const key=[scene.w,scene.h,scene.dpr,state.m,p.toFixed(3)].join('|');
    if(this.layer?.key===key)return this.layer.image;
    const image=document.createElement('canvas');image.width=Math.round(scene.w*scene.dpr);image.height=Math.round(scene.h*scene.dpr);
    const c=image.getContext('2d'),w=scene.w,h=scene.h,r=GreyModel.rng(89137);c.setTransform(scene.dpr,0,0,scene.dpr,0,0);
    for(const [y0,y1]of this.parts(scene,state)){
      // The sand ridge is visible through the water before it breaks the surface.
      scene.landPath(c,y0,y1,.25+.75*smooth(0,.8,p),30);c.fillStyle=`rgba(100,218,204,${.07+.13*p})`;c.fill();
      scene.landPath(c,y0,y1,.23+.77*smooth(0,.7,p),17);c.fillStyle=`rgba(172,230,200,${.10+.16*p})`;c.fill();
      scene.landPath(c,y0,y1,.18+.82*smooth(0,.65,p),5);c.fillStyle=`rgba(220,218,158,${.08+.18*p})`;c.fill();
      if(g<.003)continue;
      // Damp sand and a narrow pale tideline surround the dry beach.
      scene.landPath(c,y0,y1,g,7);c.fillStyle=`rgba(199,197,144,${.40*smooth(0,.35,p)})`;c.fill();
      scene.landPath(c,y0,y1,g,2);c.fillStyle='#e7d8a2';c.fill();
      scene.landPath(c,y0,y1,g);const sand=c.createLinearGradient(w*.43,0,w*.58,0);sand.addColorStop(0,'#c9af79');sand.addColorStop(.18,'#ebd7a1');sand.addColorStop(.45,'#f8e9bc');sand.addColorStop(.76,'#efdda8');sand.addColorStop(1,'#cfb781');c.fillStyle=sand;c.shadowColor='#144e5633';c.shadowBlur=7;c.shadowOffsetY=3;c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
      c.save();c.clip();
      for(let i=0;i<360;i++){const yy=r()*h;if(yy<y0||yy>y1)continue;const coast=scene.coast(yy,g),xx=coast.x+(r()*2-1)*coast.half;c.fillStyle=i%4?'#a2834920':'#fff8d45c';c.beginPath();c.ellipse(xx,yy,.35+r()*1.1,.25+r()*.6,r()*3,0,TAU);c.fill();}
      // Wind-shaped dune lines follow the central ridge.
      c.strokeStyle='#fff3ca70';c.lineWidth=.8;
      for(let j=0;j<3;j++){c.beginPath();for(let y=y0;y<=y1;y+=7){const co=scene.coast(y,g),xx=co.x+(j-1)*co.half*.38+Math.sin(y*.023+j)*3;y===y0?c.moveTo(xx,y):c.lineTo(xx,y);}c.stroke();}
      if(p>.35){
        c.globalAlpha=smooth(.35,.92,p);
        for(const [yf,spread]of [[.12,.13],[.32,.17],[.76,.13],[.91,.09]]){
          const yy=h*yf;if(yy<y0+12||yy>y1-12)continue;const co=scene.coast(yy,g),xx=co.x-co.half*.12;
          const patch=c.createRadialGradient(xx,yy,1,xx,yy,co.half*.8);patch.addColorStop(0,'#82945e9e');patch.addColorStop(.6,'#a0aa6a6b');patch.addColorStop(1,'#b4b77900');c.fillStyle=patch;c.beginPath();c.ellipse(xx,yy,co.half*.8,h*spread,0,0,TAU);c.fill();
          for(let i=0;i<24;i++){const x=xx+(r()*2-1)*co.half*.55,y=yy+(r()*2-1)*h*spread*.7;c.strokeStyle=i%3?'#78895179':'#b0b47a9c';c.lineWidth=.6+r()*.6;c.beginPath();c.moveTo(x,y+3);c.quadraticCurveTo(x-2,y-2,x-4+r()*8,y-5-r()*5);c.stroke();}
        }
        // A few beach stones have a lit face and a small cast shadow.
        for(const [yf,side]of [[.19,-1],[.42,1],[.72,-1],[.87,1]]){const yy=h*yf;if(yy<y0+15||yy>y1-15)continue;const co=scene.coast(yy,g),xx=co.x+side*co.half*.65;c.fillStyle='#716e4f36';c.beginPath();c.ellipse(xx+2,yy+3,5,3,.3,0,TAU);c.fill();c.fillStyle='#b9b39a';c.beginPath();c.ellipse(xx,yy,4.6,3,.3,0,TAU);c.fill();c.fillStyle='#e6daba';c.beginPath();c.ellipse(xx-1,yy-1,2.4,1.3,.3,0,TAU);c.fill();}
      }
      c.restore();
    }
    this.layer={key,image};return image;
  }
  surf(scene,state,p,g){
    const c=scene.c,t=scene.clock,h=scene.h,parts=this.parts(scene,state),emerging=1-smooth(.7,1,p);
    for(const [y0,y1]of parts)for(const sign of [-1,1]){
      // Two broad displacement ripples dissipate as the island settles.
      if(emerging>.01)for(let ring=0;ring<2;ring++){
        const pad=10+(p*38+ring*17)%42;c.strokeStyle=`rgba(206,252,237,${emerging*(1-pad/65)*.24})`;c.lineWidth=1.2;c.beginPath();for(let y=y0;y<=y1;y+=5){const co=scene.coast(y,.2+.8*smooth(0,.9,p)),xx=co.x+sign*(co.half+pad+Math.sin(y*.027-t*1.2)*2);y===y0?c.moveTo(xx,y):c.lineTo(xx,y);}c.stroke();
      }
      if(g<.015)continue;
      for(let strip=0;strip<2;strip++){
        const pulse=.5+.5*Math.sin(t*.9+strip*1.8),pad=2+strip*5+pulse*2;
        c.strokeStyle=`rgba(247,255,230,${(.3-strip*.13)*smooth(.08,.5,p)})`;c.lineWidth=strip?1:1.6;c.beginPath();for(let y=y0;y<=y1;y+=4){const co=scene.coast(y,g),xx=co.x+sign*(co.half+pad)+Math.sin(y*.095+t*1.15)*1.3;y===y0?c.moveTo(xx,y):c.lineTo(xx,y);}c.stroke();
      }
      for(let i=0;i<35;i++){const y=(i*.618033%1)*h;if(y<y0+5||y>y1-5)continue;const co=scene.coast(y,g),wave=.5+.5*Math.sin(t*.85+i*2.6),xx=co.x+sign*(co.half+3+wave*6);c.fillStyle=`rgba(248,255,241,${.1+wave*.25})`;c.beginPath();c.ellipse(xx,y,1.2+wave*.5,.6,sign*.3,0,TAU);c.fill();}
      // Soft surf across the two banks of a migration channel.
      if(state.m){const yy=y0<0?y1:y0;if(yy>0&&yy<h){const co=scene.coast(yy,g);c.strokeStyle='#efffe2a0';c.lineWidth=1.3;c.beginPath();for(let x=co.x-co.half;x<=co.x+co.half;x+=3){const bank=y0<0?-1:1,y=yy+bank*6*(1-((x-co.x)/co.half)**2)+Math.sin((x-co.x)*.12+t)*1.2;x===co.x-co.half?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}}
    }
  }
  frond(c,length,bend,index,shadow=false){
    const tipX=length,tipY=bend;
    const center=u=>({x:tipX*u,y:tipY*u*u-9*Math.sin(u*Math.PI)});
    const color=shadow?'#183f353d':index%2?'#4f8050':'#628e52';
    c.fillStyle=color;
    // A tapered green centre keeps each feathery frond legible from above.
    const upper=[],lower=[];
    for(let j=0;j<=16;j++){const u=j/16,p=center(u),angle=Math.atan2(2*tipY*u-9*Math.PI*Math.cos(u*Math.PI),tipX),width=Math.sin(u*Math.PI)*4.8+.35;upper.push({x:p.x-Math.sin(angle)*width,y:p.y+Math.cos(angle)*width});lower.push({x:p.x+Math.sin(angle)*width,y:p.y-Math.cos(angle)*width});}
    const edge=[...upper,...lower.reverse()];c.beginPath();c.moveTo(edge[0].x,edge[0].y);for(let j=1;j<edge.length;j++)c.lineTo(edge[j].x,edge[j].y);c.closePath();c.fill();
    for(let j=1;j<13;j++){
      const u=j/13,p=center(u),angle=Math.atan2(2*tipY*u-9*Math.PI*Math.cos(u*Math.PI),tipX),leaf=(Math.sin(u*Math.PI)*11+2)*(1-u*.3);
      for(const side of [-1,1]){const dx=Math.cos(angle+side*.96)*leaf,dy=Math.sin(angle+side*.96)*leaf;c.beginPath();c.moveTo(p.x-3,p.y);c.quadraticCurveTo(p.x+dx*.5,p.y+dy*.6,p.x+dx,p.y+dy);c.quadraticCurveTo(p.x+dx*.28-3,p.y+dy*.17,p.x-6,p.y+.4);c.closePath();c.fill();}
    }
    c.strokeStyle=shadow?'#274c3826':'#c0c78a';c.lineWidth=shadow?1.7:.85;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(length*.5,-14,tipX,tipY);c.stroke();
  }
  palm(c,x,y,size,time,growth){
    if(growth<=0)return;
    c.save();c.translate(x,y);c.scale(size,size);const rise=smooth(0,1,growth),topX=-7*rise,topY=12-43*rise,unfurl=.22+.78*smooth(.15,.9,growth);
    // Canopy shadow remains anchored on the sand while the trunk rises.
    c.save();c.translate(topX+19,topY+24);c.scale(unfurl,unfurl*.8);for(let i=0;i<8;i++){c.save();c.rotate(i/8*TAU+.12);this.frond(c,43+i%3*5,5-i%2*13,i,true);c.restore();}c.restore();
    c.lineCap='round';const bark=c.createLinearGradient(-8,0,4,0);bark.addColorStop(0,'#775332');bark.addColorStop(.45,'#ae8951');bark.addColorStop(.75,'#d1b47a');bark.addColorStop(1,'#8b6940');c.strokeStyle=bark;c.lineWidth=8;c.beginPath();c.moveTo(0,12);c.bezierCurveTo(-12,1,-12,topY+14,topX,topY);c.stroke();
    for(let j=1;j<8;j++){const u=j/8*rise,yy=12-u*43,xx=-Math.sin(u*2.3)*8;c.strokeStyle='#72563380';c.lineWidth=.8;c.beginPath();c.moveTo(xx-3,yy);c.lineTo(xx+3,yy+1.5);c.stroke();}
    c.translate(topX,topY);c.scale(unfurl,unfurl);const breeze=Math.sin(time*.55)*.025;
    // Layered pinnate fronds: individually tapered leaflets and lit midribs.
    for(let layer=0;layer<2;layer++)for(let i=0;i<4;i++){const index=i*2+layer;c.save();c.rotate(index/8*TAU+breeze+Math.sin(time*.4+index)*.016);this.frond(c,43+(index%3)*6,4-(index%2)*13,index);c.restore();}
    c.fillStyle='#68804b';c.beginPath();c.arc(0,0,5,0,TAU);c.fill();
    for(const [dx,dy]of [[-3,4],[3,5],[0,-1]]){const coconut=c.createRadialGradient(dx-1,dy-1,.4,dx,dy,3.7);coconut.addColorStop(0,'#c19b59');coconut.addColorStop(1,'#6e5635');c.fillStyle=coconut;c.beginPath();c.arc(dx,dy,3.5,0,TAU);c.fill();}
    c.restore();
  }
  draw(scene,state,progress){
    const p=clamp(progress,0,1),g=smooth(.08,.94,p);scene.c.drawImage(this.base(scene,state,p,g),0,0,scene.w,scene.h);this.surf(scene,state,p,g);
    const grow=smooth(.38,.96,p),y=scene.h*.265,co=scene.coast(y,g);
    this.palm(scene.c,co.x+co.half*.08,y,clamp(scene.w/930,.6,1.08),scene.clock,grow);
    if(scene.w>650){const yy=scene.h*.815,co2=scene.coast(yy,g);this.palm(scene.c,co2.x-co2.half*.12,yy,.56,scene.clock+.9,smooth(.55,1,p));}
  }
}
root.IslandScene=IslandScene;
})(globalThis);
