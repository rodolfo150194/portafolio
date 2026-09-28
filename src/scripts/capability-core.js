// Capability field scene: a lazily-loaded three.js visual for the "Why work
// with me" section. A dispersed field of glowing points fills the whole
// panel — no core shape, just scattered dots of varying size, same rendering
// vocabulary as the hero's constellation (Points glow, theme-keyed
// materials). Each of the four capability cards owns one vertical band of
// the field (an arbitrary, fixed partition just used to pick a distinct
// pool of points per card) — hovering a card brightens that band and pulls
// its near-center points into a small cluster toward the viewer, over the
// card; leaving lets them drift back to their scattered resting position.
// The convergence target's position is NOT derived from that band: the
// card grid reflows across breakpoints (4-across, 2x2, single column), so
// Capabilities.astro measures each card's real on-screen column/row and
// feeds it in via setSectorFocal, keeping the cluster lined up with its
// card regardless of how the grid currently wraps.

const POINT_COUNT = 600;
const SECTOR_COUNT = 4;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FIELD_FILL_FACTOR = 1.15;
const POINT_SIZE = 0.06;
const MIN_SIZE_FACTOR = 0.5;
const MAX_SIZE_FACTOR = 3.2;
const DRIFT_AMPLITUDE = 0.015;
const SECTOR_LERP = 0.09;

// Points inside this fraction of the field's radius are close enough to the
// center to be eligible for convergence; the rest hold their resting spot.
const CONVERGE_RADIUS_THRESHOLD = 0.5;
const CONVERGE_SPREAD = 0.05;
// Vertical nudge applied per row so that two cards sharing a column (2x2
// layout) get distinguishable targets — kept small and independent of the
// panel's aspect scaling since it only needs to break the tie, not track
// the card's true (possibly blurred-over) vertical position.
const CONVERGE_FOCAL_Y_SPREAD = 0.18;
// How far (in actual world units, independent of the panel's aspect ratio)
// converged points get pulled toward the camera. This must NOT be expressed
// in the same local pre-scale units as x/y: fieldGroup is scaled by a single
// uniform factor (worldRadius) derived from the panel's width, which for a
// wide panel can be large (~10+) — a "local" z of 0.6 would then land ~6
// world units from the origin, i.e. almost exactly at the camera (CAMERA_Z),
// which blows up the perspective divide and flings the point sideways on
// screen. Keeping this as a fixed world-space distance (converted to local
// units by dividing by worldRadius, same trick used for the x fraction)
// keeps the pull-toward-viewer effect a constant, safe distance from the
// camera no matter how wide the panel gets.
const CONVERGE_FOCAL_WORLD_Z = 2.2;
const CONVERGE_SIZE_BOOST = 1.9;

const CAMERA_FOV = 50;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const CAMERA_Z = 6.2;
const POINTER_SMOOTHING = 0.05;
const MAX_PIXEL_RATIO = 2;

// Same palette as the hero constellation so the two scenes read as one system.
const DARK_SCENE = {
  point: 0xb6ff5e,
  pointOpacity: 0.95,
};
const LIGHT_SCENE = {
  point: 0x3f7000,
  pointOpacity: 0.9,
};

function resolveScene() {
  return document.documentElement.classList.contains('dark') ? DARK_SCENE : LIGHT_SCENE;
}

function buildFieldGeometry(THREE) {
  const basePositions = new Float32Array(POINT_COUNT * 3);
  const positions = new Float32Array(POINT_COUNT * 3);
  const colors = new Float32Array(POINT_COUNT * 3);
  const sizes = new Float32Array(POINT_COUNT);
  const focalJitter = new Float32Array(POINT_COUNT * 3);

  for (let i = 0; i < POINT_COUNT; i++) {
    const theta = i * GOLDEN_ANGLE + Math.sin(i * 0.37) * 0.15;
    const radius = Math.sqrt((i + 0.5) / POINT_COUNT);
    const x = Math.cos(theta) * radius;
    const y = Math.sin(theta) * radius;
    const z = Math.sin(i * 1.7) * 0.08 * radius;
    basePositions.set([x, y, z], i * 3);
    positions.set([x, y, z], i * 3);

    // Squared bias keeps most points small with occasional larger ones.
    sizes[i] = POINT_SIZE * (MIN_SIZE_FACTOR + Math.pow(Math.random(), 2.2) * (MAX_SIZE_FACTOR - MIN_SIZE_FACTOR));

    const jitterAngle = Math.random() * Math.PI * 2;
    const jitterRadius = Math.random() * CONVERGE_SPREAD;
    focalJitter.set(
      [
        Math.cos(jitterAngle) * jitterRadius,
        Math.sin(jitterAngle) * jitterRadius,
        (Math.random() - 0.5) * CONVERGE_SPREAD,
      ],
      i * 3
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // The size attribute gets a copy: update() reads the immutable `sizes`
  // baseline every frame and writes into the buffer, so the two must not
  // alias the same array or each frame's write would feed the next frame's
  // read, compounding the convergence boost into runaway growth.
  geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
  return { geometry, basePositions, focalJitter, sizes };
}

function buildFieldMaterial(THREE, initialOpacity) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      opacity: { value: initialOpacity },
      pixelRatio: { value: 1 },
      scale: { value: 1 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float pixelRatio;
      uniform float scale;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio * (scale / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float opacity;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float alpha = smoothstep(0.5, 0.2, dist);
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(vColor, alpha * opacity);
      }
    `,
  });
}

function buildScene(THREE, aspect) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(0, 0, CAMERA_Z);

  const group = new THREE.Group();
  scene.add(group);

  const fieldGroup = new THREE.Group();
  group.add(fieldGroup);

  const { geometry, basePositions, focalJitter, sizes } = buildFieldGeometry(THREE);
  const sectors = new Int8Array(POINT_COUNT);
  const proximityWeights = new Float32Array(POINT_COUNT);

  let currentTheme = resolveScene();
  const material = buildFieldMaterial(THREE, currentTheme.pointOpacity);
  const points = new THREE.Points(geometry, material);
  fieldGroup.add(points);

  // Per-sector convergence target. The x/y fractions (-1..1, relative to the
  // panel's center) are supplied by the caller via setSectorFocal, driven
  // from each card's actual measured column/row in the DOM — the card grid
  // reflows from 4-across to 2x2 to a single column at different
  // breakpoints, so a fixed "quarter of the width" formula only matches the
  // 4-across layout and points the wrong way (or, for two cards sharing a
  // column, the same way) as soon as the grid wraps.
  // fieldGroup uses a single uniform scale factor derived from whichever of
  // width/height is larger, so converting the x fraction into local space
  // needs halfWidth/worldRadius (recomputed on every aspect change) to land
  // at the correct screen fraction regardless of the panel's proportions.
  // The y fraction only needs to disambiguate rows (see CONVERGE_FOCAL_Y_SPREAD
  // above), so it's scaled by a small fixed constant instead.
  const sectorFocalXFraction = new Array(SECTOR_COUNT).fill(0);
  const sectorFocalYFraction = new Array(SECTOR_COUNT).fill(0);
  const focalPositions = Array.from({ length: SECTOR_COUNT }, () => [0, 0, 0]);
  let halfWidthRef = 0;
  let worldRadiusRef = 1;

  // Which points belong to which sector, and how eligible each is to
  // converge, is derived from proximity to that sector's CURRENT target —
  // not a fixed partition of the field — so that whichever points are
  // already closest to a card's on-screen position are the ones that light
  // up and travel to it. A fixed partition baked in at build time would
  // point at a stale layout as soon as the card grid reflows to a
  // different column count, leaving points blending toward a target on the
  // opposite side of where they started (never fully arriving).
  const recomputeSectorAssignment = () => {
    for (let i = 0; i < POINT_COUNT; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      let bestSector = 0;
      let bestDist = Infinity;
      for (let s = 0; s < SECTOR_COUNT; s++) {
        const dist = Math.hypot(bx - focalPositions[s][0], by - focalPositions[s][1]);
        if (dist < bestDist) {
          bestDist = dist;
          bestSector = s;
        }
      }
      sectors[i] = bestSector;
      proximityWeights[i] =
        bestDist < CONVERGE_RADIUS_THRESHOLD ? 1 - bestDist / CONVERGE_RADIUS_THRESHOLD : 0;
    }
  };

  const recomputeFocalTargets = () => {
    const focalZLocal = CONVERGE_FOCAL_WORLD_Z / worldRadiusRef;
    for (let s = 0; s < SECTOR_COUNT; s++) {
      focalPositions[s][0] = (sectorFocalXFraction[s] * halfWidthRef) / worldRadiusRef;
      focalPositions[s][1] = sectorFocalYFraction[s] * CONVERGE_FOCAL_Y_SPREAD;
      focalPositions[s][2] = focalZLocal;
    }
    recomputeSectorAssignment();
  };

  const setSectorFocal = (index, xFraction, yFraction) => {
    if (index < 0 || index >= SECTOR_COUNT) return;
    sectorFocalXFraction[index] = xFraction;
    sectorFocalYFraction[index] = yFraction;
    recomputeFocalTargets();
  };

  const basePointColor = new THREE.Color();
  const scratchColor = new THREE.Color();

  const applyTheme = (c) => {
    currentTheme = c;
    basePointColor.set(c.point);
  };
  applyTheme(resolveScene());

  const sectorIntensity = new Array(SECTOR_COUNT).fill(0);
  const sectorTarget = new Array(SECTOR_COUNT).fill(0);
  const setActiveSector = (index) => {
    for (let i = 0; i < SECTOR_COUNT; i++) sectorTarget[i] = i === index ? 1 : 0;
  };

  const setAspect = (nextAspect) => {
    camera.aspect = nextAspect;
    camera.updateProjectionMatrix();

    const halfHeight = CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
    const halfWidth = halfHeight * nextAspect;
    const worldRadius = Math.max(halfWidth, halfHeight) * FIELD_FILL_FACTOR;
    fieldGroup.scale.setScalar(worldRadius);

    halfWidthRef = halfWidth;
    worldRadiusRef = worldRadius;
    recomputeFocalTargets();
  };
  setAspect(aspect);

  const setViewport = (height, pixelRatio) => {
    material.uniforms.pixelRatio.value = pixelRatio;
    material.uniforms.scale.value = height * 0.5;
  };

  const positionAttr = geometry.attributes.position;
  const colorAttr = geometry.attributes.color;
  const sizeAttr = geometry.attributes.size;

  return {
    scene,
    camera,
    applyTheme,
    setAspect,
    setViewport,
    setActiveSector,
    setSectorFocal,
    disposables: {
      geometries: [geometry],
      materials: [material],
    },
    update(t, pointer) {
      // No auto-spin here (unlike the hero constellation): sectors are
      // fixed horizontal bands aligned to the card row below, and a
      // continuous yaw would drift that alignment out of sync over time.
      group.rotation.y = pointer.x * 0.1;
      group.rotation.x = -pointer.y * 0.07;

      let maxIntensity = 0;
      for (let i = 0; i < SECTOR_COUNT; i++) {
        sectorIntensity[i] += (sectorTarget[i] - sectorIntensity[i]) * SECTOR_LERP;
        if (sectorIntensity[i] > maxIntensity) maxIntensity = sectorIntensity[i];
      }
      material.uniforms.opacity.value = currentTheme.pointOpacity * (0.55 + maxIntensity * 0.45);

      for (let i = 0; i < POINT_COUNT; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2] + Math.sin(t * 0.6 + i) * DRIFT_AMPLITUDE;

        const sector = sectors[i];
        const converge = sectorIntensity[sector] * proximityWeights[i];

        if (converge > 0.001) {
          const focal = focalPositions[sector];
          const fx = focal[0] + focalJitter[i * 3];
          const fy = focal[1] + focalJitter[i * 3 + 1];
          const fz = focal[2] + focalJitter[i * 3 + 2];
          positionAttr.setXYZ(i, bx + (fx - bx) * converge, by + (fy - by) * converge, bz + (fz - bz) * converge);
        } else {
          positionAttr.setXYZ(i, bx, by, bz);
        }

        const sectorGlow = sectorIntensity[sector];
        scratchColor.copy(basePointColor).offsetHSL(0, sectorGlow * 0.1, sectorGlow * 0.3 + converge * 0.25);
        colorAttr.setXYZ(i, scratchColor.r, scratchColor.g, scratchColor.b);

        sizeAttr.setX(i, sizes[i] * (1 + converge * (CONVERGE_SIZE_BOOST - 1)));
      }
      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    },
  };
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

class CapabilityCoreElement extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;
    this._pendingSector = null;
    this._pendingFocal = new Map();

    if (prefersReducedMotion() || !supportsWebGL()) {
      this.setAttribute('data-fallback', '');
      return;
    }

    this._mount();
  }

  setActiveSector(index) {
    this._pendingSector = index;
    if (this._api) this._api.setActiveSector(index);
  }

  setSectorFocal(index, xFraction, yFraction) {
    this._pendingFocal.set(index, [xFraction, yFraction]);
    if (this._api) this._api.setSectorFocal(index, xFraction, yFraction);
  }

  async _mount() {
    const THREE = await import('three');
    if (!this.isConnected) return;

    const width = this.clientWidth || 640;
    const height = this.clientHeight || 460;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    this.appendChild(renderer.domElement);

    const api = buildScene(THREE, width / height);
    api.setViewport(height, pixelRatio);
    this._api = api;
    if (this._pendingSector !== null) api.setActiveSector(this._pendingSector);
    this._pendingFocal.forEach(([xFraction, yFraction], index) => api.setSectorFocal(index, xFraction, yFraction));

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (event) => {
      const rect = this.getBoundingClientRect();
      if (!rect.width) return;
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove);

    let rafId = null;
    let running = false;
    const clock = new THREE.Clock();

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      pointer.x += (pointer.tx - pointer.x) * POINTER_SMOOTHING;
      pointer.y += (pointer.ty - pointer.y) * POINTER_SMOOTHING;
      api.update(clock.getElapsedTime(), pointer);
      renderer.render(api.scene, api.camera);
    };

    const start = () => {
      if (running) return;
      running = true;
      clock.start();
      loop();
    };

    const stop = () => {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && document.visibilityState === 'visible') {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(this);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else if (this.isConnected) {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => {
      const w = this.clientWidth;
      const h = this.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      api.setAspect(w / h);
      api.setViewport(h, pixelRatio);
    });
    resizeObserver.observe(this);

    const themeObserver = new MutationObserver(() => {
      api.applyTheme(resolveScene());
    });
    themeObserver.observe(document.documentElement, { attributeFilter: ['class'] });

    this._dispose = () => {
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      api.disposables.geometries.forEach((geometry) => geometry.dispose());
      api.disposables.materials.forEach((material) => material.dispose());
      renderer.dispose();
      if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
      if (renderer.domElement.parentNode === this) this.removeChild(renderer.domElement);
    };
  }

  disconnectedCallback() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
    this._api = null;
  }
}

export function defineCapabilityCoreElement(tag = 'scene-capability-core') {
  if (customElements.get(tag)) return;
  customElements.define(tag, CapabilityCoreElement);
}
