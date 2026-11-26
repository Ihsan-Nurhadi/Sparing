import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCw } from 'lucide-react';
import * as THREE from 'three';
import { Language, ParameterKey, SubsystemId, ThemeMode } from '../../types/sparing';
import { PARAMETERS } from '../../data/mockSparingData';
import { translations } from '../../i18n/translations';
import {
  createFlowingWaterSystem,
  createForestTreesGroup,
  createInstancedGrass,
} from './forestEnvironment';

interface SparingStage3DProps {
  lang: Language;
  theme: ThemeMode;
  liveValues: Record<ParameterKey, number>;
  enabledParams?: ParameterKey[];
  selectedSubsystem: SubsystemId;
  selectedParam: ParameterKey | null;
  onSelectSubsystem: (sub: SubsystemId) => void;
  onSelectParam: (param: ParameterKey | null) => void;
}

const TX = 0.4;

const CAMERA_PRESETS: Record<
  SubsystemId,
  { t: [number, number, number]; th: number; ph: number; d: number }
> = {
  all: { t: [0.1, 2.0, -0.2], th: 0.5, ph: 1.25, d: 12.4 },
  solar: { t: [TX, 4.5, 0], th: 0.4, ph: 1.15, d: 5.6 },
  instrument: { t: [TX, 2.6, 0.2], th: 0.3, ph: 1.3, d: 4.8 },
  cabinet: { t: [TX, 1.2, 0.2], th: 0.3, ph: 1.3, d: 5.0 },
  sampling: { t: [TX, 0.5, -1.8], th: 2.3, ph: 1.22, d: 5.0 },
  debit: { t: [1.9, 1.2, -2.2], th: 2.3, ph: 1.25, d: 5.0 },
  gate: { t: [-3.4, 1.0, -2.5], th: 1.1, ph: 1.3, d: 7.5 },
};

const HOTSPOT_DEFS: Array<{
  part: SubsystemId;
  labelKey: 'hsSolar' | 'hsInstrument' | 'hsCabinet' | 'hsSampling' | 'hsGate';
  pos: [number, number, number];
}> = [
  { part: 'solar', labelKey: 'hsSolar', pos: [TX + 0.9, 4.75, 0] },
  { part: 'instrument', labelKey: 'hsInstrument', pos: [TX + 0.36, 2.8, 0.35] },
  { part: 'cabinet', labelKey: 'hsCabinet', pos: [TX + 0.41, 0.8, 0.45] },
  { part: 'sampling', labelKey: 'hsSampling', pos: [TX, 1.02, -1.9] },
  { part: 'gate', labelKey: 'hsGate', pos: [-3.4, 1.95, -2.5] },
];

export const SparingStage3D: React.FC<SparingStage3DProps> = ({
  lang,
  theme,
  liveValues,
  enabledParams,
  selectedSubsystem,
  selectedParam,
  onSelectSubsystem,
  onSelectParam,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const hsElsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const chipElsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const lineElsRef = useRef<Record<string, SVGLineElement | null>>({});
  const dotElsRef = useRef<Record<string, SVGCircleElement | null>>({});

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [webglFailed, setWebglFailed] = useState<boolean>(false);

  const latestRef = useRef({
    lang,
    theme,
    liveValues,
    selectedSubsystem,
    selectedParam,
    autoRotate,
    onSelectSubsystem,
    onSelectParam,
  });
  latestRef.current = {
    lang,
    theme,
    liveValues,
    selectedSubsystem,
    selectedParam,
    autoRotate,
    onSelectSubsystem,
    onSelectParam,
  };

  const apiRef = useRef<{
    go: (part: SubsystemId) => void;
    zoomBy: (factor: number) => void;
    highlight: () => void;
    drawDisplay: () => void;
    applyTheme: () => void;
  } | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) setAutoRotate(false);

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const cv = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 220);

    const disposables: Array<{ dispose: () => void }> = [];

    // Skybox Cubemap from Contoh/forest3d/materials/ (copied to public/forest/)
    const cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('/forest/');
    const skyboxTex = cubeLoader.load([
      'px.jpg',
      'nx.jpg',
      'py.jpg',
      'ny.jpg',
      'pz.jpg',
      'nz.jpg',
    ]);
    skyboxTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyboxTex;
    disposables.push(skyboxTex);

    // Stable matte natural daylight (no fast spinning sun; adapts cleanly to Light/Dark theme)
    const hemi = new THREE.HemisphereLight(0xf6f3eb, 0x6f7a6d, 0.65 * Math.PI);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff9ef, 0.68 * Math.PI);
    sun.position.set(10, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -14;
    sc.right = 14;
    sc.top = 14;
    sc.bottom = -14;
    sc.near = 1;
    sc.far = 55;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xdfe9ef, 0.18 * Math.PI);
    fill.position.set(-8, 6, -5);
    scene.add(fill);

    // Matte industrial colors (zero metalness, zero emissive glow)
    const C = {
      steel: '#8c979d',
      steelD: '#566268',
      box: '#aeb8bc',
      door: '#c4ccd0',
      ink: '#2a343b',
      frame: '#b9c1c5',
      oc: '#b9953a',
      ch: '#2b3236',
      dark: '#46515a',
    };

    const M = (color: string, roughness = 0.82) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
      disposables.push(mat);
      return mat;
    };

    const mBank = M('#8f9a9a', 0.95);
    const mConc = M('#a3aaaa', 0.95);

    const add = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      mat: THREE.Material | THREE.Material[],
      x: number,
      y: number,
      z: number
    ) => {
      disposables.push(geo);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const BX = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const CY = (rt: number, rb: number, h: number, s = 20) =>
      new THREE.CylinderGeometry(rt, rb, h, s);

    const canvasTex = (
      w: number,
      h: number,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
    ) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (ctx) draw(ctx, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      disposables.push(tex);
      return tex;
    };

    // 1. FOREST3D EXTENDED SOIL TERRAIN (Split neatly around the carved river channel)
    const texLoader = new THREE.TextureLoader();
    const soilTex = texLoader.load('/forest/soil.jpg');
    soilTex.colorSpace = THREE.SRGBColorSpace;
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping;
    soilTex.repeat.set(16, 8);
    disposables.push(soilTex);

    const soilMat = new THREE.MeshStandardMaterial({
      map: soilTex,
      color: '#d8d2c6',
      roughness: 0.96,
      metalness: 0,
    });
    disposables.push(soilMat);

    // South bank terrain (station side: z from -1.05 to +38.95)
    const southGeo = new THREE.PlaneGeometry(80, 40);
    disposables.push(southGeo);
    const southGround = new THREE.Mesh(southGeo, soilMat);
    southGround.rotation.x = -Math.PI / 2;
    southGround.position.set(0, 0, 18.95);
    southGround.receiveShadow = true;
    scene.add(southGround);

    // North bank terrain (far riverbank: z from -43.95 to -3.95)
    const northGeo = new THREE.PlaneGeometry(80, 40);
    disposables.push(northGeo);
    const northGround = new THREE.Mesh(northGeo, soilMat);
    northGround.rotation.x = -Math.PI / 2;
    northGround.position.set(0, 0, -23.95);
    northGround.receiveShadow = true;
    scene.add(northGround);

    // Recessed riverbed beneath the flowing water
    const bedGeo = new THREE.PlaneGeometry(80, 3.2);
    const bedMat = M('#4b5b61', 0.96);
    disposables.push(bedGeo);
    const riverBed = new THREE.Mesh(bedGeo, bedMat);
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(0, -0.35, -2.5);
    riverBed.receiveShadow = true;
    scene.add(riverBed);

    // Extended concrete embankments along river edges
    add(scene, BX(76, 0.16, 0.32), mBank, 0, 0.08, -1.05);
    add(scene, BX(76, 0.16, 0.32), mBank, 0, 0.08, -3.95);

    // 2. FLOWING, RIPPLING & SPLASHING WATER SYSTEM
    const waterSystem = createFlowingWaterSystem(disposables);
    scene.add(waterSystem.group);

    // 3. INSTANCED WIND-SWAYING GRASS & REALISTIC BRANCHING 3D TREES (Contoh/tree.png)
    const grassSystem = createInstancedGrass(texLoader, disposables);
    scene.add(grassSystem.mesh);

    const treesSystem = createForestTreesGroup(disposables);
    scene.add(treesSystem.group);

    // 4. Concrete platform with yellow-black diagonal hazard stripe sides & guardrails
    const stripeTex = (rep: number) => {
      const tex = canvasTex(128, 64, (g) => {
        g.fillStyle = C.ch;
        g.fillRect(0, 0, 128, 64);
        g.fillStyle = C.oc;
        for (let i = -2; i < 6; i++) {
          g.beginPath();
          g.moveTo(i * 32, 64);
          g.lineTo(i * 32 + 16, 64);
          g.lineTo(i * 32 + 80, 0);
          g.lineTo(i * 32 + 64, 0);
          g.closePath();
          g.fill();
        }
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rep, 1);
      return tex;
    };

    const mLong = new THREE.MeshStandardMaterial({
      map: stripeTex(5.8),
      roughness: 0.9,
      metalness: 0,
    });
    const mShort = new THREE.MeshStandardMaterial({
      map: stripeTex(2.4),
      roughness: 0.9,
      metalness: 0,
    });
    disposables.push(mLong, mShort);

    const platform = add(
      scene,
      BX(5.2, 0.45, 2.2),
      [mShort, mShort, mConc, mConc, mLong, mLong],
      0,
      0.225,
      0.1
    );
    platform.castShadow = true;

    const railLine = (ax: number, az: number, bx: number, bz: number) => {
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, dz);
      const n = Math.ceil(len / 1.2);
      const g = new THREE.Group();
      scene.add(g);
      for (let i = 0; i <= n; i++) {
        add(g, CY(0.028, 0.028, 0.9, 10), M(C.steel), ax + (dx * i) / n, 0.9, az + (dz * i) / n);
      }
      const seg = Math.ceil(len / 0.6);
      const sl = len / seg;
      for (let i = 0; i < seg; i++) {
        const f = (i + 0.5) / seg;
        const bar = add(
          g,
          BX(0.05, 0.07, sl),
          M(i % 2 ? C.ch : C.oc),
          ax + dx * f,
          1.3,
          az + dz * f
        );
        bar.rotation.y = ang;
      }
      const mid = add(g, CY(0.02, 0.02, len, 8), M(C.steel), ax + dx / 2, 0.95, az + dz / 2);
      mid.rotation.order = 'YXZ';
      mid.rotation.x = Math.PI / 2;
      mid.rotation.y = ang;
    };

    railLine(-2.45, 1.12, 2.45, 1.12);
    railLine(-2.55, 1.12, -2.55, -0.85);
    railLine(2.55, 1.12, 2.55, -0.85);

    // 5. Central steel pole & base anchor plate
    const pole = new THREE.Group();
    scene.add(pole);
    add(pole, BX(0.56, 0.04, 0.46), M(C.steelD), TX, 0.47, 0);
    [
      [-0.2, -0.16],
      [0.2, -0.16],
      [-0.2, 0.16],
      [0.2, 0.16],
    ].forEach((p) => {
      add(pole, CY(0.02, 0.02, 0.05, 8), M(C.steel), TX + p[0], 0.5, p[1]);
    });
    add(pole, CY(0.055, 0.055, 4.05, 24), M(C.steel, 0.7), TX, 2.5, 0);

    // 6. Solar PV Module
    const solarG = new THREE.Group();
    scene.add(solarG);
    const tilt = new THREE.Group();
    tilt.position.set(TX, 4.64, 0);
    tilt.rotation.x = 0.5;
    solarG.add(tilt);
    add(tilt, BX(1.7, 0.05, 1.1), M(C.frame, 0.6), 0, 0, 0);
    add(tilt, BX(0.1, 0.14, 0.5), M(C.steelD), 0, -0.1, 0);
    [-0.3, 0.3].forEach((z) => {
      add(tilt, BX(1.5, 0.04, 0.05), M(C.steelD), 0, -0.045, z);
    });
    const cellTex = canvasTex(512, 320, (g, w, h) => {
      g.fillStyle = '#22364f';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3b5373';
      g.lineWidth = 2;
      for (let i = 1; i < 10; i++) {
        g.beginPath();
        g.moveTo((i * w) / 10, 0);
        g.lineTo((i * w) / 10, h);
        g.stroke();
      }
      for (let j = 1; j < 6; j++) {
        g.beginPath();
        g.moveTo(0, (j * h) / 6);
        g.lineTo(w, (j * h) / 6);
        g.stroke();
      }
    });
    const cellMat = new THREE.MeshStandardMaterial({
      map: cellTex,
      roughness: 0.65,
      metalness: 0,
    });
    const cellGeo = new THREE.PlaneGeometry(1.6, 1.0);
    disposables.push(cellMat, cellGeo);
    const cells = new THREE.Mesh(cellGeo, cellMat);
    cells.rotation.x = -Math.PI / 2;
    cells.position.y = 0.03;
    cells.receiveShadow = true;
    tilt.add(cells);

    // 7. Upper Instrument Control & Data Logger Cabinet (Device name ONLY)
    const instrG = new THREE.Group();
    scene.add(instrG);
    add(instrG, BX(0.72, 0.8, 0.3), M(C.box), TX, 2.6, 0.18);
    add(instrG, BX(0.68, 0.76, 0.02), M(C.door), TX, 2.6, 0.34);

    const dc = document.createElement('canvas');
    dc.width = 256;
    dc.height = 128;
    const dg = dc.getContext('2d');
    const dtex = new THREE.CanvasTexture(dc);
    dtex.colorSpace = THREE.SRGBColorSpace;
    const dmat = new THREE.MeshBasicMaterial({ map: dtex });
    const dispGeo = new THREE.PlaneGeometry(0.34, 0.17);
    disposables.push(dtex, dmat, dispGeo);
    const disp = new THREE.Mesh(dispGeo, dmat);
    disp.position.set(TX, 2.78, 0.352);
    instrG.add(disp);

    add(instrG, BX(0.4, 0.21, 0.006), M(C.ink), TX, 2.78, 0.346);
    [-0.1, 0, 0.1].forEach((x) => {
      const btn = add(instrG, CY(0.02, 0.02, 0.02, 12), M(C.steelD), TX + x, 2.57, 0.355);
      btn.rotation.x = Math.PI / 2;
    });

    const plateTex = canvasTex(256, 48, (g, w, h) => {
      g.fillStyle = '#dde3e6';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#123F6B';
      g.font = '700 22px sans-serif';
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.fillText('SPARING', w / 2, h / 2 + 1);
    });
    const plateMat = new THREE.MeshStandardMaterial({
      map: plateTex,
      roughness: 0.8,
      metalness: 0,
    });
    const plateGeo = new THREE.PlaneGeometry(0.34, 0.064);
    disposables.push(plateMat, plateGeo);
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(TX, 2.38, 0.352);
    instrG.add(plate);
    add(instrG, CY(0.015, 0.015, 0.14, 8), M(C.steelD), TX - 0.32, 2.6, 0.36);

    // 8. Lower Power & Communication Cabinet
    const cabG = new THREE.Group();
    scene.add(cabG);
    add(cabG, BX(0.82, 0.96, 0.42), M(C.box), TX, 1.12, 0.22);
    [-1, 1].forEach((s) => {
      add(cabG, BX(0.385, 0.92, 0.02), M(C.door), TX + s * 0.195, 1.12, 0.44);
      add(cabG, CY(0.014, 0.014, 0.2, 8), M(C.steelD), TX + s * 0.03, 1.12, 0.465);
    });
    add(cabG, BX(0.16, 0.12, 0.008), M(C.ink), TX + 0.2, 1.42, 0.452);
    add(cabG, BX(0.1, 0.1, 0.008), M(C.dark), TX - 0.2, 1.42, 0.452);
    add(cabG, CY(0.012, 0.012, 1.1, 8), M(C.ink), TX + 0.55, 1.8, 0.12);
    add(cabG, CY(0.03, 0.03, 0.08, 10), M(C.steelD), TX + 0.55, 1.27, 0.12);
    add(cabG, CY(0.022, 0.022, 0.2, 10), M(C.ink), TX + 0.18, 0.57, 0.1);

    // 9. Sampling Arm, Curved Conduit, & 4 Submerged Water Quality Probes (pH, COD, TSS, NH3-N)
    const sondeG = new THREE.Group();
    scene.add(sondeG);
    add(sondeG, BX(0.1, 0.34, 0.1), M(C.steelD), TX, 0.62, -0.9);
    add(sondeG, BX(0.1, 0.08, 1.15), M(C.steelD), TX, 0.82, -1.45);
    add(sondeG, BX(0.48, 0.04, 0.48), M(C.steelD), TX, 0.8, -1.9);

    const conduitGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(TX + 0.18, 0.58, 0.1),
        new THREE.Vector3(TX + 0.18, 0.52, -0.3),
        new THREE.Vector3(TX + 0.1, 0.54, -0.9),
        new THREE.Vector3(TX, 0.92, -1.05),
        new THREE.Vector3(TX, 0.9, -1.7),
        new THREE.Vector3(TX, 0.84, -1.88),
      ]),
      48,
      0.02,
      8,
      false
    );
    disposables.push(conduitGeo);
    const conduit = new THREE.Mesh(conduitGeo, M(C.ink));
    conduit.castShadow = true;
    sondeG.add(conduit);

    const probes: Partial<Record<ParameterKey, THREE.Group>> = {};
    const anchors: Record<ParameterKey, THREE.Vector3> = {} as Record<ParameterKey, THREE.Vector3>;
    const spots: Partial<Record<ParameterKey, [number, number]>> = {
      ph: [-0.1, -0.1],
      cod: [0.1, -0.1],
      tss: [-0.1, 0.1],
      nh3n: [0.1, 0.1],
    };

    PARAMETERS.forEach((p) => {
      const sp = spots[p.key];
      if (!sp) return;
      const g = new THREE.Group();
      const x = TX + sp[0];
      const z = -1.9 + sp[1];
      add(g, CY(0.035, 0.035, 0.98, 14), M(C.dark), x, 0.28, z);
      add(g, CY(0.05, 0.05, 0.1, 16), M(p.hexLight, 0.7), x, 0.87, z);
      add(g, new THREE.SphereGeometry(0.036, 12, 10), M(C.steelD), x, -0.2, z);
      sondeG.add(g);
      probes[p.key] = g;
      anchors[p.key] = new THREE.Vector3(x, 0.93, z);
    });

    // 10. Ultrasonic Discharge Rate (Debit) Sensor Mounted Over Channel
    const debitG = new THREE.Group();
    scene.add(debitG);
    add(debitG, BX(0.08, 1.0, 0.08), M(C.steelD), 1.9, 0.95, -0.9);
    add(debitG, BX(0.07, 0.07, 1.35), M(C.steelD), 1.9, 1.45, -1.55);
    add(debitG, CY(0.09, 0.09, 0.14, 20), M(C.dark), 1.9, 1.36, -2.2);
    add(debitG, CY(0.06, 0.06, 0.02, 20), M(C.steel), 1.9, 1.28, -2.2);
    anchors.debit = new THREE.Vector3(1.9, 1.4, -2.2);

    const beamGeo = new THREE.ConeGeometry(0.5, 1.26, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x4e8fb0,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(beamGeo, beamMat);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(1.9, 0.65, -2.2);
    beam.visible = false;
    scene.add(beam);

    // 11. Intake Sluice Gate
    const gateG = new THREE.Group();
    scene.add(gateG);
    [-1.05, -3.95].forEach((z) => {
      add(gateG, BX(0.16, 1.7, 0.16), M(C.steelD), -3.4, 0.85, z);
    });
    add(gateG, BX(0.14, 0.14, 3.1), M(C.steelD), -3.4, 1.7, -2.5);
    add(gateG, BX(0.07, 1.3, 2.6), M(C.dark), -3.4, 0.62, -2.5);
    add(gateG, CY(0.025, 0.025, 0.35, 8), M(C.steel), -3.4, 1.95, -2.5);
    const wheel = add(gateG, new THREE.TorusGeometry(0.17, 0.02, 8, 28), M(C.ch), -3.4, 2.13, -2.5);
    wheel.rotation.x = Math.PI / 2;
    add(gateG, BX(0.34, 0.025, 0.025), M(C.ch), -3.4, 2.13, -2.5);
    add(gateG, BX(0.025, 0.025, 0.34), M(C.ch), -3.4, 2.13, -2.5);

    // 12. Raycastable Pick List
    const partsMap: Record<Exclude<SubsystemId, 'all'>, THREE.Group> = {
      solar: solarG,
      instrument: instrG,
      cabinet: cabG,
      sampling: sondeG,
      debit: debitG,
      gate: gateG,
    };
    const pickList: THREE.Object3D[] = [];
    (Object.keys(partsMap) as Array<Exclude<SubsystemId, 'all'>>).forEach((k) => {
      partsMap[k].traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o !== disp) {
          o.userData.part = k;
          pickList.push(o);
        }
      });
    });
    (Object.keys(probes) as ParameterKey[]).forEach((id) => {
      probes[id]?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.userData.param = id;
      });
    });
    debitG.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.userData.param = 'debit';
    });

    // 13. Thin Wireframe Selection Helpers (zero neon/glow)
    const partBox = new THREE.Box3Helper(new THREE.Box3(), 0x5b6b75);
    const probeBox = new THREE.Box3Helper(new THREE.Box3(), 0x4e9a74);
    partBox.visible = false;
    probeBox.visible = false;
    scene.add(partBox);
    scene.add(probeBox);

    const setBox = (helper: THREE.Box3Helper, obj: THREE.Object3D) => {
      const b = new THREE.Box3().setFromObject(obj);
      b.expandByScalar(0.07);
      helper.box.copy(b);
      helper.visible = true;
    };

    const highlight = () => {
      const { selectedSubsystem: curPart, selectedParam: curParam, theme: curTheme } =
        latestRef.current;
      if (curPart === 'all') {
        partBox.visible = false;
      } else {
        setBox(partBox, partsMap[curPart]);
        (partBox.material as THREE.LineBasicMaterial).color.set(
          curTheme === 'dark' ? '#98a1ae' : '#4b5e69'
        );
      }

      if (curParam && (curPart === 'sampling' || curPart === 'debit')) {
        const targetObj = probes[curParam] || (curParam === 'debit' ? debitG : null);
        const meta = PARAMETERS.find((p) => p.key === curParam);
        if (targetObj && meta) {
          setBox(probeBox, targetObj);
          (probeBox.material as THREE.LineBasicMaterial).color.set(
            curTheme === 'dark' ? meta.hexDark : meta.hexLight
          );
        } else {
          probeBox.visible = false;
        }
      } else {
        probeBox.visible = false;
      }

      beam.visible = curPart === 'debit';
    };

    // 14. Live Upper Cabinet LCD Readout
    const drawDisplay = () => {
      if (!dg) return;
      const { selectedParam: curParam, liveValues: vals } = latestRef.current;
      const activeKey = curParam || 'cod';
      const meta = PARAMETERS.find((p) => p.key === activeKey) || PARAMETERS[1];
      const val = vals[meta.key];

      dg.fillStyle = '#1c2a2d';
      dg.fillRect(0, 0, 256, 128);
      dg.fillStyle = '#8fa8a0';
      dg.font = '500 17px monospace';
      dg.fillText('SPARING-01', 12, 26);
      dg.fillStyle = '#d6e4dc';
      dg.font = '600 21px monospace';
      dg.fillText(meta.key === 'debit' ? 'DEBIT' : meta.code, 12, 60);
      dg.font = '600 36px monospace';
      dg.fillText(val.toFixed(meta.decimals), 12, 106);
      dg.fillStyle = '#8fa8a0';
      dg.font = '500 15px monospace';
      dg.fillText(meta.unit === 'pH' ? '' : meta.unit, 186, 106);
      dtex.needsUpdate = true;
    };

    // 15. Theme Application (Light / Dark Matte Balance for Forest + Water + Skybox)
    const applyTheme = () => {
      const isDark = latestRef.current.theme === 'dark';
      const waterColor = cv('--scene-water') || (isDark ? '#3c5e6e' : '#648da0');
      mBank.color.set(cv('--scene-bank') || (isDark ? '#3c4d55' : '#8f9a9a'));
      mConc.color.set(cv('--scene-concrete') || (isDark ? '#6d7a80' : '#a3aaaa'));
      soilMat.color.set(isDark ? '#6e7375' : '#d8d2c6');
      bedMat.color.set(isDark ? '#243138' : '#4b5b61');

      waterSystem.setThemeColor(waterColor, isDark);
      grassSystem.setDarkMode(isDark);
      treesSystem.setDarkMode(isDark);

      scene.backgroundIntensity = isDark ? 0.24 : 0.96;
      scene.fog = new THREE.FogExp2(isDark ? '#141e25' : '#d6cfc2', isDark ? 0.015 : 0.0085);

      const k = isDark ? 0.68 : 1.0;
      hemi.intensity = 0.65 * Math.PI * k;
      sun.intensity = 0.68 * Math.PI * k;
      fill.intensity = 0.18 * Math.PI * k;
      highlight();
    };

    // 16. Spherical Orbit Controller & Resize
    let W = 1;
    let H = 1;
    const aspectK = () => clamp(0.9 / camera.aspect, 1, 1.4);

    const view = { t: new THREE.Vector3(), th: 0.5, ph: 1.25, d: 12.4 };
    const goal = { t: new THREE.Vector3(), th: 0.5, ph: 1.25, d: 12.4 };
    let autoOff = 0;

    const go = (part: SubsystemId) => {
      const p = CAMERA_PRESETS[part] || CAMERA_PRESETS.all;
      goal.t.set(p.t[0], p.t[1], p.t[2]);
      goal.th = p.th;
      goal.ph = p.ph;
      goal.d = p.d * (part === 'all' ? aspectK() : 1);
    };

    const zoomBy = (factor: number) => {
      goal.d = clamp(goal.d * factor, 3.5, 24);
    };

    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      W = w;
      H = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (latestRef.current.selectedSubsystem === 'all') {
        goal.d = CAMERA_PRESETS.all.d * aspectK();
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    // Pointer Drag Orbit & Click Raycasting
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const q = pts.get(e.pointerId);
      if (!q) return;
      const dx = e.clientX - q.x;
      const dy = e.clientY - q.y;
      q.x = e.clientX;
      q.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 4 && latestRef.current.autoRotate) {
        setAutoRotate(false);
      }
      goal.th -= dx * 0.006;
      if (e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === 'touch') {
        goal.ph = clamp(goal.ph - dy * 0.005, 0.35, 1.48);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const had = pts.delete(e.pointerId);
      if (!had || moved > 5) return;
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickList, false)[0];
      if (!hit) return;
      const u = hit.object.userData as { part?: SubsystemId; param?: ParameterKey };
      if (u.param) {
        latestRef.current.onSelectParam(u.param);
      }
      if (u.part) {
        const nextPart =
          u.part === latestRef.current.selectedSubsystem && !u.param ? 'all' : u.part;
        latestRef.current.onSelectSubsystem(nextPart);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      pts.delete(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      goal.d = clamp(goal.d * Math.exp(e.deltaY * 0.001), 3.5, 24);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // 17. 3D-to-2D Projection for Hotspot Pills & Conditional Parameter Leader Chips
    const tmp = new THREE.Vector3();
    const hsVectors = HOTSPOT_DEFS.map((h) => ({
      part: h.part,
      vec: new THREE.Vector3(h.pos[0], h.pos[1], h.pos[2]),
    }));

    const proj = (v: THREE.Vector3) => {
      tmp.copy(v).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, z: tmp.z };
    };

    const placeLabels = () => {
      hsVectors.forEach((h) => {
        const el = hsElsRef.current[h.part];
        if (!el) return;
        const s = proj(h.vec);
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
        el.style.display = s.z > 1 ? 'none' : '';
      });

      const curPart = latestRef.current.selectedSubsystem;
      const narrow = W < 560;
      const curParam = latestRef.current.selectedParam || 'cod';

      // Parameter chips ONLY appear when Sampling (4 probes) or Debit (debit probe) is active!
      const visibleKeys: ParameterKey[] =
        curPart === 'sampling'
          ? ['ph', 'cod', 'tss', 'nh3n']
          : curPart === 'debit'
          ? ['debit']
          : [];

      PARAMETERS.forEach((p) => {
        const chipEl = chipElsRef.current[p.key];
        const lnEl = lineElsRef.current[p.key];
        const dotEl = dotElsRef.current[p.key];
        if (!chipEl || !lnEl || !dotEl) return;

        const visIdx = visibleKeys.indexOf(p.key);
        const show = visIdx !== -1 && (!narrow || p.key === curParam || visibleKeys.length === 1);

        chipEl.style.display = show ? '' : 'none';
        lnEl.style.display = show ? '' : 'none';
        dotEl.style.display = show ? '' : 'none';
        if (!show) return;

        const w = chipEl.offsetWidth || 128;
        const a = proj(anchors[p.key]);
        const x = W - w - 14;
        const midOffset = visIdx - (visibleKeys.length - 1) / 2;
        let y = narrow ? H * 0.5 - 17 : H * 0.5 + midOffset * 42 - 17;
        y = clamp(y, 58, Math.max(58, H - 84));

        chipEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        const ex = a.x < x ? x : x + w;
        lnEl.setAttribute('x1', String(ex));
        lnEl.setAttribute('y1', String(y + 17));
        lnEl.setAttribute('x2', String(a.x));
        lnEl.setAttribute('y2', String(a.y));
        dotEl.setAttribute('cx', String(a.x));
        dotEl.setAttribute('cy', String(a.y));
      });
    };

    apiRef.current = { go, zoomBy, highlight, drawDisplay, applyTheme };

    // Initial boot
    applyTheme();
    resize();
    go(latestRef.current.selectedSubsystem);
    view.t.copy(goal.t);
    view.th = goal.th;
    view.ph = goal.ph;
    view.d = goal.d;
    highlight();
    drawDisplay();

    let rafId = 0;
    let prevTs = 0;
    const frame = (ts: number) => {
      rafId = requestAnimationFrame(frame);
      if (document.hidden) {
        prevTs = ts;
        return;
      }

      const dt = prevTs ? (ts - prevTs) / 1000 : 0.016;
      prevTs = ts;
      const t = ts / 1000;
      const k = 0.08;

      view.t.lerp(goal.t, k);
      view.th += (goal.th - view.th) * k;
      view.ph += (goal.ph - view.ph) * k;
      view.d += (goal.d - view.d) * k;

      const targetAuto = latestRef.current.autoRotate ? Math.sin(t * 0.22) * 0.38 : 0;
      autoOff += (targetAuto - autoOff) * 0.05;

      const th = view.th + autoOff;
      const sp = Math.sin(view.ph);
      camera.position.set(
        view.t.x + view.d * sp * Math.sin(th),
        view.t.y + view.d * Math.cos(view.ph),
        view.t.z + view.d * sp * Math.cos(th)
      );
      camera.lookAt(view.t);

      // Animate flowing/splashing water & wind-swaying grass
      waterSystem.update(t, dt, !reduceMotion);
      if (!reduceMotion) {
        grassSystem.update(t);
      }

      camera.updateMatrixWorld();
      placeLabels();
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
      partBox.dispose();
      probeBox.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.go(selectedSubsystem);
    apiRef.current?.highlight();
  }, [selectedSubsystem]);

  useEffect(() => {
    apiRef.current?.highlight();
    apiRef.current?.drawDisplay();
  }, [selectedParam, liveValues]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      apiRef.current?.applyTheme();
    });
    return () => cancelAnimationFrame(id);
  }, [theme]);

  const t = translations[lang];

  const presets: Array<{ id: SubsystemId; label: string }> = [
    { id: 'all', label: t.presetAll },
    { id: 'solar', label: t.presetSolar },
    { id: 'instrument', label: t.presetInstrument },
    { id: 'cabinet', label: t.presetCabinet },
    { id: 'sampling', label: t.presetSampling },
    { id: 'debit', label: t.presetDebit },
    { id: 'gate', label: t.presetGate },
  ];

  const infoTitle = t[`sub_${selectedSubsystem}_title`] || t.sub_all_title;
  const infoDesc = t[`sub_${selectedSubsystem}_desc`] || t.sub_all_desc;

  return (
    <div
      ref={stageRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, var(--stage-a), var(--stage-b))',
      }}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-y' }}
        aria-label="SPARING-01 3D Station"
      />

      {/* Conditional SVG Leader Lines (Visible only in Sampling / Debit focus) */}
      {!webglFailed && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {PARAMETERS.map((p) => (
            <React.Fragment key={p.key}>
              <line
                ref={(el) => {
                  lineElsRef.current[p.key] = el;
                }}
                stroke="var(--text-ink)"
                strokeWidth="1"
                opacity="0.6"
                style={{ display: 'none' }}
              />
              <circle
                ref={(el) => {
                  dotElsRef.current[p.key] = el;
                }}
                r="2.5"
                fill="var(--text-ink)"
                opacity="0.85"
                style={{ display: 'none' }}
              />
            </React.Fragment>
          ))}
        </svg>
      )}

      {/* 3D-Projected Hotspot Pills & Conditional Right-Edge Parameter Chips */}
      {!webglFailed && (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-[2]">
          {HOTSPOT_DEFS.map((h) => {
            const active = selectedSubsystem === h.part;
            return (
              <button
                key={h.part}
                ref={(el) => {
                  hsElsRef.current[h.part] = el;
                }}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectSubsystem(active ? 'all' : h.part)}
                className={`pointer-events-auto absolute left-0 top-0 -ml-3 -mt-3 inline-flex items-center gap-1.5 py-0.5 pr-2.5 pl-1 rounded-full border text-xs whitespace-nowrap transition-colors will-change-transform ${
                  active
                    ? 'bg-surface border-ink text-ink font-medium'
                    : 'bg-surface/95 border-line text-muted hover:text-ink hover:border-line-strong'
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 ${
                    active ? 'border-ink bg-ink' : 'border-muted bg-surface'
                  }`}
                />
                <span className="hidden sm:inline">{t[h.labelKey]}</span>
              </button>
            );
          })}

          {PARAMETERS.map((p) => {
            const active = selectedParam === p.key;
            const isEnabled = !enabledParams || enabledParams.includes(p.key);
            const color = theme === 'dark' ? p.hexDark : p.hexLight;
            const val = liveValues[p.key];
            return (
              <button
                key={p.key}
                ref={(el) => {
                  chipElsRef.current[p.key] = el;
                }}
                type="button"
                aria-pressed={active}
                style={{ display: 'none' }}
                onClick={() => {
                  onSelectParam(p.key);
                  onSelectSubsystem(p.key === 'debit' ? 'debit' : 'sampling');
                }}
                className={`pointer-events-auto absolute left-0 top-0 h-[34px] px-2.5 inline-flex items-center gap-1.5 rounded-md border text-xs whitespace-nowrap transition-colors will-change-transform ${
                  active
                    ? 'bg-accent-soft border-accent text-ink'
                    : 'bg-surface/95 border-line text-muted hover:border-line-strong hover:text-ink'
                } ${!isEnabled ? 'opacity-45' : ''}`}
              >
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{p.key === 'debit' ? (lang === 'id' ? 'Debit' : 'Flow') : p.code}</span>
                <b className="font-mono font-medium tabular-nums text-ink">
                  {val.toFixed(p.decimals)}
                </b>
                {p.unit !== 'pH' && <small className="text-[11px] text-muted">{p.unit}</small>}
              </button>
            );
          })}
        </div>
      )}

      {/* Top-Left Camera Focus Segmented Bar */}
      {!webglFailed && (
        <div className="absolute top-3 left-3 right-32 z-[3] flex flex-wrap gap-1.5 pointer-events-none">
          <div
            className="pointer-events-auto inline-flex flex-wrap gap-1 p-1 rounded-md border border-line bg-surface/95"
            role="group"
            aria-label="Focus Presets"
          >
            {presets.map((preset) => {
              const active = selectedSubsystem === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectSubsystem(preset.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    active
                      ? 'bg-ink text-surface'
                      : 'text-muted hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top-Right Auto-Rotate & Zoom Buttons */}
      {!webglFailed && (
        <div className="absolute top-3 right-3 z-[3] flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((v) => !v)}
            title={t.autoRotateTitle}
            className={`w-8 h-8 grid place-items-center rounded-md border transition-colors ${
              autoRotate
                ? 'bg-accent text-white border-accent'
                : 'bg-surface/95 text-muted border-line hover:text-ink hover:border-line-strong'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => apiRef.current?.zoomBy(0.8)}
            title={t.zoomInTitle}
            className="w-8 h-8 grid place-items-center rounded-md border border-line bg-surface/95 text-muted hover:text-ink hover:border-line-strong transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => apiRef.current?.zoomBy(1.25)}
            title={t.zoomOutTitle}
            className="w-8 h-8 grid place-items-center rounded-md border border-line bg-surface/95 text-muted hover:text-ink hover:border-line-strong transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom-Left Active Part Info Card */}
      {!webglFailed && (
        <div className="absolute left-3 bottom-3 z-[3] max-w-[300px] px-3.5 py-2.5 rounded-md border border-line bg-surface/95">
          <h2 className="text-xs font-semibold text-ink">{infoTitle}</h2>
          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{infoDesc}</p>
        </div>
      )}

      {/* Bottom-Right Interaction Hint */}
      {!webglFailed && (
        <p className="hidden md:block absolute right-3 bottom-3 z-[2] text-[11px] text-ink bg-surface/80 px-2 py-0.5 rounded border border-line m-0 pointer-events-none">
          {t.stageHint}
        </p>
      )}

      {webglFailed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-muted">
          {lang === 'id'
            ? 'Tampilan 3D tidak dapat dimuat di perangkat ini. Data parameter tetap tersedia di sebelah kanan.'
            : '3D view could not be initialized on this device. Live telemetry remains available on the right.'}
        </div>
      )}
    </div>
  );
};
