import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SierraSplatLayer} from './splat-loader.js';
import {loadWorldAsset,tuneHumanSkin} from './world-assets.js';
import {FAUNA} from './rewards.js';
import {HUMAN_CHARACTERS as people, approvedHumanAsset, probeHumanAsset} from './human-characters.js';
import {appendAssetCredit} from './asset-credits.js';

const base=import.meta.env?.BASE_URL||'/jugar/';
// Lugares reales reconstruidos con Gaussian splatting desde vuelos de drone del documental.
const SCENES={landscape:{label:'La sierra en 3D',file:'sierra-observatory.json',title:'La huella desde el cielo',note:'El caserío, el corral y el monte del vuelo original.'},escuela:{label:'La escuela real',file:'escuela.json',title:'La escuela desde el drone',note:'La escuela, reconstruida desde un vuelo real.'},corral:{label:'El corral real',file:'corral.json',title:'El corral de pirca desde el drone',note:'El corral de piedra y lo que lo rodea.'},rancho:{label:'Un rancho real',file:'rancho.json',title:'Un rancho de la sierra',note:'Un rancho visto desde el drone.'}};
// Fauna modelada a tamaño real: etiqueta de la pestaña, tamaño de encuadre y altura si va en vuelo.
const FAUNA_VIEW={cabra:{label:'Las cabras',size:1},condor:{label:'El cóndor',size:1.7,lift:.85},zorro:{label:'El zorro',size:.7},puma:{label:'El puma',size:1.25},pavo:{label:'Los pavos',size:.95},gallina:{label:'Las gallinas',size:.5},lagarto:{label:'El lagarto',size:.65},culebra:{label:'La culebra',size:.8}};

/** A bounded, optional archive viewer. It never changes the saved adventure. */
export function openArchive(container,{onClose,quality='auto',reducedMotion=false}={}){
  let disposed=false,release=()=>{},generation=0;
  const lifetime=new AbortController(),unavailableHumans=new Set();
  const manifests=fetch(`${base}models/manifest.json`,{signal:lifetime.signal}).then(r=>r.ok?r.json():{}).catch(()=>({}));
  container.innerHTML=`<section class="archive"><header class="archive-header"><div><span>ARCHIVO VIVO · SIERRA</span><h2>Un lugar. Su gente.</h2></div><button class="archive-close" aria-label="Cerrar archivo">Volver al viaje <span aria-hidden="true">×</span></button></header><nav class="archive-tabs" aria-label="Explorar el archivo">${[...Object.entries(SCENES).map(([id,scene])=>[id,scene.label]),...Object.entries(people).map(([id,p])=>[id,p.label]),['mule','La mula'],['goat','Las cabritas'],...Object.entries(FAUNA_VIEW).map(([id,view])=>[id,view.label])].map(([id,label])=>`<button data-archive="${id}" aria-pressed="false">${label}</button>`).join('')}</nav><div class="archive-body"></div></section>`;
  // La fauna nueva aparece sólo si su modelo está publicado; entonces reemplaza a la cabrita anterior.
  manifests.then(m=>container.querySelectorAll('[data-archive]').forEach(b=>{const id=b.dataset.archive;if((FAUNA_VIEW[id]&&!m[id])||(id==='goat'&&m.cabra))b.remove();}));
  // Una reconstrucción aparece sólo si su archivo está publicado.
  for(const [id,scene] of Object.entries(SCENES))if(id!=='landscape')fetch(`${base}scenes/${scene.file}`,{method:'HEAD',signal:lifetime.signal}).then(r=>{if(!r.ok||/text\/html/.test(r.headers.get('content-type')||''))container.querySelector(`[data-archive="${id}"]`)?.remove();}).catch(()=>container.querySelector(`[data-archive="${id}"]`)?.remove());
  const body=container.querySelector('.archive-body');
  const close=()=>{destroy();onClose?.();};const closeButton=container.querySelector('.archive-close');closeButton.onclick=close;
  // The module may arrive after the host overlay's first animation frame.
  closeButton.focus({preventScroll:true});
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};container.addEventListener('keydown',escape);
  async function select(id,view='photo'){
    if(disposed)return;
    const token=++generation;release();release=()=>{};
    container.querySelectorAll('[data-archive]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.archive===id)));
    const person=people[id],place=SCENES[id];let humanAsset;
    if(person&&view!=='model'){
      const p=person,check=new AbortController();let video;
      body.innerHTML=`<div class="archive-portrait"><div class="archive-person-media"><img src="${base}images/${p.image}.webp" alt="${p.name}, fotografía original del archivo SIERRA"/></div><div class="archive-caption"><span>${p.role}</span><h3>${p.name}</h3><p>${p.text}</p><small>Fotografía original del archivo documental SIERRA.</small><div class="archive-person-actions">${p.video?'<button class="archive-motion" data-documentary>Ver plano documental</button>':''}<button class="archive-motion" data-human-model hidden>Explorar personaje en 3D</button></div></div></div>`;
      const media=body.querySelector('.archive-person-media'),documentary=body.querySelector('[data-documentary]'),modelButton=body.querySelector('[data-human-model]');
      const stopVideo=()=>{if(video){video.pause();video.removeAttribute('src');video.load();video=null;}};
      if(documentary)documentary.onclick=()=>{
        if(video){stopVideo();media.innerHTML=`<img src="${base}images/${p.image}.webp" alt="${p.name}, fotografía original del archivo SIERRA"/>`;documentary.textContent='Ver plano documental';return;}
        media.innerHTML=`<video playsinline muted loop controls preload="metadata" poster="${base}images/${p.image}.webp" aria-label="${p.name}, plano original del documental" src="${base}video/${p.video}.mp4"></video>`;
        video=media.querySelector('video');video.play().catch(()=>{});documentary.textContent='Ver fotografía original';
      };
      modelButton.onclick=()=>select(id,'model');
      release=()=>{check.abort();stopVideo();};
      if(!unavailableHumans.has(id)){
        const entry=approvedHumanAsset(await manifests,id,base);
        if(disposed||token!==generation)return;
        const available=await probeHumanAsset(entry,{signal:check.signal});
        if(!disposed&&token===generation)modelButton.hidden=!available;
      }
      return;
    }
    if(person){
      humanAsset=approvedHumanAsset(await manifests,id,base);
      if(disposed||token!==generation)return;
      if(!humanAsset||unavailableHumans.has(id)){select(id);return;}
    }
    body.innerHTML=`<div class="archive-stage"><div class="archive-canvas"></div><div class="archive-loader" role="status">Preparando ${place?'la sierra real':'el encuentro'}…</div><div class="archive-stage-label"><span>${place?'RECONSTRUCCIÓN DEL ARCHIVO':person?'PERSONAJE DE LA AVENTURA':'MODELO ANIMADO EN BLENDER'}</span><h3>${place?place.title:person?person.name:id==='mule'?'Nuestra compañera de camino':FAUNA[id]?.name||'Habitantes de la sierra'}</h3></div></div><footer class="archive-controls"><p>${place?place.note:'Arrastrá para mirar alrededor. Acercá o alejá con dos dedos o la rueda.'}</p><div class="archive-control-row"></div><small>${place?'Gaussian splatting · reconstrucción de varias vistas; exploración limitada al área capturada.':person?'Recreación 3D basada en fotografías. La imagen original conserva la referencia documental.':'Modelo artístico para la aventura; no es un escaneo del animal real.'}</small></footer>`;
    const mount=body.querySelector('.archive-canvas'),status=body.querySelector('.archive-loader'),controlsEl=body.querySelector('.archive-control-row');
    let renderer,layer,actor,controls,frame,observer,floor,sourceFov=48,sourceAspect=16/9,playRequested=false,cleaned=false,refitHumanFrame=()=>{};const abort=new AbortController();
    const scene=new THREE.Scene();scene.background=new THREE.Color('#18231e');
    const camera=new THREE.PerspectiveCamera(48,1,.01,1500);
    const cleanup=()=>{
      if(cleaned)return;cleaned=true;
      abort.abort();cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();actor?.dispose();layer?.destroy();
      floor?.geometry.dispose();floor?.material.dispose();floor?.removeFromParent();scene.clear();
      // Each tab owns this renderer; release its context as well as its caches.
      renderer?.dispose();if(renderer&&!renderer.getContext().isContextLost())renderer.forceContextLoss();renderer?.domElement.remove();
    };release=cleanup;
    try{
      renderer=new THREE.WebGLRenderer({antialias:!place&&quality!=='low',powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='low'?1:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
      if(!place){renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
      mount.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-label',place?'Paisaje real reconstruido con Gaussian splatting':person?`Adaptación tridimensional de ${person.name}`:'Modelo tridimensional del animal');
      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(Math.tan(sourceFov*Math.PI/360)*Math.min(1,sourceAspect/camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();refitHumanFrame();};observer=new ResizeObserver(resize);observer.observe(mount);resize();
      if(place){
        const manifest=await fetch(`${base}scenes/${place.file}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('asset');return r.json();});
        if(disposed||token!==generation)return;
        layer=new SierraSplatLayer({scene,renderer,quality,onStatus:s=>{if(s.status==='loading')status.textContent=s.total?`Abriendo el paisaje · ${Math.round(s.loaded/s.total*100)||0}%`:'Abriendo el paisaje…';},onFallback:()=>{if(token===generation){status.hidden=false;status.textContent='Esta vista necesita más capacidad gráfica. Podés seguir jugando y ver los retratos del archivo.';}}});
        const asset=manifest.asset||manifest;
        const result=await layer.load(asset,{signal:abort.signal});
        if(result.status!=='ready'){cleanup();return;}
        sourceFov=manifest.camera?.fov||48;sourceAspect=manifest.camera?.aspect||16/9;resize();
        const poses=manifest.camera?.frames||manifest.views||manifest.cameras||[];
        const applyView=value=>{
          if(!poses.length)return;
          const cursor=value*(poses.length-1),index=Math.floor(cursor),a=poses[index],b=poses[Math.min(index+1,poses.length-1)],t=cursor-index;
          camera.position.fromArray(a.position).lerp(new THREE.Vector3().fromArray(b.position),t);
          if(a.quaternion){camera.quaternion.fromArray(a.quaternion).slerp(new THREE.Quaternion().fromArray(b.quaternion),t);}
          else {camera.up.fromArray(a.up||[0,1,0]);camera.lookAt(new THREE.Vector3().fromArray(a.target).lerp(new THREE.Vector3().fromArray(b.target),t));}
          camera.fov=2*Math.atan(Math.tan(sourceFov*Math.PI/360)*Math.min(1,sourceAspect/camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();
        };
        controlsEl.innerHTML='<button data-view-step="-.12" aria-label="Mirar desde la izquierda">←</button><label>Recorrer el vuelo <input type="range" min="0" max="100" value="50" aria-label="Punto de vista del paisaje"/></label><button data-view-step=".12" aria-label="Mirar desde la derecha">→</button>';
        const slider=controlsEl.querySelector('input');slider.oninput=()=>applyView(Number(slider.value)/100);controlsEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{slider.value=String(THREE.MathUtils.clamp(Number(slider.value)+Number(b.dataset.viewStep)*100,0,100));slider.oninput();});
        let drag;renderer.domElement.onpointerdown=e=>{drag={x:e.clientX,value:Number(slider.value)};renderer.domElement.setPointerCapture(e.pointerId);};renderer.domElement.onpointermove=e=>{if(!drag)return;slider.value=String(THREE.MathUtils.clamp(drag.value+(e.clientX-drag.x)/mount.clientWidth*100,0,100));slider.oninput();};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>drag=null;
        applyView(.5);
      }else{
        const entry=humanAsset||(await manifests)[id];if(!entry||entry.available===false)throw Error('model');
        if(disposed||token!==generation)return;
        scene.add(new THREE.HemisphereLight('#f1ede0','#70614b',1.7));const sun=new THREE.DirectionalLight('#ffe8c4',2.5);sun.position.set(-4,6,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-3;sun.shadow.camera.near=.1;sun.shadow.camera.far=18;sun.shadow.normalBias=.015;scene.add(sun);
        const fauna=FAUNA_VIEW[id],h=humanAsset?.heightMeters||(id==='mule'?1.85:fauna?.size||.8);
        // La fauna nueva está modelada a tamaño real: no se reescala, sólo se encuadra.
        actor=await loadWorldAsset({...entry,id,url:`${base}models/${entry.file}`,heightMeters:fauna?undefined:h},{scene,renderer,signal:abort.signal});
        if(fauna?.lift)actor.root.position.y=fauna.lift;
        if(disposed||token!==generation){actor.dispose();return;}
        if(person)tuneHumanSkin(actor.model);
        appendAssetCredit(body.querySelector('.archive-controls'),entry);
        actor.play('idle');if(reducedMotion)actor.update(.001);
        camera.position.set(h*(person?.35:1.9),h*(person?.8:1.1),h*(person?2.4:2.6));controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,h*.5,0);controls.enablePan=false;controls.minDistance=h*1.2;controls.maxDistance=h*5;controls.maxPolarAngle=Math.PI*.51;controls.enableDamping=true;controls.update();
        if(person){
          let faceView=false;
          const bodyPosition=camera.position.clone(),bodyTarget=controls.target.clone();
          const framing=document.createElement('button');framing.type='button';framing.dataset.humanFraming='body';
          framing.textContent='Ver rostro';framing.setAttribute('aria-label',`Ver rostro de ${person.name}`);
          refitHumanFrame=()=>{
            // Flush orbit inertia before changing framing; no tween or animation reset.
            const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
            if(faceView){
              // Reserve room for hair/hat, chin and neck even in narrow mobile stages.
              const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5);
              const distance=Math.max(h*.6,h*.18/tanY,h*.20/(tanY*Math.max(camera.aspect,.1)))*1.08;
              controls.target.set(0,h*.89,0);camera.position.set(0,h*.91,distance);
              controls.minDistance=h*.25;controls.maxDistance=Math.max(h*2,distance*2);
            }else{
              camera.position.copy(bodyPosition);controls.target.copy(bodyTarget);
              controls.minDistance=h*1.2;controls.maxDistance=h*5;
            }
            controls.update();controls.enableDamping=damping;
          };
          framing.onclick=()=>{
            faceView=!faceView;refitHumanFrame();framing.dataset.humanFraming=faceView?'face':'body';
            framing.textContent=faceView?'Ver cuerpo completo':'Ver rostro';
            framing.setAttribute('aria-label',`${framing.textContent} de ${person.name}`);
            renderer.domElement.setAttribute('aria-label',`${faceView?'Rostro':'Cuerpo completo'} de la adaptación tridimensional de ${person.name}`);
          };
          controlsEl.appendChild(framing);
        }
        floor=new THREE.Mesh(new THREE.CircleGeometry(h*3,64),new THREE.MeshStandardMaterial({color:'#354236',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
        const clips=actor.getState().animations;
        for(const [alias,label] of [['idle','Observar'],...(person?[['talk','Ver el gesto']]:[]),...(id==='ruly'?[['ride','Acompañar a lomo de mula']]:[['walk','Ver el paso'],['graze','Pastar'],['peck','Picotear'],['flap','Aletear'],['slither','Reptar']])]){
          if(!clips.includes(entry.animations?.[alias]||alias))continue;
          const button=document.createElement('button');button.dataset.animation=alias;button.textContent=label;button.setAttribute('aria-pressed',String(alias==='idle'));controlsEl.appendChild(button);
        }
        controlsEl.querySelectorAll('[data-animation]').forEach(b=>b.onclick=()=>{
          const animation=b.dataset.animation;
          if(!actor.play(animation,{fade:reducedMotion?0:.2}))return;
          // Reduced motion suppresses autoplay, not a child's explicit playback request.
          playRequested=animation!=='idle';
          if(reducedMotion&&!playRequested)actor.update(.001);
          controlsEl.querySelectorAll('[data-animation]').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));
        });
        if(person){const photo=document.createElement('button');photo.textContent='Ver fotografía original';photo.onclick=()=>select(id);controlsEl.appendChild(photo);}
      }
      if(disposed||token!==generation)return;status.hidden=true;
      const clock=new THREE.Clock();const animate=()=>{if(disposed||token!==generation)return;frame=requestAnimationFrame(animate);const dt=clock.getDelta();controls?.update();if(!reducedMotion||playRequested)actor?.update(dt);layer?.update(dt);renderer.render(scene,camera);};animate();
    }catch(error){cleanup();if(error.name!=='AbortError'&&token===generation){if(person){unavailableHumans.add(id);select(id);}else status.textContent='No pudimos abrir esta vista. El viaje y los retratos siguen disponibles.';console.warn('SIERRA archivo:',error.message);}}
  }
  container.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>select(b.dataset.archive));
  function destroy(){if(disposed)return;disposed=true;generation++;lifetime.abort();release();container.removeEventListener('keydown',escape);}
  select('landscape');return {destroy,select};
}
