(() => {
"use strict";
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const $ = id => document.getElementById(id);
const scoreEl=$("score"), bestEl=$("best"), gemsEl=$("gems"), levelEl=$("levelLabel");
const overlay=$("overlay"), mainBtn=$("mainBtn"), panelTitle=$("panelTitle"), panelText=$("panelText"), panelIcon=$("panelIcon"), hint=$("hint");
let W=800,H=500,dpr=1,last=0,raf=0,state="menu",score=0,gems=0,best=Number(localStorage.getItem("neonEscapeBest")||0);
let player,obstacles=[],collectibles=[],particles=[],spawn=0,gemSpawn=0,elapsed=0,speed=210,keys={},pointer=null,soundOn=false,audioCtx=null;
bestEl.textContent=best;
function resize(){
 const r=canvas.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2);
 W=Math.max(300,r.width); H=Math.max(300,r.height);
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 if(player){player.x=Math.min(W-18,Math.max(18,player.x));player.y=Math.min(H-18,Math.max(18,player.y));}
}
window.addEventListener("resize",resize); resize();
function beep(freq=500,duration=.07){
 if(!soundOn)return;
 try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="sine";o.frequency.value=freq;g.gain.value=.045;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration);}catch(e){}
}
function reset(){
 score=0;gems=0;elapsed=0;speed=210;spawn=.5;gemSpawn=.8;obstacles=[];collectibles=[];particles=[];
 player={x:W/2,y:H*.72,r:11,targetX:W/2,targetY:H*.72,trail:[]};
 updateHud();
}
function start(){reset();state="playing";overlay.classList.add("hidden");$("pauseBtn").textContent="Ⅱ";last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);beep(650);}
function pause(){
 if(state==="playing"){state="paused";showOverlay("PAUSED","Take a breath. Your run is waiting.","Ⅱ","RESUME");$("pauseBtn").textContent="▶";}
 else if(state==="paused"){state="playing";overlay.classList.add("hidden");$("pauseBtn").textContent="Ⅱ";last=performance.now();raf=requestAnimationFrame(loop);}
}
function showOverlay(title,text,icon,button){
 panelTitle.textContent=title;panelText.textContent=text;panelIcon.textContent=icon;mainBtn.innerHTML=button+' <span>➜</span>';
 hint.textContent="Touch and drag to move • Arrow keys / WASD";
 overlay.classList.remove("hidden");
}
function endGame(){
 state="over";if(score>best){best=score;localStorage.setItem("neonEscapeBest",best);bestEl.textContent=best;}
 showOverlay("GAME OVER",`You scored ${score} points and collected ${gems} gems. Try again and beat your best!`,"✦","PLAY AGAIN");beep(130,.22);
}
function updateHud(){scoreEl.textContent=score;gemsEl.textContent=gems;bestEl.textContent=best;levelEl.textContent="LEVEL "+(1+Math.floor(elapsed/18));}
function rand(a,b){return a+Math.random()*(b-a);}
function addObstacle(){
 const horizontal=Math.random()<.52;
 if(horizontal){let w=rand(65,145),x=rand(0,W-w);obstacles.push({x,y:-28,w,h:rand(13,20),type:"bar"});}
 else {let r=rand(13,21);obstacles.push({x:rand(r,W-r),y:-30,r,type:"orb",phase:rand(0,6)});}
}
function addGem(){collectibles.push({x:rand(20,W-20),y:-20,r:8,spin:0});}
function burst(x,y,color,n=12){for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,v=rand(35,160);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.25,.65),max:.65,color});}}
function circleHit(a,b){let dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy<(a.r+b.r)*(a.r+b.r);}
function update(dt){
 elapsed+=dt;speed=210+Math.min(250,elapsed*5.2);score=Math.floor(elapsed*10)+gems*25;
 let dx=(keys.ArrowLeft||keys.a?-1:0)+(keys.ArrowRight||keys.d?1:0);
 let dy=(keys.ArrowUp||keys.w?-1:0)+(keys.ArrowDown||keys.s?1:0);
 if(dx||dy){let len=Math.hypot(dx,dy)||1;player.targetX+=dx/len*360*dt;player.targetY+=dy/len*360*dt;}
 player.targetX=Math.max(player.r+3,Math.min(W-player.r-3,player.targetX));player.targetY=Math.max(player.r+3,Math.min(H-player.r-3,player.targetY));
 player.x+=(player.targetX-player.x)*Math.min(1,dt*12);player.y+=(player.targetY-player.y)*Math.min(1,dt*12);
 player.trail.push({x:player.x,y:player.y});if(player.trail.length>12)player.trail.shift();
 spawn-=dt;if(spawn<=0){addObstacle();spawn=Math.max(.34,rand(.65,1.05)-elapsed*.006);}
 gemSpawn-=dt;if(gemSpawn<=0){addGem();gemSpawn=rand(1.15,1.8);}
 for(let o of obstacles){o.y+=speed*dt;if(o.type==="orb")o.phase+=dt*3;}
 obstacles=obstacles.filter(o=>o.y<H+50);
 for(let g of collectibles){g.y+=(speed*.78)*dt;g.spin+=dt*5;}
 collectibles=collectibles.filter(g=>g.y<H+30);
 for(let o of obstacles){
  let hit=false;
  if(o.type==="bar"){let cx=Math.max(o.x,Math.min(player.x,o.x+o.w)),cy=Math.max(o.y,Math.min(player.y,o.y+o.h));hit=(player.x-cx)**2+(player.y-cy)**2<player.r**2;}
  else hit=circleHit(player,{x:o.x,y:o.y,r:o.r+2});
  if(hit){burst(player.x,player.y,"#ff3cce",22);endGame();return;}
 }
 for(let i=collectibles.length-1;i>=0;i--){if(circleHit(player,collectibles[i])){let g=collectibles.splice(i,1)[0];gems++;burst(g.x,g.y,"#ffd84b",10);beep(850,.06);}}
 for(let p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 updateHud();
}
function draw(){
 ctx.clearRect(0,0,W,H);
 let grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,"#080c25");grad.addColorStop(1,"#10072b");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle="#172653";ctx.lineWidth=1;
 for(let x=0;x<W;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
 for(let y=0;y<H;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
 for(let i=0;i<34;i++){let x=(i*97+elapsed*12)%(W||1),y=(i*53+elapsed*23)%(H||1);ctx.fillStyle=i%3?"#283b79":"#a22eff";ctx.fillRect(x,y,2,2);}
 obstacles.forEach(o=>{
  ctx.save();ctx.shadowBlur=17;
  if(o.type==="bar"){ctx.shadowColor="#f52dce";ctx.strokeStyle="#ff3edb";ctx.lineWidth=3;ctx.fillStyle="#f52dce18";ctx.beginPath();ctx.roundRect(o.x,o.y,o.w,o.h,5);ctx.fill();ctx.stroke();}
  else{ctx.translate(o.x,o.y);ctx.rotate(o.phase);ctx.shadowColor="#ff405f";ctx.fillStyle="#ff284b";ctx.strokeStyle="#ff9bad";ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<16;i++){let a=i*Math.PI/8,r=i%2?o.r*.76:o.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
 });
 collectibles.forEach(g=>{ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.spin);ctx.shadowColor="#ffd84b";ctx.shadowBlur=18;ctx.fillStyle="#ffe36a";ctx.beginPath();ctx.moveTo(0,-g.r);ctx.lineTo(g.r*.7,0);ctx.lineTo(0,g.r);ctx.lineTo(-g.r*.7,0);ctx.closePath();ctx.fill();ctx.restore();});
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;});
 if(player){
  player.trail.forEach((t,i)=>{ctx.globalAlpha=(i/player.trail.length)*.45;ctx.fillStyle="#16eaff";ctx.fillRect(t.x-3,t.y-3,6,6);});
  ctx.globalAlpha=1;ctx.save();ctx.translate(player.x,player.y);ctx.rotate(Math.PI/4);ctx.shadowColor="#00eaff";ctx.shadowBlur=24;ctx.fillStyle="#eaffff";ctx.strokeStyle="#13eaff";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-9,-9,18,18,4);ctx.fill();ctx.stroke();ctx.restore();
 }
}
function loop(t){if(state!=="playing")return;let dt=Math.min(.035,(t-last)/1000||0);last=t;update(dt);draw();if(state==="playing")raf=requestAnimationFrame(loop);}
function setPointer(e){let r=canvas.getBoundingClientRect();let x=(e.clientX-r.left),y=(e.clientY-r.top);if(player){player.targetX=x;player.targetY=y;}}
canvas.addEventListener("pointerdown",e=>{pointer=e.pointerId;canvas.setPointerCapture(pointer);setPointer(e);});
canvas.addEventListener("pointermove",e=>{if(pointer===e.pointerId)setPointer(e);});
canvas.addEventListener("pointerup",e=>{if(pointer===e.pointerId)pointer=null;});
window.addEventListener("keydown",e=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key===" "&&state==="menu")start();if(e.key==="Escape")pause();});
window.addEventListener("keyup",e=>keys[e.key]=false);
mainBtn.addEventListener("click",()=>{if(state==="paused"){state="playing";overlay.classList.add("hidden");$("pauseBtn").textContent="Ⅱ";last=performance.now();raf=requestAnimationFrame(loop);}else start();});
$("pauseBtn").addEventListener("click",pause);
$("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"♫":"♪";beep(700);});
showOverlay("NEON ESCAPE","Dodge the pink barriers. Collect golden gems. Stay alive.","✦","PLAY NOW");
draw();
})();