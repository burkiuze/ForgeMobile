// Builds and syncs three.js objects from the Forge scene model.

import * as THREE from 'three';
import { loadModel } from '../../../core/model';
import { Entity, MeshKind, RGB, Scene } from '../../../core/scene';
import { fileUrl } from '../../../core/vfs';

const geoCache = new Map<MeshKind, THREE.BufferGeometry>();

export function geometryFor(kind: MeshKind): THREE.BufferGeometry | null {
  if (kind === 'none' || kind === 'model') return null;
  let g = geoCache.get(kind);
  if (!g) {
    switch (kind) {
      case 'cube':
        g = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        g = new THREE.SphereGeometry(0.5, 32, 18);
        break;
      case 'plane':
        g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
        break;
      case 'cylinder':
        g = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'cone':
        g = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      default:
        g = new THREE.CapsuleGeometry(0.35, 0.3, 8, 20);
    }
    geoCache.set(kind, g);
  }
  return g;
}

export const srgb = (c: RGB) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
const D2R = Math.PI / 180;

const patternCache = new Map<string, THREE.Texture>();
function patternTexture(kind: 'checker' | 'grid'): THREE.Texture {
  let t = patternCache.get(kind);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#9a9a9a';
  if (kind === 'checker') {
    g.fillRect(0, 0, 32, 32);
    g.fillRect(32, 32, 32, 32);
  } else {
    g.fillRect(0, 0, 64, 3);
    g.fillRect(0, 0, 3, 64);
  }
  t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  patternCache.set(kind, t);
  return t;
}

const texLoader = new THREE.TextureLoader();
const texCache = new Map<string, Promise<THREE.Texture>>();
function projectTexture(project: string, path: string): Promise<THREE.Texture> {
  const key = `${project}:${path}`;
  let p = texCache.get(key);
  if (!p) {
    p = fileUrl(project, path).then(
      (url) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          if (!url) return reject(new Error('missing texture'));
          texLoader.load(
            url,
            (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.anisotropy = 4;
              resolve(t);
            },
            undefined,
            reject,
          );
        }),
    );
    texCache.set(key, p);
    p.catch(() => texCache.delete(key));
  }
  return p;
}

export function forgetTexture(project: string, path: string) {
  texCache.delete(`${project}:${path}`);
}

const iconCache = new Map<string, THREE.SpriteMaterial>();
function iconMaterial(emoji: string): THREE.SpriteMaterial {
  let m = iconCache.get(emoji);
  if (!m) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(20,16,13,0.65)';
    g.beginPath();
    g.arc(48, 48, 44, 0, Math.PI * 2);
    g.fill();
    g.font = '52px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, 48, 52);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false });
    iconCache.set(emoji, m);
  }
  return m;
}

/** Signature of everything that requires rebuilding the object (not transforms). */
export function buildSig(e: Entity, opts: { icons: boolean; shadows: boolean }): string {
  return JSON.stringify([e.mesh, e.model, e.color, e.material, e.light, !!e.camera, e.active, opts.icons, opts.shadows]);
}

export interface EntityObject {
  group: THREE.Group;
  sig: string;
  mesh?: THREE.Object3D;
  material?: THREE.Material;
}

export function createEntityObject(e: Entity, project: string, opts: { icons: boolean; shadows: boolean }, onAsync: () => void): EntityObject {
  const group = new THREE.Group();
  group.userData.entityId = e.id;
  const out: EntityObject = { group, sig: buildSig(e, opts) };
  const m = e.material;
  const color = srgb(e.color);
  const mat: THREE.Material = m.unlit
    ? new THREE.MeshBasicMaterial({ color })
    : new THREE.MeshStandardMaterial({
        color,
        metalness: m.metallic,
        roughness: m.roughness,
        emissive: m.emission_strength > 0 ? srgb(m.emission) : new THREE.Color(0),
        emissiveIntensity: m.emission_strength,
      });
  if (m.pattern !== 'none' && !m.texture) {
    const t = patternTexture(m.pattern).clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, e.transform.scale[0] * m.tiling), Math.max(1, e.transform.scale[2] * m.tiling));
    (mat as THREE.MeshStandardMaterial).map = t;
  }
  if (m.texture) {
    projectTexture(project, m.texture)
      .then((tex) => {
        const t = tex.clone();
        t.needsUpdate = true;
        t.repeat.set(m.tiling || 1, m.tiling || 1);
        (mat as THREE.MeshStandardMaterial).map = t;
        mat.needsUpdate = true;
        onAsync();
      })
      .catch(() => {});
  }
  out.material = mat;

  const geo = geometryFor(e.mesh);
  if (geo) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = opts.shadows && e.mesh !== 'plane';
    mesh.receiveShadow = opts.shadows;
    mesh.userData.entityId = e.id;
    group.add(mesh);
    out.mesh = mesh;
  } else if (e.mesh === 'model' && e.model) {
    // placeholder box until the model arrives
    const ph = new THREE.Mesh(geometryFor('cube')!, new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true }));
    ph.userData.entityId = e.id;
    group.add(ph);
    loadModel(project, e.model)
      .then((lm) => {
        group.remove(ph);
        const inst = lm.root.clone(true);
        inst.traverse((o: any) => {
          o.userData.entityId = e.id;
          if (o.isMesh) {
            o.castShadow = opts.shadows;
            o.receiveShadow = opts.shadows;
          }
        });
        group.add(inst);
        out.mesh = inst;
        onAsync();
      })
      .catch(() => {
        (ph.material as THREE.MeshBasicMaterial).color.set(0xe5484d);
        onAsync();
      });
  }

  if (e.light) {
    const l = e.light;
    if (l.kind === 'point') {
      const pl = new THREE.PointLight(srgb(l.color), l.intensity * 6, l.range, 1.4);
      pl.castShadow = false;
      group.add(pl);
    } else {
      const dl = new THREE.DirectionalLight(srgb(l.color), l.intensity * 2.6);
      dl.castShadow = opts.shadows && l.shadows;
      dl.shadow.mapSize.set(1024, 1024);
      dl.shadow.camera.left = dl.shadow.camera.bottom = -18;
      dl.shadow.camera.right = dl.shadow.camera.top = 18;
      dl.shadow.camera.near = 0.5;
      dl.shadow.camera.far = 80;
      dl.shadow.bias = -0.0004;
      dl.shadow.normalBias = 0.02;
      dl.userData.isSun = true;
      // light shines along the entity's local -Z (Forge convention)
      dl.position.set(0, 0, 0);
      dl.target.position.set(0, 0, -1);
      group.add(dl);
      group.add(dl.target);
    }
  }
  if (opts.icons && (e.light || e.camera) && e.mesh === 'none') {
    const s = new THREE.Sprite(iconMaterial(e.camera ? '🎥' : e.light?.kind === 'point' ? '💡' : '☀️'));
    s.scale.set(0.07, 0.07, 1);
    s.userData.entityId = e.id;
    s.userData.editorOnly = true;
    group.add(s);
  }
  group.visible = e.active;
  return out;
}

export function applyTransform(obj: THREE.Object3D, e: Entity) {
  const t = e.transform;
  obj.position.set(t.position[0], t.position[1], t.position[2]);
  obj.rotation.set(t.rotation[0] * D2R, t.rotation[1] * D2R, t.rotation[2] * D2R, 'XYZ');
  obj.scale.set(t.scale[0] || 1e-4, t.scale[1] || 1e-4, t.scale[2] || 1e-4);
}

/** Lights: directional light shadow box follows a focus point. */
export function aimSuns(root: THREE.Object3D, focus: THREE.Vector3) {
  root.traverse((o: any) => {
    if (o.isDirectionalLight && o.userData.isSun) {
      // The sun shines along its entity's -Z; keep that direction but centre the shadow box on the focus.
      const parent = o.parent as THREE.Object3D;
      const q = parent.getWorldQuaternion(new THREE.Quaternion());
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      const worldPos = focus.clone().addScaledVector(dir, -30);
      parent.worldToLocal(worldPos);
      o.position.copy(worldPos);
      const tgt = focus.clone();
      parent.worldToLocal(tgt);
      o.target.position.copy(tgt);
    }
  });
}

export function skyTexture(top: RGB, bottom: RGB): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  const css = (v: RGB) => `rgb(${v.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255)).join(',')})`;
  grd.addColorStop(0, css(top));
  grd.addColorStop(1, css(bottom));
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mainCamera(s: Scene): Entity | undefined {
  return s.entities.find((e) => e.camera && e.active);
}
