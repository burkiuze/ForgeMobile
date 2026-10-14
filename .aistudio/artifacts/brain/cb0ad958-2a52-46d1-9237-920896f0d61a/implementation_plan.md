# Forge Mobile — AI-Native Game Engine & Editor

Forge Mobile is the companion mobile editor for **Forge**, a next-generation AI-native 3D game engine. Built mobile-first with touch-optimized ergonomics, Forge Mobile lets developers inspect, animate, tweak physics and components, browse CC0 asset repositories, synthesize procedural sound effects, and collaborate with an Antigravity-style agent that modifies live scene hierarchies and scripts.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during initial clarification and are locked into the architecture:

- **Confirmed Decision 1 (Initial Launch Screen)**: The application boots into the **First-launch Setup Wizard walkthrough** on first visit (Language selection $\rightarrow$ Welcome $\rightarrow$ AI `.env` / OpenRouter setup $\rightarrow$ Local Model selection $\rightarrow$ Project template creation), guiding the user into their workspace. Once completed or skipped, subsequent launches open the interactive **Editor** or **Start Screen**.
- **Confirmed Decision 2 (3D Viewport Controls)**: The 3D viewport defaults to **Touch Orbit, Pan, Pinch & Gizmo manipulation** (Move, Rotate, Scale) with a floating Play/Stop simulation button.
- **Confirmed Decision 3 (AI Agent Behavior)**: The AI copilot runs with **step-by-step thinking, interactive tool-call rows (`list_assets`, `inspect_asset`, `create_entity`, etc.), live todo checklists, and an approval card** in Manual mode (Accept / Accept All / Reject) before mutating the scene.

---

### 1. Overview & Core Concept

- **What It Does**: A complete mobile 3D game development environment running smoothly on web and packaged for Android via Capacitor. Developers can build 3D levels, configure materials, lights, cameras, rigidbodies, colliders, audio, and scripts, craft custom keyframe animations, and use natural language AI commands (with `@entity` mentions and `/slash` commands) to compose game worlds.
- **Target Audience / Persona**: Indie game developers, technical artists, game designers, and mobile creators who want to prototype, tweak shaders, adjust scene compositions, or co-create games on their phones or tablets.
- **Key Value**: Zero-friction 3D authoring on mobile with real Three.js rendering, instant Web Audio SFX generation, secure local-first API key import from `.env` files, and intelligent agent actions that inspect and import real assets rather than crude primitive mockups.

---

### 2. User Experience & Visual Design

#### Visual Identity & Theme Tokens
- **Background Base**: `#141414` (Deep obsidian dark)
- **Panels & Surfaces**: `#1C1C1C` (Primary cards) & `#262626` (Elevated headers / secondary sheets)
- **Borders & Dividers**: `#333333` / `#3D3D3D`
- **Accent Primary**: `#F05A22` (Forge Orange)
- **Accent Secondary**: `#F2B233` (Molten Gold / Sparks)
- **Typography Tone**: `#EDE6D8` (Bone White text for high readability and warm contrast)
- **Muted Text**: `#9E988D`
- **Logo**: Stylized Forge flame "F" with subtle gold sparks and the tagline *"Shaped by fire"*.
- **Footer Attribution**: Centered `made by burkiuze` at ~35% opacity on the Start Screen and Setup Wizard.
- **Touch Ergonomics**: All interactive buttons, chips, tabs, and gizmo selectors strictly respect $\ge 44\text{px}$ touch targets with safe-area padding for notches and bottom gesture bars.

#### Key Screens & User Flows

1. **Setup Wizard (First Launch)**
   - **Step 1 — Language**: English or Türkçe (auto-detected TR if browser/system is Turkish).
   - **Step 2 — Welcome**: Brand introduction, logo animation, and engine overview.
   - **Step 3 — AI & Secrets**: Import from `.env` file via file picker, paste masked `OPENROUTER_API_KEY` / `HF_TOKEN`, or skip.
   - **Step 4 — Model Selection**: Choose OpenRouter (Auto, Gemma 4 31B, Mercury Decide) or select an on-device local model.
   - **Step 5 — Create Project**: Name project + select template (*Platformer*, *3D Starter*, *Empty*).
   - **Complete**: Opens the Editor with the preloaded platformer scene.

2. **Start Screen (Project Hub)**
   - New Project creation dialog with templates.
   - Recent projects list with thumbnail badges, entity counts, and last modified timestamps.
   - "Open from device" JSON scene loader.
   - Mock update banner: *"Update available - update now?"* with `Update` and `Later` actions.

3. **Game Editor (5 Main Tabs)**
   - **Scene Tab**: Three.js WebGL viewport featuring ground grid, dynamic shadows, soft ambient lighting, camera touch controls (single finger orbit, two finger pan/pinch zoom), selectable entity bounding outlines, transform gizmo toggles (Translate/Rotate/Scale), and a floating Play/Stop simulation preview running real-time kinematics.
   - **Hierarchy Tab**: Scannable entity tree with parent-child indentation, visibility toggles, selection highlights, drag/reorder controls, and a long-press/context bottom sheet to Add Entity (Cube, Sphere, Capsule, Light, Camera, Audio), Duplicate, or Delete.
   - **Inspector Tab**: Deep component inspector for selected entity:
     - *Transform*: Position ($X, Y, Z$), Rotation ($X, Y, Z$), Scale ($X, Y, Z$).
     - *Mesh Renderer*: Color picker, Metallic, Roughness, wireframe toggle, texture map slot.
     - *Light*: Point/Directional/Spot, Color, Intensity, Cast Shadows.
     - *Camera*: FOV, Near, Far, Aspect.
     - *Collider & Rigidbody*: Box/Sphere/Capsule, isTrigger, Mass, Drag, Use Gravity, Kinematic.
     - *Audio Source*: Web Audio synthesis sound clips, volume, loop, play on start.
     - *Animator*: Attached clip, playback speed, autoplay.
     - *Script*: Built-in code editor with syntax highlighting, template scripts (movement, rotate, collectible), and error linting.
     - *"Add Component"* bottom sheet.
   - **Assets Tab**:
     - *Project Tab*: Folders for Scripts, Textures, Prefabs, Models, Audio, Animations + device file importer.
     - *Store Tab*: Poly Haven / ambientCG style CC0 3D models and textures with thumbnails, license indicators, and 1-tap download; built-in procedural SFX generator (Coin, Jump, Laser, Explosion, Hit, Powerup, Click, Blip) with real-time sound playback and saving; preset animations (Bob, Spin, Pulse, Walk, Swing, Door, Shake, Flash, Hover).
   - **Animation Editor (Modal / Sub-Editor)**:
     - Clip selector, scrubbable playback timeline with keyframe diamonds, record key button (Position, Rotation, Scale, Color), play/stop loop, and duration scrubber.
   - **AI Antigravity-Style Chat**:
     - Minimal empty state: centered flame logo + project name + prompt bar.
     - Flowing stream: collapsible *"Thought for Xs"* reasoning blocks, tool execution pills (`list_assets`, `inspect_asset`, `asset_search`, `asset_import`, `create_entity`, `set_script`, `generate_sound`, `create_animation`), interactive todo checklist card, web search citations, thumbs up/down feedback, and an active *"N changes — Review — Undo"* bar.
     - Input bar: `+` attachment button, Mode chip (`Planning`, `Fast`, `Ask`), Model selector, Permission chip (`Manual` / `Auto`), Web search toggle, Send/Stop button.
     - Rich input features: `@` entity mention autocomplete popup and `/slash` commands (`/level`, `/game`, `/script`, `/light`, `/fix`, `/explain`, `/search`).
     - Manual mode shows an interactive **Approval Card** with `Accept`, `Accept All`, and `Reject` before any changes are written to the scene.

4. **Model Library Screen**
   - **Cloud Models (OpenRouter)**: Auto (`openrouter/free`), Gemma 4 31B, Mercury Decide, North Mini Code, Inkling Small.
   - **Local Models (300+ GGUF catalog)**: Categorized & searchable (Llama 3, Qwen 2.5, Gemma 2, Phi 3.5, Mistral, DeepSeek, gpt-oss, Granite) displaying quantization (`Q4_K_M`, `Q5_K_M`, `Q8_0`), download size, RAM requirements, and an intelligent *"Fits your device"* badge with simulated download progress bars.

5. **Settings Screen (Preferences)**
   - Grouped into General, Editor, Rendering, Audio, AI, Agents & Models, Memory, API Keys, and Updates.
   - **API Keys Section**: Secure import from `.env`, manual masked inputs with reveal toggles, key testing, and deletion.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Architecture Behind Service Interfaces**
  - *Chosen Approach*: Decouple all data persistence and agent execution behind clean TypeScript interfaces (`SceneService`, `AgentService`, `ModelService`, `AssetService`, `UpdateService`, `SecretsService`) managed via a centralized Zustand store.
  - *Why*: Allows the app to run completely client-side in Vite/Capacitor immediately with robust mock datasets and realistic async streams, while making future backend or real LLM/OpenRouter bindings a 1-line swap.
- **Decision 2: 3D Engine Implementation via Three.js Canvas**
  - *Chosen Approach*: Three.js direct scene controller integrated into a responsive React canvas component with OrbitControls and interactive Raycaster selection.
  - *Why*: Eliminates complex multi-package version conflicts while providing fluid touch controls, custom bounding boxes, play-mode kinematic physics simulations, and seamless mobile responsiveness.
- **Decision 3: Zero-Dependency Sound Synthesizer**
  - *Chosen Approach*: Built-in Web Audio API synthesizer for the sound generator (Coin, Jump, Laser, Explosion, Hit, Powerup, Click, Blip).
  - *Why*: Provides instant, audible audio previews with zero external audio assets or network latency.
- **Decision 4: Mobile-First Safe Area & Landscape Optimization**
  - *Chosen Approach*: Tailwind utility classes with CSS environment variables (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) and responsive breakpoints for both portrait mobile and landscape orientation.

---

### 4. Technical Architecture & Data Strategy

#### System & Component Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App Container                             │
│       (i18n Context: EN/TR • Safe Area Insets • Dark Theme #141414)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
┌───▼──────────────────┐                                ┌───────────▼───────────┐
│     Setup Wizard     │ (First Launch)                 │      Start Screen     │
│ - Language Picker    │                                │ - Project List        │
│ - AI .env Import     │                                │ - Template Cards      │
│ - Model Selector     │                                │ - Update Banner       │
│ - Project Template   │                                │ - "made by burkiuze"  │
└───┬──────────────────┘                                └───────────┬───────────┘
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    │ Launch / Select Project
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                          Forge Mobile Editor                          │
├───────────────────────────────────────────────────────────────────────┤
│  Top Bar: Project Title • Play/Stop • Undo/Redo • Model Pill • Menu   │
├───────────────────────────────────┬───────────────────────────────────┤
│           Main Viewport           │           Sidebar Sheets          │
│ ┌───────────────────────────────┐ │ ┌───────────────────────────────┐ │
│ │        3D Scene Canvas        │ │ │       Hierarchy Tree          │ │
│ │ - Three.js WebGL Renderer     │ │ │ - Reparent / Add / Duplicate  │ │
│ │ - Touch Orbit / Pan / Pinch   │ │ ├───────────────────────────────┤ │
│ │ - Gizmo: Move / Rotate / Scale│ │ │       Inspector Panel         │ │
│ │ - Kinematics Simulation Mode  │ │ │ - Transform, Mesh, Light,     │ │
│ └───────────────────────────────┘ │ │   Camera, Rigidbody, Audio,   │ │
│                                   │ │   Animator & Code Script      │ │
│                                   │ └───────────────────────────────┘ │
├───────────────────────────────────┴───────────────────────────────────┤
│   Bottom Sub-Sheets & Overlays:                                       │
│   • Asset Store & Sound FX Generator (Web Audio Synthesizer)          │
│   • Keyframe Animation Editor (Timeline, Diamonds, Record, Scrub)     │
│   • Antigravity AI Chat (Collapsible Thoughts, Tools, Approval Card)   │
│   • Model Library (OpenRouter + 300+ Local GGUF catalog)              │
│   • Full Preferences Settings & Secure .env Keys Storage              │
├───────────────────────────────────────────────────────────────────────┤
│  Bottom Nav: [ Scene ]  [ Hierarchy ]  [ Inspector ]  [ Assets ] [ AI ]│
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       State & Service Interfaces                      │
├───────────────────────────────────┬───────────────────────────────────┤
│ Zustand Stores                    │ Services (Mock Implementations)   │
│ • useEditorStore (scene, select)  │ • SceneService (CRUD, physics)    │
│ • useAIStore (chat, tools, stream)│ • AgentService (streaming events) │
│ • useAssetStore (store, sound fx) │ • ModelService (cloud & GGUF cat) │
│ • useSettingsStore (theme, lang)  │ • SecretsService (.env parser)    │
│ • useSecretsStore (masked keys)   │ • UpdateService (version check)   │
└───────────────────────────────────┴───────────────────────────────────┘
```

#### Seed Scene (3D Platformer)
The editor will boot with a fully interactive 3D Platformer project containing:
1. **Ground**: Large slate-colored floor tile with grid texture and static collider.
2. **Player**: Bone-white capsule with player tag, dynamic Rigidbody (mass 1.0), capsule collider, and movement script.
3. **Platforms**: 3 floating stepping platforms at varying heights and orientations.
4. **Coins / Collectibles**: 3 spinning gold coins (`#F2B233`) with point lights, trigger colliders, and bobbing animations.
5. **Lighting**: Sun DirectionalLight casting shadows + warm ambient fill light.
6. **Main Camera**: Isometric 3D perspective camera targeting the platform arena.

---

### Step-by-Step Implementation Strategy

1. **Project Setup & Dependencies**: Set up Vite + React + TypeScript with Tailwind CSS, Three.js, Lucide-react icons, and Zustand. Configure `capacitor.config.ts` (`appId: com.burkiuze.forge`, `appName: Forge`).
2. **i18n & Localization**: Implement full English & Türkçe string dictionary with automatic device detection and live toggle.
3. **Core Services & State**: Implement `SecretsService` (with `.env` parser, masked display, storage fallback), `SceneService`, `ModelService` (OpenRouter + 300+ GGUFs), `AssetService` (with Web Audio sound synthesizer), `UpdateService`, and `AgentService` (async event stream).
4. **Setup Wizard & Start Screen**: Build first-run wizard with `.env` file import, local model selection, and template project creation.
5. **3D Viewport & Simulation Engine**: Build touch-interactive Three.js canvas with orbit/pan/pinch, object picking, transform manipulation, grid, and play-mode physics loop.
6. **Hierarchy & Inspector**: Build tree hierarchy with drag reorder and comprehensive multi-component inspector (Transform, Mesh, Light, Camera, Collider, Rigidbody, Audio Source, Animator, Script editor).
7. **Asset Store & Sound Synthesizer**: Build CC0 asset browser and real-time procedural 8-bit sound effect generator.
8. **Animation Timeline Editor**: Keyframe track editor with scrubbable timeline and record capabilities.
9. **Antigravity AI Chat**: Clean minimal AI interface with collapsible thoughts, tool-call rows, todo checklist, `@` mentions, `/slash` commands, and approval cards.
10. **Model Library & Settings**: Filterable model catalog and comprehensive engine preferences.
11. **Packaging & README**: Include Android APK export guidelines via Capacitor.
