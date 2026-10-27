const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={Math};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../animation/shark-character.js'),'utf8'),context);
const {followTurn,makeSpine}=context.SharkCharacter;
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

test('rear body sections lag behind the head in a turn and relax afterward',()=>{
  const shark={heading:0,stroke:0,effort:.8};
  for(let i=0;i<60;i++)followTurn(shark,1/60,1.3,170);
  for(let i=0;i<30;i++){shark.heading+=2/60;followTurn(shark,1/60,1.3,170);}
  assert.equal(shark.turnPose[0],0);
  assert(Math.abs(shark.turnPose[3])>.15,'The torso should visibly bend');
  assert(Math.abs(shark.turnPose[7])>Math.abs(shark.turnPose[3]),'The tail should follow later');
  assert(Math.abs(delta(shark.jointHeadings[7],shark.heading))>.4);
  const turning=makeSpine(shark),straight=makeSpine({...shark,turnPose:undefined,bend:0});
  assert(Math.abs(turning.spine(1).y-straight.spine(1).y)>25,'The bend should move the tail visibly away from a rigid rotation');
  for(let i=0;i<180;i++)followTurn(shark,1/60,1.3,170);
  assert(Math.max(...shark.turnPose.map(Math.abs))<.01,'The body should gradually straighten');
});

test('sharp turns keep the spine finite, attached at the head, and approximately constant in length',()=>{
  for(const sign of [-1,1])for(const scale of [.65,1.4]){
    const shark={heading:0,stroke:.9,effort:.8};followTurn(shark,0,scale,180);
    for(let frame=0;frame<120;frame++){
      shark.heading+=sign*2.2/60;followTurn(shark,1/60,scale,180);
      const rig=makeSpine(shark),head=rig.spine(0);assert.equal(head.x,74);assert.equal(head.y,0);
      let length=0,previous=head;
      for(let i=1;i<=100;i++){const p=rig.spine(i/100);assert(Number.isFinite(p.x+p.y+rig.basis(i/100).a));length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
      assert(length>138&&length<148,'Turning should bend, not stretch, the body');
    }
  }
});
