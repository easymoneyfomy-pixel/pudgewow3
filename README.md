# Pudge Wars AAA ⚓🔥

A high-fidelity recreation of the classic **Warcraft 3 Pudge Wars** mod, built with modern web technologies. Focuses on skill-based gameplay, organic hook physics, and authentic "trailing" mechanics.

## 🚀 Key Features

- **2.5D Isometric Combat:** Smooth canvas-based rendering with glassmorphism UI.
- **Organic Hook Physics:** Hooks lock movement during flight and follow a polyline trailing path, exactly like the original engine.
- **Iconic WC3 Skills:**
  - **Meat Hook (Q):** Curving, trailing, and chain-detonating.
  - **Rot (W):** AOE damage toggle and self-deny mechanic.
  - **Flesh Heap (E):** Permanent HP scaling from kills.
- **Dynamic Items:** Blink Dagger, Techies Barrels (Mines), Tiny's Arm (Toss), and Healing Salves with break-on-damage logic.
- **AAA Netcode:** 60Hz server-side physics with client-side interpolation for buttery smooth 250Hz visuals.

## 🛠 Tech Stack

- **Frontend:** Vanilla JavaScript (ES Modules), Canvas 2D API.
- **Backend:** Node.js, WebSockets (`ws`).
- **Styling:** Modern CSS3 with Backdrop Filters and Neumorphism elements.

## 📦 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the tavern (server):**
   ```bash
   npm start
   ```
3. **Open the browser:**
   Navigate to `http://localhost:8080`

## 🩺 AI Doctor Certification
This project has undergone a full architectural overhaul:
- ✅ **Memory Leak Purge:** Fully stabilized entity tracking.
- ✅ **GC Optimization:** Minimized array reallocations in hot paths.
- ✅ **Frame Independence:** Physics and camera movement are decoupled from frame rate.
- ✅ **Code Quality:** Centralized balance constants and clean layer separation.

---
*Created with care by the AI Doctor.*
