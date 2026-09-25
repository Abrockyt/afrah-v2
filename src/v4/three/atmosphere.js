import * as THREE from 'three';

const cloudVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const cloudFragment = `
  uniform sampler2D uCloud;uniform float uTime;uniform float uDensity;uniform float uFade;varying vec2 vUv;
  void main(){
    vec2 uv=vUv+vec2(uTime*.00006,-uTime*.00003);
    vec4 photographed=texture2D(uCloud,uv);
    float edge=smoothstep(0.,.11,vUv.x)*smoothstep(0.,.11,vUv.y)*smoothstep(0.,.11,1.-vUv.x)*smoothstep(0.,.11,1.-vUv.y);
    vec3 shaded=photographed.rgb*vec3(.91,.88,.9);
    gl_FragColor=vec4(shaded,photographed.a*edge*uDensity*uFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const skyVertex = `varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFragment = `
  uniform float uDusk;uniform float uTime;varying vec3 vDirection;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float a=.5,n=0.;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.07+vec2(9.2,4.1);a*=.52;}return n;}
  void main(){
    vec3 d=normalize(vDirection);float h=smoothstep(-.15,.72,d.y);
    vec3 day=mix(vec3(.58,.69,.71),vec3(.16,.37,.54),h);
    vec3 eve=mix(vec3(.48,.34,.34),vec3(.06,.15,.27),h);
    vec3 sky=mix(day,eve,uDusk);
    vec2 field=d.xz*5.5+vec2(d.y*1.8,uTime*.0008);
    float billow=fbm(field+vec2(fbm(field*.7)*.8));
    float cloud=smoothstep(.46,.59,billow)*smoothstep(-.18,.04,d.y)*(1.-smoothstep(.4,.7,d.y));
    sky=mix(sky,mix(vec3(.88,.92,.91),vec3(.96,.72,.59),uDusk*.65),cloud*.72);
    float facing=max(dot(d,normalize(vec3(-.55,.23,-.77))),0.);
    sky+=vec3(1.,.65,.34)*(pow(facing,650.)*.9+pow(facing,18.)*.12)*(1.-uDusk*.6);
    gl_FragColor=vec4(sky,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Photographic alpha cloud banks occupy real world elevations; the camera
// passes through them. The sky shader supplies aerial perspective behind them.
export function makeAtmosphere(scene) {
  const skyMat = new THREE.ShaderMaterial({vertexShader: skyVertex, fragmentShader: skyFragment, uniforms: {uDusk: {value: 0}, uTime: {value: 0}}, side: THREE.BackSide, depthWrite: false});
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5800, 32, 20), skyMat);
  sky.frustumCulled = false; scene.add(sky);
  const cloudTexture = new THREE.TextureLoader().load('/media/afrah-cloud-atlas.png');
  cloudTexture.colorSpace = THREE.SRGBColorSpace;
  cloudTexture.anisotropy = 4;
  const cloudGeo = new THREE.PlaneGeometry(4900, 1850);
  const layers = [
    {height: 1170, density: .76, x: 350, z: 250, angle: -.1},
    {height: 810, density: .54, x: -220, z: -170, angle: .18},
    {height: 515, density: .33, x: 140, z: 80, angle: -.24},
  ].map(({height, density, x, z, angle}) => {
    const material = new THREE.ShaderMaterial({vertexShader: cloudVertex, fragmentShader: cloudFragment,
      uniforms: {uCloud: {value: cloudTexture}, uTime: {value: 0}, uDensity: {value: density}, uFade: {value: 1}},
      transparent: true, depthWrite: false, side: THREE.DoubleSide});
    const mesh = new THREE.Mesh(cloudGeo, material); mesh.rotation.set(-Math.PI / 2, 0, angle); mesh.position.set(x, height, z);
    scene.add(mesh); return mesh;
  });
  return {
    update(camera, dusk, seconds) {
      sky.position.copy(camera.position); skyMat.uniforms.uDusk.value = dusk; skyMat.uniforms.uTime.value = seconds;
      layers.forEach((layer, i) => {
        layer.material.uniforms.uTime.value = seconds;
        layer.material.uniforms.uFade.value = 1 - dusk * (i === 2 ? .7 : .4);
      });
    },
    dispose() { layers.forEach(mesh => { scene.remove(mesh); mesh.material.dispose(); }); cloudGeo.dispose(); cloudTexture.dispose(); scene.remove(sky); sky.geometry.dispose(); skyMat.dispose(); },
  };
}
