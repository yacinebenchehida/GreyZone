const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={Math};vm.createContext(context);
for(const name of ['shark-character.js','swim-motion.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation',name),'utf8'),context);
const {followTurn,makeSpine}=context.SharkCharacter;
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

test('the whole body bends through a turn, then eases back into a straight cruise',()=>{
  for(const sign of [-1,1]){
    const shark={heading:0,stroke:0,effort:.8};followTurn(shark,0,1.3,170);
    for(let i=0;i<30;i++){shark.heading+=sign*1.5/60;followTurn(shark,1/60,1.3,170);}
    const turning=makeSpine(shark),straight=makeSpine({...shark,bend:0});
    assert(Math.abs(turning.spine(.5).y-straight.spine(.5).y)>3,'The middle of the body should bend too');
    assert(sign*(turning.spine(1).y-straight.spine(1).y)>15,'The rear body should trail the turning head');
    const before=shark.bend;followTurn(shark,1/60,1.3,170);
    assert(Math.abs(shark.bend)>.8*Math.abs(before),'The bend should relax rather than snap straight');
    for(let i=0;i<180;i++)followTurn(shark,1/60,1.3,170);
    assert(Math.abs(shark.bend)<.01);
  }
});

test('the cruising wave has a steady head, a moving torso and a sweeping attached tail',()=>{
  const a=makeSpine({stroke:0,effort:.8}),b=makeSpine({stroke:Math.PI,effort:.8});
  assert(Math.hypot(a.spine(0).x-b.spine(0).x,a.spine(0).y-b.spine(0).y)<1e-12);
  const shoulder=Math.abs(a.spine(.25).y-b.spine(.25).y),body=Math.abs(a.spine(.75).y-b.spine(.75).y);
  assert(body>shoulder*2);
  for(const bend of [-.72,0,.72])for(let stroke=0;stroke<7;stroke+=.3){
    const rig=makeSpine({stroke,effort:1,bend});let previous=rig.spine(0),length=0;
    for(let i=1;i<=100;i++){const p=rig.spine(i/100);assert(Number.isFinite(p.x+p.y+rig.basis(i/100).a));length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
    assert(length>=142&&length<160,'The body should remain continuous without collapsing or stretching excessively');
  }
});

test('a sudden destination change cannot produce an instant pivot or reverse the turn rate',()=>{
  const shark={heading:0};let previous=0;
  for(let i=0;i<180;i++){
    const before=shark.heading,desired=i<60?2:-2;
    context.FreeSwim.steer(shark,desired,1/60);
    assert(Math.abs(shark.heading-before)<=2.2/60+1e-9);
    assert(Math.abs(shark.turnRate-previous)<=6/60+1e-9);
    previous=shark.turnRate;
  }
  assert(Math.abs(delta(shark.heading,-2))<.06,'The shark should settle on its new heading');
});
