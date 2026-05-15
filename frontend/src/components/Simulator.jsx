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
    const lightYPositions = [-600, -1500, -2600];
    trafficLightsRef.current = lightYPositions.map((y, idx) => {
      const centers = road.getLaneCenterAt(y);
      const cx = (centers[0] + centers[centers.length - 1]) / 2;
      const { nx, ny } = road.getRoadPerpAt(y);
      const timings = [[300, 200], [250, 280], [280, 240]][idx];
      return new TrafficLight(cx, y, road.width, timings[0], timings[1], nx, ny);
    });
  };

  const initializeTraffic = () => {
    const road = roadRef.current;

    // Calculate traffic count based on density (0-300%)
    const baseDensity = 50;
    const trafficCount = Math.floor(baseDensity * (trafficDensity / 100));

    trafficRef.current = [];
    const trafficColors = ['#ff00ff', '#ff0080', '#8000ff'];
    for (let i = 0; i < trafficCount; i++) {
      const y = -200 - i * 400;
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

    // Update cars
    const carCount = carsRef.current.length;
    for (let i = 0; i < carCount; i++) {
      const car = carsRef.current[i];
      // Red lines = damage border (kill if pass through) + sensor barrier + hard-stop logic
      const aiBorders = activeStopLines.length
        ? [...road.borders, ...activeStopLines]
        : road.borders;
      car.update(aiBorders, trafficRef.current, speedRef.current, activeStopLines);

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
      car.update([], [], speedRef.current, activeStopLines);

      // Nudge traffic cars to follow road curves
      if (car.laneIndex !== undefined) {
        const centers = road.getLaneCenterAt(car.y);
        const idx = Math.min(car.laneIndex, centers.length - 1);
        car.x += (centers[idx] - car.x) * 0.05;
      }

      // Align traffic car visual angle with road direction
      const perp = road.getRoadPerpAt(car.y);
      car.angle = Math.atan2(-perp.ny, perp.nx);

      // Respawn traffic at top of road
      if (car.y > canvas.height + 100) {
        const spawnY = -100;
        const centers = road.getLaneCenterAt(spawnY);
        const lane = Math.floor(Math.random() * centers.length);
        car.x = centers[lane];
        car.y = spawnY;
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

      // Reset traffic
      initializeTraffic();
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

    // Draw traffic (batched)
    for (let i = 0; i < trafficCount; i++) {
      trafficRef.current[i].draw(ctx, false);
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
    ctx.shadowBlur = 0;
  };

  const drawNetwork = (car) => {
    const canvas = networkCanvasRef.current;
    if (!canvas || !car.brain) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = 30;
    const width = canvas.width - margin * 2;
    const chartHeight = 130; // reserved for fitness chart at bottom
    const nnHeight = canvas.height - margin * 2 - chartHeight;

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
    const layerSpacing = width / (layers.length - 0.5);

    const getNodePos = (layerIndex, nodeIndex, totalNodes) => {
      const x = margin + layerIndex * layerSpacing + 40;
      const ySpacing = nnHeight / (totalNodes + 1);
      const y = margin + (nodeIndex + 1) * ySpacing;
      return { x, y };
    };

    // Flash progress: 0=no flash, 1=full flash
    const flashProgress = evolutionFlashRef.current / 60;
    if (evolutionFlashRef.current > 0) evolutionFlashRef.current--;

    const prevBrain = prevBrainRef.current;

    const drawConnections = (layerIdx, weights, prevWeights, sourceNodes, targetNodes) => {
      for (let i = 0; i < sourceNodes.length; i++) {
        for (let j = 0; j < targetNodes.length; j++) {
          const weight = weights[i][j];
          const pos1 = getNodePos(layerIdx, i, sourceNodes.length);
          const pos2 = getNodePos(layerIdx + 1, j, targetNodes.length);
          const alpha = Math.min(1, Math.abs(weight));
          const color = weight > 0 ? `rgba(0, 255, 255, ${alpha})` : `rgba(255, 0, 128, ${alpha})`;

          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.5 + alpha * 1.5;
          ctx.stroke();

          // Yellow flash for changed weights after evolution
          if (flashProgress > 0 && prevWeights) {
            const delta = Math.abs(weight - prevWeights[i][j]);
            if (delta > 0.05) {
              ctx.beginPath();
              ctx.moveTo(pos1.x, pos1.y);
              ctx.lineTo(pos2.x, pos2.y);
              ctx.strokeStyle = `rgba(255, 220, 0, ${Math.min(1, delta * 2) * flashProgress})`;
              ctx.lineWidth = 1.5 + delta * 3;
              ctx.stroke();
            }
          }
        }
      }
    };

    if (car.brain.weightsInputHidden) {
      drawConnections(0, car.brain.weightsInputHidden,
        prevBrain?.weightsInputHidden, inputs, hidden);
    }
    if (car.brain.weightsHiddenOutput) {
      drawConnections(1, car.brain.weightsHiddenOutput,
        prevBrain?.weightsHiddenOutput, hidden, outputs);
    }

    // Draw nodes
    layers.forEach((layer, l) => {
      layer.nodes.forEach((value, i) => {
        const { x, y } = getNodePos(l, i, layer.nodes.length);

        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${value})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
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
          const outputLabels = ['Steer', 'Throttle', 'Brake'];
          ctx.textAlign = 'left';
          ctx.fillText(outputLabels[i], x + 15, y);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(value.toFixed(2), x + 65, y);
        }
      });

      const { x } = getNodePos(l, 0, 1);
      ctx.fillStyle = '#00ffff';
      ctx.font = '12px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(layer.label, x, margin - 15);
    });

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
    <div className="flex gap-4">
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          className="w-full border-2 border-glow-cyan rounded-lg bg-muted/20"
          style={{ maxHeight: '800px' }}
        />
      </div>
      {showNetwork && (
        <div className="w-80">
          <canvas
            ref={networkCanvasRef}
            width={320}
            height={800}
            className="w-full border-2 border-glow-magenta rounded-lg bg-muted/20"
          />
        </div>
      )}
    </div>
  );
};
