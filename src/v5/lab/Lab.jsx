import {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {Canvas, useThree, useFrame} from '@react-three/fiber';
import {MeshTransmissionMaterial} from '@react-three/drei';
import AfrahView from '../three/AfrahView';
import {ENVIRONMENTS, loadHDR} from '../engine/core';
import {windowMaterial} from '../engine/tower';

// /dev/3d-lab — development only. Isolated tests + live stats for every engine feature.
function Stats({api}) {
  const [s, setS] = useState({});
  useEffect(() => { const t = setInterval(() => api.current && setS(api.current.stats()), 500); return () => clearInterval(t); }, []);
  return <pre className="lab-stats">{Object.entries(s).map(([k, v]) => `${k.padEnd(11)} ${typeof v === 'number' ? Math.round(v * 10) / 10 : v}`).join('\n')}</pre>;
}
function EnvBG() {
  const {scene, gl} = useThree();
  useEffect(() => { loadHDR('night').then(t => { const pm = new THREE.PMREMGenerator(gl); scene.environment = pm.fromEquirectangular(t).texture; scene.background = t; scene.backgroundIntensity = .8; }); }, []);
  return null;
}
function InfoOut({id}) { const {gl} = useThree(); useFrame(() => { const el = document.getElementById(id); if (el) el.textContent = ` · calls ${gl.info.render.calls} · tris ${gl.info.render.triangles} · tex ${gl.info.memory.textures}`; }); return null; }
function WindowPanel() {
  const ref = useRef(), mat = useRef();
  useEffect(() => {
    const m = windowMaterial(); mat.current = m; m.fog = false; loadHDR('night').then(t => { m.uniforms.uEnv.value = t; m.uniforms.uEnvInt.value = .6; });
    const g = new THREE.PlaneGeometry(1, 1); g.translate(.5, .5, 0);
    [['aSeed', 37.2], ['aKind', 0], ['aLevel', 3]].forEach(([k, v]) => g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array([v]), 1)));
    g.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array([2.6, 2.96]), 2));
    const im = new THREE.InstancedMesh(g, m, 1); im.setMatrixAt(0, new THREE.Matrix4().compose(new THREE.Vector3(-1.3, -1.48, 0), new THREE.Quaternion(), new THREE.Vector3(2.6, 2.96, 1)));
    ref.current.add(im); return () => { g.dispose(); m.dispose(); };
  }, []);
  useFrame((_, dt) => { if (mat.current) mat.current.uniforms.uTime.value += dt; });
  return <group ref={ref}/>;
}
function GlassScene({kind}) {
  return <>
    <EnvBG/>
    <mesh position={[0, 0, -2.5]}><boxGeometry args={[1.2, 1.2, 1.2]}/><meshStandardMaterial color="#c9a25b" metalness={1} roughness={.3} emissive="#ffb760" emissiveIntensity={.6}/></mesh>
    {kind === 'A' && <mesh><boxGeometry args={[2.6, 2.96, .02]}/><meshPhysicalMaterial transmission={1} thickness={.02} roughness={.02} ior={1.52} color="#e6ecec"/></mesh>}
    {kind === 'B' && <mesh><boxGeometry args={[2.6, 2.96, .02]}/><MeshTransmissionMaterial transmission={1} thickness={.02} roughness={.02} ior={1.52} chromaticAberration={0} samples={6}/></mesh>}
    {kind === 'C' && <WindowPanel/>}
    <InfoOut id={'glass-' + kind}/>
  </>;
}

export default function Lab() {
  const api = useRef();
  const [mode, setMode] = useState('orbit'), [env, setEnv] = useState('night'), [envTo, setEnvTo] = useState('blue'), [envT, setEnvT] = useState(0), [level, setLevel] = useState(12);
  const [times, setTimes] = useState({}); const t0 = useRef(performance.now());
  const progress = useRef(0), [p, setP] = useState(0);
  return <div className="lab">
    <header><b>AFRAH 3D LAB</b><span>dev only · quality via ?q=high|standard|mobile</span></header>
    <section className="lab-world">
      <AfrahView key={mode} mode={mode} env={env} envTo={envTo} envT={envT} selected={level} progress={progress} apiRef={api}
        onReady={s => setTimes(o => ({...o, [s]: Math.round(performance.now() - t0.current)}))}/>
      <Stats api={api}/>
      <div className="lab-controls">
        <label>Mode <select value={mode} onChange={e => { t0.current = performance.now(); setTimes({}); setMode(e.target.value); }}>{['flight', 'orbit', 'select', 'map'].map(m => <option key={m}>{m}</option>)}</select></label>
        <label>Env A <select value={env} onChange={e => setEnv(e.target.value)}>{Object.keys(ENVIRONMENTS).map(m => <option key={m}>{m}</option>)}</select></label>
        <label>Env B <select value={envTo} onChange={e => setEnvTo(e.target.value)}>{Object.keys(ENVIRONMENTS).map(m => <option key={m}>{m}</option>)}</select></label>
        <label>Blend <input type="range" min="0" max="1" step=".01" value={envT} onChange={e => setEnvT(+e.target.value)}/></label>
        <label>Flight <input type="range" min="0" max="1" step=".005" value={p} onChange={e => { progress.current = +e.target.value; setP(+e.target.value); }}/></label>
        <label>Level <input type="number" min="1" max="26" value={level} onChange={e => setLevel(+e.target.value)}/></label>
        <label>Reveal <input type="range" min="-10" max="140" defaultValue="140" onChange={e => { if (api.current) api.current.shared.uReveal.value = +e.target.value >= 140 ? 1e4 : +e.target.value; }}/></label>
        <button onClick={() => api.current?.startIntro()}>Play intro</button>
        <span>hero ready {times.hero ?? '…'} ms · city ready {times.city ?? '…'} ms</span>
      </div>
    </section>
    <section className="lab-glass">
      <h2>Architectural glass A/B/C</h2>
      <div>{['A', 'B', 'C'].map(k => <figure key={k}>
        <Canvas camera={{position: [1.6, .4, 4], fov: 32}} gl={{toneMapping: THREE.ACESFilmicToneMapping}}><GlassScene kind={k}/></Canvas>
        <figcaption><b>{k}</b> {k === 'A' ? 'MeshPhysicalMaterial transmission (three)' : k === 'B' ? 'MeshTransmissionMaterial (drei)' : 'AFRAH window shader (interior map + Fresnel)'}<span id={'glass-' + k}/></figcaption>
      </figure>)}</div>
    </section>
  </div>;
}
