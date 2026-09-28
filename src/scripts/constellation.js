// Neural constellation scene: a lazily-loaded three.js particle sphere used as the
// hero background. Registered as a vanilla custom element so it needs no client:*
// framework directive — only a <script type="module"> import from the host Astro
// component. See sdd/hero-neural-terminal-redesign design doc for scene parameters.

const POINT_COUNT = 820;
const SPHERE_RADIUS = 2.7;
const POINT_SIZE = 0.038;
const EDGE_MAX_DISTANCE = 0.46;
const EDGE_NEIGHBOR_SPAN = 7;
const CORE_RADIUS = 1.4;
const CORE_DETAIL = 1;
const CAMERA_FOV = 50;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const CAMERA_Z = 7.4;
const POINTER_SMOOTHING = 0.045;
const MAX_PIXEL_RATIO = 2;

// Tech cards float just outside the point cloud, one per stack highlight —
// same set shown in the TechMarquee strip, kept as plain labels (no i18n)
// since tech names don't translate.
const TECH_ITEMS = [
  { id: 'python', label: 'PYTHON' },
  { id: 'django', label: 'DJANGO' },
  { id: 'fastapi', label: 'FASTAPI' },
  { id: 'flutter', label: 'FLUTTER' },
  { id: 'postgis', label: 'POSTGIS' },
  { id: 'geoserver', label: 'GEOSERVER' },
  { id: 'astro', label: 'ASTRO' },
  { id: 'docker', label: 'DOCKER' },
  { id: 'ai', label: 'AI AGENTS' },
  { id: 'drf', label: 'DRF' },
  { id: 'tailwindcss', label: 'TAILWINDCSS' },
  { id: 'claude-code', label: 'CLAUDE CODE' },
  { id: 'mcp', label: 'MCP' },
  { id: 'llm', label: 'LLM' },
  { id: 'harness', label: 'HARNESS' },
  { id: 'integrations', label: 'INTEGRATIONS' },
];
// Two anchor shells: an outer one just outside the point cloud (same radius
// as before) and an inner one sitting between the core wireframe and the
// point cloud, so cards read as visible from inside the sphere too.
const OUTER_RADIUS_FACTOR = 1.08;
const INNER_RADIUS_FACTOR = 0.55;
// Anchors behind this facing threshold (dot of their rotated position with
// the camera axis) are edge-on or facing away — hide their card instead of
// letting the perspective projection fling it to a wild screen position.
const ANCHOR_FACING_CUTOFF = -0.15;
// Drag-to-rotate inertia: how much of the last frame's angular velocity
// carries into the next one once the pointer is released.
const DRAG_INERTIA_DECAY = 0.94;
const DRAG_ROTATE_SPEED = 0.006;

// Theme-keyed material constants (color + opacity per layer). Dark values are
// byte-identical to the pre-fix hardcoded literals; light values are tuned so
// the particles/edges/core stay visible against the light `--hero-bg` band.
const DARK_SCENE = {
  point: 0xb6ff5e,
  pointOpacity: 0.95,
  edge: 0x3ee9b0,
  edgeOpacity: 0.2,
  core: 0xffffff,
  coreOpacity: 0.13,
};
const LIGHT_SCENE = {
  point: 0x3f7000,
  pointOpacity: 0.9,
  edge: 0x1f7a5c,
  edgeOpacity: 0.35,
  core: 0x12151c,
  coreOpacity: 0.1,
};

function resolveScene() {
  return document.documentElement.classList.contains('dark') ? DARK_SCENE : LIGHT_SCENE;
}

/**
 * Builds the scene, camera, and per-frame update logic. Mirrors the reference
 * scene-constellation.js mock (design handoff), ported to ES module `three`.
 */
function buildScene(THREE, aspect) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(0, 0, CAMERA_Z);

  const positions = new Float32Array(POINT_COUNT * 3);
  const basePoints = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    const y = 1 - (i / (POINT_COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.39996;
    const point = new THREE.Vector3(
      Math.cos(theta) * radiusAtY,
      y,
      Math.sin(theta) * radiusAtY
    ).multiplyScalar(SPHERE_RADIUS);
    basePoints.push(point);
    point.toArray(positions, i * 3);
  }

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMaterial = new THREE.PointsMaterial({
    size: POINT_SIZE,
    transparent: true,
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);

  const edgeVertices = [];
  for (let i = 0; i < POINT_COUNT; i++) {
    for (let j = i + 1; j < Math.min(i + EDGE_NEIGHBOR_SPAN, POINT_COUNT); j++) {
      if (basePoints[i].distanceTo(basePoints[j]) < EDGE_MAX_DISTANCE) {
        edgeVertices.push(basePoints[i], basePoints[j]);
      }
    }
  }
  const edgesGeometry = new THREE.BufferGeometry().setFromPoints(edgeVertices);
  const edgesMaterial = new THREE.LineBasicMaterial({
    transparent: true,
  });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

  const coreGeometry = new THREE.EdgesGeometry(
    new THREE.IcosahedronGeometry(CORE_RADIUS, CORE_DETAIL)
  );
  const coreMaterial = new THREE.LineBasicMaterial({
    transparent: true,
  });
  const core = new THREE.LineSegments(coreGeometry, coreMaterial);

  const group = new THREE.Group();
  group.add(points, edges, core);
  scene.add(group);

  // Fixed base positions for the tech cards, distributed with the same
  // Fibonacci-sphere spacing as the point cloud but phase-shifted so cards
  // don't sit exactly on top of a cloud point. Split into two shells: outer
  // (even index) sits just outside the point cloud, inner (odd index) sits
  // between the core wireframe and the point cloud, so more cards are
  // visible at once — including from inside the sphere.
  const outerItems = TECH_ITEMS.filter((_, i) => i % 2 === 0);
  const innerItems = TECH_ITEMS.filter((_, i) => i % 2 === 1);

  function buildShell(items, radius, phaseOffset) {
    const bases = items.map((_, i) => {
      const n = items.length;
      const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * 2.399963 + phaseOffset;
      return new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY).multiplyScalar(
        radius
      );
    });
    const screens = items.map(() => ({ left: 0.5, top: 0.5, visible: false, depth: 0 }));
    return { items, radius, bases, screens };
  }

  const outerShell = buildShell(outerItems, SPHERE_RADIUS * OUTER_RADIUS_FACTOR, 0.6);
  const innerShell = buildShell(innerItems, SPHERE_RADIUS * INNER_RADIUS_FACTOR, 2.1);
  const shells = [outerShell, innerShell];
  const anchorScratch = new THREE.Vector3();

  function updateShellScreens(shell) {
    for (let i = 0; i < shell.bases.length; i++) {
      anchorScratch.copy(shell.bases[i]).applyQuaternion(group.quaternion);
      const facing = anchorScratch.z / shell.radius;
      const screen = shell.screens[i];
      if (facing < ANCHOR_FACING_CUTOFF) {
        screen.visible = false;
        continue;
      }
      anchorScratch.project(camera);
      const left = (anchorScratch.x + 1) / 2;
      const top = (1 - anchorScratch.y) / 2;
      // Near-grazing anchors (facing close to the cutoff) can still land far
      // outside the viewport once projected — the perspective divide isn't
      // well-behaved right at the silhouette edge. Treat those as hidden
      // instead of letting a card fly off to some extreme position.
      if (left < -0.5 || left > 1.5 || top < -0.5 || top > 1.5) {
        screen.visible = false;
        continue;
      }
      screen.left = left;
      screen.top = top;
      screen.visible = true;
      screen.depth = THREE.MathUtils.clamp((facing - ANCHOR_FACING_CUTOFF) / (1 - ANCHOR_FACING_CUTOFF), 0, 1);
    }
  }

  const applyTheme = (c) => {
    pointsMaterial.color.set(c.point);
    pointsMaterial.opacity = c.pointOpacity;
    edgesMaterial.color.set(c.edge);
    edgesMaterial.opacity = c.edgeOpacity;
    coreMaterial.color.set(c.core);
    coreMaterial.opacity = c.coreOpacity;
  };
  applyTheme(resolveScene());

  return {
    scene,
    camera,
    applyTheme,
    // Flat list aligned index-for-index with getAnchorScreens()'s flat
    // concatenation below (outer shell items first, then inner shell items).
    techItems: [...outerShell.items, ...innerShell.items],
    outerCount: outerShell.items.length,
    getAnchorScreens: () => [...outerShell.screens, ...innerShell.screens],
    disposables: {
      geometries: [pointsGeometry, edgesGeometry, coreGeometry],
      materials: [pointsMaterial, edgesMaterial, coreMaterial],
    },
    update(t, pointer, manualRotation, hasInteracted) {
      const manualX = manualRotation ? manualRotation.x : 0;
      const manualY = manualRotation ? manualRotation.y : 0;
      if (hasInteracted) {
        // Once the user has taken manual control, rotation is fully driven
        // by drag + inertia — no ambient auto-spin or mouse parallax pulling
        // the sphere away from where they left it.
        group.rotation.y = manualY;
        group.rotation.x = manualX;
      } else {
        group.rotation.y = t * 0.11 + pointer.x * 0.45 + manualY;
        group.rotation.x = -pointer.y * 0.3 + Math.sin(t * 0.2) * 0.07 + manualX;
      }
      core.rotation.y = -t * 0.3;
      core.rotation.x = t * 0.18;
      const attr = pointsGeometry.attributes.position;
      for (let i = 0; i < POINT_COUNT; i++) {
        const base = basePoints[i];
        const scale = 1 + Math.sin(t * 1.1 + i * 0.055) * 0.025;
        attr.setXYZ(i, base.x * scale, base.y * scale, base.z * scale);
      }
      attr.needsUpdate = true;

      // Rotate each anchor by the sphere's current orientation, then project
      // it to normalized screen space (0..1) so the host element can place a
      // DOM card on top of the canvas at that point.
      for (const shell of shells) {
        updateShellScreens(shell);
      }
    },
  };
}

const NARROW_VIEWPORT_QUERY = '(max-width: 639px)';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isNarrowViewport() {
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
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

class SceneConstellationElement extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;

    if (prefersReducedMotion() || !supportsWebGL() || isNarrowViewport()) {
      this.setAttribute('data-fallback', '');
      return;
    }

    this._mount();
  }

  async _mount() {
    const THREE = await import('three');
    if (!this.isConnected) return;

    const width = this.clientWidth || 900;
    const height = this.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    this.appendChild(renderer.domElement);

    const api = buildScene(THREE, width / height);

    const cardsHost = document.createElement('div');
    cardsHost.className = 'pointer-events-none absolute inset-0 z-10';
    this.appendChild(cardsHost);
    const cardEls = api.techItems.map((item, i) => {
      const isOuter = i < api.outerCount;
      const el = document.createElement('div');
      el.className = isOuter
        ? 'absolute rounded-full border border-accent/60 bg-heroBg/80 px-2.5 py-1 font-jetbrains text-[11px] tracking-[0.14em] text-accent backdrop-blur-sm opacity-0'
        : 'absolute rounded-full border border-accent2/60 bg-heroBg/80 px-2.5 py-1 font-jetbrains text-[10px] tracking-[0.14em] text-accent2 backdrop-blur-sm opacity-0';
      el.textContent = item.label;
      cardsHost.appendChild(el);
      return el;
    });

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (event) => {
      const rect = this.getBoundingClientRect();
      if (!rect.width) return;
      pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove);

    // Drag-to-rotate: while the pointer is down, dragging adds directly to
    // manualRotation; on release, the last frame's delta keeps spinning the
    // sphere and decays back to rest (same feel as flicking a globe).
    const manualRotation = { x: 0, y: 0 };
    const dragVelocity = { x: 0, y: 0 };
    let dragging = false;
    let hasInteracted = false;
    let lastDragX = 0;
    let lastDragY = 0;

    const onDragStart = (event) => {
      dragging = true;
      hasInteracted = true;
      lastDragX = event.clientX;
      lastDragY = event.clientY;
      dragVelocity.x = 0;
      dragVelocity.y = 0;
      this.setPointerCapture?.(event.pointerId);
      this.style.cursor = 'grabbing';
    };
    const onDragMove = (event) => {
      if (!dragging) return;
      const dx = event.clientX - lastDragX;
      const dy = event.clientY - lastDragY;
      lastDragX = event.clientX;
      lastDragY = event.clientY;
      manualRotation.y += dx * DRAG_ROTATE_SPEED;
      manualRotation.x += dy * DRAG_ROTATE_SPEED;
      dragVelocity.y = dx * DRAG_ROTATE_SPEED;
      dragVelocity.x = dy * DRAG_ROTATE_SPEED;
    };
    const onDragEnd = () => {
      dragging = false;
      this.style.cursor = 'grab';
    };
    this.style.cursor = 'grab';
    this.style.touchAction = 'none';
    this.addEventListener('pointerdown', onDragStart);
    this.addEventListener('pointermove', onDragMove);
    this.addEventListener('pointerup', onDragEnd);
    this.addEventListener('pointercancel', onDragEnd);

    let rafId = null;
    let running = false;
    const clock = new THREE.Clock();

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      pointer.x += (pointer.tx - pointer.x) * POINTER_SMOOTHING;
      pointer.y += (pointer.ty - pointer.y) * POINTER_SMOOTHING;
      if (!dragging) {
        manualRotation.x += dragVelocity.x;
        manualRotation.y += dragVelocity.y;
        dragVelocity.x *= DRAG_INERTIA_DECAY;
        dragVelocity.y *= DRAG_INERTIA_DECAY;
      }
      api.update(clock.getElapsedTime(), pointer, manualRotation, hasInteracted);
      renderer.render(api.scene, api.camera);

      const screens = api.getAnchorScreens();
      for (let i = 0; i < cardEls.length; i++) {
        const screen = screens[i];
        const el = cardEls[i];
        if (!screen.visible) {
          el.style.opacity = '0';
          continue;
        }
        const scale = 0.75 + screen.depth * 0.35;
        el.style.opacity = String(0.5 + screen.depth * 0.5);
        el.style.left = `${screen.left * 100}%`;
        el.style.top = `${screen.top * 100}%`;
        el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }
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
      api.camera.aspect = w / h;
      api.camera.updateProjectionMatrix();
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
      this.removeEventListener('pointerdown', onDragStart);
      this.removeEventListener('pointermove', onDragMove);
      this.removeEventListener('pointerup', onDragEnd);
      this.removeEventListener('pointercancel', onDragEnd);
      cardsHost.remove();
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
  }
}

export function defineConstellationElement(tag = 'scene-constellation') {
  if (customElements.get(tag)) return;
  customElements.define(tag, SceneConstellationElement);
}
