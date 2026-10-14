# Forge Mobile 🔥

**Forge Mobile** is the mobile companion of **Forge**, an AI-native 3D game engine and editor.
Shaped by fire.

## Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Dark theme: `#141414`, `#1C1C1C`, `#262626`, accent `#F05A22`, gold `#F2B233`, bone `#EDE6D8`)
- **3D Viewport**: Three.js WebGL engine with touch Orbit, Pan, Pinch, and Raycaster selection
- **Audio**: Web Audio API Procedural SFX Synthesizer
- **State**: Zustand store with clean decoupled mock service interfaces
- **Mobile Container**: Capacitor 6 (`com.burkiuze.forge`)

---

## Quickstart (Web Development)

```bash
# Install dependencies
npm install

# Run Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser. Open mobile responsive view (360px–430px) for the best touch experience.

---

## Building the Android APK with Capacitor

Forge Mobile is configured to be wrapped into an Android APK using Capacitor:

```bash
# 1. Build the production web bundle
npm run build

# 2. Add Android native platform (first time only)
npx cap add android

# 3. Synchronize web assets into the Android native project
npx cap sync android

# 4. Open in Android Studio to build the debug/release APK
npx cap open android
```

Alternatively, to build directly from the CLI:
```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Features
- **First-Launch Setup Wizard**: Language picker (EN / TR), brand intro, `.env` file key importer, local model selector, and template project generator.
- **Start Screen**: Project hub with recent projects, templates, and mock update alert.
- **3D Scene Viewport**: Touch-optimized Orbit, Pan, Pinch, Raycast entity selection, Transform gizmos, and real-time Play/Stop physics simulation.
- **Hierarchy & Inspector**: Full entity tree with parenting, duplicate/delete, and inspector for Transform, Mesh Renderer, Light, Camera, Collider, Rigidbody, Audio Source, Animator, and Scripting code editor.
- **Asset Store & Sound Synthesizer**: CC0 3D models and textures + procedural 8-bit sound effect generator (Coin, Jump, Laser, Explosion, Hit, Powerup, Click, Blip) with real-time playback.
- **Animation Timeline**: Keyframe timeline editor with scrub, loop, record position/rotation/scale/color keys.
- **Antigravity AI Chat**: Minimal conversational interface with step-by-step thoughts, tool executions (`list_assets`, `inspect_asset`, `create_entity`, etc.), todo checklist, `@` entity mentions, `/slash` commands, and Manual approval cards.
- **Model Library**: OpenRouter cloud models + catalog of 300+ local GGUF models with size, RAM, and "Fits your device" indicators.
- **Secure Key Management**: Import `.env` files with zero leakage; keys are stored in secure storage, masked with only the last 4 characters displayed.

---
*made by burkiuze*
