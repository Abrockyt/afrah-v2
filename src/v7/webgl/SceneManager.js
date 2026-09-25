import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FeatherWipe } from './transitions/FeatherWipe';
import { IntroScene } from './scenes/IntroScene';
import { TunnelScene } from './scenes/TunnelScene';
import { ReferenceBuildingScene } from './scenes/ReferenceBuildingScene';
import { HistoryScene, HISTORY_BG } from './scenes/HistoryScene';
import { ZeusScene, ZEUS_BG } from './scenes/ZeusScene';
import { HeroCloudScene } from './scenes/HeroCloudScene';
import { store, sectionProgress, range, smooth, resolveActiveStage } from '../core/store';
import HS from './data/historySpec.json';

export const INK = '#061e34';
export const INK2 = '#04182b';
export const BONE = '#f0eee8';

// Owns the renderer, one persistent WebGL scene graph, and the stage
// background. Scenes are plain classes with update(camera, t, dt); the manager
// decides which camera rig is in charge from section progress.
export class SceneManager {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.stageEl = canvas.parentElement;
    this.overlay = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.autoClear = false;
    // Shadows only come from the sculpture room's cursor light.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    // Fog is always present (pushed far away) so switching it on for the
    // history helix never recompiles materials.
    this.scene.fog = new THREE.Fog(HISTORY_BG, 1e4, 1e4 + 1);
    this.pointer = new THREE.Vector2(); store.pointer = this.pointer;
    this.onPointer = (e) => { this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2); };
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 200);
    this.camera.position.set(0, 0, 4.2);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Lights: soft key from upper-left, cool fill from the right, low rim.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-3, 4, 5);
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.5); fill.position.set(4, 1, 2);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(0, -3, -4);
    this.scene.add(key, fill, rim);
    this.lights = { hemi: this.scene.children[0], key, fill, rim };
    this.lightScale = 1;

    this.wipe = new FeatherWipe();
    this.intro = new IntroScene(this.scene, this.envMap, this.wipe);
    this.tunnel = new TunnelScene(this.scene, this.envMap);
    this.building = new ReferenceBuildingScene(this.scene, this.envMap, this.renderer);
    this.heroClouds = new HeroCloudScene(this.scene, this.envMap);
    this.history = new HistoryScene(this.scene);
    this.zeus = new ZeusScene(this.scene);
    this.last = 0;
    this.bg = { from: INK, to: INK, p: 0, dir: [0, 1], seed: 1.3, fringe: 0.09 };
    this.ready = Promise.all([this.warmup(), this.building.ready, this.heroClouds.ready, this.zeus.ready.then(() => this.warmupLate())]);
  }

  // Compile every program while the loader is up so no stage stalls on first
  // use (the masked physical materials are expensive to compile on D3D/ANGLE).
  async warmup() {
    const all = [this.intro.group, this.tunnel.group];
    const saved = all.map((o) => o.visible);
    all.forEach((o) => { o.visible = true; });
    const u = this.intro.group.userData;
    u.solid.visible = true; u.wire.visible = true; this.intro.grid.visible = true;
    const tu = this.tunnel.group.userData; tu.solid.visible = true; tu.wire.visible = true;
    try {
      if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
      else this.renderer.compile(this.scene, this.camera);
      // Linking is not enough on ANGLE/D3D: the pipeline is built on first
      // draw. Draw everything once (the loader covers the canvas), including
      // the masked variants of the rib materials.
      this.wipe.render(this.renderer, 1.78);
      this.camera.position.set(0, 0.5, 6); this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
      this.intro.setMask(true, 2, 2);
      this.renderer.render(this.scene, this.camera);
      this.intro.setMask(false, 2, 2);
      await new Promise((res) => setTimeout(res, 30));
    } catch (e) { console.warn('warmup failed', e); }
    all.forEach((o, i) => { o.visible = saved[i]; });
    return true;
  }

  // Compile the sculpture room and helix once the model is in, still under the loader.
  async warmupLate() {
    const groups = [this.history.group, this.zeus.group, this.heroClouds.group];
    groups.forEach((g) => { g.visible = true; });
    try {
      if (this.renderer.compileAsync) await this.renderer.compileAsync(this.scene, this.camera);
      this.renderer.render(this.scene, this.camera);
    } catch (e) { console.warn('late warmup failed', e); }
    groups.forEach((g) => { g.visible = false; });
    return true;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait screens see a narrower slice of the scene: rigs use this to pull
    // the camera back and pull objects toward the centre line.
    store.aspectK = Math.max(0.45, Math.min(1, (w / h) / 1.78));
    this.camera.updateProjectionMatrix();
  }

  // Which stage colour is under the DOM, and any in-progress feathered wipe.
  computeBackground() {
    const s = store.sections;
    const act = (id) => store.activeStage === id;
    const bg = this.bg;
    bg.fringe = 0; bg.p = 0; bg.from = INK; bg.to = INK;
    if (act('arrival')) { bg.from = INK; }
    else if (act('opening')) { // the earlier sculptural hero is now chapter two
      bg.from = INK; bg.to = BONE; bg.dir = [0, -1]; bg.seed = 1.3; bg.p = range(sectionProgress('opening'), 0.66, 0.98);
    } else if (act('nature')) { bg.from = BONE; }
    else if (act('paving')) { bg.from = BONE; bg.to = INK; bg.dir = [1, 0]; bg.seed = 2.7; bg.fringe = 0.05; bg.p = range(sectionProgress('paving'), 0.0, 0.16); }
    else if (act('fusion')) { bg.from = INK; bg.to = BONE; bg.dir = [0.5, 0.86]; bg.seed = 4.1; bg.fringe = 0.2; bg.p = range(sectionProgress('fusion'), 0.84, 1.0); }
    else if (act('protect') || act('defy')) { bg.from = BONE; }
    else if (act('building')) {bg.from=INK;}
    else if (act('tunnel')) { bg.from = sectionProgress('tunnel') > 0.8 ? INK : '#040608'; }
    else if (act('why')) { bg.from = INK2; }
    else if (act('bridge')) { bg.from = INK2; }
    else if (act('history')) { bg.from = HISTORY_BG; }
    else if (act('statue')) { bg.from = ZEUS_BG; }
    else if (!store.activeStage && s.building?.st && s.eraArch?.st && store.scroll > s.building.st.end && store.scroll < s.eraArch.st.start) { bg.from = BONE; }
    else if (!store.activeStage && s.history?.st && store.scroll < s.history.st.start && store.scroll > s.history.st.start - store.vh * 1.5) { bg.from = HISTORY_BG; }
    else if (store.scroll < 4) { bg.from = INK; }
    // Theme for the navigation follows the dominant colour
    const light = ((bg.from === BONE || bg.from === HISTORY_BG) && bg.p < 0.5) || (bg.to === BONE && bg.p >= 0.5);
    store.themeHint = light ? 'light' : 'dark';
  }

  render(t) {
    const prof = window.__glProf || (window.__glProf = []);
    const T0 = performance.now();
    this._render(t);
    const ms = performance.now() - T0;
    if (ms > 60) prof.push({ ms: Math.round(ms), scroll: Math.round(store.scroll), marks: this._marks });
  }

  _render(t) {
    const marks = this._marks = {};
    let tm = performance.now();
    const mark = (k) => { const n = performance.now(); marks[k] = Math.round(n - tm); tm = n; };
    const dt = Math.min(0.05, t - this.last); this.last = t;
    resolveActiveStage();
    this.computeBackground();
    const bg = this.bg;
    this.wipe.set(bg.from, bg.to, bg.p, bg.dir, bg.seed, bg.fringe);
    this.wipe.tick(t);
    // Fog belongs to the history helix only
    const fog = this.scene.fog;
    if (store.activeStage === 'history') { fog.near = 6; fog.far = 14.5; } else { fog.near = 1e4; fog.far = 1e4 + 1; }
    const r = this.renderer;
    // Overlay mode: during the history timeline the canvas floats above the
    // DOM panels (transparent background) so the feather sits in front of them.
    const s0 = store.sections;
    const overlay = false;
    if (overlay !== this.overlay) { this.overlay = overlay; this.stageEl.classList.toggle('is-over', overlay); }
    if (overlay) {
      r.setClearColor(0x000000, 0);
      r.clear(true, true, true);
    } else {
      r.setClearColor(0x000000, 1);
      r.clear(true, true, true);
      this.wipe.render(r, this.camera.aspect);
      r.clearDepth();
    }
    mark('bg');

    // Camera rig selection
    const act = (id) => store.activeStage === id;
    if (act('opening') || act('nature') || act('paving')) {
      this.intro.update(this.camera, t, r);
      this.tunnel.group.visible = false;
    } else if (act('tunnel')) {
      this.tunnel.update(this.camera, t);
      this.intro.group.visible = false;
    } else if (act('building')) {
      this.intro.group.visible = false; this.tunnel.group.visible = false;
    } else {
      this.camera.position.set(0, 0, 4.3); this.camera.lookAt(0, 0, 0);
      this.intro.group.visible = false; this.tunnel.group.visible = false;
    }
    // Inside the tunnel only the portal lights the ribs
    if(!act('tunnel'))this.tunnel.group.userData.glow.intensity=0;
    const wantLights = act('tunnel') && sectionProgress('tunnel')<.82 ? .16 : act('hero') || act('arrival') || act('building') ? .65 : 1;
    if (wantLights !== this.lightScale) {
      this.lightScale = wantLights;
      this.lights.hemi.intensity = 0.9 * wantLights; this.lights.key.intensity = 1.6 * wantLights;
      this.lights.fill.intensity = 0.5 * wantLights; this.lights.rim.intensity = 0.8 * wantLights;
    }
    this.building.update(this.camera, t, r);
    this.heroClouds.update(this.camera, t);
    this.history.update(this.camera, t);
    this.zeus.update(this.camera, t);
    mark('rigs');
    mark('composition');
    r.render(this.scene, this.camera);
    // The same organic edge covers the outgoing composition and uncovers
    // the next camera rig. The cut happens only while the screen is covered.
    const stage=store.activeStage;
    if(stage==='arrival' && sectionProgress('arrival')>.87)
      this.wipe.cover(r,this.camera.aspect,range(sectionProgress('arrival'),.87,1),INK);
    if(stage==='opening'){
      const p=sectionProgress('opening');
      if(p<.1)this.wipe.cover(r,this.camera.aspect,range(p,0,.1),INK,true);
      if(p>.88)this.wipe.cover(r,this.camera.aspect,range(p,.88,1),INK);
    }
    // Composites-style cuts around the passage, the story and the sculpture
    // room: the outgoing colour is wiped away by a feathered edge.
    // Hero → arrival: a feathered dark edge closes over the sky, then opens
    // onto the arrival scene.
    if(stage==='hero' && sectionProgress('hero')>.84)
      this.wipe.cover(r,this.camera.aspect,range(sectionProgress('hero'),.84,.99),INK,false,[0,-1]);
    if(stage==='arrival' && sectionProgress('arrival')<.07)
      this.wipe.cover(r,this.camera.aspect,range(sectionProgress('arrival'),0,.07),INK,true,[0,-1]);
    if(stage==='history'){
      const p=sectionProgress('history');
      if(p>.965)this.wipe.cover(r,this.camera.aspect,range(p,.965,1),ZEUS_BG,false,[0,-1]);
    }
    if(stage==='statue' && sectionProgress('statue')<.08)
      this.wipe.cover(r,this.camera.aspect,range(sectionProgress('statue'),0,.08),ZEUS_BG,true,[0,-1]);
    if(stage==='statue' && sectionProgress('statue')>.68)
      this.wipe.cover(r,this.camera.aspect,range(sectionProgress('statue'),.68,.78),INK,false,[1,0]);
    if(stage==='building' && sectionProgress('building')<.1)
      this.wipe.cover(r,this.camera.aspect,range(sectionProgress('building'),0,.1),INK,true);
    mark('render');
  }

  dispose() { window.removeEventListener('pointermove', this.onPointer); this.renderer.dispose(); }
}
