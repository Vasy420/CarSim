# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
cd frontend
yarn install
yarn start       # dev server on :3000
yarn build       # production build
yarn test        # run tests
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Backend needs `backend/.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=<db_name>
CORS_ORIGINS=http://localhost:3000
```

Frontend `.env` is already committed at `frontend/.env` with `REACT_APP_BACKEND_URL=http://127.0.0.1:8000`.

## Architecture

### Simulation modes
`App.js` manages a top-level `mode` state: `'welcome'` → `'2d'` or `'3d'`.
- **2D**: React-rendered `<canvas>` in `Simulator.jsx` with a `requestAnimationFrame` loop.
- **3D**: A pre-built static Vite bundle served from `frontend/public/3d-sim/`, loaded inside an `<iframe>`.
- **Preview mode** (`?preview=1`): strips all UI — canvas fills the viewport. Used by `WelcomePage` to embed a live demo in an iframe.

### 2D simulation core (`frontend/src/lib/`)
| File | Role |
|------|------|
| `Car.js` | Physics, sensors (7 raycasts), scoring, `TRAFFIC`/`AI`/`MANUAL`/`AI_ASSIST` control types |
| `NeuralNetwork.js` | 3-layer feedforward NN: 8 inputs (7 sensors + speed) → 8 hidden → 3 outputs (steer, throttle, brake). Weights clamped to [-1, 1]. |
| `GeneticAlgorithm.js` | Elitism (top 10% carry unchanged) + mutation of top 20% to fill next generation |
| `Road.js` | Lane geometry |
| `TrafficLight.js` | Traffic light state machine |

`Simulator.jsx` owns all simulation state via refs (not React state) to avoid re-renders inside the animation loop. Props are mirrored into refs with a `useEffect` so the loop always reads the latest value.

### Control modes
- `AI_AUTO` — full neural net control, genetic evolution active
- `MANUAL` — arrow keys / WASD drive the player car
- `AI_ASSIST` — NN suggests but player can override

Difficulty maps to `trafficDensity`: easy=40, medium=50, hard=80. The mapping lives in `App.js`.

### React component tree
```
App.js
├── WelcomePage        — landing with iframe preview of 2D sim
├── Simulator          — canvas + NN viz canvas; manages simulation loop
├── ControlPanel       — run/pause, speed, population, difficulty, mode selector
├── StatsPanel         — generation, alive count, scores
└── ModelManager       — save/load brain JSON (UI complete; brain wire-up is a stub)
```

UI components are shadcn/ui (Radix primitives + Tailwind) in `src/components/ui/`. Build config uses CRACO (`craco.config.js`) to extend CRA with Tailwind via PostCSS.

### Backend
`backend/server.py` is a minimal FastAPI scaffold with a `/api/status` endpoint backed by MongoDB (motor). It is not involved in simulation logic — the sim runs entirely in the browser.
