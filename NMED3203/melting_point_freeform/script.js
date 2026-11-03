"use strict";

/* DESIGN — Renkler, boyutlar, süreler ve fizik kuralları burada ayarlanır. */
const DESIGN = {
  colors: { ice: "#8dcde7", edge: "#438cab", trace: "#91aebd", ground: "#b5cbd5", cursor: "#246b8c" },
  sizes: { icePx: 56, minIceScale: 0.12, cursorStepPx: 16, canvasWidth: 900, canvasHeight: 500 },
  timings: { meltMs: 15000, announcementMs: 800 },
  thresholds: { gravity: 980, collisionTolerancePx: 3, maxFrameSeconds: 0.04 },
  rules: { maxTraces: 100, initialMemory: "visible", initialPaused: false }
};

/* STATE — Her parça kendi oluşturulma konumunu ve yaşını hatırlar. */
const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");
const clock = document.querySelector("#clock");
const runState = document.querySelector("#run-state");
const count = document.querySelector("#active-count");
const pauseButton = document.querySelector("#pause-button");
const placeButton = document.querySelector("#place-button");
const activity = document.querySelector("#activity");
const announcement = document.querySelector("#announcement");
const modeCaption = document.querySelector("#mode-caption");
const W = DESIGN.sizes.canvasWidth, H = DESIGN.sizes.canvasHeight;
const groundY = H - 43;
canvas.width = W; canvas.height = H;
let state = createState(DESIGN.rules.initialMemory);
let lastFrame = null, lastAnnounce = -Infinity;
function createState(mode) {
  return { pieces: [], traces: [], mode, paused: DESIGN.rules.initialPaused,
    time: 0, nextId: 1, cursor: { x: W/2, y: H/2 }, changed: true };
}

/* INPUT — Tıklama/dokunma ve klavye aynı yerleştirme işlevine gider. */
function message(text, speak=true) {
  activity.textContent = text;
  if (speak && state.time * 1000 - lastAnnounce >= DESIGN.timings.announcementMs) {
    announcement.textContent = text;
    lastAnnounce = state.time * 1000;
  }
}
function place(x,y) {
  if (state.paused) { message("Resume time before placing ice."); return; }
  const s = DESIGN.sizes.icePx;
  x = Math.max(s/2, Math.min(W-s/2, x));
  y = Math.max(s/2, Math.min(groundY-s/2, y));
  const piece = { id: state.nextId++, x, y, startX:x, startY:y, born:state.time, vy:0 };
  state.pieces.push(piece);
  message(`Ice ${piece.id} placed. It will melt over 15 seconds.`);
  state.changed = true;
}
function coords(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX-rect.left)*W/rect.width, y:(event.clientY-rect.top)*H/rect.height };
}
canvas.addEventListener("click", e => { const p=coords(e); state.cursor=p; place(p.x,p.y); });
canvas.addEventListener("keydown", e => {
  const step=DESIGN.sizes.cursorStepPx;
  if (e.key === "ArrowLeft") state.cursor.x-=step;
  else if(e.key === "ArrowRight") state.cursor.x+=step;
  else if(e.key === "ArrowUp") state.cursor.y-=step;
  else if(e.key === "ArrowDown") state.cursor.y+=step;
  else if(e.key === "Enter" || e.key === " ") place(state.cursor.x,state.cursor.y);
  else return;
  e.preventDefault();
  state.cursor.x=Math.max(20,Math.min(W-20,state.cursor.x));
  state.cursor.y=Math.max(20,Math.min(groundY-20,state.cursor.y));
  state.changed=true;
});
placeButton.addEventListener("click",()=>place(state.cursor.x,state.cursor.y));
pauseButton.addEventListener("click",()=>{
  state.paused=!state.paused; lastFrame=null;
  message(state.paused?"Time paused. Ice and movement are frozen.":"Time resumed.");
  syncUI();
});
document.querySelector("#reset-button").addEventListener("click",()=>{
  state=createState(state.mode); lastFrame=null; lastAnnounce=-Infinity;
  message("Sculpture, traces and time reset."); syncUI();
});
document.querySelectorAll('input[name="memory"]').forEach(r=>r.addEventListener("change",()=>{
  if(!r.checked)return;
  state=createState(r.value); lastFrame=null; lastAnnounce=-Infinity;
  message(`New attempt. ${r.value==="visible"?"Visible":"Hidden"} Past.`); syncUI();
}));
document.addEventListener("visibilitychange",()=>{
  if(document.hidden && !state.paused){state.paused=true;message("Automatically paused while the tab is hidden.");syncUI();}
  lastFrame=null;
});

/* RULE — Yaşa göre erime ve destek yüzeylerine göre basit düşme fiziği. */
function sizeOf(p) {
  return DESIGN.sizes.icePx * Math.max(0, 1-(state.time-p.born)*1000/DESIGN.timings.meltMs);
}
function update(dt) {
  state.time+=dt;
  const remaining=[];
  for(const p of state.pieces){
    if(sizeOf(p)<=0){
      state.traces.push({x:p.startX,y:p.startY,id:p.id});
      if(state.traces.length>DESIGN.rules.maxTraces)state.traces.shift();
    }else remaining.push(p);
  }
  state.pieces=remaining;
  // Alt parçalardan başlayarak destekleri yeniden hesapla.
  const ordered=[...state.pieces].sort((a,b)=>b.y-a.y);
  for(const p of ordered){
    const half=sizeOf(p)/2;
    let support=groundY;
    for(const q of ordered){
      if(q===p || q.y<=p.y)continue;
      const qhalf=sizeOf(q)/2;
      const overlap=Math.abs(p.x-q.x)<(half+qhalf)*0.85;
      const surface=q.y-qhalf;
      if(overlap && surface>=p.y-half-DESIGN.thresholds.collisionTolerancePx && surface<support){support=surface;}
    }
    p.vy+=DESIGN.thresholds.gravity*dt;
    const nextY=p.y+p.vy*dt;
    if(nextY+half>=support){p.y=support-half;p.vy=0;}
    else p.y=nextY;
  }
}

/* OUTPUT — Görünür izler ve erişilebilir metin aynı moda uyar. */
function drawPiece(p){
  const s=sizeOf(p),h=s/2;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.shadowColor="rgba(63,125,155,.19)";ctx.shadowBlur=15;ctx.shadowOffsetY=5;
  const grad=ctx.createLinearGradient(-h,-h,h,h);
  grad.addColorStop(0,"#f0fdff");grad.addColorStop(.55,DESIGN.colors.ice);grad.addColorStop(1,"#6ab5d2");
  ctx.fillStyle=grad;ctx.strokeStyle=DESIGN.colors.edge;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(-h,-h,s,s,Math.min(7,s/5));ctx.fill();ctx.stroke();
  ctx.shadowColor="transparent";
  ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-h+5,-h+9);ctx.lineTo(h-7,-h+9);ctx.stroke();
  ctx.restore();
}
function render(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#f7fbfd";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#e2edf2";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,groundY);ctx.lineTo(W,groundY);ctx.stroke();
  ctx.fillStyle="#e4edf2";ctx.fillRect(0,groundY,W,H-groundY);
  if(state.mode==="visible"){
    for(const t of state.traces){
      const s=DESIGN.sizes.icePx;
      ctx.save();ctx.strokeStyle=DESIGN.colors.trace;ctx.globalAlpha=.62;ctx.lineWidth=1.7;
      ctx.setLineDash([5,4]);ctx.strokeRect(t.x-s/2,t.y-s/2,s,s);ctx.restore();
    }
  }
  for(const p of [...state.pieces].sort((a,b)=>a.y-b.y))drawPiece(p);
  if(document.activeElement===canvas){
    ctx.strokeStyle=DESIGN.colors.cursor;ctx.lineWidth=2;
    const {x,y}=state.cursor;
    ctx.beginPath();ctx.moveTo(x-13,y);ctx.lineTo(x+13,y);ctx.moveTo(x,y-13);ctx.lineTo(x,y+13);ctx.stroke();
  }
}
function syncUI(){
  const mins=Math.floor(state.time/60).toString().padStart(2,"0");
  const secs=(state.time%60).toFixed(1).padStart(4,"0");
  clock.textContent=`${mins}:${secs}`;
  runState.textContent=state.paused?"Paused":"Running";
  count.textContent=state.pieces.length;
  pauseButton.textContent=state.paused?"Resume":"Pause";
  placeButton.disabled=state.paused;
  modeCaption.textContent=state.mode==="visible"?"VISIBLE PAST":"HIDDEN PAST";
}
function frame(timestamp){
  if(lastFrame===null)lastFrame=timestamp;
  const dt=Math.min(DESIGN.thresholds.maxFrameSeconds,Math.max(0,(timestamp-lastFrame)/1000));
  lastFrame=timestamp;
  if(!state.paused)update(dt);
  render();syncUI();
  requestAnimationFrame(frame);
}
syncUI();requestAnimationFrame(frame);
