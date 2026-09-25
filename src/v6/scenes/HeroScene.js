import * as THREE from 'three';

export function createHeroScene({ renderer, quality }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0a);
  scene.fog = new THREE.FogExp2(0x0b0b0a, 0.08);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 2.5);
  camera.lookAt(0, 2, 0);

  const group = new THREE.Group();
  scene.add(group);

  // Materials
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1816,
    roughness: 0.9,
    metalness: 0.2, // Subtle metallic flecks approximation
  });

  const bronzeMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d2e1f,
    roughness: 0.3,
    metalness: 0.8,
  });

  // Geometry: Extrude a 4m tall by 0.15m thick profile along a curved path
  // Profile shape
  const ribShape = new THREE.Shape();
  const halfThickness = 0.075;
  const halfHeight = 2.0; // Total 4m tall
  ribShape.moveTo(-halfThickness, -halfHeight);
  ribShape.lineTo(halfThickness, -halfHeight);
  ribShape.lineTo(halfThickness, halfHeight);
  ribShape.lineTo(-halfThickness, halfHeight);
  ribShape.lineTo(-halfThickness, -halfHeight);

  // Curved path (approx 6m long curve extending outwards)
  // Starts near center (radius 1) and curves outwards
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(3, 0, 1.5),
    new THREE.Vector3(5, 0, 1.5),
    new THREE.Vector3(6, 0, -1)
  );

  const steps = quality === 'high' ? 32 : 16;
  const extrudeSettings = {
    steps: steps,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
    extrudePath: curve
  };

  const ribGeo = new THREE.ExtrudeGeometry(ribShape, extrudeSettings);
  
  // Also create a thinner bronze rib
  const bronzeShape = new THREE.Shape();
  const bronzeHalfThickness = 0.02;
  const bronzeHalfHeight = 2.1;
  bronzeShape.moveTo(-bronzeHalfThickness, -bronzeHalfHeight);
  bronzeShape.lineTo(bronzeHalfThickness, -bronzeHalfHeight);
  bronzeShape.lineTo(bronzeHalfThickness, bronzeHalfHeight);
  bronzeShape.lineTo(-bronzeHalfThickness, bronzeHalfHeight);
  bronzeShape.lineTo(-bronzeHalfThickness, -bronzeHalfHeight);

  const bronzeGeo = new THREE.ExtrudeGeometry(bronzeShape, extrudeSettings);

  const numRibs = 24;
  const ribs = [];
  const initialRotations = [];

  for (let i = 0; i < numRibs; i++) {
    const angle = (i / numRibs) * Math.PI * 2;
    
    // Primary stone rib
    const mesh = new THREE.Mesh(ribGeo, stoneMaterial);
    
    // We want the ribs to form a radial pattern.
    // They will rotate around the Y axis.
    // At scroll=0, they are closed (angled inwards).
    mesh.position.y = 2; // Move up so bottom is near y=0
    
    // Additional grouping to easily apply base rotation + animation
    const pivot = new THREE.Group();
    pivot.rotation.y = angle;
    pivot.add(mesh);
    
    // Storing initial state for animation
    const closedAngle = -Math.PI / 2.2; // Tightly packed, pointing inward
    mesh.rotation.y = closedAngle;
    
    group.add(pivot);
    ribs.push(mesh);
    initialRotations.push(closedAngle);

    // Secondary bronze rib (interleaved)
    if (i % 2 === 0) {
      const bronzeMesh = new THREE.Mesh(bronzeGeo, bronzeMaterial);
      bronzeMesh.position.y = 2;
      
      const bronzePivot = new THREE.Group();
      bronzePivot.rotation.y = angle + (Math.PI / numRibs); // Offset between stone ribs
      bronzePivot.add(bronzeMesh);
      
      bronzeMesh.rotation.y = closedAngle;
      
      group.add(bronzePivot);
      ribs.push(bronzeMesh);
      initialRotations.push(closedAngle);
    }
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
  scene.add(ambientLight);

  const centerPointLight = new THREE.PointLight(0xffaa55, 0.5, 10);
  centerPointLight.position.set(0, 2, 0);
  scene.add(centerPointLight);

  const topDirectionalLight = new THREE.DirectionalLight(0xF1EDE5, 0.0);
  topDirectionalLight.position.set(5, 10, 5);
  scene.add(topDirectionalLight);

  // State
  const state = {
    targetCameraPos: new THREE.Vector3(),
    targetCameraLookAt: new THREE.Vector3(0, 2, 0),
    currentLookAt: new THREE.Vector3(0, 2, 0),
    mouseOffsetX: 0,
    mouseOffsetY: 0
  };

  const update = (scrollProgress, mouseX, mouseY, dt) => {
    // 1. Animate Ribs
    // At 0: closed, At 1: fully open
    // They start opening significantly after 0.3
    let openFactor = 0;
    if (scrollProgress > 0.3) {
      openFactor = (scrollProgress - 0.3) / 0.7; // 0 to 1
    }
    
    // Smooth the open factor with ease out
    const easeOut = 1 - Math.pow(1 - openFactor, 3);
    const maxOpenAngle = Math.PI / 1.5; // Rotate outwards

    for (let i = 0; i < ribs.length; i++) {
      const mesh = ribs[i];
      const initialRot = initialRotations[i];
      mesh.rotation.y = initialRot + (easeOut * maxOpenAngle);
    }

    // 2. Animate Lighting
    if (scrollProgress > 0.3) {
      const lightFactor = (scrollProgress - 0.3) / 0.7;
      topDirectionalLight.intensity = lightFactor * 2.5;
    } else {
      topDirectionalLight.intensity = 0;
    }
    
    centerPointLight.intensity = 0.5 + (scrollProgress * 1.5);

    // 3. Animate Camera Position
    // Start: (0, 1.5, 2.5) -> End: (0, 3, 12)
    const p = scrollProgress;
    const targetX = 0;
    const targetY = THREE.MathUtils.lerp(1.5, 3.0, p);
    const targetZ = THREE.MathUtils.lerp(2.5, 12.0, p);

    // Add parallax based on mouse
    state.mouseOffsetX = THREE.MathUtils.lerp(state.mouseOffsetX, mouseX * 2.0, dt * 5.0);
    state.mouseOffsetY = THREE.MathUtils.lerp(state.mouseOffsetY, mouseY * 1.0, dt * 5.0);

    state.targetCameraPos.set(
      targetX + state.mouseOffsetX,
      targetY - state.mouseOffsetY, // Invert Y for natural feel
      targetZ
    );

    camera.position.lerp(state.targetCameraPos, dt * 3.0);
    
    // Smooth LookAt
    const targetLookAt = new THREE.Vector3(
      state.mouseOffsetX * 0.5,
      2 + state.mouseOffsetY * 0.5,
      0
    );
    state.currentLookAt.lerp(targetLookAt, dt * 3.0);
    camera.lookAt(state.currentLookAt);
  };

  const dispose = () => {
    // Cleanup geometries and materials
    ribGeo.dispose();
    bronzeGeo.dispose();
    stoneMaterial.dispose();
    bronzeMaterial.dispose();
    scene.clear();
  };

  return {
    scene,
    camera,
    group,
    update,
    dispose
  };
}
