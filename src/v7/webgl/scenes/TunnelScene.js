import * as THREE from 'three';
import { createRibbedTunnel, tunnelPath, TUNNEL_LENGTH } from '../objects/RibbedTunnel';
import { sectionProgress, range, smooth, lerp, store } from '../../core/store';
import T from '../data/tunnelSpec.json';

// Contour lines → ribs rise from below → constant-speed approach (portal size
// grows as k / (reachP - p), fitted to 201 measured checkpoints) → portal fills.
export class TunnelScene {
  constructor(scene, envMap) {
    this.group = createRibbedTunnel({ ribs: 40, envMap });
    this.group.visible = false;
    scene.add(this.group);
    this.group.userData.glow.intensity = 0; scene.add(this.group.userData.glow);
    this.look = new THREE.Vector3();
  }
  update(camera, t) {
    const pStage = sectionProgress('tunnel');
    const active = store.activeStage === 'tunnel' && pStage<.82;
    const g = this.group, u = g.userData;
    g.visible = !!active;
    if (!active) { u.glow.intensity = 0; return; }
    camera.fov = store.aspectK < .7 ? 56 : 44; camera.updateProjectionMatrix();
    const p = Math.min(1, pStage / T.pinFraction);
    // contour lines
    const wireA = smooth(range(p, T.contour.in[0], T.contour.in[1])) * (1 - smooth(range(p, T.contour.out[0], T.contour.out[1])));
    u.wireMat.opacity = 0.6 * wireA; u.wire.visible = wireA > 0.002;
    // solid ribs rise from below the floor (staggered by depth)
    const rise = range(p, T.solid.rise[0], T.solid.rise[1]);
    u.solid.visible = rise > 0.001; u.mat.opacity = 1;
    // the white feather bridges the contour->solid handoff, then fades once the ribs are established
    const featherIn = smooth(range(p, T.contour.in[1], T.solid.rise[0] + 0.03));
    const featherOut = smooth(range(p, T.solid.rise[1] + 0.05, T.solid.rise[1] + 0.16));
    u.feather.material.opacity = 0;
    u.feather.visible = false;
    u.feather.rotation.z = Math.sin(t * 0.15) * 0.05;
    u.ribs.forEach((m, i) => { const k = smooth(range(rise, i * 0.008, 0.7 + i * 0.008)); m.position.y = m.userData.baseY - 9 * (1 - k); });
    // portal lights up and the camera approaches at constant speed
    const on = p >= T.portal.on;
    u.portal.visible = on; u.glow.intensity = on ? 18 : 0; u.floorGlow.visible = on;
    const D0 = 44;                                         // camera-to-opening distance when the approach starts (fitted)
    const d = on ? Math.max(0.6, D0 * (T.portal.reachP - p) / (T.portal.reachP - T.portal.on)) : D0;
    const tPath = Math.max(0, Math.min(1, 1 - d / TUNNEL_LENGTH));
    const pos = tunnelPath(tPath);
    if (d > TUNNEL_LENGTH) pos.z = -TUNNEL_LENGTH + d;      // waiting before the entrance
    camera.position.set(pos.x, pos.y + 0.05, pos.z + 1.0);
    const ahead = tunnelPath(Math.min(1, tPath + 0.05));
    this.look.set(ahead.x, ahead.y + 0.05, ahead.z - 3);
    camera.lookAt(this.look);
    u.floorGlow.position.set(pos.x, u.floorGlow.position.y, pos.z - 4);
    // portal fills the frame: keep it slightly larger than the view at arrival
    const grow = 1 + 2.0 * smooth(range(p, 0.49, T.portal.fillAt + 0.01));
    u.portal.scale.set(3.1 * 0.95 * T.portal.aspect * grow, 3.1 * 0.95 * grow, 1);
  }
}
