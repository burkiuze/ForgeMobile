import { Entity, SceneProject } from '../types';

export interface ISceneService {
  getProjects(): Promise<SceneProject[]>;
  getProjectById(id: string): Promise<SceneProject | null>;
  saveProject(project: SceneProject): Promise<void>;
  createProject(name: string, template: 'platformer' | 'starter3d' | 'empty'): Promise<SceneProject>;
  deleteProject(id: string): Promise<void>;
  createDefaultPlatformerProject(): SceneProject;
}

const SEED_PLATFORMER_PROJECT: SceneProject = {
  id: 'proj_platformer_seed',
  name: 'Platformer Alpha',
  template: 'platformer',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
  entities: [
    {
      id: 'entity_ground',
      name: 'Ground',
      tag: 'Environment',
      visible: true,
      transform: {
        position: [0, -0.5, 0],
        rotation: [0, 0, 0],
        scale: [16, 1, 16],
      },
      meshRenderer: {
        geometry: 'box',
        color: '#2A303C',
        metallic: 0.1,
        roughness: 0.8,
        wireframe: false,
      },
      collider: {
        type: 'box',
        isTrigger: false,
        size: [16, 1, 16],
      },
    },
    {
      id: 'entity_player',
      name: 'Player',
      tag: 'Player',
      visible: true,
      transform: {
        position: [0, 1.2, 0],
        rotation: [0, 0, 0],
        scale: [0.8, 1.6, 0.8],
      },
      meshRenderer: {
        geometry: 'capsule',
        color: '#EDE6D8', // Bone white player
        metallic: 0.2,
        roughness: 0.4,
        wireframe: false,
      },
      collider: {
        type: 'capsule',
        isTrigger: false,
        size: [0.8, 1.6, 0.8],
      },
      rigidbody: {
        mass: 1.0,
        drag: 0.1,
        useGravity: true,
        isKinematic: false,
        velocity: [0, 0, 0],
      },
      script: {
        name: 'PlayerController.ts',
        code: `// Player Controller\\nexport function update(dt: number) {\\n  // Move and jump logic\\n  if (input.isActionPressed('jump')) {\\n    rigidbody.applyImpulse([0, 5, 0]);\\n  }\\n}`,
        enabled: true,
      },
    },
    {
      id: 'entity_platform_1',
      name: 'Floating Island A',
      tag: 'Platform',
      visible: true,
      transform: {
        position: [-3.5, 1.5, -2],
        rotation: [0, 0.15, 0],
        scale: [3, 0.6, 3],
      },
      meshRenderer: {
        geometry: 'box',
        color: '#F05A22', // Forge Orange platform
        metallic: 0.3,
        roughness: 0.5,
        wireframe: false,
      },
      collider: {
        type: 'box',
        isTrigger: false,
        size: [3, 0.6, 3],
      },
    },
    {
      id: 'entity_platform_2',
      name: 'Floating Island B',
      tag: 'Platform',
      visible: true,
      transform: {
        position: [3.5, 3.0, 1.5],
        rotation: [0, -0.2, 0],
        scale: [3.5, 0.6, 3],
      },
      meshRenderer: {
        geometry: 'box',
        color: '#3F4E5E',
        metallic: 0.2,
        roughness: 0.6,
        wireframe: false,
      },
      collider: {
        type: 'box',
        isTrigger: false,
        size: [3.5, 0.6, 3],
      },
    },
    {
      id: 'entity_coin_1',
      name: 'Gold Spark Coin',
      tag: 'Collectible',
      visible: true,
      transform: {
        position: [-3.5, 2.6, -2],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.15],
      },
      meshRenderer: {
        geometry: 'cylinder',
        color: '#F2B233', // Molten Gold
        metallic: 0.9,
        roughness: 0.2,
        wireframe: false,
      },
      collider: {
        type: 'sphere',
        isTrigger: true,
        size: [0.5, 0.5, 0.5],
      },
      light: {
        type: 'point',
        color: '#F2B233',
        intensity: 2.5,
        castShadow: false,
        distance: 4,
      },
      animator: {
        clip: 'Spin',
        speed: 1.5,
        playOnStart: true,
      },
      audioSource: {
        clip: 'coin_pickup',
        volume: 0.8,
        loop: false,
        playOnStart: false,
      },
    },
    {
      id: 'entity_coin_2',
      name: 'Apex Artifact',
      tag: 'Collectible',
      visible: true,
      transform: {
        position: [3.5, 4.2, 1.5],
        rotation: [0, 0, 0],
        scale: [0.5, 0.5, 0.15],
      },
      meshRenderer: {
        geometry: 'cylinder',
        color: '#F2B233',
        metallic: 0.9,
        roughness: 0.2,
        wireframe: false,
      },
      collider: {
        type: 'sphere',
        isTrigger: true,
        size: [0.5, 0.5, 0.5],
      },
      light: {
        type: 'point',
        color: '#F2B233',
        intensity: 2.5,
        castShadow: false,
        distance: 4,
      },
      animator: {
        clip: 'Bob',
        speed: 1.2,
        playOnStart: true,
      },
    },
    {
      id: 'entity_sun',
      name: 'Forge Sun',
      tag: 'Light',
      visible: true,
      transform: {
        position: [6, 12, 6],
        rotation: [-0.8, 0.6, 0],
        scale: [1, 1, 1],
      },
      light: {
        type: 'directional',
        color: '#FFF8EE',
        intensity: 2.2,
        castShadow: true,
      },
    },
    {
      id: 'entity_main_cam',
      name: 'Main Camera',
      tag: 'MainCamera',
      visible: true,
      transform: {
        position: [8, 9, 13],
        rotation: [-0.4, 0.5, 0],
        scale: [1, 1, 1],
      },
      camera: {
        fov: 50,
        near: 0.1,
        far: 1000,
        isMain: true,
      },
    },
  ],
};

class SceneService implements ISceneService {
  private STORAGE_KEY = 'forge_projects_cache';

  createDefaultPlatformerProject(): SceneProject {
    return JSON.parse(JSON.stringify(SEED_PLATFORMER_PROJECT));
  }

  async getProjects(): Promise<SceneProject[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed: SceneProject[] = JSON.parse(stored);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    const defaultProj = this.createDefaultPlatformerProject();
    await this.saveProject(defaultProj);
    return [defaultProj];
  }

  async getProjectById(id: string): Promise<SceneProject | null> {
    const list = await this.getProjects();
    return list.find((p) => p.id === id) || null;
  }

  async saveProject(project: SceneProject): Promise<void> {
    const list = await this.getProjects();
    const index = list.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      list[index] = { ...project, updatedAt: Date.now() };
    } else {
      list.unshift({ ...project, updatedAt: Date.now() });
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  }

  async createProject(name: string, template: 'platformer' | 'starter3d' | 'empty'): Promise<SceneProject> {
    const id = `proj_${Date.now()}`;
    let entities: Entity[] = [];

    if (template === 'platformer') {
      entities = this.createDefaultPlatformerProject().entities;
    } else if (template === 'starter3d') {
      entities = [
        {
          id: 'ent_plane',
          name: 'Floor',
          visible: true,
          transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [10, 0.2, 10] },
          meshRenderer: { geometry: 'box', color: '#333333', metallic: 0.1, roughness: 0.9, wireframe: false },
          collider: { type: 'box', isTrigger: false, size: [10, 0.2, 10] },
        },
        {
          id: 'ent_cube',
          name: 'Hero Cube',
          visible: true,
          transform: { position: [0, 1, 0], rotation: [0, 0.5, 0], scale: [1.5, 1.5, 1.5] },
          meshRenderer: { geometry: 'box', color: '#F05A22', metallic: 0.5, roughness: 0.2, wireframe: false },
          rigidbody: { mass: 1, drag: 0.1, useGravity: true, isKinematic: false },
        },
        {
          id: 'ent_sun',
          name: 'Directional Light',
          visible: true,
          transform: { position: [5, 10, 5], rotation: [-0.6, 0.4, 0], scale: [1, 1, 1] },
          light: { type: 'directional', color: '#FFFFFF', intensity: 2, castShadow: true },
        },
      ];
    }

    const newProject: SceneProject = {
      id,
      name: name.trim() || 'New Forge Scene',
      template,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities,
    };

    await this.saveProject(newProject);
    return newProject;
  }

  async deleteProject(id: string): Promise<void> {
    const list = await this.getProjects();
    const filtered = list.filter((p) => p.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }
}

export const sceneService = new SceneService();
