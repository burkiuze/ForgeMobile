// glTF/GLB loading from the project file system (relative textures/buffers resolved too).
// Models are normalised like the desktop: centred in a unit cube, entity scale = real size.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fileUrl, listFiles } from './vfs';

export interface LoadedModel {
  /** Unit-sized, centred group (clone it per entity). */
  root: THREE.Group;
  /** Real-world size in metres (x, y, z). */
  extents: [number, number, number];
  triangles: number;
  textured: boolean;
}

const cache = new Map<string, Promise<LoadedModel>>();

export function invalidateModel(project: string, path: string) {
  cache.delete(`${project}:${path}`);
}

export function loadModel(project: string, path: string): Promise<LoadedModel> {
  const key = `${project}:${path}`;
  let p = cache.get(key);
  if (!p) {
    p = load(project, path);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

async function load(project: string, path: string): Promise<LoadedModel> {
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
  // Pre-resolve every file next to the model so relative URIs map to blob URLs.
  const siblings = await listFiles(project, dir.replace(/\/$/, '') || '');
  const map = new Map<string, string>();
  for (const f of siblings) {
    const u = await fileUrl(project, f.path);
    if (u) map.set(f.path, u);
  }
  const mainUrl = await fileUrl(project, path);
  if (!mainUrl) throw new Error(`${path}: not found`);
  const manager = new THREE.LoadingManager();
  const BASE = 'forge-vfs://model/';
  manager.setURLModifier((url) => {
    if (url.startsWith(BASE)) {
      const rel = decodeURIComponent(url.slice(BASE.length).split('?')[0]).replace(/^\.\//, '');
      return map.get(dir + rel) || map.get(rel) || url;
    }
    return url;
  });
  const loader = new GLTFLoader(manager);
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.setResourcePath(BASE);
    loader.load(mainUrl, resolve, undefined, (e) => reject(new Error(`glTF: ${(e as any)?.message || e}`)));
  });
  const scene: THREE.Object3D = gltf.scene || gltf.scenes?.[0];
  if (!scene) throw new Error('glTF has no scene');
  let triangles = 0;
  let textured = false;
  scene.traverse((o: any) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      const g = o.geometry as THREE.BufferGeometry;
      triangles += g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.some((m: any) => m?.map)) textured = true;
    }
  });
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const ext: [number, number, number] = [size.x || 1, size.y || 1, size.z || 1];
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(scene);
  scene.position.sub(center);
  inner.scale.set(1 / ext[0], 1 / ext[1], 1 / ext[2]);
  root.add(inner);
  return { root, extents: ext.map((v) => Math.round(v * 1000) / 1000) as [number, number, number], triangles: Math.round(triangles), textured };
}
