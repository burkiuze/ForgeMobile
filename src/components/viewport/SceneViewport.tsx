import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Move, RotateCw, Maximize2, Crosshair, Box as BoxIcon } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useTranslation } from '../../i18n';

export const SceneViewport: React.FC = () => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    currentProject,
    selectedEntityId,
    setSelectedEntityId,
    transformMode,
    setTransformMode,
    isPlaying,
  } = useEditorStore();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectedBoxRef = useRef<THREE.BoxHelper | null>(null);

  // Camera Orbit / Pan state
  const isDraggingRef = useRef(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const pinchDistRef = useRef<number | null>(null);
  const sphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 18,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
  });
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.5, 0));

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 500;

    // 1. Setup Three.js Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141414);
    scene.fog = new THREE.FogExp2(0x141414, 0.035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight.position.set(10, 18, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    scene.add(dirLight);

    // 5. Ground Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0xf05a22, 0x2a2a2a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // If Playing simulation preview: animate physics/rotations
      if (isPlaying) {
        meshMapRef.current.forEach((mesh, entityId) => {
          const entity = currentProject?.entities.find((e) => e.id === entityId);
          if (entity?.animator?.clip === 'Spin') {
            mesh.rotation.y += delta * (entity.animator.speed || 1) * 2;
          } else if (entity?.animator?.clip === 'Bob') {
            mesh.position.y = entity.transform.position[1] + Math.sin(elapsed * 3) * 0.35;
          } else if (entity?.rigidbody?.useGravity) {
            // Simple kinematic bounce preview
            mesh.position.y = Math.max(0.8, entity.transform.position[1] + Math.abs(Math.sin(elapsed * 4)) * 1.2);
          }
        });
      }

      // Update selection bounding box helper
      if (selectedBoxRef.current) {
        selectedBoxRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update camera coordinates from spherical state
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    const target = targetRef.current;

    cameraRef.current.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    cameraRef.current.lookAt(target);
  };

  // Re-sync 3D meshes whenever entities change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !currentProject) return;

    // Clear old meshes
    meshMapRef.current.forEach((mesh) => scene.remove(mesh));
    meshMapRef.current.clear();

    if (selectedBoxRef.current) {
      scene.remove(selectedBoxRef.current);
      selectedBoxRef.current = null;
    }

    currentProject.entities.forEach((entity) => {
      if (!entity.visible) return;

      let geom: THREE.BufferGeometry;
      const geomType = entity.meshRenderer?.geometry || 'box';
      const scale = entity.transform.scale;

      if (geomType === 'sphere') {
        geom = new THREE.SphereGeometry(scale[0] / 2, 24, 24);
      } else if (geomType === 'capsule') {
        geom = new THREE.CapsuleGeometry(scale[0] / 2, Math.max(0.2, scale[1] - scale[0]), 8, 16);
      } else if (geomType === 'cylinder') {
        geom = new THREE.CylinderGeometry(scale[0] / 2, scale[0] / 2, scale[1], 24);
      } else {
        geom = new THREE.BoxGeometry(scale[0], scale[1], scale[2]);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: entity.meshRenderer?.color || (entity.tag === 'Player' ? '#EDE6D8' : '#F05A22'),
        metalness: entity.meshRenderer?.metallic ?? 0.2,
        roughness: entity.meshRenderer?.roughness ?? 0.5,
        wireframe: entity.meshRenderer?.wireframe ?? false,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...entity.transform.position);
      mesh.rotation.set(...entity.transform.rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { entityId: entity.id };

      scene.add(mesh);
      meshMapRef.current.set(entity.id, mesh);

      // Attach selection outline box
      if (entity.id === selectedEntityId) {
        const box = new THREE.BoxHelper(mesh, new THREE.Color(0xf2b233));
        scene.add(box);
        selectedBoxRef.current = box;
      }
    });
  }, [currentProject, selectedEntityId]);

  // Touch & Pointer Gesture Handlers (Single finger Orbit, Pinch Zoom, Tap Selection)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      sphericalRef.current.theta -= dx * 0.008;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - dy * 0.008));
      updateCameraPosition();
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = pinchDistRef.current - dist;
      pinchDistRef.current = dist;

      sphericalRef.current.radius = Math.max(4, Math.min(45, sphericalRef.current.radius + delta * 0.04));
      updateCameraPosition();
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    lastTouchRef.current = null;
    pinchDistRef.current = null;
  };

  // Tap to select entity via Raycaster
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const meshes = Array.from(meshMapRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const hitId = hitMesh.userData?.entityId;
      if (hitId) {
        setSelectedEntityId(hitId);
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-forge-bg select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
      />

      {/* Floating Viewport Gizmo Controls (Move, Rotate, Scale) */}
      <div className="absolute top-3 left-3 flex flex-col space-y-1.5 z-20">
        <div className="bg-forge-panel/90 backdrop-blur-md border border-forge-panelBorder p-1 rounded-xl shadow-lg flex flex-col space-y-1">
          <button
            onClick={() => setTransformMode('translate')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              transformMode === 'translate'
                ? 'bg-forge-orange text-white shadow-md'
                : 'text-forge-boneMuted hover:text-forge-bone hover:bg-forge-panelElevated'
            }`}
            title={t('Translate Tool (W)', 'Taşıma Aracı')}
          >
            <Move className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTransformMode('rotate')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              transformMode === 'rotate'
                ? 'bg-forge-orange text-white shadow-md'
                : 'text-forge-boneMuted hover:text-forge-bone hover:bg-forge-panelElevated'
            }`}
            title={t('Rotate Tool (E)', 'Döndürme Aracı')}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTransformMode('scale')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              transformMode === 'scale'
                ? 'bg-forge-orange text-white shadow-md'
                : 'text-forge-boneMuted hover:text-forge-bone hover:bg-forge-panelElevated'
            }`}
            title={t('Scale Tool (R)', 'Ölçekleme Aracı')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Status Pill (Selection Name & Coordinates) */}
      {selectedEntityId && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2 bg-forge-panel/85 backdrop-blur-md border border-forge-panelBorder px-3 py-1.5 rounded-full shadow-md text-xs">
          <Crosshair className="w-3.5 h-3.5 text-forge-gold animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-semibold text-forge-bone truncate max-w-[140px]">
            {currentProject?.entities.find((e) => e.id === selectedEntityId)?.name || 'Selected'}
          </span>
          <span className="text-[10px] text-forge-gold uppercase px-1.5 py-0.5 bg-forge-panelElevated rounded">
            {transformMode}
          </span>
        </div>
      )}
    </div>
  );
};
