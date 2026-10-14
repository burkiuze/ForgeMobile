import { create } from 'zustand';
import { AIMessage, AIMode, AIPermission, ToolCall, TodoItem } from '../types';
import { agentService } from '../services/AgentService';
import { useEditorStore } from './useEditorStore';

interface AIState {
  messages: AIMessage[];
  mode: AIMode;
  permission: AIPermission;
  selectedModel: string;
  webSearchEnabled: boolean;
  isStreaming: boolean;
  activeThoughts: string[];
  activeDuration: number;
  activeToolCalls: ToolCall[];
  activeTodos: TodoItem[];
  pendingApproval: {
    action: string;
    description: string;
    changesCount: number;
  } | null;
  unreviewedChangesCount: number;

  // Actions
  setMode: (mode: AIMode) => void;
  setPermission: (permission: AIPermission) => void;
  setSelectedModel: (model: string) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
  acceptApproval: (acceptAll?: boolean) => void;
  rejectApproval: () => void;
  reviewChanges: () => void;
  undoChanges: () => void;
  setMessageFeedback: (messageId: string, feedback: 'like' | 'dislike') => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  mode: 'planning',
  permission: 'manual',
  selectedModel: 'openrouter/free',
  webSearchEnabled: true,
  isStreaming: false,
  activeThoughts: [],
  activeDuration: 0,
  activeToolCalls: [],
  activeTodos: [],
  pendingApproval: null,
  unreviewedChangesCount: 0,

  setMode: (mode) => set({ mode }),
  setPermission: (permission) => set({ permission }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setWebSearchEnabled: (webSearchEnabled) => set({ webSearchEnabled }),

  sendMessage: async (text: string) => {
    if (!text.trim() || get().isStreaming) return;

    const userMsg: AIMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: Date.now(),
      text,
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isStreaming: true,
      activeThoughts: [],
      activeDuration: 0,
      activeToolCalls: [],
      activeTodos: [],
      pendingApproval: null,
    }));

    const agentMsgId = `msg_agent_${Date.now()}`;
    let agentText = '';
    const thoughts: string[] = [];
    const tools: ToolCall[] = [];
    let todos: TodoItem[] = [];
    let sources: { title: string; url: string }[] = [];

    try {
      const stream = agentService.executeStream({
        prompt: text,
        mode: get().mode,
        permission: get().permission,
        model: get().selectedModel,
        webSearchEnabled: get().webSearchEnabled,
      });

      for await (const event of stream) {
        if (!get().isStreaming) break; // User stopped streaming

        switch (event.type) {
          case 'thought':
            thoughts.push(event.payload.text);
            set({ activeThoughts: [...thoughts], activeDuration: event.payload.duration || 1.4 });
            break;

          case 'tool_call':
            tools.push(event.payload);
            set({ activeToolCalls: [...tools] });
            break;

          case 'todos':
            todos = event.payload;
            set({ activeTodos: [...todos] });
            break;

          case 'sources':
            sources = event.payload;
            break;

          case 'approval_request':
            set({ pendingApproval: event.payload });
            break;

          case 'message_delta':
            agentText += event.payload.delta;
            break;

          case 'done':
            set((state) => ({
              unreviewedChangesCount: state.unreviewedChangesCount + (event.payload.totalChanges || 0),
            }));
            break;
        }
      }

      // Finalize agent message in chat history
      const finalAgentMsg: AIMessage = {
        id: agentMsgId,
        sender: 'agent',
        timestamp: Date.now(),
        text: agentText,
        thoughts: thoughts.length > 0 ? thoughts : undefined,
        thoughtDurationSeconds: get().activeDuration,
        toolCalls: tools.length > 0 ? tools : undefined,
        todos: todos.length > 0 ? todos : undefined,
        sources: sources.length > 0 ? sources : undefined,
      };

      set((state) => ({
        messages: [...state.messages, finalAgentMsg],
        isStreaming: false,
      }));
    } catch (e) {
      set({ isStreaming: false });
    }
  },

  stopStreaming: () => set({ isStreaming: false }),

  acceptApproval: (acceptAll = false) => {
    const { pendingApproval } = get();
    if (!pendingApproval) return;

    // Apply scene mutation by adding the real asset
    const editorStore = useEditorStore.getState();
    editorStore.addEntity({
      id: `ent_column_${Date.now()}`,
      name: 'Ancient Stone Column',
      tag: 'Environment',
      visible: true,
      transform: {
        position: [2.5, 1.2, -3.0],
        rotation: [0, 0.4, 0],
        scale: [1, 2.4, 1],
      },
      meshRenderer: {
        geometry: 'cylinder',
        color: '#718096',
        metallic: 0.2,
        roughness: 0.8,
        wireframe: false,
      },
      collider: {
        type: 'box',
        isTrigger: false,
        size: [1, 2.4, 1],
      },
    });

    set({ pendingApproval: null });
  },

  rejectApproval: () => {
    set({ pendingApproval: null });
  },

  reviewChanges: () => {
    useEditorStore.getState().setActiveTab('hierarchy');
  },

  undoChanges: () => {
    set({ unreviewedChangesCount: 0 });
  },

  setMessageFeedback: (messageId, feedback) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)),
    }));
  },
}));
