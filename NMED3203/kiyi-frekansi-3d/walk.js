(() => {
  const world=window.IMA_WORLD;
  if(!world) return;
  const {T,scene,canvas,visuals,walkable,floor,start}=world;
  let renderer;
  try {
    renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
  } catch (error) {
    console.error("WebGL unavailable",error);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  const camera=new T.PerspectiveCamera(43,1,.13,300);
  const stage=canvas.parentElement;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const {box,cyl,gem,group,material}=world.model;

  function buildWalker() {
    const person=group(scene,start[0],floor(...start),start[1]);
    const coat=material(0xc69155), boots=material(0x2d454b), skin=material(0xc3956a), scarf=material(0x548482);
    const body=cyl(person,.23,.32,.53,8,coat,0,.625,0);
    body.scale.z=.76;
    cyl(person,.135,.15,.09,8,scarf,0,.91,0);
    gem(person,.181,skin,0,1.076,.015).scale.set(.93,1.12,.88);
    cyl(person,.255,.265,.062,12,material(0x52655b),0,1.18,.026);
    cyl(person,.14,.19,.14,10,material(0x638274),0,1.255,-.008);
    box(person,.34,.34,.115,boots,0,.65,-.211);
    box(person,.26,.24,.06,material(0xab8f64),0,.68,-.28);
    const lantern=group(person,.30,.45,-.10);
    cyl(lantern,.064,.073,.13,7,material(0xdfa46b,1.35),0,0,0);
    cyl(lantern,.069,.066,.024,7,boots,0,.074,0);
    const limbs=[];
    for(const s of [-1,1]){
      const leg=group(person,.13*s,.295,0);
      box(leg,.125,.246,.135,boots,0,-.11,0);
      box(leg,.135,.080,.21,material("ink"),0,-.26,.043);
      const arm=group(person,.244*s,.80,0);
      arm.rotation.z=-s*.14;
      box(arm,.112,.29,.13,coat,0,-.10,0);
      gem(arm,.062,skin,0,-.277,0);
      limbs.push({leg,arm});
    }
    person.rotation.y=.93;
    return {person,limbs};
  }
  const {person,limbs}=buildWalker();
  const location=person.position;
  const look=new T.Vector3();
  const projected=new T.Vector3();
  const ideal=new T.Vector3();
  const ray=new T.Raycaster();
  const pickRegion=new T.Sphere();
  const ground=new T.Plane(new T.Vector3(0,1,0),-.39);
  const keys=new Set();
  const controls=new Map([
    ["KeyW","up"],["ArrowUp","up"],["KeyA","left"],["ArrowLeft","left"],
    ["KeyS","down"],["ArrowDown","down"],["KeyD","right"],["ArrowRight","right"]
  ]);
  const touchControls=new Map();
  const drag={id:null,x:0,y:0,moved:false};
  let path=[];
  let arrive;
  let yaw=-.67;
  let pitch=.45;
  let overview=true;
  let last=performance.now();
  let first=true;
  let clock=0;
  let stepCycle=0;
  let width=0;
  let height=0;
  let hooks={};
  let flightPaused=false;

  function cameraMode(value) {
    if(overview===value) return;
    overview=value;
    hooks.camera?.(value);
  }

  function resize() {
    width=Math.max(1,stage.clientWidth);
    height=Math.max(1,stage.clientHeight);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }

  function levelCamera(dt) {
    if(overview){
      const portrait=camera.aspect<.95;
      ideal.set(portrait?-27:-16,portrait?34:17,portrait?43:25);
      look.set(portrait?0:-3.65,portrait?-.6:.4,portrait?-.8:1.6);
      camera.fov=portrait?51:44;
    }else{
      const distance=camera.aspect<.95?6.6:6.15;
      const cx=Math.sin(yaw)*Math.cos(pitch)*distance;
      const cz=Math.cos(yaw)*Math.cos(pitch)*distance;
      const y=location.y+1+Math.sin(pitch)*distance;
      ideal.set(location.x+cx,Math.max((floor(location.x+cx,location.z+cz) ?? -.5)+.6,y),location.z+cz);
      look.set(location.x-cx*.15,location.y+.84,location.z-cz*.15);
      camera.fov=camera.aspect<.95?61:49;
    }
    camera.position.lerp(ideal, first || reduced ? 1 : 1-Math.exp(-dt*(drag.moved?15:7.3)));
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    first=false;
  }

  function move(dx,dz) {
    let moved=false;
    if(walkable(location.x+dx,location.z+dz)) {
      location.x+=dx;
      location.z+=dz;
      moved=true;
    }else{
      if(dx && walkable(location.x+dx,location.z)){location.x+=dx;moved=true;}
      if(dz && walkable(location.x,location.z+dz)){location.z+=dz;moved=true;}
    }
    if(moved) person.rotation.y=Math.atan2(dx,dz);
    return moved;
  }

  const gridStep=.24;
  const left=-16, top=-12, columns=135, rows=102;
  const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  let grid;

  function cellCoordinate(id) {
    return [left+(id%columns)*gridStep,top+Math.floor(id/columns)*gridStep];
  }

  function segmentClear(ax,az,bx,bz) {
    const count=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.10));
    for(let i=1;i<=count;i++){
      const fraction=i/count;
      if(!walkable(T.MathUtils.lerp(ax,bx,fraction),T.MathUtils.lerp(az,bz,fraction))) return false;
    }
    return true;
  }

  function snap(x,z) {
    const gx=Math.round((x-left)/gridStep), gz=Math.round((z-top)/gridStep);
    let result=null, best=Infinity;
    for(let dz=-4;dz<=4;dz++){
      for(let dx=-4;dx<=4;dx++){
        const col=gx+dx, row=gz+dz;
        if(col<0||col>=columns||row<0||row>=rows) continue;
        const id=row*columns+col;
        if(!grid[id]) continue;
        const [a,b]=cellCoordinate(id);
        const dist=Math.hypot(a-x,b-z);
        if(dist<best && (segmentClear(x,z,a,b) || !walkable(x,z))){best=dist;result=id;}
      }
    }
    return result;
  }

  function findPath(x,z) {
    if(segmentClear(location.x,location.z,x,z)) return [[x,z]];
    grid ||= Uint8Array.from({length:columns*rows},(_,id)=>Number(walkable(...cellCoordinate(id))));
    const from=snap(location.x,location.z), to=snap(x,z);
    if(from===null||to===null) return [];
    const nodes=[{id:from,rank:0,cost:0}];
    const parents=new Int32Array(grid.length).fill(-1);
    const costs=new Float32Array(grid.length).fill(Infinity);
    costs[from]=0;
    while(nodes.length){
      nodes.sort((a,b)=>b.rank-a.rank);
      const {id,cost}=nodes.pop();
      if(id===to) break;
      if(cost>costs[id]+.0001) continue;
      const col=id%columns,row=Math.floor(id/columns);
      for(const [dx,dz] of neighbors){
        if(col+dx<0||col+dx>=columns||row+dz<0||row+dz>=rows) continue;
        const next=id+dz*columns+dx;
        if(!grid[next] || (dx && dz && (!grid[id+dx] || !grid[id+dz*columns]))) continue;
        const costNext=cost+(dx&&dz ? Math.SQRT2 : 1);
        if(costNext>=costs[next]-.0001) continue;
        costs[next]=costNext;
        parents[next]=id;
        const [tx,tz]=cellCoordinate(next);
        nodes.push({id:next,cost:costNext,rank:costNext+Math.hypot(x-tx,z-tz)/gridStep});
      }
    }
    if(from!==to&&parents[to]===-1) return [];
    const raw=[];
    for(let node=to;node!==from;node=parents[node]) raw.push(cellCoordinate(node));
    raw.push(cellCoordinate(from));
    raw.reverse();
    const end=raw.at(-1);
    if(walkable(x,z)&&segmentClear(...end,x,z)) raw.push([x,z]);
    const smoothed=[];
    let ax=location.x,az=location.z;
    for(let i=0;i<raw.length;i++){
      let far=i;
      while(far+1<raw.length && segmentClear(ax,az,...raw[far+1])) far++;
      smoothed.push(raw[far]);
      [ax,az]=raw[far];
      i=far;
    }
    return smoothed;
  }

  function cancelWalk() {
    path=[];
    arrive=undefined;
  }

  function go(x,z,onArrival) {
    cameraMode(false);
    cancelWalk();
    if(Math.hypot(x-location.x,z-location.z)<.16){onArrival?.();return true;}
    path=findPath(x,z);
    if(!path.length) return false;
    arrive=onArrival;
    canvas.focus({preventScroll:true});
    return true;
  }

  function assist(dt) {
    if(!path.length) return false;
    const [x,z]=path[0], dx=x-location.x, dz=z-location.z;
    const distance=Math.hypot(dx,dz);
    const step=Math.min(distance,4.15*dt);
    if(distance<.027){
      path.shift();
      if(!path.length){
        const callback=arrive;
        arrive=undefined;
        callback?.();
      }
      return false;
    }
    if(move(dx/distance*step,dz/distance*step)) return true;
    cancelWalk();
    hooks.interrupted?.();
    return false;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt=Math.min(.045,(now-last)/1000);
    last=now;
    clock+=dt;
    let walking=false;
    if(!flightPaused){
      const directions=new Set([...keys, ...touchControls.values()]);
      const sx=Number(directions.has("right"))-Number(directions.has("left"));
      const sy=Number(directions.has("down"))-Number(directions.has("up"));
      if(sx||sy){
        cancelWalk();
        hooks.manual?.();

        cameraMode(false);
        const length=Math.hypot(sx,sy);
        const speed=3.65*dt/length;
        walking=move((Math.cos(yaw)*sx+Math.sin(yaw)*sy)*speed,
                     (-Math.sin(yaw)*sx+Math.cos(yaw)*sy)*speed);
      }else walking=assist(dt);
    }
    stepCycle+=walking?dt*17:0;
    const heightOnGround=floor(location.x,location.z);
    if(heightOnGround!==null) location.y=T.MathUtils.lerp(location.y,heightOnGround,1-Math.exp(-dt*18));
    for(const [i,{leg,arm}] of limbs.entries()){
      const swing=walking && !reduced ? Math.sin(stepCycle+i*Math.PI)*.49 : 0;
      leg.rotation.x=T.MathUtils.lerp(leg.rotation.x,swing,.44);
      arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,-swing*.62,.44);
    }
    world.update(dt,clock,reduced);
    levelCamera(dt);
    hooks.frame?.();
    renderer.render(scene,camera);
  }

  function pin(id) {
    const point=visuals[id];
    if(!point) return null;
    projected.copy(point).project(camera);
    if(projected.z<-1||projected.z>1||Math.abs(projected.x)>.96||Math.abs(projected.y)>.94) return null;
    return [(projected.x*.5+.5)*width,(-projected.y*.5+.5)*height];
  }

  function pickTarget() {
    let closest=null;
    let depth=Infinity;
    for(const target of world.targets){
      pickRegion.center.copy(visuals[target.id]);
      pickRegion.center.y-=target.y*.46;
      pickRegion.radius=target.id==="lighthouse"?.63:.49;
      const hit=ray.ray.intersectSphere(pickRegion,new T.Vector3());
      if(!hit) continue;
      const distance=ray.ray.origin.distanceToSquared(hit);
      if(distance>=depth) continue;
      depth=distance;
      closest=target.id;
    }
    return closest;
  }

  const heldKeys=new Map();
  document.addEventListener("keydown", event=>{
    const isModal=document.querySelector("dialog[open]");
    if(isModal||event.ctrlKey||event.altKey||event.metaKey) return;
    const direction=controls.get(event.code);
    if(direction){
      event.preventDefault();
      heldKeys.set(event.code,direction);
      keys.add(direction);
    }else if(event.code==="KeyE" && !event.repeat){
      event.preventDefault();
      hooks.use?.();
    }
  });
  document.addEventListener("keyup",event=>{
    if(!heldKeys.delete(event.code)) return;
    keys.clear();
    for(const direction of heldKeys.values()) keys.add(direction);
  });
  window.addEventListener("blur",()=>{
    heldKeys.clear();
    keys.clear();
    touchControls.clear();
    for(const button of document.querySelectorAll(".dpad .held")) button.classList.remove("held");
  });

  const dpad=document.getElementById("dpad");
  dpad.addEventListener("pointerdown",event=>{
    const button=event.target.closest("button[data-move]");
    if(!button) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touchControls.set(event.pointerId,button.dataset.move);
    button.classList.add("held");
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]){
    dpad.addEventListener(type,event=>{
      touchControls.delete(event.pointerId);
      event.target.closest("button")?.classList.remove("held");
    });
  }

  canvas.addEventListener("pointerdown",event=>{
    if(drag.id!==null||event.button!==0) return;
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId);
    Object.assign(drag,{id:event.pointerId,x:event.clientX,y:event.clientY,moved:false});
  });
  canvas.addEventListener("pointermove",event=>{
    if(drag.id!==event.pointerId) return;
    const dx=event.clientX-drag.x, dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5) return;
    drag.moved=true;
    cameraMode(false);
    yaw-=dx*.008;
    pitch=T.MathUtils.clamp(pitch+dy*.005,.10,1.03);
    drag.x=event.clientX;
    drag.y=event.clientY;
  });
  canvas.addEventListener("pointerup",event=>{
    if(drag.id!==event.pointerId) return;
    const tap=!drag.moved;
    drag.id=null;
    drag.moved=false;
    if(!tap) return;
    const rect=canvas.getBoundingClientRect();
    const p=new T.Vector2((event.clientX-rect.left)/width*2-1,-(event.clientY-rect.top)/height*2+1);
    ray.setFromCamera(p,camera);
    const target=pickTarget();
    if(target){
      hooks.pick?.(target);
      return;
    }
    hooks.manual?.();
    const surfaceHit=ray.intersectObject(world.surface)[0];
    const hit=surfaceHit?.point ?? ray.ray.intersectPlane(ground,new T.Vector3());
    if(hit && walkable(hit.x,hit.z)) go(hit.x,hit.z);
  });
  canvas.addEventListener("pointercancel",()=>{drag.id=null;drag.moved=false;});
  canvas.addEventListener("webglcontextlost",event=>{
    event.preventDefault();
    document.getElementById("webgl-error").hidden=false;
  });
  canvas.addEventListener("webglcontextrestored",()=>{
    document.getElementById("webgl-error").hidden=true;
  });
  new ResizeObserver(resize).observe(stage);
  resize();
  requestAnimationFrame(animate);

  window.COAST_PLAYER={
    setHooks(next){hooks=next;},
    at(){return [location.x,location.z];},
    go,pin,
    stop:cancelWalk,
    camera:cameraMode,
    pause(value){flightPaused=value; if(value){heldKeys.clear();keys.clear();touchControls.clear();}},
    reset(position=start){
      cancelWalk();
      location.set(position[0],floor(...position) ?? .38,position[1]);
      person.rotation.y=.93;
      yaw=-.67;
      pitch=.45;
      first=true;
    }
  };
})();
