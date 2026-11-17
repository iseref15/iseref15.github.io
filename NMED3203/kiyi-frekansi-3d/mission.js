(() => {
  const world=window.IMA_WORLD;
  const player=window.COAST_PLAYER;
  const byId=id=>document.getElementById(id);
  const icons={
    help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 .5c0 2-3 2.3-3 4.5m0 3h.01"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    signal:'<circle cx="12" cy="12" r="2"/><path d="M7 17a7 7 0 0 1 0-10m10 0a7 7 0 0 1 0 10M4 20A11 11 0 0 1 4 4m16 0a11 11 0 0 1 0 16"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    waves:'<path d="M2 8c3 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2M2 13c3 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2M2 18c3 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2"/>',
    eye:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2"/>',
    drag:'<path d="M5 12h14M5 12l3-3m-3 3 3 3m11-3-3-3m3 3-3 3M12 5v14m0-14-3 3m3-3 3 3m-3 11-3-3m3 3 3-3"/>',
    arrow:'<path d="M3 12h17m-7-7 7 7-7 7"/>',
    dusk:'<path d="M2 17h20M5 21h14M7 17a5 5 0 0 1 10 0M12 4v3m-7 3L3 8m16 2 2-2"/>',
    moon:'<path d="M20.8 15A8.8 8.8 0 0 1 9 3.2 9 9 0 1 0 20.8 15Z"/>',
    mute:'<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
    sound:'<path d="M11 5 6 9H3v6h3l5 4V5Zm4 4a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>'
  };
  const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
  for(const node of document.querySelectorAll("[data-icon]")) node.innerHTML=icon(node.dataset.icon);

  const phases=[
    { name:"Alacakaranlık", time:"18:40", water:"Su çekiliyor", icon:"dusk" },
    { name:"Sular çekilirken", time:"20:15", water:"Alçak su", icon:"waves" },
    { name:"Ay ışığı", time:"22:30", water:"Yüksek su", icon:"moon" }
  ];
  const routes={
    reflect:{ name:"Kıyı yansıtıcısı", phase:1, frequency:892, description:"Sular çekilince açığa çıkan kayalar sinyali iskeleye yansıtır.", success:"Yansıtıcı kayalara doğru çevrildi." },
    relay:{ name:"Yüzer röle", phase:2, frequency:946, description:"Su yükselince şamandıranın anteni kayaların üstüne çıkar. Sinyal buradan iskeleye ulaşır.", success:"Röle şamandıraya bağlandı." }
  };
  const targets=Object.fromEntries((world?.targets ?? []).map(target=>[target.id,target]));
  const interactionDistance=1.38;
  const fresh=()=>({ talked:false,route:null,phase:0,frequency:880,captured:false,delivered:false,preferredRoute:"reflect" });
  let state=fresh();
  let walkingTo=null;
  let sound=false;
  let audio;
  let nearby=null;
  let noticeTimer;
  let panelKind="";
  const panel=byId("panel");
  const panelBody=byId("panel-body");
  const panelActions=byId("panel-actions");
  const panelFeedback=byId("panel-feedback");
  const pins=byId("world-labels");
  const pinElements=new Map();
  const phasesBar=byId("phases");

  const bot=message=>'<div class="bot"><img src="assets/robot.png" alt=""><span><strong>Box Bot</strong>'+message+'</span></div>';
  const frequencyText=value=>(value/10).toFixed(1).replace(".",",")+" MHz";
  const btn=(id,text,alt=false)=>'<button type="button" class="'+(alt?"secondary":"primary")+'" data-command="'+id+'">'+text+icon("arrow")+'</button>';
  const phaseButtons=()=>phases.map((phase,i)=>'<button type="button" class="phase" data-phase="'+i+
    '" aria-label="'+phase.name+', '+phase.water+', '+phase.time+'"><span data-icon="'+phase.icon+'">'+icon(phase.icon)+
    '</span><span><strong>'+phase.name+'</strong><small>'+phase.water+'</small></span><time>'+phase.time+'</time></button>').join("");

  function beep(kind="tick") {
    if(!sound) return;
    try{
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const pitches=kind==="success"?[451,568,680]:kind==="error"?[260,171]:[420];
      const play=()=>{
        for(const [i,pitch] of pitches.entries()){
          const start=audio.currentTime+i*.11, node=audio.createOscillator(), volume=audio.createGain();
          node.frequency.value=pitch;
          volume.gain.setValueAtTime(.0001,start);
          volume.gain.exponentialRampToValueAtTime(.09,start+.018);
          volume.gain.exponentialRampToValueAtTime(.0001,start+.127);
          node.connect(volume).connect(audio.destination);
          node.start(start);
          node.stop(start+.133);
        }
      };
      if(audio.state==="suspended") audio.resume().then(play).catch(()=>{});
      else play();
    }catch{/* The movement and game remain available without audio. */}
  }

  function notice(message="") {
    clearTimeout(noticeTimer);
    byId("notice").textContent=message;
    if(message) noticeTimer=setTimeout(()=>byId("notice").textContent="",4200);
  }

  function task() {
    if(state.delivered) return { id:null,zone:"FENER",title:"Fener yayında",detail:"Box Bot’un sinyali koya geri döndü." };
    if(state.captured) return { id:"lighthouse",zone:"FENER",title:"Sinyali yayınla",detail:"Tepeye çık ve fener konsolunu kullan.",go:"Fenere yürü" };
    if(state.route) return { id:"pier",zone:"İSKELE",title:"İskeleyi dinle",detail:"Telsizde uygun gelgiti ve frekansı bul.",go:"İskeleye yürü" };
    if(state.talked) return { id:state.preferredRoute,zone:"KUMSAL",title:"Bir düzenek seç",detail:"Yansıtıcıyı veya yüzer röleyi incele.",go:"Kumsala yürü" };
    return { id:"robot",zone:"MEYDAN",title:"Box Bot’la konuş",detail:"Telsizin başında seni bekliyor.",go:"Box Bot’a yürü" };
  }

  function refreshTask() {
    const objective=task();
    byId("objective-meta").textContent=objective.zone;
    byId("objective-title").textContent=objective.title;
    byId("objective-detail").textContent=objective.detail;
    const advance=byId("walk-target");
    advance.hidden=!objective.id;
    advance.disabled=!player;
    if(objective.id){
      advance.innerHTML=walkingTo? "Yürüyüşü durdur":objective.go+icon("arrow");
    }
    for(const [id,node] of pinElements){
      const active=id===objective.id || (objective.zone==="KUMSAL" && (id==="reflect"||id==="relay"));
      node.classList.toggle("current",active);
    }
  }

  function refreshTime() {
    const phase=phases[state.phase];
    byId("clock").textContent=phase.time;
    byId("water-level").textContent=phase.water.toLocaleUpperCase("tr");
    for(const node of document.querySelectorAll("button[data-phase]")){
      node.setAttribute("aria-pressed",String(Number(node.dataset.phase)===state.phase));
    }
    updateTuner();
  }

  function changePhase(index) {
    if(index===state.phase) return;
    state.phase=index;
    world?.setTime(index);
    refreshTime();
    if(panel.open) panelFeedback.textContent="";
    beep();
  }

  function distance(target) {
    const [x,z]=player.at();
    return Math.hypot(x-target.at[0],z-target.at[1]);
  }

  function allowed(id) {
    if(id==="robot") return true;
    if(!state.talked && !state.delivered) return false;
    if(id==="pier") return Boolean(state.route);
    if(id==="lighthouse") return state.captured;
    return true;
  }

  function frame() {
    let close=null;
    let best=interactionDistance;
    const active=task();
    const compact=byId("cover").classList.contains("compact");
    const sceneWidth=world.canvas.clientWidth;
    for(const [id,node] of pinElements){
      const target=targets[id];
      const point=player.pin(id);
      const gap=distance(target);
      const device=id==="reflect"||id==="relay";
      const visible=id===active.id || (device ? state.talked && (gap<6.5 || active.zone==="KUMSAL") : gap<6.5 || !compact);
      node.hidden=!point || !visible;
      if(point){
        const offsetX=id==="reflect"?-12:id==="relay"?12:0;
        const offsetY=id==="relay"?-13:0;
        const x=Math.min(sceneWidth-61,Math.max(61,point[0]+offsetX));
        node.style.transform="translate("+x+"px,"+(point[1]+offsetY)+"px) translate(-50%,-100%)";
      }
      if(gap<best && allowed(id)){
        best=gap;
        close=target;
      }
    }
    if(nearby===close) return;
    nearby=close;
    byId("interact").hidden=!close;
    if(close) byId("interact-label").textContent=close.id==="robot"?"Box Bot’la konuş":close.label+" · İncele";
  }

  function halt() {
    walkingTo=null;
    player?.stop();
    refreshTask();
  }

  function walkTo(id) {
    if(!player || panel.open) return;
    const target=targets[id];
    if(!target) return;
    if(!allowed(id)){
      notice(id==="pier"&&state.talked?"Önce kumsalda bir düzenek seç.":id==="lighthouse"&&state.talked?"Önce iskelede sinyali kaydet.":"Önce Box Bot’la konuş.");
      beep("error");
      return;
    }
    if(distance(target)<interactionDistance){
      openTarget(id);
      return;
    }
    notice();
    walkingTo=id;
    refreshTask();
    if(!player.go(...target.stand,()=>{
      walkingTo=null;
      refreshTask();
      if(distance(target)<interactionDistance) openTarget(id);
      else notice(target.label+" noktasına biraz daha yaklaş.");
    })){
      halt();
      notice("Bu noktaya buradan yürünemiyor. Kıyı yoluna dön.");
    }
  }

  function show(kind,place,title,body,actions="") {
    halt();
    panelKind=kind;
    byId("panel-place").textContent=place;
    byId("panel-title").textContent=title;
    panelBody.innerHTML=body;
    panelActions.innerHTML=actions;
    panelFeedback.textContent="";
    player?.pause(true);
    if(!panel.open) panel.showModal();
    else byId("close-panel").focus();
    refreshTime();
  }

  function tuner() {
    return '<div class="tuner"><label for="frequency">Telsiz frekansı <output id="frequency-value" for="frequency"></output></label>'+
      '<input type="range" id="frequency" min="875" max="965" value="'+state.frequency+
      '" step="1" aria-describedby="frequency-hint"><strong id="frequency-hint"></strong></div>';
  }

  function updateTuner() {
    const input=byId("frequency");
    const route=routes[state.route];
    if(!input||!route) return;
    const current=frequencyText(state.frequency);
    byId("frequency-value").textContent=current;
    input.setAttribute("aria-valuetext",current);
    const delta=Math.abs(state.frequency-route.frequency);
    byId("frequency-hint").textContent=state.phase!==route.phase?"Bu gelgitte bağlantı kapalı":delta===0?"Net sinyal":delta<=5?"Sinyal yakın":"Parazit";
  }

  function openTarget(id) {
    const target=targets[id];
    if(!target || distance(target)>=interactionDistance || !allowed(id)) return;
    notice();
    beep();
    if(id==="robot"){
      show("robot","MEYDAN","Box Bot",
        bot(state.talked?"Kumsalda iki düzenek var. Kullanmak istediğini yakından incele.":"Son yayın yarıda kesildi. Kumsalda iki düzenek var. Birini kurup sinyali iskelede yakalayabilir misin?"),
        btn("meet","Görevi al"));
    }else if(id==="reflect"||id==="relay"){
      const route=routes[id];
      show(id,"KUMSAL",route.name,"<p>"+route.description+"</p>",
        btn("choose",state.route===id?"Bu rotayla devam et":"Düzeneği kur")+
        btn("compare",id==="reflect"?"Yüzer röleye yürü":"Yansıtıcıya yürü",true));
    }else if(id==="pier"){
      const route=routes[state.route];
      const phase=phases[route.phase];
      if(state.captured){
        show("captured","İSKELE","Sinyal kaydedildi",bot("Sinyal net. Fener konsolu tepenin üstünde."),btn("to-light","Fenere yürü"));
      }else{
        show("pier","İSKELE","İskeleyi dinle",
          bot(phase.time+"’te "+phase.water.toLocaleLowerCase("tr")+" bekleniyor. Telsizi "+frequencyText(route.frequency)+" frekansına getir.")+
          '<div class="panel-phases" role="group" aria-label="İskele gelgit saati">'+phaseButtons()+'</div>'+tuner(),
          btn("capture","Sinyali yakala"));
      }
    }else{
      const route=routes[state.route];
      show("lighthouse","FENER","Yayın zamanı",
        bot("Kayıt temiz. Bu konsoldan yayınlayınca bütün koy bizi duyacak.")+
        "<p>"+frequencyText(route.frequency)+" · "+route.name+"</p>",btn("broadcast","Sinyali yayınla"));
    }
  }

  function capture() {
    const route=routes[state.route];
    if(state.phase!==route.phase){
      panelFeedback.textContent="Telsizin bağlantı penceresi "+phases[route.phase].time+"’te açılıyor.";
      beep("error");
      return;
    }
    if(state.frequency!==route.frequency){
      panelFeedback.textContent="Parazit var. Telsizi "+frequencyText(route.frequency)+" değerine ayarla.";
      beep("error");
      return;
    }
    state.captured=true;
    refreshTask();
    beep("success");
    show("captured","İSKELE","Sinyal kaydedildi",bot("Sinyal net. Şimdi kaydı fenerden yayınla."),btn("to-light","Fenere yürü"));
  }

  function restart(other) {
    const prior=state.route;
    state=fresh();
    if(other){
      state.talked=true;
      state.preferredRoute=prior==="reflect"?"relay":"reflect";
    }
    world.lampOn(false);
    world.setTime(0);
    world.route(null);
    refreshTime();
    player.reset();
    player.camera(true);
    panel.close();
    refreshTask();
    if(other) walkTo(state.preferredRoute);
  }

  const commands={
    meet(){
      state.talked=true;
      panel.close();
      refreshTask();
      notice("Kumsalda yansıtıcı ile yüzer röleyi incele.");
    },
    choose(){
      if(state.route!==panelKind){
        state.route=panelKind;
        state.frequency=880;
        state.captured=false;
        state.delivered=false;
      }
      world.route(state.route);
      world.lampOn(state.delivered);
      panel.close();
      refreshTask();
      notice(routes[state.route].success);
      beep();
    },
    compare(){
      const other=panelKind==="reflect"?"relay":"reflect";
      panel.close();
      walkTo(other);
    },
    capture,
    "to-light"(){
      panel.close();
      walkTo("lighthouse");
    },
    broadcast(){
      state.delivered=true;
      world.lampOn(true);
      refreshTask();
      beep("success");
      const route=routes[state.route];
      show("done","FENER","Fener yanıyor",
        bot("Sinyal ulaştı. Ferah Koy bizi duyuyor!")+
        "<p>"+route.name+" ile "+phases[route.phase].time+" yayınını "+frequencyText(route.frequency)+" üzerinden tamamladın.</p>",
        btn("other","Diğer rotayı dene")+btn("restart","Vardiyayı baştan başlat",true));
    },
    other(){restart(true);},
    restart(){restart(false);}
  };

  for(const target of Object.values(targets)){
    const pin=document.createElement("button");
    pin.type="button";
    pin.className="pin3d";
    pin.textContent=target.label;
    pin.addEventListener("click",()=>walkTo(target.id));
    pins.append(pin);
    pinElements.set(target.id,pin);
  }

  phasesBar.innerHTML=phaseButtons();
  document.addEventListener("click",event=>{
    const phase=event.target.closest("button[data-phase]");
    if(phase) changePhase(Number(phase.dataset.phase));
  });
  panel.addEventListener("input",event=>{
    if(event.target.id!=="frequency") return;
    state.frequency=Number(event.target.value);
    panelFeedback.textContent="";
    updateTuner();
  });
  panelActions.addEventListener("click",event=>{
    const node=event.target.closest("button[data-command]");
    if(node) commands[node.dataset.command]?.();
  });
  panel.addEventListener("close",()=>{
    if(panel.open) return;
    player?.pause(false);
    if(walkingTo) world.canvas.focus({preventScroll:true});
  });
  byId("close-panel").addEventListener("click",()=>panel.close());
  byId("interact").addEventListener("click",()=>nearby&&openTarget(nearby.id));
  byId("walk-target").addEventListener("click",()=>{
    if(walkingTo) halt();
    else walkTo(task().id);
  });
  const overview=byId("overview");
  overview.addEventListener("click",()=>player?.camera(overview.getAttribute("aria-pressed")!=="true"));
  byId("help").addEventListener("click",()=>show("help","FERAH KOY","Kontroller",
    "<ul><li><strong>WASD / ok tuşları</strong> ile yürü. Telefonda yön düğmelerini kullan.</li>"+
    "<li>Fareyle veya parmağınla sürükleyerek kamerayı çevir. Zemine dokunarak o noktaya yürüyebilirsin.</li>"+
    "<li>Bir nesneye yaklaştığında <strong>E</strong>’ye veya <strong>İncele</strong> düğmesine bas. Nesneye ya da etiketine tıklarsan karakter yanına yürür.</li>"+
    "<li>Gelgit saatini seçtiğinde su seviyesi ve ışık değişir.</li></ul>"));
  byId("premises").addEventListener("click",()=>show("premises","IMA LAB","İki tasarım premisi",
    "<h3>04 · Temporality / Zamansallık</h3><p>Gelgit, iskelede sinyali hangi saatte alabileceğini belirler.</p>"+
    "<h3>05 · Possibility / Olasılık</h3><p>Yansıtıcı ve röle aynı hedefe farklı su seviyelerinde ve farklı frekanslarda ulaşır.</p>"));
  const soundButton=byId("sound");
  const soundIcon=byId("sound-icon");
  soundIcon.innerHTML=icon("mute");
  soundButton.addEventListener("click",()=>{
    sound=!sound;
    soundButton.setAttribute("aria-pressed",String(sound));
    byId("sound-label").textContent=sound?"Ses açık":"Ses kapalı";
    soundIcon.innerHTML=icon(sound?"sound":"mute");
    beep();
  });

  if(player){
    player.setHooks({
      frame,
      camera(active){
        overview.setAttribute("aria-pressed",String(active));
        byId("cover").classList.toggle("compact",!active);
      },
      interrupted(){halt();notice("Yol kesildi. Nesneye tekrar tıkla.");},
      manual(){if(walkingTo) halt();},
      pick:walkTo,
      use(){if(nearby) openTarget(nearby.id);else notice("Etkileşim için bir nesneye yaklaş.");}
    });
  }else{
    byId("webgl-error").hidden=false;
    overview.disabled=true;
  }
  refreshTime();
  refreshTask();
})();
