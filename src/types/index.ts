export type Vector3D = [number, number, number];

export interface TransformComponent {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

export interface MeshRendererComponent {
  geometry: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane';
  color: string;
  texture?: string;
  metallic: number; // 0 to 1
  roughness: number; // 0 to 1
  wireframe: boolean;
}

export interface LightComponent {
  type: 'directional' | 'point' | 'spot' | 'ambient';
  color: string;
  intensity: number;
  castShadow: boolean;
  distance?: number;
}

export interface CameraComponent {
  fov: number;
  near: number;
  far: number;
  isMain: boolean;
}

export interface ColliderComponent {
  type: 'box' | 'sphere' | 'capsule';
  isTrigger: boolean;
  size: Vector3D;
}

export interface RigidbodyComponent {
  mass: number;
  drag: number;
  useGravity: boolean;
  isKinematic: boolean;
  velocity?: Vector3D;
}

export interface AudioSourceComponent {
  clip: string;
  volume: number;
  loop: boolean;
  playOnStart: boolean;
}

export interface AnimatorComponent {
  clip: string;
  speed: number;
  playOnStart: boolean;
  isPlaying?: boolean;
}

export interface ScriptComponent {
  name: string;
  code: string;
  enabled: boolean;
}

export interface Entity {
  id: string;
  name: string;
  tag?: string;
  visible: boolean;
  locked?: boolean;
  parentId?: string | null;
  transform: TransformComponent;
  meshRenderer?: MeshRendererComponent;
  light?: LightComponent;
  camera?: CameraComponent;
  collider?: ColliderComponent;
  rigidbody?: RigidbodyComponent;
  audioSource?: AudioSourceComponent;
  animator?: AnimatorComponent;
  script?: ScriptComponent;
}

export interface SceneProject {
  id: string;
  name: string;
  template: 'platformer' | 'starter3d' | 'empty';
  createdAt: number;
  updatedAt: number;
  entities: Entity[];
}

export interface Keyframe {
  time: number; // in seconds
  value: any;
}

export interface AnimationTrack {
  property: 'position.x' | 'position.y' | 'position.z' | 'rotation.y' | 'scale.x' | 'scale.y' | 'scale.z' | 'color';
  keyframes: Keyframe[];
}

export interface AnimationClip {
  id: string;
  name: string;
  duration: number; // seconds
  loop: boolean;
  tracks: AnimationTrack[];
}

export interface StoreAsset {
  id: string;
  name: string;
  category: 'models' | 'textures' | 'audio' | 'animations';
  thumbnailUrl?: string;
  license: string;
  author: string;
  size: string;
  tags: string[];
  downloaded: boolean;
  previewUrl?: string;
}

export interface LocalModel {
  id: string;
  name: string;
  family: string;
  quantization: string;
  diskSize: string;
  ramRequirement: string;
  fitsDevice: boolean;
  downloaded: boolean;
  downloadProgress?: number;
  isDownloading?: boolean;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  contextLength: string;
  pricing: string;
  badge?: string;
}

export type AIMode = 'planning' | 'fast' | 'ask';
export type AIPermission = 'manual' | 'auto';

export interface ToolCall {
  id: string;
  tool: string;
  params: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'rejected';
  output?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'agent';
  timestamp: number;
  text: string;
  thoughts?: string[];
  thoughtDurationSeconds?: number;
  toolCalls?: ToolCall[];
  todos?: TodoItem[];
  sources?: { title: string; url: string }[];
  requiresApproval?: boolean;
  pendingChangesCount?: number;
  feedback?: 'like' | 'dislike';
}

export interface AgentStreamEvent {
  type: 'start' | 'thought' | 'tool_call' | 'approval_request' | 'todos' | 'message_delta' | 'sources' | 'done';
  payload: any;
}
