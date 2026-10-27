/* Articulated, aerial whale characters. Every pose is decorative. */
(function(root){
'use strict';
const TAU=Math.PI*2;
// A single closed outline joins the broad forehead, full body and tail stock.
const BODY='M31 0C31-10 21-18 6-18C-8-18-19-11-28-4C-32-2.5-35-2-38-2L-38 2C-33 2-30 3-27 5C-17 12-6 18 7 18C22 18 31 10 31 0Z';
const body=new Path2D(BODY);
function oval(c,x,y,rx,ry,fill,angle=0){c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);c.fillStyle=fill;c.fill();}
function fin(c,side,time,phase,roll,still){
  const beat=still?0:Math.sin(time*2.2+phase+side*.6);
  c.save();c.translate(3,side*10);c.scale(1,side);c.rotate(.1+beat*.09+roll*.13);
  const g=c.createLinearGradient(0,0,-19,17);g.addColorStop(0,'#74afba');g.addColorStop(.55,'#5396a8');g.addColorStop(1,'#32788e');
  c.fillStyle=g;c.strokeStyle='#24566c';c.lineWidth=1.2;c.lineJoin='round';
  c.beginPath();c.moveTo(5,-3);c.bezierCurveTo(2,7,-7,21,-20,24);c.bezierCurveTo(-23,22,-15,10,-8,4);c.quadraticCurveTo(-1,-3,5,-3);c.closePath();c.fill();c.stroke();
  // The pale pectoral flash makes these read as baleen-whale paddles.
  c.fillStyle='#e7e9ce';c.beginPath();c.moveTo(-3,7);c.quadraticCurveTo(-9,18,-18,22);c.quadraticCurveTo(-13,14,-3,7);c.fill();
  c.strokeStyle='#b9ded5a0';c.lineWidth=.75;c.beginPath();c.moveTo(0,3);c.quadraticCurveTo(-8,15,-18,22);c.stroke();c.restore();
}
function tail(c,time,phase,turn,still){
  const wave=still?0:Math.sin(time*2.6+phase);
  c.save();c.translate(-28,0);c.rotate(wave*.105+turn*.18);c.scale(1,.91+wave*.07);
  const g=c.createLinearGradient(0,-16,-20,17);g.addColorStop(0,'#89bbc1');g.addColorStop(.55,'#5997a8');g.addColorStop(1,'#367b91');
  c.fillStyle=g;c.strokeStyle='#24566c';c.lineWidth=1.25;c.lineJoin='round';
  c.beginPath();c.moveTo(5,-4);c.quadraticCurveTo(-3,-2,-10,-4);c.bezierCurveTo(-13,-11,-23,-19,-30,-16);c.bezierCurveTo(-29,-10,-23,-3,-19,0);c.bezierCurveTo(-23,3,-29,10,-30,16);c.bezierCurveTo(-23,19,-13,11,-10,4);c.quadraticCurveTo(-1,2,5,4);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#cee5d690';c.lineWidth=.9;for(const side of [-1,1]){c.beginPath();c.moveTo(-12,side*4);c.quadraticCurveTo(-21,side*13,-27,side*15);c.stroke();}
  // The central notch and sweeping trailing edges are complete, attached flukes.
  c.strokeStyle='#3c7387';c.lineWidth=.7;c.beginPath();c.moveTo(-11,0);c.lineTo(-18,0);c.stroke();c.restore();
}
function face(c,time,phase,still,delighted){
  const blink=!still&&(time+phase*1.4)%6.1<.16;
  for(const side of [-1,1]){
    c.save();c.translate(21,side*8.8);c.rotate(side*.28);
    oval(c,-2,side*4,3.7,1.7,'#e6aaa05c');
    if(blink||delighted){c.strokeStyle='#173e54';c.lineWidth=1.35;c.lineCap='round';c.beginPath();c.moveTo(-2.1,-.3);c.quadraticCurveTo(0,delighted?-2.5:1.7,2.1,-.3);c.stroke();}
    else{oval(c,0,0,2.65,3.25,'#153c53');oval(c,.7,-1.1,1,1.15,'#fffdf0');oval(c,-.7,1.2,.42,.48,'#dff6e9');}
    c.restore();
  }
  c.lineCap='round';c.strokeStyle='#32667a';c.lineWidth=.9;c.beginPath();c.moveTo(26,-6);c.bezierCurveTo(29,-4,29,4,26,6);c.stroke();
  // A small smile crease follows the rounded snout, rather than a fish's point.
  c.strokeStyle='#d7ece0a6';c.lineWidth=.65;c.beginPath();c.moveTo(27,-4.3);c.quadraticCurveTo(29,0,27,4.3);c.stroke();
}
function draw(c,whale,time=0,pose={}){
  const phase=whale.phase||0,still=!!pose.still,turn=whale.turn||0;
  const breathe=still?0:Math.sin(time*2.6+phase),roll=still?0:Math.sin(time*.8+phase)*.08;
  c.save();c.translate(whale.x,whale.y);c.rotate(whale.heading||0);c.scale(whale.scale||1,whale.scale||1);
  c.lineJoin='round';c.lineCap='round';
  // All appendages overlap the torso; there are no detached fins or tail pieces.
  tail(c,time,phase,turn,still);fin(c,-1,time,phase,roll,still);fin(c,1,time,phase,roll,still);
  c.save();c.scale(1+breathe*.008,1+breathe*.016);
  const g=c.createLinearGradient(-12,-22,14,22);g.addColorStop(0,'#b1d9d9');g.addColorStop(.35,'#8ec4cd');g.addColorStop(.68,'#67a7b9');g.addColorStop(1,'#3a7e98');
  c.fillStyle=g;c.strokeStyle='#24566c';c.lineWidth=1.4;c.fill(body);c.stroke(body);
  c.save();c.clip(body);
  const glow=c.createRadialGradient(12,-10,1,9,-3,31);glow.addColorStop(0,'#fff7d760');glow.addColorStop(1,'#fff7d700');oval(c,9,-5,34,25,glow);
  // A soft ivory throat sweep hints at volume in this stylised aerial view.
  c.fillStyle='#dfebd7';c.beginPath();c.moveTo(28,4);c.bezierCurveTo(23,13,8,18,-8,11);c.quadraticCurveTo(-16,7,-19,3);c.bezierCurveTo(-4,9,14,10,28,4);c.fill();
  c.strokeStyle='#7dabae77';c.lineWidth=.65;for(let i=0;i<3;i++){c.beginPath();c.moveTo(22-i*3,8+i*.6);c.quadraticCurveTo(7,15+i*.5,-6-i*3,9-i*.3);c.stroke();}
  c.strokeStyle='#e1f0dfb8';c.lineWidth=1.7;c.beginPath();c.moveTo(-11,-10);c.bezierCurveTo(-3,-15,9,-15,17,-11);c.stroke();
  // A small raised back fin and its contact shadow, sitting on a continuous back.
  oval(c,-10,1.5,5.5,2.2,'#285e7833',-.2);
  c.fillStyle='#568ea2';c.strokeStyle='#32667e';c.lineWidth=.7;c.beginPath();c.moveTo(-4,-1);c.quadraticCurveTo(-9,-9,-14,-5);c.quadraticCurveTo(-13,0,-8,2);c.closePath();c.fill();c.stroke();
  // A small blowhole sits on the crown of the broad head.
  oval(c,11,0,1.8,.8,'#4b8293');
  face(c,time,phase,still,!!pose.delighted);
  if(pose.alleles){for(let i=0;i<2;i++){const x=1-i*6,allele=pose.alleles[i];oval(c,x,1,2.5,2.5,allele?'#29d1be':'#f6a183');c.strokeStyle='#f3ffeb';c.lineWidth=.7;c.stroke();if(allele){c.strokeStyle='#216c75';c.lineWidth=.8;c.beginPath();c.moveTo(x-1.5,-.5);c.lineTo(x+1.5,2.5);c.stroke();}}}
  c.restore();c.restore();c.restore();
}
root.WhaleCharacter={draw,bodyPath:BODY};
})(typeof globalThis!=='undefined'?globalThis:this);
