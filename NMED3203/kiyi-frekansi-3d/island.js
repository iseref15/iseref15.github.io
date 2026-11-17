(() => {
  if (!window.THREE) return;
  const T = window.THREE;
  const { island, style, square, beach, pier, robot } = window.ISLAND_ASSETS;
  const canvas = document.getElementById("world");
  const scene = new T.Scene();
  const coast = island.coast;
  const bridge = [[3.6, .58], [3.12, 3.25], [3, 4.8]];
  const beachAt = [island.places[beach.place].at[0], 3.26];
  const squareAt = island.places[square.place].at;
  const pierAt = island.places[pier.place].at;
  const lighthouseAt = island.places.hub.at;
  const start = [-10.8, 4.45];
  const road = island.paths[0].pts;
  const scenery = new T.Group();
  const obstructions = [];
  const visuals = {};
  const recipeMotion = [];
  let waterHeight = .02;
  let phase = 0;
  let powered = false;
  let selectedRoute = null;

  const colors = {
    paper: 0xe3cfaa, ink: 0x2c4140, hot: 0xb86b4d, cool: 0x537e83, warm: 0xd3a068,
    green: 0x557567, pink: 0xbd927c, wood: 0x85674f, mid: 0x93947c,
    shadow: 0x364746, gold: 0xdcb576, night: 0x1c3036
  };
  const palette = new Map();
  function material(name, emissive = 0) {
    const color = colors[name] ?? name ?? colors.paper;
    const key = color + ":" + emissive;
    if (!palette.has(key)) palette.set(key, new T.MeshStandardMaterial({
      color, roughness: .83, metalness: 0, emissive: emissive ? color : 0, emissiveIntensity: emissive,
      flatShading: true
    }));
    return palette.get(key);
  }

  function mesh(parent, geometry, mat, x=0, y=0, z=0) {
    const item = new T.Mesh(geometry, mat);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  const box = (group, w, h, d, mat, x, y, z) =>
    mesh(group, new T.BoxGeometry(w, h, d), mat, x, y, z);
  const cyl = (group, r1, r2, h, segments, mat, x, y, z) =>
    mesh(group, new T.CylinderGeometry(r1, r2, h, segments), mat, x, y, z);
  const gem = (group, radius, mat, x, y, z) =>
    mesh(group, new T.IcosahedronGeometry(radius, 0), mat, x, y, z);

  function group(parent, x=0, y=0, z=0) {
    const object = new T.Group();
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  function distanceToSegment(x, z, [ax, az], [bx, bz]) {
    const dx = bx - ax;
    const dz = bz - az;
    const t = T.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  }

  function onLand(x, z) {
    let inside = false;
    for (let i = 0, j = coast.length - 1; i < coast.length; j = i++) {
      const [x1, z1] = coast[i];
      const [x2, z2] = coast[j];
      if ((z1 > z) !== (z2 > z) && x < (x2 - x1) * (z - z1) / (z2 - z1) + x1) inside = !inside;
    }
    return inside;
  }

  function edgeDistance(x,z) {
    let closest = Infinity;
    for (let i = 0; i < coast.length; i++) {
      closest = Math.min(closest, distanceToSegment(x,z,coast[i],coast[(i+1)%coast.length]));
    }
    return closest;
  }

  function height(x,z) {
    let y = 0;
    for (const hill of island.hills) {
      const d = Math.hypot(x - hill.at[0], z - hill.at[1]) / hill.r;
      y += hill.h * .85 * Math.exp(-d * d * 2.4);
    }
    const roadDistance = Math.min(...road.slice(1).map((point, i) => distanceToSegment(x,z,road[i],point)));
    return .17 + T.MathUtils.smoothstep(edgeDistance(x,z), 0, 1.7) * (y * (roadDistance < 1.1 ? .79 : 1) + .20);
  }

  const sandFloor = .36;
  const dockFloor = .65;
  function localDockPoint(x,z) {
    const a = island.places[pier.place].rot;
    const dx = x - pierAt[0], dz = z - pierAt[1];
    return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)];
  }

  function floor(x,z) {
    const [px,pz] = localDockPoint(x,z);
    if (bridge.slice(1).some((point, i) => distanceToSegment(x,z,bridge[i],point) < .66) ||
        (Math.abs(px) < .58 && pz > -.8 && pz < 2.1) ||
        (Math.abs(px) < 2.16 && pz > -3.02 && pz < -.1)) return dockFloor;
    if (Math.hypot(x - beachAt[0], z - beachAt[1]) < 2.15) return Math.max(sandFloor, onLand(x,z) ? height(x,z) : sandFloor);
    if (onLand(x,z)) return height(x,z);
    return null;
  }

  function walkable(x,z) {
    return floor(x,z) !== null && !obstructions.some(([a,b,r]) => (x-a)**2 + (z-b)**2 < r*r);
  }

  function terrain() {
    const silhouette = coast.map(([x,z]) => new T.Vector2(x,z));
    const triangles = T.ShapeUtils.triangulateShape(silhouette, []);
    const positions = [], shades = [];
    const grass = new T.Color(0x7f9b78), rock = new T.Color(0xaaa185), sandy = new T.Color(0xd8b78c);
    const shade = new T.Color();
    const put = (x,z, darker=0) => {
      const y = height(x,z);
      const dryBeach = Math.max(0, 1 - Math.hypot(x - beachAt[0], z - beachAt[1]) / 3.2);
      const shore = (1 - T.MathUtils.smoothstep(edgeDistance(x,z),0,1.35))*.62;
      shade.copy(grass).lerp(rock, Math.max(0,y-.62)*.30).lerp(sandy, Math.max(shore,dryBeach));
      shade.multiplyScalar(.94 + .06 * Math.sin(x * 5.34 + z * 3.72) - darker);
      positions.push(x,y,z);
      shades.push(shade.r,shade.g,shade.b);
    };
    function triangle(a,b,c,depth) {
      if (depth === 0) {
        const cross = (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x);
        const ordered = cross < 0 ? [a,b,c] : [a,c,b];
        for (const p of ordered) put(p.x,p.y);
        return;
      }
      const ab = a.clone().lerp(b,.5), bc = b.clone().lerp(c,.5), ca = c.clone().lerp(a,.5);
      triangle(a,ab,ca,depth-1); triangle(ab,b,bc,depth-1);
      triangle(ca,bc,c,depth-1); triangle(ab,bc,ca,depth-1);
    }
    for (const [a,b,c] of triangles) triangle(silhouette[a],silhouette[b],silhouette[c],4);
    const land = new T.BufferGeometry();
    land.setAttribute("position", new T.Float32BufferAttribute(positions,3));
    land.setAttribute("color", new T.Float32BufferAttribute(shades,3));
    land.computeVertexNormals();
    const surface=mesh(scene,land,new T.MeshStandardMaterial({ vertexColors:true, flatShading:true, roughness:1 }));

    const sidePositions = [];
    for (const [i,[ax,az]] of coast.entries()) {
      const [bx,bz] = coast[(i+1)%coast.length];
      sidePositions.push(ax,.171,az,bx,.171,bz,ax,-.62,az, bx,.171,bz,bx,-.62,bz,ax,-.62,az);
    }
    const cliff = new T.BufferGeometry();
    cliff.setAttribute("position",new T.Float32BufferAttribute(sidePositions,3));
    cliff.computeVertexNormals();
    mesh(scene,cliff,new T.MeshStandardMaterial({color:0x857b63,side:T.DoubleSide,roughness:1}));
    return surface;
  }

  function stripPath(points, width, mat) {
    const p = [];
    for (let i=1;i<points.length;i++) {
      const [ax,az]=points[i-1], [bx,bz]=points[i];
      const length=Math.hypot(bx-ax,bz-az);
      const steps=Math.ceil(length/.30);
      const nx=-(bz-az)/length*width*.5, nz=(bx-ax)/length*width*.5;
      const edges = Array.from({length: steps+1}, (_,k) => {
        const t=k/steps, x=T.MathUtils.lerp(ax,bx,t), z=T.MathUtils.lerp(az,bz,t);
        return [[x+nx,height(x+nx,z+nz)+.025,z+nz],[x-nx,height(x-nx,z-nz)+.025,z-nz]];
      });
      for(let k=1;k<edges.length;k++) p.push(...edges[k-1][0],...edges[k][0],...edges[k-1][1],...edges[k-1][1],...edges[k][0],...edges[k][1]);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p,3));
    g.computeVertexNormals();
    const item=mesh(scenery,g,mat);
    item.castShadow=false;
  }

  const waterUniforms = {
    clock:{value:0}, nearColor:{value:new T.Color()}, farColor:{value:new T.Color()}, glimmer:{value:new T.Color()}
  };
  const skyUniforms = {
    horizon:{value:new T.Color()}, topColor:{value:new T.Color()}, sun:{value:new T.Color()},
    sunPosition:{value:new T.Vector3(.24,.12,-.96).normalize()}, stars:{value:0}
  };

  function makeSkies() {
    const sky = new T.ShaderMaterial({
      side:T.BackSide, depthWrite:false, uniforms:skyUniforms,
      vertexShader:`varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`
        varying vec3 direction;
        uniform vec3 horizon, topColor, sun, sunPosition;
        uniform float stars;
        float hash(vec2 p){return fract(sin(dot(p,vec2(63.87,119.71)))*43758.5453);}
        void main(){
          vec3 d=normalize(direction); float h=max(0.,d.y); float angle=distance(d,sunPosition);
          vec3 c=mix(horizon,topColor,smoothstep(0.,.68,h));
          c+=sun*exp(-angle*3.8)*.34+sun*(1.-smoothstep(.025,.031,angle))*1.05;
          vec2 spherical=vec2(atan(d.z,d.x),asin(d.y)); vec2 pos=spherical*185.;
          float pixel=1.-smoothstep(.02,.084,distance(fract(pos),vec2(.5)));
          c+=stars*smoothstep(.07,.35,h)*step(.987,hash(floor(pos)))*pixel*.43;
          float cloud=sin(d.x*11.+sin(d.z*9.)*2.1+d.y*36.)*.5+.5;
          c=mix(c,horizon*.75,smoothstep(.84,1.,cloud)*exp(-abs(h-.17)*17.)*.15);
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`
    });
    const skyMesh = mesh(scene,new T.SphereGeometry(190,28,16),sky);
    skyMesh.castShadow = skyMesh.receiveShadow = false;
    const seaMaterial = new T.ShaderMaterial({
      uniforms:waterUniforms,
      vertexShader:`
        varying vec3 worldPoint;
        uniform float clock;
        void main(){
          vec4 p=modelMatrix*vec4(position,1.);
          p.y+=.026*sin(p.x*.76+p.z*.65+clock*.9)+.018*sin(p.z*1.1-clock*.65);
          worldPoint=p.xyz;
          gl_Position=projectionMatrix*viewMatrix*p;
        }`,
      fragmentShader:`
        varying vec3 worldPoint;
        uniform float clock;
        uniform vec3 nearColor,farColor,glimmer;
        void main(){
          vec2 p=worldPoint.xz; float distanceToCamera=length(worldPoint-cameraPosition);
          float wav=sin(p.y*5.8+sin(p.x*1.8+clock*.73)*.86+sin(p.y*.9+clock)*.6-clock*1.3);
          float overlap=sin(p.y*4.5+p.x*2.1-clock*.58+sin(p.x*.7)*2.1);
          float stripe=smoothstep(.88,1.,wav)*smoothstep(-.42,.86,overlap)*(.22+.65*pow(sin(p.x*.68+p.y*.41)*.5+.5,3.));
          float horizonMix=smoothstep(28.,125.,distanceToCamera);
          float gleam=exp(-abs((p.x-cameraPosition.x)+(p.y-cameraPosition.z)*.35)*.12);
          vec3 c=mix(nearColor,farColor,horizonMix)+glimmer*stripe*(1.-horizonMix)*(.2+.47*gleam);
          c+=nearColor*.15*sin(p.x*.36+p.y*.78+clock*.63);
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }`
    });
    const sea = mesh(scene,new T.PlaneGeometry(245,245,65,65),seaMaterial);
    sea.rotation.x = -Math.PI/2;
    sea.castShadow = sea.receiveShadow = false;
    return sea;
  }

  function readPart(parent, part) {
    const node = group(parent,...(part.at || [0,0,0]));
    if (Array.isArray(part.rot)) node.rotation.set(...part.rot);
    if (Array.isArray(part.scale)) node.scale.set(...part.scale);
    if (part.type === "group") {
      for (const child of part.parts) readPart(node,child);
    } else if (part.type === "row") {
      for (let i=0;i<part.count;i++) readPart(group(node, ...part.step.map(n=>n*i)), part.part);
    } else {
      const paint = material(part.paint?.color ?? part.paint?.colors?.[0] ?? "paper");
      const segment = part.seg || 10;
      let shape;
      if (part.type === "box") {
        const [w,h,d]=part.size;
        if (part.paint?.pattern === "planks") {
          const count=Math.ceil(d/.17);
          for(let i=0;i<count;i++) box(node,w,h,d/count-.014,material(i%3 ? "wood" : 0x94765a),0,0,(i+.5)*d/count-d/2);
        } else shape = new T.BoxGeometry(w,h,d);
      } else if (part.type === "cyl") shape = new T.CylinderGeometry(part.rTop ?? part.r, part.rBottom ?? part.r, part.h,segment);
      else if (part.type === "cone") shape = new T.ConeGeometry(part.r,part.h,segment);
      else if (part.type === "sphere") shape = new T.IcosahedronGeometry(part.r,1);
      else if (part.type === "ring") shape = new T.TorusGeometry(part.r || .2,part.tube || .032,6,segment);
      else if (part.type === "lathe") shape = new T.LatheGeometry(part.profile.map(p=>new T.Vector2(...p)),segment);
      if (shape) mesh(node,shape,paint);
    }
    if (part.anim) recipeMotion.push({node, original:node.position.y, rotation:node.rotation.clone(), anim:part.anim});
    return node;
  }

  function place(recipe, at, y, rot) {
    const object=group(scenery,at[0],y,at[1]);
    object.rotation.y=rot;
    for (const part of recipe.parts) if (part.type !== "char") readPart(object,part);
    return object;
  }

  function lamp(x,z,light=false) {
    const node=group(scenery,x,height(x,z),z);
    cyl(node,.042,.058,1.36,7,material("ink"),0,.68,0);
    cyl(node,.135,.095,.21,6,material(0xe6ad6f,1.6),0,1.40,0);
    cyl(node,.035,.18,.11,6,material("ink"),0,1.55,0);
    if(light){
      const point=new T.PointLight(0xffb46b,4.5,5,1.7);
      point.position.y=1.4;
      node.add(point);
    }
  }

  function house(x,z,angle,variant) {
    const root=group(scenery,x,height(x,z),z);
    root.rotation.y=angle;
    const width=1 + variant%3*.17;
    const heightBody=.9 + variant%2*.25;
    box(root,width,heightBody,.9,material([0xb6ad8e,0xccaa86,0x729388,0xb09e7f][variant%4]),0,heightBody/2,0);
    const roof=cyl(root,0,.79+variant%3*.08,.60,4,material([0xa05945,0x586a61,0x8b6f59][variant%3]),0,heightBody+.27,0);
    roof.rotation.y=Math.PI/4;
    roof.scale.z=.97;
    box(root,.22,.51,.02,material("ink"),.23,.25,.464);
    box(root,.21,.25,.036,material(0xe8aa67,.85),-.24,.56,.468);
    box(root,.035,.25,.022,material("ink"),-.24,.56,.49);
    box(root,.21,.035,.023,material("ink"),-.24,.56,.49);
    box(root,.17,.4,.16,material("wood"),-.27,heightBody+.30,-.2);
    obstructions.push([x,z,.54]);
  }

  function tree(x,z,item) {
    const root=group(scenery,x,height(x,z),z);
    const h=item.h;
    const green=material([0x58745d,0x557865,0x6f8865,0x456557][Math.floor((item.rot || 0)*5)%4]);
    cyl(root,.035,.06,h*.62,5,material("wood"),0,h*.31,0);
    if(item.cone){
      cyl(root,0,h*.24,h*.74,6,green,0,h*.64,0);
      cyl(root,0,h*.19,h*.61,6,green,0,h*.91,0);
    }else{
      gem(root,h*.29,green,0,h*.62,0).scale.set(.91,1.42,1);
    }
    if(h>1.5) obstructions.push([x,z,.15]);
  }

  const floating = [];
  function boat(x,z,angle) {
    const hull=group(scenery,x,0,z);
    hull.rotation.y=angle;
    const bottom=gem(hull,.6,material("hot"),0,0,0);
    bottom.scale.set(1,.32,.48);
    box(hull,.68,.06,.34,material("wood"),0,.10,0);
    cyl(hull,.021,.027,.8,6,material("ink"),.02,.5,0);
    const sail=mesh(hull,new T.ConeGeometry(.34,.67,3),material("paper"),.12,.64,0);
    sail.scale.z=.15;
    floating.push(hull);
  }

  function clutter() {
    for (const item of island.items) {
      const [x,z]=item.at;
      if(item.kind==="house") house(x,z,item.rot,item.v);
      else if(item.kind==="tree") tree(x,z,item);
      else if(item.kind==="boat") boat(x,z,item.rot);
      else if(item.kind==="lamp") lamp(x,z,item.v===0);
      else if(item.kind==="rock"){
        const rock=gem(scenery,.24,material(0xaaa28c),x,floor(x,z) ?? .10,z);
        rock.scale.set(1.45,.7,.9);
        rock.rotation.y=item.rot || 0;
      }
    }
    lamp(-9.7,3.65,true);
    lamp(-4.8,2.37,true);
    lamp(3.9,.80,true);
    lamp(10.25,6.48,true);
  }

  function bridgeSegment([x,z],[tx,tz]) {
    const length=Math.hypot(tx-x,tz-z);
    const node=group(scenery,(x+tx)/2,dockFloor-.064,(z+tz)/2);
    node.rotation.y=Math.atan2(tx-x,tz-z);
    const n=Math.ceil(length/.15);
    for(let i=0;i<n;i++) box(node,1.28,.13,length/n-.012,material(i%3 ? "wood" : 0x997a59),0,0,(i+.5)*length/n-length/2);
    for(const side of [-1,1]){
      box(node,.06,.065,length,material("ink"),side*.64,.42,0);
      for(let i=0;i<5;i++) box(node,.09,1.0,.09,material("wood"),side*.62,-.025,(i+.5)*length/5-length/2);
    }
  }

  function radioSet(parent,x,y,z) {
    const root=group(parent,x,y,z);
    box(root,.55,.32,.32,material("ink"),0,.15,0);
    box(root,.42,.21,.029,material(0xa89b77),0,.16,.17);
    box(root,.23,.11,.02,material(0x477c70,.56),-.074,.17,.187);
    cyl(root,.063,.063,.04,9,material("paper"),.124,.17,.19).rotation.x=Math.PI/2;
    cyl(root,.014,.025,.4,6,material("ink"),-.21,.48,-.07).rotation.z=.17;
    gem(root,.035,material(0xe0ae6a,1.2),-.25,.675,-.07);
    return root;
  }

  function robotCharacter(x,z) {
    const root=group(scenery,x,floor(x,z),z);
    const head=robot.parts.head.paint.color;
    const accent=robot.parts.hat.paint.color;
    const body=robot.parts.body.paint.colors[0];
    box(root,.51,.61,.29,material(body),0,.38,0);
    box(root,.49,.055,.295,material(accent),0,.088,0);
    box(root,.43,.38,.32,material(head),0,.925,.015);
    cyl(root,.10,.10,robot.parts.neck.height,8,material("ink"),0,.72,0);
    for(const side of [-1,1]){
      box(root,.15,.055,.023,material("ink"),side*.106,.95,.185);
      cyl(root,.032,.032,.026,9,material("paper"),side*.106,.95,.201).rotation.x=Math.PI/2;
      box(root,.08,.29,.1,material("ink"),side*.32,.43,.06).rotation.z=side*.31;
      const antenna=cyl(root,.011,.013,.21,6,material("ink"),side*.095,1.18,.015);
      antenna.rotation.z=-side*.43;
      gem(root,.041,material(accent,.44),side*.13,1.27,.015);
    }
    box(root,.12,.018,.02,material("ink"),0,.854,.184);
    for(let i=0;i<3;i++) gem(root,.025,material(accent,.45),0,.49-i*.10,.15);
    return root;
  }

  function buildLighthouse(x,z) {
    const root=group(scenery,x,height(x,z),z);
    const red=material(0xaf6149), cream=material(0xe1c6a1);
    cyl(root,.65,.84,.27,10,material("wood"),0,.13,0);
    for(let i=0;i<4;i++){
      cyl(root,.51-i*.05,.565-i*.05,.57,10,i%2===0?cream:red,0,.28+(i+.5)*.57,0);
    }
    const deck=cyl(root,.54,.48,.11,12,material("ink"),0,2.63,0);
    deck.castShadow=false;
    box(root,.18,.38,.024,material("ink"),0,.51,.55);
    box(root,.11,.19,.024,material(0xf6bc74,1),0,1.33,.47);
    cyl(root,.035,.56,.37,10,red,0,3.30,0);
    cyl(root,.045,.04,.22,6,material("ink"),0,3.55,0);
    cyl(root,.30,.30,.45,10,material(0xffc479,2.8),0,2.91,0);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      cyl(root,.025,.025,.48,6,material("ink"),Math.cos(angle)*.34,2.91,Math.sin(angle)*.34);
    }
    const bulb=new T.PointLight(0xffbd70,6,12,1.8);
    bulb.position.y=3.05;
    root.add(bulb);
    const beamGroup=group(root,0,2.91,0);
    const radius=style.beacon.width*8;
    const cone=mesh(beamGroup,new T.ConeGeometry(radius,13,24,1,true),new T.ShaderMaterial({
      transparent:true, depthWrite:false, side:T.DoubleSide,
      uniforms:{glow:{value:.12}},
      vertexShader:"varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:"varying vec2 v;uniform float glow;void main(){gl_FragColor=vec4(.98,.76,.43,glow*pow(v.y,.85));}"
    }),0,-.42,-6.45);
    cone.rotation.x=Math.PI/2-.064;
    cone.castShadow=cone.receiveShadow=false;
    return { beamGroup, cone, bulb };
  }

  const surface=terrain();
  const sea=makeSkies();
  const roadMat=new T.MeshStandardMaterial({color:0xbaad8c,roughness:1,side:T.DoubleSide});
  for(const path of island.paths) stripPath(path.pts,path.kind==="road"?.63:.39,roadMat);
  scene.add(scenery);
  clutter();
  place(square,squareAt,height(...squareAt),island.places[square.place].rot);
  place(beach,beachAt,sandFloor-.08,island.places[beach.place].rot);
  place(pier,pierAt,dockFloor-.43,island.places[pier.place].rot);
  for(let i=1;i<bridge.length;i++) bridgeSegment(bridge[i-1],bridge[i]);
  const robotAt=[-9.25,3.70];
  const robotModel=robotCharacter(...robotAt);
  robotModel.rotation.y=-.35;

  const reflectAt=[-5.04,3.77];
  const relayAt=[-3.50,3.31];
  const reflector=group(scenery,reflectAt[0],floor(...reflectAt),reflectAt[1]);
  cyl(reflector,.21,.28,.11,8,material("wood"),0,.055,0);
  cyl(reflector,.04,.06,.59,7,material("ink"),0,.33,0);
  const plate=cyl(reflector,.32,.18,.12,14,material(0xdfc28d),0,.67,0);
  plate.rotation.x=Math.PI/2-.36;
  const center=gem(reflector,.075,material(0xf4bb6a,.8),0,.71,.13);
  box(reflector,.035,.034,.25,material("ink"),0,.70,.14);
  const relay=group(scenery,relayAt[0],floor(...relayAt),relayAt[1]);
  cyl(relay,.20,.31,.19,9,material(0xc37b51),0,.11,0);
  cyl(relay,.05,.065,.50,7,material("ink"),0,.42,0);
  cyl(relay,.16,.13,.17,8,material("paper"),0,.57,0);
  const relayTop=gem(relay,.089,material(0x83d4b4,.8),0,.73,0);

  const pierRadio=[2.94,4.24];
  const radioShelf=group(scenery,pierRadio[0],dockFloor,pierRadio[1]);
  box(radioShelf,.61,.69,.41,material("wood"),0,.345,0);
  box(radioShelf,.69,.07,.47,material("ink"),0,.7,0);
  const pierRadioModel=radioSet(radioShelf,0,.75,0);
  pierRadioModel.rotation.y=.25;
  const { beamGroup, cone, bulb }=buildLighthouse(...lighthouseAt);
  const beaconAt=[11.24,7.34];
  const dockConsole=group(scenery,beaconAt[0],height(...beaconAt),beaconAt[1]);
  box(dockConsole,.63,.73,.41,material("wood"),0,.365,0);
  radioSet(dockConsole,0,.78,0);

  const targets=[
    { id:"robot", label:robot.name, at:robotAt, stand:[-9.9,4.14], y:1.67 },
    { id:"reflect", label:"Yansıtıcı", at:reflectAt, stand:[-5.63,3.33], y:1.14 },
    { id:"relay", label:"Yüzer röle", at:relayAt, stand:[-3.86,2.51], y:1.13 },
    { id:"pier", label:"İskele telsizi", at:pierRadio, stand:[3.13,3.57], y:1.52 },
    { id:"lighthouse", label:"Fener konsolu", at:beaconAt, stand:[10.68,7.01], y:1.58 }
  ];
  for(const target of targets) visuals[target.id]=new T.Vector3(target.at[0],(floor(...target.at) ?? .65)+target.y,target.at[1]);

  const ambient=new T.HemisphereLight(0xffe8cd,0x667f81,2.0);
  const key=new T.DirectionalLight(0xffcd9d,2.35);
  key.position.set(-13,23,-14);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-18,right:18,top:15,bottom:-15,near:.6,far:70});
  key.shadow.bias=-.00042;
  key.shadow.normalBias=.027;
  const fill=new T.DirectionalLight(0x9ed2d5,.65);
  fill.position.set(11,8,15);
  scene.add(ambient,key,fill);
  const looks=[
    { horizon:0xc99b7c,sky:0x446b7f,sun:0xffb363,water:0x416975,far:0x9f8d83,glimmer:0xf0c79c,y:.06,light:1.95 },
    { horizon:0xaa8076,sky:0x324c6d,sun:0xffa76f,water:0x476f78,far:0x837b87,glimmer:0xeac3a2,y:-.16,light:1.5 },
    { horizon:0x456c82,sky:0x152439,sun:0xaed3f6,water:0x284956,far:0x4c6782,glimmer:0x92c1da,y:.25,light:.82 }
  ];
  scene.fog=new T.FogExp2(0x738b89,.018);
  function setTime(index) {
    phase=index;
    const next=looks[index];
    skyUniforms.horizon.value.setHex(next.horizon);
    skyUniforms.topColor.value.setHex(next.sky);
    skyUniforms.sun.value.setHex(next.sun);
    skyUniforms.sunPosition.value.set(.24,index===2?.31:.12,-.96).normalize();
    skyUniforms.stars.value=index===2 ? 1 : 0;
    waterUniforms.nearColor.value.setHex(next.water);
    waterUniforms.farColor.value.setHex(next.far);
    waterUniforms.glimmer.value.setHex(next.glimmer);
    scene.fog.color.setHex(next.far);
    key.color.setHex(index===2?0xa8c7f1:0xffd1a3);
    key.intensity=next.light;
    ambient.intensity=index===2?1.25:1.94;
    bulb.intensity=index===2?11:6;
  }

  function update(dt,t,reduced) {
    const time=reduced ? 1.4 : t;
    waterUniforms.clock.value=time;
    waterHeight=T.MathUtils.lerp(waterHeight, looks[phase].y, 1-Math.exp(-dt*4));
    sea.position.y=waterHeight;
    beamGroup.rotation.y=reduced ? -.8 : time*.28;
    cone.material.uniforms.glow.value=powered?.27:phase===2?.19:.095;
    for(const [i,hull] of floating.entries()){
      hull.position.y=waterHeight+.10+Math.sin(time*1.2+i)*.05;
      hull.rotation.z=Math.sin(time*1.05+i)*.075;
    }
    const flicker=(.5+Math.sin(time*4)*.5);
    center.material.emissiveIntensity=selectedRoute==="reflect" ? .8+flicker*.78 : .22;
    relayTop.material.emissiveIntensity=selectedRoute==="relay" ? .8+flicker*.78 : .22;
    robotModel.rotation.z = robot.motion.personality==="jittery" ? Math.sin(time*2.8)*.038 : 0;
    for(const {node,original,rotation,anim} of recipeMotion){
      if(anim.bob) node.position.y=original+Math.sin(time*(anim.speed || 1))*anim.bob;
      if(anim.swing) node.rotation[anim.axis]=rotation[anim.axis]+Math.sin(time*(anim.speed || 1))*anim.swing;
    }
  }

  setTime(0);
  window.IMA_WORLD={T,scene,canvas,surface,targets,visuals,start,walkable,floor,setTime,update,
    lampOn(value){powered=value;}, route(value){selectedRoute=value;}, model:{box,cyl,gem,group,material}};
})();
