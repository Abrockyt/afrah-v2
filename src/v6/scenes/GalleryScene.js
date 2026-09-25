import * as THREE from 'three';

const slidesConfig = [
  { label: '01\nMORNING', pos: [0, 0, 0], rot: [0, 0, 0], scale: 1.0, color: '#2a1f14' },
  { label: '02\nLIGHT', pos: [-6, 0.5, -12], rot: [0, 0.15, 0], scale: 0.8, color: '#1a2028' },
  { label: '03\nINSIDE', pos: [5, -0.3, -24], rot: [0, -0.1, 0], scale: 0.85, color: '#1f1a14' },
  { label: '04\nOUTSIDE', pos: [-2, 0.8, -36], rot: [0, 0.08, 0], scale: 0.9, color: '#14201a' },
  { label: '05\nEVENING', pos: [0, 0, -50], rot: [0, 0, 0], scale: 1.1, color: '#1a1410' },
];

/**
 * Creates a canvas-based placeholder texture with text and gradient
 */
function createPlaceholderTexture(label, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768; // ~4:3 aspect ratio
  const ctx = canvas.getContext('2d');

  // Base background
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradient overlay for depth
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(0,0,0,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text setup
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = label.split('\n');
  const lineH = 100;
  const startY = (canvas.height - (lines.length - 1) * lineH) / 2;
  
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, startY + i * lineH);
  });

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Creates the 3D gallery scene
 */
export function createGalleryScene({ renderer, quality = 'high' }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0a0a');
  
  // Subtle dark fog for depth
  scene.fog = new THREE.FogExp2('#0a0a0a', 0.015);

  const aspect = window.innerWidth / window.innerHeight;
  // FOV 45
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(0, 1, 15);
  camera.lookAt(0, 1, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Dark ambient lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  const slides = [];

  const baseW = 8;
  const baseH = 6; // 4:3ish

  // Re-use geometries for performance
  const geo = new THREE.PlaneGeometry(1, 1);
  const frameGeo = new THREE.PlaneGeometry(1, 1);

  slidesConfig.forEach((cfg) => {
    const slideGroup = new THREE.Group();
    slideGroup.position.set(...cfg.pos);
    slideGroup.rotation.set(...cfg.rot);
    
    // Scale container based on configuration
    const s = cfg.scale;
    const w = baseW * s;
    const h = baseH * s;

    // Main Image Mesh
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: createPlaceholderTexture(cfg.label, cfg.color),
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(w, h, 1);
    
    // Frame Mesh (slightly larger and placed slightly behind)
    const border = 0.2 * s;
    const frameMat = new THREE.MeshBasicMaterial({ color: '#0B0B0A', transparent: true, opacity: 1 });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.scale.set(w + border, h + border, 1);
    frameMesh.position.z = -0.05;

    // Spot Light behind the frame to provide local warm tone illumination
    const light = new THREE.SpotLight(0xffddbb, 0, 20, Math.PI / 4, 0.5, 2);
    light.position.set(0, 0, -2);
    light.target = mesh; // point to mesh
    
    slideGroup.add(frameMesh);
    slideGroup.add(mesh);
    slideGroup.add(light);
    // Needed for spotlight target to update properly if it's attached elsewhere, 
    // but here adding it to scene/group is fine.
    group.add(slideGroup);

    slides.push({
      group: slideGroup,
      mesh,
      frameMesh,
      light,
      mat,
      frameMat,
      config: cfg,
      baseZ: cfg.pos[2]
    });
  });

  const textureLoader = new THREE.TextureLoader();

  /**
   * Helper function to replace placeholder textures with real images
   * @param {string[]} urls - Array of image URLs matching the slides config length
   */
  const loadImages = (urls) => {
    urls.forEach((url, i) => {
      if (slides[i]) {
        textureLoader.load(url, (tex) => {
          slides[i].mat.map.dispose();
          slides[i].mat.map = tex;
          slides[i].mat.needsUpdate = true;
        });
      }
    });
  };

  /**
   * Updates the camera position and slide animations based on scroll
   * @param {number} scrollProgress - Value from 0.0 to 1.0
   */
  const update = (scrollProgress) => {
    // Camera moves along Z from 15 to -55
    const startZ = 15;
    const endZ = -55;
    
    // Simple lerp calculation for camera target
    const targetZ = startZ + (endZ - startZ) * scrollProgress;

    // Smoothly interpolate camera (simulating a slight delay/smoothness)
    camera.position.z += (targetZ - camera.position.z) * 0.1;
    
    // Always look forward with a slight vertical offset
    camera.lookAt(camera.position.x, 1, camera.position.z - 10);

    // Calculate active state and animations for each slide
    slides.forEach((slide) => {
      // Distance from camera to slide along the Z axis
      const dist = camera.position.z - slide.config.pos[2];
      
      let activity = 0;
      
      // The slide is considered 'active' when it's in front of the camera (distance > 0)
      // and within a visible range.
      if (dist > 5 && dist < 35) {
        // Approaching and peaking (1.0) around dist = 15
        activity = 1 - Math.abs(dist - 15) / 20;
      } else if (dist <= 5) {
        // Passed the camera or very close, fade out
        activity = Math.max(0, 1 - (5 - dist) / 5);
      }
      
      activity = THREE.MathUtils.clamp(activity, 0, 1);

      // Interpolate opacity
      // Far/inactive slides have lower opacity
      const targetOpacity = 0.25 + (0.75 * activity);
      slide.mat.opacity += (targetOpacity - slide.mat.opacity) * 0.1;
      slide.frameMat.opacity += (targetOpacity - slide.frameMat.opacity) * 0.1;

      // Interpolate scale (grow slightly when active)
      const targetScale = 1.0 + (0.05 * activity);
      const currentScale = slide.group.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.1;
      slide.group.scale.setScalar(newScale);

      // Light intensity boosts when active
      const targetLight = activity * 2.5; // brighter when active
      slide.light.intensity += (targetLight - slide.light.intensity) * 0.1;
    });
  };

  /**
   * Cleanup resources
   */
  const dispose = () => {
    slides.forEach((slide) => {
      if (slide.mat.map) slide.mat.map.dispose();
      slide.mat.dispose();
      slide.frameMat.dispose();
      slide.light.dispose();
    });
    geo.dispose();
    frameGeo.dispose();
  };

  return { scene, camera, group, update, dispose, loadImages };
}
