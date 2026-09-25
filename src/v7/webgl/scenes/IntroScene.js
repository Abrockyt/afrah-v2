import * as THREE from 'three';
import { createRibStructure } from '../objects/RibStructure';
import { sectionProgress, range, smooth, lerp, store } from '../../core/store';

// Opening → Nature → Paving. One rib structure, one camera, three phases.
// During the opening, the light stage (solid ribs on bone) is revealed over
// the dark stage (contour lines on ink) by the shared feathered wipe mask.
export class IntroScene {
  constructor(scene, envMap, wipe) {
    this.group = createRibStructure({ ribs: 26, envMap });
    const u = this.group.userData;
    u.solidMat.transparent = true;
    wipe.applyMask(u.solidMat, 'to');
    wipe.applyMask(u.wireMat, 'from');
    wipe.applyMask(u.contourMat, 'from');
    // Perspective floor grid under the sculpture (light stage only)
    const grid = new THREE.GridHelper(60, 60, 0xb5b0af, 0xb5b0af);
    grid.material.transparent = true; grid.material.opacity = 0.45; grid.material.depthWrite = false;
    grid.position.y = -2.3;
    wipe.applyMask(grid.material, 'to');
    this.grid = grid;
    this.group.add(grid);
    this.masked = [u.solidMat, u.wireMat, u.contourMat, grid.material];
    scene.add(this.group);
    this.target = new THREE.Vector3();
  }
  setMask(enabled, w, h) {
    for (const m of this.masked) { m.userData.maskEnabled.value = enabled ? 1 : 0; m.userData.maskRes.value.set(w, h); }
  }
  update(camera, t, renderer) {
    const open = sectionProgress('opening');
    const nature = sectionProgress('nature');
    const paving = sectionProgress('paving');
    const act = (id) => store.activeStage === id;
    const g = this.group, u = g.userData;
    g.visible = act('opening') || act('nature') || act('paving');
    if (!g.visible) return;
    camera.fov=38;camera.updateProjectionMatrix();

    let camPos, look, rotY, wireOp, solidOp, pos, mask = false;
    if (act('opening')) {
      // Camera low and close, looking up through the fan of lines; the lines
      // slide as we rise. From ~0.66 the light stage tears in from the top.
      const k = open;
      camPos = [lerp(-2.4, -0.6, k), lerp(-2.6, 0.4, k), lerp(1.4, 5.2, k)];
      look = [lerp(1.4, 0.4, k), lerp(2.0, 0.4, k), lerp(-1.2, 0, k)];
      rotY = -1.1 + k * 0.8;
      wireOp = 1; solidOp = k > 0.6 ? 1 : 0; mask = k > 0.6 && k < 0.985;
      if (k >= 0.985) wireOp = 0;
      pos = [0, lerp(-0.4, 0.2, k), 0];
    } else if (act('nature')) {
      const k = nature;
      camPos = [lerp(-0.6, -0.2, k), lerp(0.4, 0.8, k), lerp(5.2, 7.2, k)];
      look = [lerp(0.4, 0.4, k), lerp(0.4, 0.2, k), 0];
      rotY = -0.3 + k * 1.0;
      wireOp = 0; solidOp = 1;
      const kk = smooth(range(k, 0, 0.35));
      pos = [lerp(0.6, -4.4, kk), lerp(0.2, 0.7, kk), lerp(0, -1.6, kk)];
    } else {
      const k = paving;
      camPos = [lerp(-0.2, 0.6, k), lerp(0.6, 1.2, k), lerp(7.2, 5.0, k)];
      look = [lerp(0.2, 0.6, k), lerp(0.3, 0.1, k), 0];
      rotY = 0.7 + k * 1.5;
      wireOp = 0; solidOp = 1 - smooth(range(k, 0.86, 1));
      pos = [lerp(-4.4, 1.2, k), lerp(0.7, -0.4, k), lerp(-1.6, -2.0, k)];
      u.solidMat.envMapIntensity = 0.12;
    }
    if (!act('paving')) u.solidMat.envMapIntensity = 0.35;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.setMask(mask, size.x, size.y);
    const ak = store.aspectK || 1;
    g.position.set(pos[0] * ak, pos[1], pos[2]);
    g.rotation.set(0.05, rotY, 0.02);
    camPos = [camPos[0] * ak, camPos[1], camPos[2] / Math.pow(ak, 0.85)];
    look = [look[0] * ak, look[1], look[2]];
    const onLight = act('nature') || (act('opening') && open > 0.6);
    this.grid.visible = onLight && solidOp > 0.001;
    this.grid.material.opacity = 0.45 * solidOp * (act('nature') ? 1 - smooth(range(nature, 0.9, 1)) : 1);
    this.grid.rotation.y = -rotY; // grid stays world-aligned while the ribs turn
    u.wireMat.opacity = 0.55 * wireOp; u.contourMat.opacity = 0.35 * wireOp;
    u.wire.visible = wireOp > 0.001;
    u.solidMat.opacity = solidOp; u.solid.visible = solidOp > 0.001;
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    this.target.set(look[0], look[1], look[2]);
    camera.lookAt(this.target);
  }
}
