import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SierraSplatLayer} from './splat-loader.js';
import {loadWorldAsset} from './world-assets.js';

const base=import.meta.env.BASE_URL;
const people={
  reyes:{name:'Ladislao Reyes',role:'El poeta de Vallecito',image:'reyes-reference',video:'reyes',text:'Su voz y sus cuadernos son el corazón de este viaje. El libro nace de sus palabras y del trabajo de la comunidad.'},
  rosalia:{name:'Rosalía',role:'La vida junto al monte',image:'rosalia-goats',video:'rosalia',text:'La huerta, el hilado, las cabritas. Cada encuentro nos enseña a mirar el tiempo y los saberes de la sierra.'},
  monica:{name:'Mónica Speso',role:'La directora de la escuela',image:'monica',video:'monica',text:'La escuela reúne a chicos y docentes para que los cuadernos puedan transformarse en un libro compartido.'},
};

/** A bounded, optional archive viewer. It never changes the saved adventure. */
export function openArchive(container,{onClose,quality='auto',reducedMotion=false}={}){
  let disposed=false,release=()=>{},generation=0;
  container.innerHTML=`<section class="archive"><header class="archive-header"><div><span>ARCHIVO VIVO · SIERRA</span><h2>Un lugar. Su gente.</h2></div><button class="archive-close" aria-label="Cerrar archivo">Volver al viaje <span aria-hidden="true">×</span></button></header><nav class="archive-tabs" aria-label="Explorar el archivo">${[['landscape','La sierra en 3D'],['reyes','Reyes'],['rosalia','Rosalía'],['monica','Mónica'],['mule','La mula'],['goat','Las cabritas']].map(([id,label])=>`<button data-archive="${id}" aria-pressed="false">${label}</button>`).join('')}</nav><div class="archive-body"></div></section>`;
  const body=container.querySelector('.archive-body');
  const close=()=>{destroy();onClose?.();};const closeButton=container.querySelector('.archive-close');closeButton.onclick=close;
  // The module may arrive after the host overlay's first animation frame.
  closeButton.focus({preventScroll:true});
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};container.addEventListener('keydown',escape);
  async function select(id){
    const token=++generation;release();release=()=>{};
    container.querySelectorAll('[data-archive]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.archive===id)));
    if(people[id]){
      const p=people[id];body.innerHTML=`<div class="archive-portrait"><video playsinline muted loop preload="metadata" poster="${base}images/${p.image}.webp" aria-label="${p.name}, imagen original del documental"><source src="${base}video/${p.video}.mp4" type="video/mp4"/></video><div class="archive-caption"><span>${p.role}</span><h3>${p.name}</h3><p>${p.text}</p><small>Imágenes originales del documental. Los personajes animables en 3D siguen en desarrollo.</small><button class="archive-motion">${reducedMotion?'Reproducir el plano':'Pausar el plano'}</button></div></div>`;
      const video=body.querySelector('video'),button=body.querySelector('button');
      const sync=()=>button.textContent=video.paused?'Reproducir el plano':'Pausar el plano';
      button.onclick=()=>{if(video.paused)video.play().catch(()=>{});else video.pause();};video.onplay=video.onpause=sync;
      if(!reducedMotion)video.play().catch(sync);
      release=()=>{video.pause();video.removeAttribute('src');video.querySelectorAll('source').forEach(s=>s.remove());video.load();};return;
    }
    body.innerHTML=`<div class="archive-stage"><div class="archive-canvas"></div><div class="archive-loader" role="status">Preparando ${id==='landscape'?'la sierra real':'el encuentro'}…</div><div class="archive-stage-label"><span>${id==='landscape'?'RECONSTRUCCIÓN DEL ARCHIVO':'MODELO ANIMADO EN BLENDER'}</span><h3>${id==='landscape'?'La huella desde el cielo':id==='mule'?'Nuestra compañera de camino':'Habitantes de la sierra'}</h3></div></div><footer class="archive-controls"><p>${id==='landscape'?'El caserío, el corral y el monte del vuelo original.':'Arrastrá para mirar alrededor. Acercá o alej á con dos dedos o la rueda.'.replace('alej á','alejá')}</p><div class="archive-control-row"></div><small>${id==='landscape'?'Gaussian splatting · reconstrucción de varias vistas; exploración limitada al área capturada.':'Modelo artístico para la aventura; no es un escaneo del animal real.'}</small></footer>`;
    const mount=body.querySelector('.archive-canvas'),status=body.querySelector('.archive-loader'),controlsEl=body.querySelector('.archive-control-row');
    let renderer,layer,actor,controls,frame,observer,floor,sourceFov=48,sourceAspect=16/9,playRequested=false,cleaned=false;const abort=new AbortController();
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
      renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='low'?1:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;mount.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-label',id==='landscape'?'Paisaje real reconstruido con Gaussian splatting':'Modelo tridimensional del animal');
      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(Math.tan(sourceFov*Math.PI/360)*Math.min(1,sourceAspect/camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();};observer=new ResizeObserver(resize);observer.observe(mount);resize();
      if(id==='landscape'){
        const manifest=await fetch(`${base}scenes/sierra-observatory.json`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('asset');return r.json();});
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
        const entries=await fetch(`${base}models/manifest.json`,{signal:abort.signal}).then(r=>r.json());const entry=entries[id];if(!entry)throw Error('model');
        scene.add(new THREE.HemisphereLight('#f1ede0','#70614b',3.3));const sun=new THREE.DirectionalLight('#ffe8c4',4);sun.position.set(-4,6,4);scene.add(sun);
        actor=await loadWorldAsset({...entry,id,url:`${base}models/${entry.file}`,heightMeters:id==='mule'?1.85:.8},{scene,renderer,signal:abort.signal});
        actor.play('idle');const h=id==='mule'?1.85:.8;
        camera.position.set(h*1.9,h*1.1,h*2.6);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,h*.5,0);controls.enablePan=false;controls.minDistance=h*1.2;controls.maxDistance=h*5;controls.maxPolarAngle=Math.PI*.51;controls.enableDamping=true;controls.update();
        floor=new THREE.Mesh(new THREE.CircleGeometry(h*3,64),new THREE.MeshStandardMaterial({color:'#354236',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
        controlsEl.innerHTML='<button data-animation="idle" aria-pressed="true">Observar</button><button data-animation="walk" aria-pressed="false">Ver el paso</button>';
        controlsEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{
          const animation=b.dataset.animation;
          if(!actor.play(animation,{fade:reducedMotion?0:.2}))return;
          // Reduced motion suppresses autoplay, not a child's explicit playback request.
          playRequested=animation==='walk';
          if(reducedMotion&&!playRequested)actor.update(.001);
          controlsEl.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));
        });
      }
      if(disposed||token!==generation)return;status.hidden=true;
      const clock=new THREE.Clock();const animate=()=>{if(disposed||token!==generation)return;frame=requestAnimationFrame(animate);const dt=clock.getDelta();controls?.update();if(!reducedMotion||playRequested)actor?.update(dt);layer?.update(dt);renderer.render(scene,camera);};animate();
    }catch(error){cleanup();if(error.name!=='AbortError'&&token===generation){status.textContent='No pudimos abrir esta vista. El viaje y los retratos siguen disponibles.';console.warn('SIERRA archivo:',error.message);}}
  }
  container.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>select(b.dataset.archive));
  function destroy(){if(disposed)return;disposed=true;generation++;release();container.removeEventListener('keydown',escape);}
  select('landscape');return {destroy,select};
}
