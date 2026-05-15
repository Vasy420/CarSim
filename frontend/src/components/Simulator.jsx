import React, { useRef, useEffect, useState } from 'react';
import { Car } from '../lib/Car';
import { GeneticAlgorithm } from '../lib/GeneticAlgorithm';
import { NeuralNetwork } from '../lib/NeuralNetwork';
import { TrafficLight } from '../lib/TrafficLight';
import { Road } from '../lib/Road';

export const Simulator = ({
  isRunning,
  speedMultiplier,
  populationSize,
  showSensors,
  showNetwork,
  onStatsUpdate,
  resetTrigger,
  controlMode = 'AI_AUTO',
  trafficDensity = 100
}) => {
  const canvasRef = useRef(null);
  const networkCanvasRef = useRef(null);
  const animationRef = useRef(null);
  const carsRef = useRef([]);
  const trafficRef = useRef([]);
  const gaRef = useRef(null);
  const roadRef = useRef(null);
  const bestCarRef = useRef(null);
  const playerCarRef = useRef(null);
  const frameCountRef = useRef(0);
  const cameraYRef = useRef(0);
  const cameraXRef = useRef(0);
  const prevBrainRef = useRef(null);
  const evolutionFlashRef = useRef(0);
  const trafficLightsRef = useRef([]);
  const crossTrafficRef = useRef([]);
  const crossStateRef = useRef([]);
  // Persistent weight-change accumulators (per layer) so learning trail decays slowly across frames
  const weightChangeRef = useRef({ ih: null, ho: null });
  // Recent significant weight changes per generation (ticker)
  const learningLogRef = useRef([]);

  // Refs for props to access fresh values inside animation loop
  const isRunningRef = useRef(isRunning);
  const speedRef = useRef(speedMultiplier);
  const showSensorsRef = useRef(showSensors);
  const showNetworkRef = useRef(showNetwork);
  const controlModeRef = useRef(controlMode);
  const trafficDensityRef = useRef(trafficDensity);

  useEffect(() => {
    isRunningRef.current = isRunning;
    speedRef.current = speedMultiplier;
    showSensorsRef.current = showSensors;
    showNetworkRef.current = showNetwork;
    controlModeRef.current = controlMode;
    trafficDensityRef.current = trafficDensity;
  }, [isRunning, speedMultiplier, showSensors, showNetwork, controlMode, trafficDensity]);

  // Keyboard controls for manual mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!playerCarRef.current) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          playerCarRef.current.manualControls.forward = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          playerCarRef.current.manualControls.backward = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          playerCarRef.current.manualControls.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          playerCarRef.current.manualControls.right = true;
          break;
      }
    };

    const handleKeyUp = (e) => {
      if (!playerCarRef.current) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          playerCarRef.current.manualControls.forward = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          playerCarRef.current.manualControls.backward = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          playerCarRef.current.manualControls.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          playerCarRef.current.manualControls.right = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [controlMode]);

  // Update traffic density dynamically
  useEffect(() => {
    if (roadRef.current && trafficRef.current.length > 0) {
      initializeTraffic();
    }
  }, [trafficDensity]);

  // Initialize simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.width = 800;
    canvas.height = 800;

    // Initialize road
    const road = new Road(canvas.width);
    road.addFork();
    // Intersections placed only on STRAIGHT sections of road for clean alignment:
    //  -400  → straight at cx (waypoints 0 → -700)
    //  -2200 → straight at cx-180 (waypoints -1900 → -2600)
    //  -4400 → straight at cx (waypoints -4000 → -4800)
    road.addIntersections([-400, -2200, -4400]);
    roadRef.current = road;

    // Initialize genetic algorithm
    gaRef.current = new GeneticAlgorithm(populationSize, 0.1, 0.3);

    // Initialize cars
    initializeCars();

    // Start animation
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [resetTrigger, populationSize, controlMode]);

  const initializeCars = () => {
    const canvas = canvasRef.current;
    const road = roadRef.current;
    const laneWidth = road.width / road.laneCount;
    const startX = road.x - road.width / 2 + laneWidth / 2 + laneWidth;

    carsRef.current = [];
    bestCarRef.current = null;
    playerCarRef.current = null;
    trafficRef.current = [];
    trafficLightsRef.current = [];
    crossTrafficRef.current = [];
    crossStateRef.current = [];
    cameraYRef.current = 0;
    cameraXRef.current = 0;

    if (controlMode === 'MANUAL' || controlMode === 'AI_ASSIST') {
      // Single player car
      const car = new Car(startX, 100, 30, 50, controlMode, '#00ffff');
      carsRef.current.push(car);
      playerCarRef.current = car;
    } else {
      // AI Auto mode - population of AI cars
      playerCarRef.current = null;
      for (let i = 0; i < populationSize; i++) {
        const car = new Car(startX, 100, 30, 50, 'AI', `hsl(${180 + i * 5}, 100%, ${50 + i}%)`);
        carsRef.current.push(car);
      }
    }

    initializeTraffic();
    initializeTrafficLights();
  };

  const initializeTrafficLights = () => {
    const road = roadRef.current;
    // Place main lights at south edge of each intersection (entry for upward cars)
    trafficLightsRef.current = road.intersections.map((inter, idx) => {
      const y = inter.y + inter.halfH;
      const centers = road.getLaneCenterAt(y);
      const cx = (centers[0] + centers[centers.length - 1]) / 2;
      const { nx, ny } = road.getRoadPerpAt(y);
      const timings = [[300, 200], [250, 280], [280, 240]][idx];
      return new TrafficLight(cx, y, road.width, timings[0], timings[1], nx, ny);
    });
    // Per-intersection cross-traffic state: alternates direction each red cycle
    crossStateRef.current = trafficLightsRef.current.map(() => ({
      direction: 1, prevRed: false, spawnTimer: 0
    }));
  };

  const initializeTraffic = () => {
    const road = roadRef.current;

    // Use ref so live value always wins — closure-captured trafficDensity can be stale in animate loop
    const baseDensity = 50;
    const density = trafficDensityRef.current ?? trafficDensity;
    const trafficCount = Math.floor(baseDensity * (density / 100));

    trafficRef.current = [];
    const trafficColors = ['#ff00ff', '#ff0080', '#8000ff'];
    // Distribute cars randomly within fixed span ahead of AI cars (or camera as fallback)
    let refY = cameraYRef.current;
    if (carsRef.current.length > 0) {
      const alive = carsRef.current.find(c => !c.damaged);
      if (alive) refY = alive.y;
    }
    const baseY = refY - 100;
    const span = 5000;
    const cellH = span / Math.max(1, trafficCount);
    for (let i = 0; i < trafficCount; i++) {
      // Stratified: each car in its own cell with jitter — avoids clumping
      const y = baseY - (i + Math.random()) * cellH;
      const centers = road.getLaneCenterAt(y);
      const lane = Math.floor(Math.random() * centers.length);
      const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
      const tCar = new Car(centers[lane], y, 30, 50, 'TRAFFIC', color);
      tCar.laneIndex = lane;
      trafficRef.current.push(tCar);
    }
  };

  const animate = () => {
    if (!isRunningRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const road = roadRef.current;
    const currentMode = controlModeRef.current;

    // Update traffic lights, collect active stop lines
    const activeStopLines = [];
    for (const light of trafficLightsRef.current) {
      light.update(speedRef.current);
      if (light.isRed()) activeStopLines.push(light.getStopLine());
    }

    // Cross-traffic spawn manager (per intersection)
    const halfMain = road.width / 2;
    for (let i = 0; i < trafficLightsRef.current.length; i++) {
      const light = trafficLightsRef.current[i];
      const inter = road.intersections[i];
      const state = crossStateRef.current[i];
      if (!inter || !state) continue;
      const isRed = light.isRed();
      if (isRed && !state.prevRed) {
        state.direction *= -1; // flip each red phase
        state.spawnTimer = 999; // immediate spawn allowed
      }
      state.prevRed = isRed;

      if (isRed) {
        state.spawnTimer += speedRef.current;
        // Block spawn only if pedestrian car STRICTLY inside intersection square
        // (queued cars sit south of stop line — outside box — so won't block)
        let pedInIntersection = false;
        for (const t of trafficRef.current) {
          if (Math.abs(t.y - inter.y) < inter.halfH &&
              Math.abs(t.x - inter.x) < halfMain) {
            pedInIntersection = true;
            break;
          }
        }
        // Stop spawning ~80 frames before green so cars clear in time
        if (!pedInIntersection && light.framesUntilGreen() > 80 && state.spawnTimer > 35) {
          const dir = state.direction;
          // 2 sub-lanes per direction. L→R: upper half; R→L: lower half
          const laneChoices = dir === 1
            ? [-inter.halfH * 0.66, -inter.halfH * 0.22]
            : [ inter.halfH * 0.22,  inter.halfH * 0.66];
          const laneY = inter.y + laneChoices[Math.floor(Math.random() * laneChoices.length)];
          const spawnX = dir === 1
            ? inter.x - halfMain - inter.extent + 40
            : inter.x + halfMain + inter.extent - 40;
          const car = new Car(spawnX, laneY, 30, 50, 'CROSS_TRAFFIC', '#ffaa00');
          car.crossDir = dir;
          car.interIdx = i;
          car.angle = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
          crossTrafficRef.current.push(car);
          state.spawnTimer = 0;
        }
      }
    }

    // Set crossStopX per car based on its main light state, then update (with peers for gap check)
    for (const car of crossTrafficRef.current) {
      const mainLight = trafficLightsRef.current[car.interIdx];
      const inter = road.intersections[car.interIdx];
      if (mainLight && inter && !mainLight.isRed()) {
        car.crossStopX = car.crossDir === 1 ? inter.x - halfMain : inter.x + halfMain;
      } else {
        car.crossStopX = null;
      }
      car.update([], crossTrafficRef.current, speedRef.current, []);
    }
    crossTrafficRef.current = crossTrafficRef.current.filter(c => {
      if (c.damaged) return false;
      // Remove when past opposite end
      for (const inter of road.intersections) {
        if (Math.abs(c.y - inter.y) < inter.halfH + 20) {
          const leftEnd = inter.x - halfMain - inter.extent;
          const rightEnd = inter.x + halfMain + inter.extent;
          if (c.x < leftEnd - 50 || c.x > rightEnd + 50) return false;
        }
      }
      return true;
    });

    // Update cars
    const carCount = carsRef.current.length;
    for (let i = 0; i < carCount; i++) {
      const car = carsRef.current[i];
      // AI damage/sensor borders: visible borders + invisible inner walls + active red stop lines
      const aiBorders = [
        ...road.borders,
        ...road.aiOnlyBorders,
        ...activeStopLines
      ];
      const allTraffic = crossTrafficRef.current.length
        ? [...trafficRef.current, ...crossTrafficRef.current]
        : trafficRef.current;
      car.update(aiBorders, allTraffic, speedRef.current, activeStopLines);

      if (!car.damaged) {
        const centers = road.getLaneCenterAt(car.y);
        const nearestCenter = centers.reduce((best, c) =>
          Math.abs(c - car.x) < Math.abs(best - car.x) ? c : best, centers[0]);
        car.laneDeviation += Math.abs(car.x - nearestCenter);
      }
    }

    // Update traffic (pass stop lines so they can stop at red lights)
    const trafficCount = trafficRef.current.length;
    const laneWidth = road.width / road.laneCount;
    for (let i = 0; i < trafficCount; i++) {
      const car = trafficRef.current[i];
      car.update([], trafficRef.current, speedRef.current, activeStopLines);

      // Nudge traffic cars to follow road curves
      if (car.laneIndex !== undefined) {
        const centers = road.getLaneCenterAt(car.y);
        const idx = Math.min(car.laneIndex, centers.length - 1);
        car.x += (centers[idx] - car.x) * 0.05;
      }

      // Align traffic car visual angle with road direction
      const perp = road.getRoadPerpAt(car.y);
      car.angle = Math.atan2(-perp.ny, perp.nx);

      // Respawn far-off cars AHEAD of the best AI (so they never appear from behind)
      if (car.y < cameraYRef.current - 2500) {
        let aheadY = cameraYRef.current - 4000;
        if (bestCarRef.current && !bestCarRef.current.damaged) {
          aheadY = bestCarRef.current.y - 3500 - Math.random() * 1500;
        }
        const centers = road.getLaneCenterAt(aheadY);
        const lane = Math.floor(Math.random() * centers.length);
        car.x = centers[lane];
        car.y = aheadY;
        car.speed = car.maxSpeed;
        car.laneIndex = lane;
      }
    }

    // Find best car
    let aliveCars;
    if (currentMode === 'MANUAL' || currentMode === 'AI_ASSIST') {
      // Manual/Assist mode - track player car
      bestCarRef.current = playerCarRef.current;
      aliveCars = playerCarRef.current && !playerCarRef.current.damaged ? [playerCarRef.current] : [];
    } else {
      // AI Auto mode - find best performing car
      aliveCars = [];
      for (let i = 0; i < carCount; i++) {
        if (!carsRef.current[i].damaged) {
          aliveCars.push(carsRef.current[i]);
        }
      }

      if (aliveCars.length > 0) {
        bestCarRef.current = aliveCars[0];
        for (let i = 1; i < aliveCars.length; i++) {
          if (aliveCars[i].score > bestCarRef.current.score) {
            bestCarRef.current = aliveCars[i];
          }
        }
      } else {
        bestCarRef.current = null;
      }
    }

    // Check if generation is complete (AI Auto mode only)
    if (currentMode === 'AI_AUTO' && aliveCars.length === 0) {
      // Capture best brain before evolve for weight-flash diff
      // (bestCarRef is already null here, so find best by score directly)
      const bestForFlash = carsRef.current.reduce(
        (best, c) => c.score > (best?.score ?? -Infinity) ? c : best, null
      );
      if (bestForFlash?.brain) {
        prevBrainRef.current = bestForFlash.brain.clone();
      }

      const newBrains = gaRef.current.evolve(carsRef.current);
      evolutionFlashRef.current = 60;

      const startX = road.x - road.width / 2 + laneWidth / 2 + laneWidth;
      for (let i = 0; i < carCount; i++) {
        const car = carsRef.current[i];
        car.brain = newBrains[i];
        car.damaged = false;
        car.score = 0;
        car.distanceTraveled = 0;
        car.laneDeviation = 0;
        car.timeAlive = 0;
        car.stuckFrames = 0;
        car.redWaitFrames = 0;
        car.bestY = 100;
        car.noProgressFrames = 0;
        car.prevX = startX;
        car.prevY = 100;

        // Reset position
        car.x = startX;
        car.y = 100;
        car.angle = 0;
        car.speed = 0;
      }

      // Reset traffic + cross traffic
      initializeTraffic();
      crossTrafficRef.current = [];
    }

    // Reset player car in manual/assist mode
    if ((currentMode === 'MANUAL' || currentMode === 'AI_ASSIST') && aliveCars.length === 0 && playerCarRef.current) {
      const startX = road.x - road.width / 2 + laneWidth / 2 + laneWidth;
      playerCarRef.current.damaged = false;
      playerCarRef.current.score = 0;
      playerCarRef.current.distanceTraveled = 0;
      playerCarRef.current.laneDeviation = 0;
      playerCarRef.current.timeAlive = 0;
      playerCarRef.current.stuckFrames = 0;
      playerCarRef.current.redWaitFrames = 0;
      playerCarRef.current.bestY = 100;
      playerCarRef.current.noProgressFrames = 0;
      playerCarRef.current.prevX = startX;
      playerCarRef.current.prevY = 100;
      playerCarRef.current.x = startX;
      playerCarRef.current.y = 100;
      playerCarRef.current.angle = 0;
      playerCarRef.current.speed = 0;

      initializeTraffic();
      crossTrafficRef.current = [];
    }

    // Update stats (throttled to every 10 frames to prevent UI lag)
    frameCountRef.current++;
    if (frameCountRef.current % 10 === 0) {
      const stats = gaRef.current.getStats(carsRef.current);
      onStatsUpdate(stats);
    }

    // RENDERING (optimized)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set camera to follow best car with smoothed movement (LERP)
    ctx.save();
    if (bestCarRef.current) {
      const zoom = 0.8;
      const targetX = bestCarRef.current.x;
      const targetY = bestCarRef.current.y;

      // Initialize or snap if too far
      if (cameraYRef.current === 0 || Math.abs(cameraYRef.current - targetY) > 2000) {
        cameraYRef.current = targetY;
        cameraXRef.current = targetX;
      } else {
        // LERP: Move 10% towards target per frame
        cameraYRef.current += (targetY - cameraYRef.current) * 0.1;
        cameraXRef.current += (targetX - cameraXRef.current) * 0.1;
      }

      ctx.translate(canvas.width / 2, canvas.height * 0.7);
      ctx.scale(zoom, zoom);
      ctx.translate(-cameraXRef.current, -cameraYRef.current);
    }

    // Draw road
    drawRoad(ctx, road);

    // Draw traffic lights
    for (const light of trafficLightsRef.current) {
      light.draw(ctx);
    }

    // Draw cross-direction lights (opposite phase of main)
    const halfMainDraw = road.width / 2;
    for (let i = 0; i < road.intersections.length; i++) {
      const inter = road.intersections[i];
      const mainLight = trafficLightsRef.current[i];
      if (!mainLight) continue;
      const crossRed = !mainLight.isRed();
      const color = crossRed ? '#ff2244' : '#00ff44';

      // West-side cross light (for L→R cars approaching from west)
      const wx = inter.x - halfMainDraw - 30;
      const wy = inter.y - inter.halfH - 30;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx, wy + 30);
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.fillRect(wx - 10, wy - 30, 20, 30);
      ctx.beginPath();
      ctx.arc(wx, wy - 15, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // East-side cross light
      const ex = inter.x + halfMainDraw + 30;
      const ey = inter.y - inter.halfH - 30;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex, ey + 30);
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.fillRect(ex - 10, ey - 30, 20, 30);
      ctx.beginPath();
      ctx.arc(ex, ey - 15, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cross stop lines (vertical, dashed when cross red)
      if (crossRed) {
        ctx.strokeStyle = 'rgba(255, 34, 68, 0.8)';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        // West stop line (L→R cars stop here)
        ctx.beginPath();
        ctx.moveTo(inter.x - halfMainDraw, inter.y - inter.halfH);
        ctx.lineTo(inter.x - halfMainDraw, inter.y + inter.halfH);
        ctx.stroke();
        // East stop line (R→L cars stop here)
        ctx.beginPath();
        ctx.moveTo(inter.x + halfMainDraw, inter.y - inter.halfH);
        ctx.lineTo(inter.x + halfMainDraw, inter.y + inter.halfH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw traffic (use live length — initializeTraffic may have resized array mid-frame)
    for (let i = 0; i < trafficRef.current.length; i++) {
      trafficRef.current[i].draw(ctx, false);
    }
    // Draw cross traffic
    for (const c of crossTrafficRef.current) {
      c.draw(ctx, false);
    }

    // Draw cars based on mode
    if (currentMode === 'MANUAL' || currentMode === 'AI_ASSIST') {
      // Draw player car with sensors if enabled
      if (playerCarRef.current) {
        playerCarRef.current.draw(ctx, showSensorsRef.current);
      }
    } else {
      // Draw AI cars (non-best faded)
      for (let i = 0; i < carCount; i++) {
        const car = carsRef.current[i];
        if (car !== bestCarRef.current) {
          ctx.globalAlpha = 0.2;
          car.draw(ctx, false);
          ctx.globalAlpha = 1;
        }
      }

      // Draw best car with sensors if enabled
      if (bestCarRef.current) {
        bestCarRef.current.draw(ctx, showSensorsRef.current);
      }
    }

    ctx.restore();

    // Draw network visualization (outside animation loop optimization)
    if (showNetworkRef.current && bestCarRef.current && bestCarRef.current.brain) {
      drawNetwork(bestCarRef.current);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const drawRoad = (ctx, road) => {
    const wp = road.waypoints;
    const half = road.width / 2;
    const laneW = road.width / road.laneCount;

    // ── 1. Fill road body along waypoint path (segment quads) ──
    ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
    for (let i = 0; i < wp.length - 1; i++) {
      const p1 = wp[i], p2 = wp[i + 1];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const nx = -dy / len * half, ny = dx / len * half;
      ctx.beginPath();
      ctx.moveTo(p1.x + nx, p1.y + ny);
      ctx.lineTo(p1.x - nx, p1.y - ny);
      ctx.lineTo(p2.x - nx, p2.y - ny);
      ctx.lineTo(p2.x + nx, p2.y + ny);
      ctx.closePath();
      ctx.fill();
    }

    // ── 2. Fill fork branches ──
    if (road.forkBranches) {
      for (const b of road.forkBranches) {
        ctx.fillRect(b.cx - b.width / 2, b.y - b.len, b.width, b.len);
      }
      // Island (solid dark triangle)
      const isl = road.forkIsland;
      ctx.fillStyle = '#0a0a14';
      ctx.beginPath();
      ctx.moveTo(isl.tipX,   isl.tipY);
      ctx.lineTo(isl.leftX,  isl.baseY);
      ctx.lineTo(isl.rightX, isl.baseY);
      ctx.closePath();
      ctx.fill();
    }

    // ── 2.5 Fill cross road bodies + intersection squares + cross lane dashes ──
    if (road.intersections && road.intersections.length) {
      ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
      for (const it of road.intersections) {
        ctx.fillRect(it.x - half - it.extent, it.y - it.halfH, it.extent, it.halfH * 2);
        ctx.fillRect(it.x + half, it.y - it.halfH, it.extent, it.halfH * 2);
        ctx.fillRect(it.x - half, it.y - it.halfH, half * 2, it.halfH * 2);
      }

      // Cross road lane dashes (3 lanes → 2 dividers at y ± halfH/3)
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      for (const it of road.intersections) {
        const laneH = it.halfH * 2 / 3;
        for (let k = 1; k < 3; k++) {
          const ly = it.y - it.halfH + k * laneH;
          ctx.beginPath();
          ctx.moveTo(it.x - half - it.extent, ly);
          ctx.lineTo(it.x - half, ly);
          ctx.moveTo(it.x + half, ly);
          ctx.lineTo(it.x + half + it.extent, ly);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // ── 3. Lane dashes along waypoint path ──
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    for (let lane = 1; lane < road.laneCount; lane++) {
      const offset = -half + lane * laneW; // signed distance from center
      ctx.beginPath();
      for (let i = 0; i < wp.length - 1; i++) {
        const p1 = wp[i], p2 = wp[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;
        const nx = -dy / len; // left-perp unit vector
        const ny =  dx / len;
        if (i === 0) ctx.moveTo(p1.x + nx * offset, p1.y + ny * offset);
        ctx.lineTo(p2.x + nx * offset, p2.y + ny * offset);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── 4. Border lines with glow ──
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    for (const border of road.borders) {
      ctx.beginPath();
      ctx.moveTo(border[0].x, border[0].y);
      ctx.lineTo(border[1].x, border[1].y);
      ctx.stroke();
    }
    // Decorative borders (cross arm walls) — drawn, but invisible to AI sensors
    if (road.decorativeBorders) {
      for (const border of road.decorativeBorders) {
        ctx.beginPath();
        ctx.moveTo(border[0].x, border[0].y);
        ctx.lineTo(border[1].x, border[1].y);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  };

  const drawNetwork = (car) => {
    const canvas = networkCanvasRef.current;
    if (!canvas || !car.brain) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = 20;
    const headerHeight = 45;
    const width = canvas.width - margin * 2;
    const chartHeight = 140;
    const tickerHeight = 90;
    const nnTop = headerHeight + 10;
    const nnHeight = canvas.height - headerHeight - chartHeight - tickerHeight - 30;

    // Sensor inputs (pad to 7)
    const sensorInputs = car.sensorReadings.map(r => r ? r.distance : 0);
    while (sensorInputs.length < 7) sensorInputs.push(0);

    const inputs = [...sensorInputs, car.speed / car.maxSpeed];
    if (inputs.length !== 8) return;

    const { hidden, outputs } = car.brain.predict(inputs);
    const layers = [
      { nodes: inputs, label: 'Inputs' },
      { nodes: hidden, label: 'Hidden' },
      { nodes: outputs, label: 'Outputs' }
    ];
    const inputLabels = ['Front', 'F-Right', 'F-Left', 'Right', 'Left', 'B-Right', 'B-Left', 'Speed'];
    // Header bar
    const genNum = gaRef.current?.generation ?? 0;
    ctx.fillStyle = 'rgba(0, 20, 30, 0.9)';
    ctx.fillRect(margin, margin / 2, width, headerHeight - margin / 2);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin / 2, width, headerHeight - margin / 2);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 18px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ffff';
    ctx.fillText('Neural Network', margin + 14, margin / 2 + (headerHeight - margin / 2) / 2);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 14px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`Generation ${genNum}`, margin + 200, margin / 2 + (headerHeight - margin / 2) / 2);

    if (evolutionFlashRef.current > 0) {
      const a = evolutionFlashRef.current / 60;
      ctx.fillStyle = `rgba(255, 220, 0, ${a})`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffdc00';
      ctx.fillText('● EVOLVING', margin + 360, margin / 2 + (headerHeight - margin / 2) / 2);
      ctx.shadowBlur = 0;
    }

    // Architecture hint
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(180, 200, 220, 0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('8 → 8 → 3  (fixed topology, weights evolve)', margin + width - 14, margin / 2 + (headerHeight - margin / 2) / 2);
    ctx.textAlign = 'left';

    const layerSpacing = (width - 100) / (layers.length - 0.5);

    const getNodePos = (layerIndex, nodeIndex, totalNodes) => {
      const x = margin + layerIndex * layerSpacing + 80;
      const ySpacing = nnHeight / (totalNodes + 1);
      const y = nnTop + (nodeIndex + 1) * ySpacing;
      return { x, y };
    };

    // Flash progress: 0=no flash, 1=full flash (one-shot pulse at the moment of evolution)
    const justEvolved = evolutionFlashRef.current === 60;
    const flashProgress = evolutionFlashRef.current / 60;
    if (evolutionFlashRef.current > 0) evolutionFlashRef.current--;

    const prevBrain = prevBrainRef.current;
    const frame = frameCountRef.current;

    // Initialize / accumulate persistent weight-change buffers
    const ensureBuf = (rows, cols) => {
      const a = new Array(rows);
      for (let i = 0; i < rows; i++) a[i] = new Float32Array(cols);
      return a;
    };
    if (car.brain.weightsInputHidden) {
      if (!weightChangeRef.current.ih ||
          weightChangeRef.current.ih.length !== car.brain.weightsInputHidden.length) {
        weightChangeRef.current.ih = ensureBuf(
          car.brain.weightsInputHidden.length,
          car.brain.weightsInputHidden[0].length
        );
      }
    }
    if (car.brain.weightsHiddenOutput) {
      if (!weightChangeRef.current.ho ||
          weightChangeRef.current.ho.length !== car.brain.weightsHiddenOutput.length) {
        weightChangeRef.current.ho = ensureBuf(
          car.brain.weightsHiddenOutput.length,
          car.brain.weightsHiddenOutput[0].length
        );
      }
    }
    // Accumulate deltas on evolution moment, decay each frame
    const accumulate = (buf, weights, prevWeights) => {
      if (!buf || !prevWeights) return;
      for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights[i].length; j++) {
          if (justEvolved) {
            const delta = Math.abs(weights[i][j] - prevWeights[i][j]);
            buf[i][j] = Math.min(1, buf[i][j] + delta * 2.5);
          }
          buf[i][j] *= 0.985; // decay
        }
      }
    };
    accumulate(weightChangeRef.current.ih, car.brain.weightsInputHidden, prevBrain?.weightsInputHidden);
    accumulate(weightChangeRef.current.ho, car.brain.weightsHiddenOutput, prevBrain?.weightsHiddenOutput);

    // On evolution: log top-K weight changes for ticker
    const outputLabels = ['Steer', 'Throttle', 'Brake'];
    if (justEvolved && prevBrain) {
      const changes = [];
      const wih = car.brain.weightsInputHidden, pih = prevBrain.weightsInputHidden;
      if (wih && pih) {
        for (let i = 0; i < wih.length; i++) {
          for (let j = 0; j < wih[i].length; j++) {
            changes.push({
              src: inputLabels[i] || `I${i}`,
              dst: `H${j}`,
              delta: wih[i][j] - pih[i][j]
            });
          }
        }
      }
      const who = car.brain.weightsHiddenOutput, pho = prevBrain.weightsHiddenOutput;
      if (who && pho) {
        for (let i = 0; i < who.length; i++) {
          for (let j = 0; j < who[i].length; j++) {
            changes.push({
              src: `H${i}`,
              dst: outputLabels[j] || `O${j}`,
              delta: who[i][j] - pho[i][j]
            });
          }
        }
      }
      changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      for (const c of changes.slice(0, 2)) {
        if (Math.abs(c.delta) < 0.02) continue;
        learningLogRef.current.unshift({
          gen: genNum,
          text: `${c.src} → ${c.dst} ${c.delta > 0 ? '↑' : '↓'}${(Math.abs(c.delta) * 100).toFixed(0)}%`
        });
      }
      learningLogRef.current = learningLogRef.current.slice(0, 8);
    }

    // Compute hidden neuron specialization labels
    const hiddenLabels = [];
    if (car.brain.weightsInputHidden && car.brain.weightsHiddenOutput) {
      const wih = car.brain.weightsInputHidden;
      const who = car.brain.weightsHiddenOutput;
      const hiddenSize = who.length;
      for (let j = 0; j < hiddenSize; j++) {
        // Top input feeding this hidden node
        let maxIn = 0, maxInIdx = 0;
        for (let i = 0; i < wih.length; i++) {
          const w = Math.abs(wih[i][j]);
          if (w > maxIn) { maxIn = w; maxInIdx = i; }
        }
        // Top output this hidden node feeds
        let maxOut = 0, maxOutIdx = 0;
        for (let k = 0; k < who[j].length; k++) {
          const w = Math.abs(who[j][k]);
          if (w > maxOut) { maxOut = w; maxOutIdx = k; }
        }
        hiddenLabels.push(`${(inputLabels[maxInIdx] || 'I').slice(0, 5)}→${outputLabels[maxOutIdx][0]}`);
      }
    }

    const drawConnections = (layerIdx, weights, changeBuf, sourceNodes, targetNodes, srcVals, dstVals) => {
      for (let i = 0; i < sourceNodes.length; i++) {
        for (let j = 0; j < targetNodes.length; j++) {
          const weight = weights[i][j];
          const pos1 = getNodePos(layerIdx, i, sourceNodes.length);
          const pos2 = getNodePos(layerIdx + 1, j, targetNodes.length);
          const absW = Math.abs(weight);
          const alpha = Math.min(1, absW);
          // Activity factor: high when both ends active and weight strong → connection "lights up"
          const activity = (srcVals[i] || 0) * absW;
          const color = weight > 0 ? `rgba(0, 255, 255, ${alpha})` : `rgba(255, 0, 128, ${alpha})`;

          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.5 + alpha * 1.5 + activity * 1.0;
          ctx.stroke();

          // Persistent learning trail (yellow glow that decays over multiple frames)
          const learnIntensity = changeBuf ? changeBuf[i][j] : 0;
          if (learnIntensity > 0.05) {
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.strokeStyle = `rgba(255, 220, 0, ${learnIntensity})`;
            ctx.lineWidth = 1.5 + learnIntensity * 3;
            ctx.stroke();
          }

          // Animated energy particle on active connections — visualizes signal flow
          if (activity > 0.15) {
            const t = ((frame * 0.02 + (i + j) * 0.13) % 1);
            const px = pos1.x + (pos2.x - pos1.x) * t;
            const py = pos1.y + (pos2.y - pos1.y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 2 + activity * 2, 0, Math.PI * 2);
            ctx.fillStyle = weight > 0 ? `rgba(0, 255, 255, ${activity})` : `rgba(255, 0, 128, ${activity})`;
            ctx.fill();
          }
        }
      }
    };

    if (car.brain.weightsInputHidden) {
      drawConnections(0, car.brain.weightsInputHidden,
        weightChangeRef.current.ih, inputs, hidden, inputs, hidden);
    }
    if (car.brain.weightsHiddenOutput) {
      drawConnections(1, car.brain.weightsHiddenOutput,
        weightChangeRef.current.ho, hidden, outputs, hidden, outputs);
    }

    // Draw nodes with pulse + activation glow
    layers.forEach((layer, l) => {
      layer.nodes.forEach((value, i) => {
        const { x, y } = getNodePos(l, i, layer.nodes.length);
        const pulse = Math.sin(frame * 0.08 + (l + i) * 0.6) * 0.5 + 0.5;
        const radius = 10 + value * 2 + pulse * value * 2;

        // Outer glow when node is active
        if (value > 0.2) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 255, 255, ${value * 0.15})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${value})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = value > 0.5 ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px "Space Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        if (l === 0) {
          ctx.fillText(inputLabels[i] || `I${i}`, x - 15, y);
        } else if (l === layers.length - 1) {
          ctx.textAlign = 'left';
          ctx.fillText(outputLabels[i], x + 15, y);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(value.toFixed(2), x + 65, y);
        } else if (l === 1 && hiddenLabels[i]) {
          // Hidden neuron specialization label
          ctx.fillStyle = 'rgba(255, 220, 0, 0.75)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(hiddenLabels[i], x, y + 22);
          ctx.font = '11px "Space Mono", monospace';
          ctx.fillStyle = '#ffffff';
        }
      });

      const { x } = getNodePos(l, 0, 1);
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 13px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(layer.label, x, nnTop - 8);
    });

    // Learning ticker box (between NN and fitness chart)
    const tickerTop = nnTop + nnHeight + 5;
    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(margin, tickerTop, width, tickerHeight - 10);
    ctx.strokeStyle = 'rgba(255, 220, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, tickerTop, width, tickerHeight - 10);
    ctx.fillStyle = '#ffdc00';
    ctx.font = 'bold 10px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Learning Log (top weight changes per gen):', margin + 6, tickerTop + 4);

    const log = learningLogRef.current || [];
    ctx.font = '9px monospace';
    if (log.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('Waiting for first evolution...', margin + 6, tickerTop + 22);
    } else {
      const cols = 2;
      const colWidth = (width - 12) / cols;
      const rows = Math.ceil(Math.min(6, log.length) / cols);
      for (let i = 0; i < Math.min(6, log.length); i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const e = log[i];
        const age = i / log.length;
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - age * 0.6})`;
        ctx.fillText(
          `Gen ${e.gen}: ${e.text}`,
          margin + 6 + col * colWidth,
          tickerTop + 20 + row * 14
        );
      }
    }

    // Fitness chart (bottom section)
    const history = gaRef.current?.history || [];
    const chartTop = canvas.height - chartHeight + 10;
    const chartW = width;
    const chartInnerH = chartHeight - 30;

    ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
    ctx.fillRect(margin, chartTop, chartW, chartHeight - 15);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, chartTop, chartW, chartHeight - 15);

    ctx.fillStyle = '#00ffff';
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Evolution Fitness', margin + 6, chartTop + 4);

    if (history.length > 1) {
      const maxScore = Math.max(...history.map(h => h.bestScore), 1);
      const xStep = chartW / (history.length - 1);

      const plotY = (score) => chartTop + chartInnerH - (score / maxScore) * (chartInnerH - 20) + 5;

      // Avg score (magenta)
      ctx.beginPath();
      history.forEach((h, i) => {
        const px = margin + i * xStep;
        const py = plotY(h.avgScore);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Best score (cyan)
      ctx.beginPath();
      history.forEach((h, i) => {
        const px = margin + i * xStep;
        const py = plotY(h.bestScore);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Latest values label
      const last = history[history.length - 1];
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`Gen ${last.generation}  best:${Math.round(last.bestScore)}`, margin + chartW - 4, chartTop + 4);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for first evolution...', margin + chartW / 2, chartTop + chartInnerH / 2);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <canvas
          ref={canvasRef}
          className="w-full border-2 border-glow-cyan rounded-lg bg-muted/20"
          style={{ maxHeight: '800px' }}
        />
      </div>
      {showNetwork && (
        <div>
          <canvas
            ref={networkCanvasRef}
            width={1000}
            height={600}
            className="w-full border-2 border-glow-magenta rounded-lg bg-muted/20"
          />
        </div>
      )}
    </div>
  );
};
