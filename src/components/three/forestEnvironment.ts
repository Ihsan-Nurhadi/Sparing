import * as THREE from 'three';

function createSeededRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function multiplyQuaternions(q1: THREE.Vector4, q2: THREE.Vector4): THREE.Vector4 {
  const x = q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x;
  const y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y;
  const z = q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z;
  const w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w;
  return new THREE.Vector4(x, y, z, w);
}

/* ============================================================================
   1. REALISTIC PROCEDURAL BRANCHING 3D TREES (Inspired by Contoh/tree.png)
   Bark-textured tapered trunks, organic forked limbs & sub-branches,
   and airy alpha-cutout broadleaf foliage clusters.
============================================================================ */

function createBarkTexture(disposables: Array<{ dispose: () => void }>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#6f6252';
    ctx.fillRect(0, 0, 256, 512);
    const rand = createSeededRandom(101);
    // Vertical bark grooves & ridges
    for (let i = 0; i < 160; i++) {
      const x = rand() * 256;
      const y = rand() * 512;
      const w = 2 + rand() * 7;
      const h = 35 + rand() * 110;
      ctx.fillStyle = rand() > 0.45 ? '#4c4135' : '#8a7c68';
      ctx.globalAlpha = 0.35 + rand() * 0.35;
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  disposables.push(tex);
  return tex;
}

function createBroadleafClusterTexture(
  disposables: Array<{ dispose: () => void }>
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const rand = createSeededRandom(307);

    // Fine inner wooden twigs radiating from cluster center
    ctx.strokeStyle = '#5a4c3d';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + (rand() - 0.5) * 0.4;
      const len = 48 + rand() * 44;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.lineTo(128 + Math.cos(ang) * len, 128 + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Layered matte broadleaf / oak-style leaf sprigs (zero neon!)
    const leafColors = ['#3d5c2a', '#4d7033', '#5c823d', '#6d9148', '#44632e'];
    for (let i = 0; i < 48; i++) {
      const dist = 12 + Math.pow(rand(), 0.72) * 92;
      const ang = rand() * Math.PI * 2;
      const lx = 128 + Math.cos(ang) * dist;
      const ly = 128 + Math.sin(ang) * dist;
      const rot = ang + (rand() - 0.5) * 1.1;
      const rx = 11 + rand() * 11;
      const ry = 5 + rand() * 5.5;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = leafColors[Math.floor(rand() * leafColors.length)];

      // Multi-lobed oak-like leaf silhouette
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.ellipse(rx * 0.35, ry * 0.55, rx * 0.45, ry * 0.48, 0.35, 0, Math.PI * 2);
      ctx.ellipse(-rx * 0.25, -ry * 0.52, rx * 0.42, ry * 0.45, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  disposables.push(tex);
  return tex;
}

function buildBranchSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rBottom: number,
  rTop: number,
  mat: THREE.Material,
  disposables: Array<{ dispose: () => void }>
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(rTop, rBottom, len, 7, 1);
  disposables.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildRealisticTreeArchetype(
  seed: number,
  barkMat: THREE.Material,
  leafMat: THREE.Material,
  leafGeo: THREE.PlaneGeometry,
  disposables: Array<{ dispose: () => void }>
): THREE.Group {
  const rand = createSeededRandom(seed);
  const tree = new THREE.Group();

  // 2-segment slightly curved tapered trunk
  const p0 = new THREE.Vector3(0, 0, 0);
  const p1 = new THREE.Vector3((rand() - 0.5) * 0.22, 1.55, (rand() - 0.5) * 0.22);
  const p2 = new THREE.Vector3(
    p1.x + (rand() - 0.5) * 0.32,
    2.95 + rand() * 0.4,
    p1.z + (rand() - 0.5) * 0.32
  );

  tree.add(buildBranchSegment(p0, p1, 0.24, 0.17, barkMat, disposables));
  tree.add(buildBranchSegment(p1, p2, 0.17, 0.11, barkMat, disposables));

  const addFoliageCluster = (center: THREE.Vector3, scale: number) => {
    // 3 crossed double-sided alpha-cutout leaf cards for full 360-degree volume
    for (let c = 0; c < 3; c++) {
      const card = new THREE.Mesh(leafGeo, leafMat);
      card.position.set(
        center.x + (rand() - 0.5) * 0.26,
        center.y + (rand() - 0.5) * 0.22,
        center.z + (rand() - 0.5) * 0.26
      );
      card.rotation.set(
        (rand() - 0.5) * 0.9,
        (c / 3) * Math.PI + rand() * 0.5,
        (rand() - 0.5) * 0.7
      );
      const s = scale * (0.85 + rand() * 0.35);
      card.scale.set(s, s, s);
      card.castShadow = true;
      card.receiveShadow = true;
      tree.add(card);
    }
  };

  // Primary limbs forking outward & upward (5 limbs)
  const limbCount = 5;
  for (let i = 0; i < limbCount; i++) {
    const az = (i / limbCount) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const tAttach = 0.35 + (i / limbCount) * 0.62;
    const origin = new THREE.Vector3().lerpVectors(p1, p2, tAttach);
    const reach = 1.25 + rand() * 0.85;
    const lift = 1.15 + rand() * 0.95;
    const limbEnd = new THREE.Vector3(
      origin.x + Math.cos(az) * reach,
      origin.y + lift,
      origin.z + Math.sin(az) * reach
    );

    tree.add(buildBranchSegment(origin, limbEnd, 0.095, 0.042, barkMat, disposables));
    addFoliageCluster(limbEnd, 1.35);

    // 2 secondary sub-branches per primary limb
    for (let j = 0; j < 2; j++) {
      const subOrigin = new THREE.Vector3().lerpVectors(origin, limbEnd, 0.48 + j * 0.3);
      const subAz = az + (j === 0 ? 0.65 : -0.65) + (rand() - 0.5) * 0.35;
      const subLen = 0.75 + rand() * 0.55;
      const subEnd = new THREE.Vector3(
        subOrigin.x + Math.cos(subAz) * subLen,
        subOrigin.y + 0.55 + rand() * 0.55,
        subOrigin.z + Math.sin(subAz) * subLen
      );
      tree.add(buildBranchSegment(subOrigin, subEnd, 0.045, 0.018, barkMat, disposables));
      addFoliageCluster(subEnd, 1.15);
    }
  }

  // Crown apex branch & top foliage
  const apexEnd = new THREE.Vector3(
    p2.x + (rand() - 0.5) * 0.5,
    p2.y + 1.45 + rand() * 0.5,
    p2.z + (rand() - 0.5) * 0.5
  );
  tree.add(buildBranchSegment(p2, apexEnd, 0.085, 0.025, barkMat, disposables));
  addFoliageCluster(apexEnd, 1.45);
  addFoliageCluster(p2.clone().add(new THREE.Vector3(0, 0.7, 0)), 1.35);

  return tree;
}

export function createForestTreesGroup(disposables: Array<{ dispose: () => void }>): {
  group: THREE.Group;
  setDarkMode: (isDark: boolean) => void;
} {
  const barkTex = createBarkTexture(disposables);
  const leafTex = createBroadleafClusterTexture(disposables);

  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    roughness: 0.94,
    metalness: 0,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0,
  });
  const leafGeo = new THREE.PlaneGeometry(1.5, 1.5);
  disposables.push(barkMat, leafMat, leafGeo);

  // Build 4 distinct tree archetypes and clone them around the meadow/forest
  const archetypes = [11, 29, 53, 89].map((s) =>
    buildRealisticTreeArchetype(s, barkMat, leafMat, leafGeo, disposables)
  );

  const group = new THREE.Group();
  const rand = createSeededRandom(419);

  let placed = 0;
  let attempts = 0;
  const targetTrees = 52;

  while (placed < targetTrees && attempts < 500) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const dist = 10.5 + rand() * 34;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    // Exclude river channel corridor & close station clearance
    if (z > -5.6 && z < 0.2 && Math.abs(x) < 28) continue;
    if (Math.hypot(x, z) < 9.5) continue;

    const proto = archetypes[placed % archetypes.length];
    const treeClone = proto.clone();
    const scale = 0.85 + rand() * 0.75;
    treeClone.position.set(x, -0.04, z);
    treeClone.rotation.y = rand() * Math.PI * 2;
    treeClone.scale.set(scale, scale * (0.92 + rand() * 0.2), scale);
    group.add(treeClone);
    placed++;
  }

  return {
    group,
    setDarkMode: (isDark: boolean) => {
      leafMat.color.set(isDark ? '#8ba189' : '#ffffff');
      barkMat.color.set(isDark ? '#a8a29c' : '#ffffff');
    },
  };
}

/* ============================================================================
   2. INSTANCED WIND-SWAYING GRASS FIELD (Ported from Contoh/forest3d)
   Uses blade_diffuse.jpg & blade_alpha.jpg with simplex noise wind shader,
   excluding river channel and concrete SPARING platform.
============================================================================ */

const GRASS_VERTEX_SHADER = `
precision mediump float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec3 offset;
attribute vec2 uv;
attribute vec4 orientation;
attribute float halfRootAngleSin;
attribute float halfRootAngleCos;
attribute float stretch;
uniform float time;
varying vec2 vUv;
varying float frc;

vec3 mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec2 mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec3 permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 rotateVectorByQuaternion(vec3 v, vec4 q){
  return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}

vec4 slerp(vec4 v0, vec4 v1, float t) {
  v0 = normalize(v0);
  v1 = normalize(v1);
  float dot_ = dot(v0, v1);
  if (dot_ < 0.0) {
    v1 = -v1;
    dot_ = -dot_;
  }
  const float DOT_THRESHOLD = 0.9995;
  if (dot_ > DOT_THRESHOLD) {
    return normalize(t*(v1 - v0) + v0);
  }
  float theta_0 = acos(dot_);
  float theta = theta_0 * t;
  float sin_theta = sin(theta);
  float sin_theta_0 = sin(theta_0);
  float s0 = cos(theta) - dot_ * sin_theta / sin_theta_0;
  float s1 = sin_theta / sin_theta_0;
  return (s0 * v0) + (s1 * v1);
}

void main() {
  frc = position.y / 0.52;
  float noise = 1.0 - snoise(vec2((time * 0.45 - offset.x / 18.0), (time * 0.45 - offset.z / 18.0)));
  vec4 direction = vec4(0.0, halfRootAngleSin, 0.0, halfRootAngleCos);
  direction = slerp(direction, orientation, frc);

  vec3 vPosition = vec3(position.x, position.y + position.y * stretch, position.z);
  vPosition = rotateVectorByQuaternion(vPosition, direction);
  float angle = noise * 0.24;
  vPosition = rotateVectorByQuaternion(
    vPosition,
    normalize(vec4(sin(angle / 2.0), 0.0, -sin(angle / 2.0), cos(angle / 2.0)))
  );
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(offset + vPosition, 1.0);
}
`;

const GRASS_FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D map;
uniform sampler2D alphaMap;
uniform float brightness;
varying vec2 vUv;
varying float frc;

void main() {
  float alpha = texture2D(alphaMap, vUv).r;
  if (alpha < 0.18) {
    discard;
  }
  vec4 texCol = texture2D(map, vUv);
  // Natural matte meadow green (no oversaturated neon)
  vec3 baseGreen = mix(vec3(0.16, 0.26, 0.13), texCol.rgb * vec3(0.76, 0.86, 0.68), clamp(frc, 0.0, 1.0));
  gl_FragColor = vec4(baseGreen * brightness, 1.0);
}
`;

export function createInstancedGrass(
  loader: THREE.TextureLoader,
  disposables: Array<{ dispose: () => void }>
): {
  mesh: THREE.Mesh;
  update: (timeSec: number) => void;
  setDarkMode: (isDark: boolean) => void;
} {
  const bladeW = 0.075;
  const bladeH = 0.52;
  const joints = 4;
  const baseGeo = new THREE.PlaneGeometry(bladeW, bladeH, 1, joints);
  baseGeo.translate(0, bladeH / 2, 0);

  const instGeo = new THREE.InstancedBufferGeometry();
  instGeo.index = baseGeo.index;
  instGeo.setAttribute('position', baseGeo.attributes.position);
  instGeo.setAttribute('uv', baseGeo.attributes.uv);

  const rand = createSeededRandom(733);
  const offsets: number[] = [];
  const orientations: number[] = [];
  const stretches: number[] = [];
  const halfSin: number[] = [];
  const halfCos: number[] = [];

  const targetBlades = 13500;
  let count = 0;
  let tries = 0;
  const minTilt = -0.24;
  const maxTilt = 0.24;

  while (count < targetBlades && tries < targetBlades * 3) {
    tries++;
    const x = (rand() - 0.5) * 68;
    const z = (rand() - 0.5) * 68;

    // Exclude river channel + concrete embankments
    if (z > -4.35 && z < -0.72) continue;
    // Exclude concrete SPARING platform footprint
    if (Math.abs(x) < 2.95 && z > -1.2 && z < 1.45) continue;

    offsets.push(x, 0, z);

    const yaw = Math.PI - rand() * Math.PI * 2;
    halfSin.push(Math.sin(0.5 * yaw));
    halfCos.push(Math.cos(0.5 * yaw));

    let q0 = new THREE.Vector4(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)).normalize();
    const rx = rand() * (maxTilt - minTilt) + minTilt;
    const qx = new THREE.Vector4(Math.sin(rx / 2), 0, 0, Math.cos(rx / 2)).normalize();
    q0 = multiplyQuaternions(q0, qx);

    const rz = rand() * (maxTilt - minTilt) + minTilt;
    const qz = new THREE.Vector4(0, 0, Math.sin(rz / 2), Math.cos(rz / 2)).normalize();
    q0 = multiplyQuaternions(q0, qz);

    orientations.push(q0.x, q0.y, q0.z, q0.w);
    stretches.push(count < targetBlades / 3 ? rand() * 0.95 : rand() * 0.55);
    count++;
  }

  instGeo.instanceCount = count;
  instGeo.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
  instGeo.setAttribute(
    'orientation',
    new THREE.InstancedBufferAttribute(new Float32Array(orientations), 4)
  );
  instGeo.setAttribute('stretch', new THREE.InstancedBufferAttribute(new Float32Array(stretches), 1));
  instGeo.setAttribute(
    'halfRootAngleSin',
    new THREE.InstancedBufferAttribute(new Float32Array(halfSin), 1)
  );
  instGeo.setAttribute(
    'halfRootAngleCos',
    new THREE.InstancedBufferAttribute(new Float32Array(halfCos), 1)
  );

  const bladeDiffuse = loader.load('/forest/blade_diffuse.jpg');
  const bladeAlpha = loader.load('/forest/blade_alpha.jpg');
  bladeDiffuse.colorSpace = THREE.SRGBColorSpace;
  disposables.push(baseGeo, instGeo, bladeDiffuse, bladeAlpha);

  const grassMat = new THREE.RawShaderMaterial({
    uniforms: {
      map: { value: bladeDiffuse },
      alphaMap: { value: bladeAlpha },
      time: { value: 0 },
      brightness: { value: 0.92 },
    },
    vertexShader: GRASS_VERTEX_SHADER,
    fragmentShader: GRASS_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
  });
  disposables.push(grassMat);

  const mesh = new THREE.Mesh(instGeo, grassMat);
  mesh.frustumCulled = false;

  return {
    mesh,
    update: (timeSec: number) => {
      grassMat.uniforms.time.value = timeSec;
    },
    setDarkMode: (isDark: boolean) => {
      grassMat.uniforms.brightness.value = isDark ? 0.56 : 0.92;
    },
  };
}

/* ============================================================================
   3. FLOWING, RIPPLING & SPLASHING WATER SIMULATION
   Directional waves + scrolling flow-streak texture + splash/foam particles
   at the Intake Sluice Gate and around the 4 submerged Sampling Probes.
============================================================================ */

function createFlowTexture(disposables: Array<{ dispose: () => void }>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base muted water tone (multiplied with material color)
    ctx.fillStyle = '#c8d9e2';
    ctx.fillRect(0, 0, 512, 256);

    const rand = createSeededRandom(911);
    // Subtle darker current bands
    for (let i = 0; i < 48; i++) {
      const x = rand() * 512;
      const y = rand() * 256;
      const len = 45 + rand() * 110;
      const h = 3 + rand() * 7;
      ctx.fillStyle = 'rgba(72, 108, 126, 0.22)';
      ctx.fillRect(x, y, len, h);
    }

    // Fine light matte foam streamlines flowing horizontally
    for (let i = 0; i < 95; i++) {
      const x = rand() * 512;
      const y = rand() * 256;
      const len = 18 + rand() * 68;
      ctx.strokeStyle = `rgba(244, 249, 252, ${0.14 + rand() * 0.26})`;
      ctx.lineWidth = 1 + rand() * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len * 0.5, y + (rand() - 0.5) * 6, x + len, y);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5.5, 1.4);
  tex.anisotropy = 4;
  disposables.push(tex);
  return tex;
}

function createDropletTexture(disposables: Array<{ dispose: () => void }>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(245, 250, 252, 0.95)');
    grad.addColorStop(0.55, 'rgba(225, 238, 244, 0.65)');
    grad.addColorStop(1, 'rgba(225, 238, 244, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(tex);
  return tex;
}

export function createFlowingWaterSystem(disposables: Array<{ dispose: () => void }>): {
  group: THREE.Group;
  update: (timeSec: number, dt: number, animate: boolean) => void;
  setThemeColor: (hex: string, isDark: boolean) => void;
} {
  const group = new THREE.Group();

  // High-subdivision channel surface extending across the forest scene
  const waterGeo = new THREE.PlaneGeometry(76, 2.86, 140, 20);
  const flowTex = createFlowTexture(disposables);
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#6f94a5',
    map: flowTex,
    roughness: 0.42,
    metalness: 0.04,
  });
  disposables.push(waterGeo, waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, 0.04, -2.5);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  const basePos = Float32Array.from(waterGeo.attributes.position.array);

  // Splashing droplets & turbulent whitewater foam ("bergemercik")
  const particleCount = 240;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const ages = new Float32Array(particleCount);
  const lifetimes = new Float32Array(particleCount);
  const zones = new Uint8Array(particleCount); // 0 = Intake Gate splash, 1 = Probes wake, 2 = Channel foam flecks

  const rand = createSeededRandom(577);

  const respawn = (i: number, randomInitialAge = false) => {
    const zone = i < 120 ? 0 : i < 190 ? 1 : 2;
    zones[i] = zone;

    if (zone === 0) {
      // Turbulent splash right downstream of the Intake Sluice Gate (x = -3.35)
      positions[i * 3] = -3.32 + rand() * 0.45;
      positions[i * 3 + 1] = 0.06 + rand() * 0.06;
      positions[i * 3 + 2] = -3.72 + rand() * 2.44;
      velocities[i * 3] = 0.95 + rand() * 1.1; // flows +X
      velocities[i * 3 + 1] = 0.55 + rand() * 0.95; // arcs upward (gemercik)
      velocities[i * 3 + 2] = (rand() - 0.5) * 0.35;
      lifetimes[i] = 0.48 + rand() * 0.52;
    } else if (zone === 1) {
      // Micro-splashes & wake foam around the 4 submerged sampling probes (x = 0.4, z = -1.9)
      positions[i * 3] = 0.26 + rand() * 0.36;
      positions[i * 3 + 1] = 0.06 + rand() * 0.04;
      positions[i * 3 + 2] = -2.14 + rand() * 0.48;
      velocities[i * 3] = 0.75 + rand() * 0.75;
      velocities[i * 3 + 1] = 0.28 + rand() * 0.45;
      velocities[i * 3 + 2] = (rand() - 0.5) * 0.25;
      lifetimes[i] = 0.42 + rand() * 0.45;
    } else {
      // Drifting surface foam flecks flowing along the river
      positions[i * 3] = -14 + rand() * 28;
      positions[i * 3 + 1] = 0.075;
      positions[i * 3 + 2] = -3.7 + rand() * 2.4;
      velocities[i * 3] = 1.25 + rand() * 0.65;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = (rand() - 0.5) * 0.08;
      lifetimes[i] = 1.6 + rand() * 1.8;
    }

    ages[i] = randomInitialAge ? rand() * lifetimes[i] : 0;
  };

  for (let i = 0; i < particleCount; i++) {
    respawn(i, true);
  }

  const splashGeo = new THREE.BufferGeometry();
  splashGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dropletTex = createDropletTexture(disposables);
  const splashMat = new THREE.PointsMaterial({
    map: dropletTex,
    color: '#eef6fa',
    size: 0.14,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  disposables.push(splashGeo, splashMat);

  const splashPoints = new THREE.Points(splashGeo, splashMat);
  group.add(splashPoints);

  return {
    group,
    update: (timeSec: number, dt: number, animate: boolean) => {
      if (!animate) return;
      const safeDt = Math.min(dt, 0.05);

      // 1. Scroll horizontal current texture (+X downstream)
      flowTex.offset.x -= safeDt * 0.36;
      flowTex.offset.y = Math.sin(timeSec * 0.65) * 0.03;

      // 2. Multi-octave directional traveling waves + obstacle turbulence
      const posAttr = waterGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = basePos[i * 3];
        const vy = basePos[i * 3 + 1]; // maps to -Z in world space
        const worldZ = -2.5 - vy;

        // Primary flowing wave moving from -X to +X
        let h =
          Math.sin(vx * 1.35 - timeSec * 2.6 + vy * 0.9) * 0.022 +
          Math.sin(vx * 2.7 - timeSec * 4.1 - vy * 1.6) * 0.011 +
          Math.cos(vx * 0.65 - timeSec * 1.4) * 0.012;

        // Extra choppy turbulence right after the Intake Sluice Gate (x in [-3.4, -1.2])
        if (vx > -3.5 && vx < -1.0) {
          const gateFactor = Math.exp(-Math.pow((vx + 2.8) * 1.15, 2));
          h += Math.sin(vx * 6.5 - timeSec * 7.8 + vy * 3.2) * 0.032 * gateFactor;
        }

        // Subtle wake ripple around submerged Sampling Probes (x ~ 0.4, z ~ -1.9)
        const dProbe = Math.hypot(vx - 0.55, worldZ + 1.9);
        if (dProbe < 1.1) {
          const wake = (1 - dProbe / 1.1) * 0.024;
          h += Math.sin(dProbe * 11 - timeSec * 6.5) * wake;
        }

        posAttr.setZ(i, h);
      }
      posAttr.needsUpdate = true;
      waterGeo.computeVertexNormals();

      // 3. Update splashing droplets & foam flecks
      const spAttr = splashGeo.attributes.position as THREE.BufferAttribute;
      const arr = spAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        ages[i] += safeDt;
        if (ages[i] >= lifetimes[i]) {
          respawn(i, false);
        } else {
          arr[i * 3] += velocities[i * 3] * safeDt;
          arr[i * 3 + 1] += velocities[i * 3 + 1] * safeDt;
          arr[i * 3 + 2] += velocities[i * 3 + 2] * safeDt;

          if (zones[i] !== 2) {
            // Gravity pulls splashing droplets back into the stream
            velocities[i * 3 + 1] -= 3.1 * safeDt;
            if (arr[i * 3 + 1] < 0.05) {
              arr[i * 3 + 1] = 0.05;
              velocities[i * 3 + 1] = Math.abs(velocities[i * 3 + 1]) * 0.25;
            }
          }
        }
      }
      spAttr.needsUpdate = true;
    },
    setThemeColor: (hex: string, isDark: boolean) => {
      waterMat.color.set(hex);
      splashMat.color.set(isDark ? '#a8c2cf' : '#eef6fa');
      splashMat.opacity = isDark ? 0.52 : 0.78;
    },
  };
}
