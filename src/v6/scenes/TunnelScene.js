import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Creates a procedural architectural tunnel scene.
 * @param {Object} options - Options containing renderer and quality settings
 * @returns {Object} Object containing scene, camera, group, update(), and dispose() methods
 */
export function createTunnelScene({ renderer, quality }) {
  const scene = new THREE.Scene();
  
  // Very dark ambient fog
  scene.fog = new THREE.FogExp2(0x050505, 0.015);
  scene.background = new THREE.Color(0x050505);

  // Setup camera
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 1.6, 5);

  const group = new THREE.Group();
  scene.add(group);

  // Configuration
  const numRibs = 40;
  const ribSpacing = 3;
  const startZ = 5;
  const tunnelEnd = startZ + (numRibs - 1) * ribSpacing; // ~122
  const endZ = 115; // Target end camera position
  
  const stoneColor = 0xd9d0c2;
  const bronzeColor = 0x3d2e1f;

  // Materials
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: stoneColor,
    roughness: 0.85,
    metalness: 0.1,
  });

  // Add procedural normal variation for stone ribs
  stoneMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vWorldPosition;
      ${shader.vertexShader}
    `.replace(
      `#include <worldpos_vertex>`,
      `
      #include <worldpos_vertex>
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      `
    );

    shader.fragmentShader = `
      varying vec3 vWorldPosition;
      
      // Simple 3D noise function
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      ${shader.fragmentShader}
    `.replace(
      `#include <normal_fragment_maps>`,
      `
      #include <normal_fragment_maps>
      
      // Perturb normal based on noise for a rough stone look
      float n = noise(vWorldPosition * 2.0) * 0.5 + noise(vWorldPosition * 10.0) * 0.25;
      vec3 noiseNormal = normalize(vec3(dFdx(n), dFdy(n), 1.0));
      normal = normalize(normal + noiseNormal * 0.2); // blend with base normal
      `
    );
  };

  const bronzeMaterial = new THREE.MeshStandardMaterial({
    color: bronzeColor,
    metalness: 1.0,
    roughness: 0.4,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Geometries arrays for merging
  const ribGeometries = [];
  const bronzeGeometries = [];

  // Rib base geometry: Torus half-circle in XY plane
  // Radius = 4m (width = 8m), Tube radius = 0.6m
  // Arc goes from 0 to PI (top half of circle)
  const ribTemplate = new THREE.TorusGeometry(4, 0.6, 16, 64, Math.PI);
  
  // Bronze strip template: Thin arch matching inner/outer shape
  const bronzeTemplate = new THREE.TorusGeometry(4.1, 0.1, 8, 64, Math.PI);

  // Generate ribs and lights
  for (let i = 0; i < numRibs; i++) {
    const zPos = startZ + i * ribSpacing;

    const ribGeo = ribTemplate.clone();
    ribGeo.translate(0, 0, zPos);
    ribGeometries.push(ribGeo);

    // Add bronze strip slightly offset in Z between ribs
    if (i < numRibs - 1) {
      const bGeo = bronzeTemplate.clone();
      bGeo.translate(0, 0, zPos + ribSpacing / 2);
      bronzeGeometries.push(bGeo);
    }
    
    // Add point lights every 4th rib along the ceiling
    if (i % 4 === 0) {
      const pLight = new THREE.PointLight(0x98735B, 0.3, 15);
      // Position light near the ceiling arch (radius 4)
      pLight.position.set(0, 3.8, zPos);
      group.add(pLight);
    }
  }

  // Merge geometries for performance
  if (ribGeometries.length > 0) {
    const mergedRibs = mergeGeometries(ribGeometries);
    const ribsMesh = new THREE.Mesh(mergedRibs, stoneMaterial);
    group.add(ribsMesh);
  }

  if (bronzeGeometries.length > 0) {
    const mergedBronze = mergeGeometries(bronzeGeometries);
    const bronzeMesh = new THREE.Mesh(mergedBronze, bronzeMaterial);
    group.add(bronzeMesh);
  }

  // Floor plane
  const floorLength = tunnelEnd + 20;
  const floorGeo = new THREE.PlaneGeometry(16, floorLength);
  const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, floorLength / 2 - 5);
  group.add(floorMesh);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Very dark ambient
  scene.add(ambientLight);

  // Exit light (Intensity set dynamically)
  const exitLight = new THREE.PointLight(0xfffae6, 0.0, 50);
  exitLight.position.set(0, 3, tunnelEnd + 10);
  scene.add(exitLight);

  // Directional light from the far end (warm ivory, low intensity)
  const directionalLight = new THREE.DirectionalLight(0xfff0dd, 0.2);
  directionalLight.position.set(0, 2, tunnelEnd + 10);
  directionalLight.target.position.set(0, 0, 0);
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  // Add bright exit area visually at the end of the tunnel
  const exitGeo = new THREE.CircleGeometry(4, 32);
  const exitMat = new THREE.MeshBasicMaterial({ color: 0xfffae6, fog: false });
  const exitMesh = new THREE.Mesh(exitGeo, exitMat);
  exitMesh.position.set(0, 0, tunnelEnd + 10);
  group.add(exitMesh);

  /**
   * Updates the scene based on scroll progress
   * @param {number} scrollProgress - Value between 0 and 1
   */
  function update(scrollProgress) {
    // Camera moves forward along Z
    const currentZ = startZ + scrollProgress * (endZ - startZ);
    
    // Very slight sinusoidal sway (±0.1m horizontal) for organic feel
    const sway = Math.sin(scrollProgress * Math.PI * 10) * 0.1;
    
    camera.position.set(sway, 1.6, currentZ);
    
    // Look slightly ahead towards the exit
    camera.lookAt(0, 1.6, currentZ + 10);

    // Exit light intensity increases as scrollProgress approaches 1.0
    // Quadratic scaling for smooth brightness build-up
    exitLight.intensity = Math.pow(scrollProgress, 2) * 5.0; 
  }

  /**
   * Cleans up scene resources
   */
  function dispose() {
    scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  return { scene, camera, group, update, dispose };
}
