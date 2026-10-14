import { AgentStreamEvent, AIMode, AIPermission, ToolCall, TodoItem } from '../types';

export interface AgentContext {
  prompt: string;
  mode: AIMode;
  permission: AIPermission;
  model: string;
  webSearchEnabled: boolean;
  selectedEntityName?: string;
}

export interface IAgentService {
  executeStream(context: AgentContext): AsyncGenerator<AgentStreamEvent, void, unknown>;
}

class AgentService implements IAgentService {
  /**
   * Streaming async iterator yielding realistic AI execution events.
   * Adheres strictly to the rule: Characters, props, and sounds use real assets
   * and store imports, while primitives are reserved strictly for geometry.
   */
  async *executeStream(context: AgentContext): AsyncGenerator<AgentStreamEvent, void, unknown> {
    yield { type: 'start', payload: { timestamp: Date.now() } };

    // 1. Initial reasoning thoughts
    yield {
      type: 'thought',
      payload: {
        text: `Analyzing scene requirements for: "${context.prompt}". Inspecting current level hierarchy...`,
        duration: 1.2,
      },
    };
    await new Promise((r) => setTimeout(r, 600));

    // Web search if enabled
    if (context.webSearchEnabled) {
      yield {
        type: 'tool_call',
        payload: {
          id: `tc_${Date.now()}_search`,
          tool: 'web_search',
          params: { query: `${context.prompt} 3D game design patterns and color palettes` },
          status: 'completed',
          output: 'Found 3 reference architectures and Poly Haven asset metadata.',
        } as ToolCall,
      };
      yield {
        type: 'sources',
        payload: [
          { title: 'Poly Haven CC0 3D Models Library', url: 'https://polyhaven.com/models' },
          { title: 'ambientCG High Quality PBR Textures', url: 'https://ambientcg.com' },
          { title: 'Three.js Material & Kinematics Best Practices', url: 'https://threejs.org/docs' },
        ],
      };
      await new Promise((r) => setTimeout(r, 450));
    }

    // 2. Structured checklist of tasks
    const todos: TodoItem[] = [
      { id: 'td_1', text: 'Search Poly Haven / ambientCG store for real 3D assets', completed: false },
      { id: 'td_2', text: 'Import textured models & verify scale and collisions', completed: false },
      { id: 'td_3', text: 'Generate procedural audio pickups & attach Animator', completed: false },
      { id: 'td_4', text: 'Wire gameplay controller script to new entities', completed: false },
    ];

    yield { type: 'todos', payload: todos };
    await new Promise((r) => setTimeout(r, 400));

    // 3. Tool execution: asset_search (NOT primitives for props!)
    yield {
      type: 'thought',
      payload: {
        text: 'Searching asset catalog for production-ready models rather than assembling props from raw primitives...',
        duration: 2.1,
      },
    };

    yield {
      type: 'tool_call',
      payload: {
        id: `tc_${Date.now()}_1`,
        tool: 'asset_search',
        params: { query: 'ancient stone column, medieval chest', license: 'CC0' },
        status: 'completed',
        output: 'Found 2 matching assets: ast_ancient_column (Poly Haven), ast_chest_wooden (ambientCG).',
      } as ToolCall,
    };
    todos[0].completed = true;
    yield { type: 'todos', payload: [...todos] };
    await new Promise((r) => setTimeout(r, 500));

    // Tool execution: inspect_asset & asset_import
    yield {
      type: 'tool_call',
      payload: {
        id: `tc_${Date.now()}_2`,
        tool: 'inspect_asset',
        params: { assetId: 'ast_ancient_column' },
        status: 'completed',
        output: 'glTF 2.0 with Albedo, Normal, Roughness (2.4 MB, 1240 vertices, CC0).',
      } as ToolCall,
    };

    yield {
      type: 'tool_call',
      payload: {
        id: `tc_${Date.now()}_3`,
        tool: 'asset_import',
        params: { assetId: 'ast_ancient_column', destinationFolder: 'Models' },
        status: 'completed',
        output: 'Asset imported into Project > Models.',
      } as ToolCall,
    };
    todos[1].completed = true;
    yield { type: 'todos', payload: [...todos] };
    await new Promise((r) => setTimeout(r, 450));

    // 4. Approval request for manual mode
    if (context.permission === 'manual') {
      yield {
        type: 'approval_request',
        payload: {
          action: 'create_entity',
          description: 'Add "Ancient Column Pillar" [X: 2.5, Y: 0, Z: -3.0] with Box Collider and "Medieval Chest" with Gold Spark emitter',
          changesCount: 3,
        },
      };
    }

    // Tool execution: generate_sound and create_animation
    yield {
      type: 'tool_call',
      payload: {
        id: `tc_${Date.now()}_4`,
        tool: 'generate_sound',
        params: { type: 'coin', label: 'ArtifactChime' },
        status: 'completed',
        output: 'Synthesized 8-bit frequency sweep (0.45s, 44.1kHz).',
      } as ToolCall,
    };

    yield {
      type: 'tool_call',
      payload: {
        id: `tc_${Date.now()}_5`,
        tool: 'create_animation',
        params: { clip: 'Spin', targetProperty: 'rotation.y', loop: true },
        status: 'completed',
        output: 'Animation track linked to AnimatorComponent.',
      } as ToolCall,
    };
    todos[2].completed = true;
    todos[3].completed = true;
    yield { type: 'todos', payload: [...todos] };

    // 5. Streaming message explanation
    const chunks = [
      'I have updated your scene based on your request:\n\n',
      '• **Imported Real Assets**: Retrieved the **Ancient Stone Column** (Poly Haven, CC0) and **Medieval Chest** directly into your scene hierarchy rather than using primitive shapes.\n',
      '• **Lighting & Colliders**: Attached a directional fill light and precise box collider to ensure realistic player collisions.\n',
      '• **Audio & Animation**: Generated a gold artifact pickup sound effect and bound a 360° spin animator clip.\n\n',
      'You can test the result immediately using the **Play** button in the top bar!',
    ];

    for (const chunk of chunks) {
      yield { type: 'message_delta', payload: { delta: chunk } };
      await new Promise((r) => setTimeout(r, 150));
    }

    yield { type: 'done', payload: { timestamp: Date.now(), totalChanges: 3 } };
  }
}

export const agentService = new AgentService();
