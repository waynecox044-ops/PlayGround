(() => {
  const canvas = document.querySelector('#scene');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const intro = document.querySelector('#intro');
  const choices = document.querySelector('#choices');
  const dialogue = document.querySelector('#line');
  const speaker = document.querySelector('#speaker');
  const heartDisplay = document.querySelector('#hearts');
  const toast = document.querySelector('#toast');
  let started = false, x = 285, mayaX = 695, hearts = 0;
  let scene = 'meet', action = '', actionAt = 0, choiceOpen = false;
  let lastTime = 0, time = 0, toastTimer = 0, soundOn = false;
  const keys = new Set();
  const stars = Array.from({length:90}, (_,i) => ({x:(i*173+31)%W,y:(i*79+14)%258,r:.6+(i%4)*.35,p:i*.71}));
  const fireflies = Array.from({length:18},(_,i)=>({x:(i*127+70)%W,y:320+(i*61)%130,p:i*1.9}));

  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function ellipse(x,y,rx,ry,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
  function line(x1,y1,x2,y2,color,width=4){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
  function heart(x,y,size,color,alpha=1){ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,8);ctx.bezierCurveTo(-20,-3,-12,-15,-3,-10);ctx.bezierCurveTo(0,-8,0,-5,0,-5);ctx.bezierCurveTo(0,-5,3,-12,10,-11);ctx.bezierCurveTo(22,-9,16,3,0,14);ctx.fill();ctx.restore()}

  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#262344');sky.addColorStop(.55,'#65507a');sky.addColorStop(1,'#e28b91');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // dusky moon and stars
    ellipse(809,93,35,35,'#f8dfc7');ellipse(822,82,33,33,'#332c50');
    stars.forEach(s=>{ctx.globalAlpha=.35+.55*(.5+.5*Math.sin(time*1.3+s.p));ellipse(s.x,s.y,s.r,s.r,'#fff0dd')});ctx.globalAlpha=1;
    // soft faraway town
    ctx.fillStyle='#39334f';ctx.beginPath();ctx.moveTo(0,312);for(let i=0;i<1000;i+=75)ctx.lineTo(i,277+(i*17%44));ctx.lineTo(W,343);ctx.lineTo(W,390);ctx.lineTo(0,390);ctx.fill();
    for(let i=0;i<19;i++){const bx=(i*67)%W, by=300+(i*23)%65;ctx.fillStyle='#ffe2a0';ctx.globalAlpha=.25+(i%3)*.1;ctx.fillRect(bx,by,3,4)}ctx.globalAlpha=1;
    // hill and grass
    ctx.fillStyle='#35344c';ctx.beginPath();ctx.moveTo(0,373);ctx.quadraticCurveTo(220,327,420,376);ctx.quadraticCurveTo(700,421,1000,356);ctx.lineTo(1000,H);ctx.lineTo(0,H);ctx.fill();
    const ground=ctx.createLinearGradient(0,393,0,H);ground.addColorStop(0,'#414050');ground.addColorStop(1,'#283541');ctx.fillStyle=ground;ctx.fillRect(0,408,W,H-408);
    // strings of warm park lights
    line(0,197,1000,197,'#292438',2);for(let i=0;i<12;i++){const lx=30+i*86;line(lx,197,lx,212,'#d9b685',1.5);ellipse(lx,216,4,5,'#ffdb9c');ctx.shadowColor='#ffd38a';ctx.shadowBlur=15;ellipse(lx,216,2,2,'#fff1c8');ctx.shadowBlur=0}
    // tree silhouettes
    drawTree(50,385,.92);drawTree(955,396,1.08);drawTree(160,378,.54);
    // bench
    ctx.fillStyle='#4b3544';ctx.fillRect(422,359,158,9);ctx.fillRect(430,373,145,8);line(438,377,430,409,'#342b3b',6);line(565,377,575,409,'#342b3b',6);line(426,351,575,351,'#835968',5);
    // scattered flowers/grass flickers
    for(let i=0;i<46;i++){const gx=(i*89+11)%W,gy=425+(i*41)%130;line(gx,gy,gx+(i%2?3:-2),gy-6,'#718267',1.3);if(i%5===0)ellipse(gx,gy-7,1.5,1.5,'#e7b9b5')}
    fireflies.forEach(f=>{const fx=f.x+Math.sin(time*.6+f.p)*13,fy=f.y+Math.cos(time*.7+f.p)*8;ctx.globalAlpha=.35+.5*(.5+.5*Math.sin(time*2+f.p));ctx.shadowColor='#ffe7a4';ctx.shadowBlur=9;ellipse(fx,fy,2,2,'#fff1ad');ctx.shadowBlur=0});ctx.globalAlpha=1;
  }
  function drawTree(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line(0,0,0,-145,'#28283b',13);for(let i=0;i<7;i++){const yy=-42-i*19, dir=i%2?1:-1;line(0,yy,dir*(25+i*5),yy-30,'#29283c',7);ellipse(dir*(25+i*5),yy-34,18+i%3*3,15,'#34334b')}ellipse(0,-144,33,24,'#35334c');ctx.restore()}

  function drawPerson(px, isMaya, pose='idle', walking=false){
    const base=430;const bob=walking?Math.sin(time*12)*2:Math.sin(time*2.2+(isMaya?1:0)) * 1.8;
    ctx.save();ctx.translate(px,base+bob);
    // ground shadow
    ellipse(0,0,31,7,'#171c2c66');
    let lean=0, arm=0;
    if(pose==='hug'&&!isMaya)lean=20;
    if(pose==='hug'&&isMaya)lean=-20;
    if(pose==='kiss'&&!isMaya)lean=25;
    if(pose==='kiss'&&isMaya)lean=-23;
    ctx.translate(lean,0);
    const skin=isMaya?'#e7ad91':'#d99b82', hair=isMaya?'#34233a':'#302634';
    const shirt=isMaya?'#d8788e':'#7998a4';
    // legs
    if(pose==='hug'||pose==='kiss'){
      line(-8,-57,-12,-20,'#343344',11);line(9,-57,13,-20,'#343344',11);
    } else {
      const swing=walking?Math.sin(time*12)*7:0;line(-8,-57,-11+swing,-20,'#343344',11);line(9,-57,12-swing,-20,'#343344',11);
    }
    rounded(-22,-25,19,6,3,'#e7d8ce');rounded(4,-25,19,6,3,'#e7d8ce');
    // body
    ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-17,-104);ctx.quadraticCurveTo(0,-114,17,-104);ctx.lineTo(23,-58);ctx.quadraticCurveTo(0,-48,-23,-58);ctx.closePath();ctx.fill();
    if(isMaya){ctx.fillStyle='#d8788e';ctx.beginPath();ctx.moveTo(-15,-80);ctx.lineTo(15,-80);ctx.lineTo(29,-55);ctx.quadraticCurveTo(0,-45,-29,-55);ctx.closePath();ctx.fill()}
    // arms
    if(pose==='hug'){
      line(-16,-98,-27,-75,'#e7ad91',9);line(-27,-75,isMaya?23:26,-86,'#e7ad91',8);
      line(15,-98,27,-76,'#e7ad91',9);line(27,-76,isMaya?-24:-26,-88,'#e7ad91',8);
    }else if(pose==='kiss'){
      line(-16,-98,-25,-77,'#e7ad91',9);line(-25,-77,lean>0?-4:-12,-87,'#e7ad91',8);
      line(15,-98,25,-80,'#e7ad91',9);line(25,-80,lean>0?7:-4,-90,'#e7ad91',8);
    }else{
      line(-16,-98,-25,-74,'#e7ad91',9);line(-25,-74,-22,-57,'#e7ad91',8);
      line(16,-98,24,-75,'#e7ad91',9);line(24,-75,19,-59,'#e7ad91',8);
    }
    // neck and head
    rounded(-6,-117,12,17,5,skin);ellipse(0,-137,22,25,skin);
    // hair cap / hairstyle
    if(isMaya){ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-22,-138);ctx.quadraticCurveTo(-23,-168,2,-164);ctx.quadraticCurveTo(25,-164,23,-134);ctx.lineTo(18,-119);ctx.quadraticCurveTo(13,-132,14,-144);ctx.quadraticCurveTo(2,-134,-10,-145);ctx.quadraticCurveTo(-15,-132,-20,-126);ctx.closePath();ctx.fill();ellipse(-19,-135,6,20,hair);ellipse(20,-133,5,18,hair)}
    else{ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-22,-140);ctx.quadraticCurveTo(-23,-168,0,-164);ctx.quadraticCurveTo(23,-163,22,-141);ctx.quadraticCurveTo(9,-151,-3,-146);ctx.quadraticCurveTo(-12,-141,-22,-140);ctx.fill();ctx.beginPath();ctx.moveTo(-20,-150);ctx.lineTo(-27,-161);ctx.lineTo(-13,-156);ctx.fill()}
    // face details
    ellipse(-7,-137,1.8,2.4,'#352837');ellipse(7,-137,1.8,2.4,'#352837');
    ctx.strokeStyle='#a95d68';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-129,5,.25,Math.PI-.25);ctx.stroke();
    ellipse(-14,-129,4,2,'#e99495');ellipse(14,-129,4,2,'#e99495');
    if(isMaya){ellipse(0,-172,4,4,'#dcb578')}
    ctx.restore();
  }

  function drawScene(){
    ctx.clearRect(0,0,W,H);drawBackground();
    // subtle warm aura near the couple
    const glow=ctx.createRadialGradient(500,397,10,500,397,240);glow.addColorStop(0,'#ffc39b20');glow.addColorStop(1,'#ffc39b00');ctx.fillStyle=glow;ctx.fillRect(250,220,500,300);
    const close=Math.abs(x-mayaX)<70;
    let pose='idle';if(scene==='hug')pose='hug';else if(scene==='kiss')pose='kiss';
    drawPerson(mayaX,true,pose,false);drawPerson(x,false,pose,started&&keys.size>0&&Math.abs(x-mayaX)>45);
    if(started&&close&&scene==='meet'&&!choiceOpen){heart(mayaX-25,235+Math.sin(time*2)*4,16,'#ff9bb4',.8);heart(x+18,261+Math.cos(time*2)*4,12,'#ffc1cd',.75)}
    if(scene==='hug'||scene==='kiss'){
      const elapsed=(performance.now()-actionAt)/1000;
      for(let i=0;i<7;i++){const p=(elapsed*.44+i/7)%1;heart(500+Math.sin(i*8+elapsed*2)*72,340-p*160,12+Math.sin(i)*3,'#ff91b0',1-p*.45)}
      if(scene==='kiss'&&elapsed<2){ctx.globalAlpha=Math.max(0,1-elapsed/2);ctx.font='26px sans-serif';ctx.fillText('♥',500,282);ctx.globalAlpha=1}
    }
  }
  function setLine(name,text){speaker.textContent=name;dialogue.textContent=text}
  function updateHUD(){heartDisplay.textContent='♥'.repeat(hearts)+'☆'.repeat(3-hearts)}
  function showToast(text){toast.textContent=text;toast.classList.add('show');toastTimer=2.2}
  function setChoices(show){choiceOpen=show;choices.hidden=!show}
  function interact(){
    if(!started||scene==='hug'||scene==='kiss')return;
    if(Math.abs(x-mayaX)>100){setLine('Maya','Come a little closer — I want to hear about your day.');return}
    if(choiceOpen)return;
    setChoices(true);setLine('You','Would you like to share a sweet moment?');
  }
  function doAction(kind){
    setChoices(false);scene=kind;action=kind;actionAt=performance.now();hearts=Math.min(3,hearts+1);updateHUD();
    if(kind==='hug'){setLine('Maya','I’d love a hug. This is really nice.');showToast('A warm, welcome hug ♡')}
    else{setLine('Maya','I’d love a kiss. Come here.');showToast('A sweet kiss beneath the lights ✦')}
    if(soundOn)playChime();
    setTimeout(()=>{
      if(scene!==kind)return;scene='meet';
      if(hearts>=3)setLine('Maya','I’m really glad we had this evening together. ♡');
      else setLine('Maya',kind==='hug'?'That was lovely. Want another moment together?':'That was sweet. I’m happy we asked each other.');
    },kind==='hug'?2600:2100);
  }
  function start(){started=true;intro.classList.add('hidden');setLine('Maya','I’ve been looking forward to seeing you tonight.');}
  function restart(){started=false;x=285;scene='meet';hearts=0;updateHUD();setChoices(false);intro.classList.remove('hidden');setLine('Maya','I’ve been looking forward to seeing you tonight.')}
  function frame(now){const dt=Math.min(.04,(now-lastTime)/1000||0);lastTime=now;time=now/1000;
    if(started&&scene==='meet'&&!choiceOpen){if(keys.has('ArrowLeft')||keys.has('a'))x-=180*dt;if(keys.has('ArrowRight')||keys.has('d'))x+=180*dt;x=Math.max(130,Math.min(mayaX-42,x));if(Math.abs(x-mayaX)<100&&speaker.textContent==='Maya'&&dialogue.textContent.includes('looking forward'))setLine('Maya','I’m happy you’re here. Would you like a hug, or maybe a kiss?')}
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('show')}
    drawScene();requestAnimationFrame(frame)
  }
  function playChime(){try{const ac=new(window.AudioContext||window.webkitAudioContext)();const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(660,ac.currentTime);osc.frequency.exponentialRampToValueAtTime(990,ac.currentTime+.18);gain.gain.setValueAtTime(.08,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.6);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+.6);osc.onended=()=>ac.close()}catch{}}
  document.querySelector('#startBtn').addEventListener('click',start);
  document.querySelector('#restartBtn').addEventListener('click',restart);
  document.querySelector('#soundBtn').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♪';e.currentTarget.title=soundOn?'Sound on':'Sound off';if(soundOn)playChime()});
  choices.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button)doAction(button.dataset.action)});
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='e'||e.key==='E'){interact();return}if(e.key==='Escape'){setChoices(false);return}keys.add(e.key)});
  window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
  canvas.addEventListener('click',e=>{if(started&&!choiceOpen){const r=canvas.getBoundingClientRect();const clickX=(e.clientX-r.left)/r.width*W;if(clickX<x)x=Math.max(130,x-60);else if(clickX>mayaX+70)interact();else x=Math.min(mayaX-42,x+60)}});
  updateHUD();requestAnimationFrame(frame);
})();
