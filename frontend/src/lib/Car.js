import { NeuralNetwork } from './NeuralNetwork';

export class Car {
  constructor(x, y, width, height, controlType = 'AI', color = '#00ffff') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;

    this.speed = 0;
    this.acceleration = 0.2;
    this.maxSpeed = controlType === 'TRAFFIC' ? 2 : 3;
    this.friction = 0.05;
    this.angle = 0;
    this.angleSpeed = 0.03;

    this.controlType = controlType;
    this.damaged = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.laneDeviation = 0;
    this.timeAlive = 0;
    this.stuckFrames = 0;
    this.prevX = x;
    this.prevY = y;

    // Sensors
    this.sensors = this.createSensors();
    this.sensorReadings = [];

    // Manual control state
    this.manualControls = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // Collision proximity (for visual warning)
    this.collisionProximity = 0; // 0 = safe, 1 = imminent collision
    this.safeDirection = null; // Direction with most clearance

    // Neural network for AI control
    if (controlType === 'AI' || controlType === 'MANUAL' || controlType === 'AI_ASSIST') {
      this.brain = new NeuralNetwork(8, 8, 3); // 7 sensors + speed -> 8 hidden -> 3 outputs (steer, throttle, brake)
    }

    // Traffic cars move at constant speed
    if (controlType === 'TRAFFIC') {
      this.speed = this.maxSpeed;
    }
  }

  createSensors() {
    const rayCount = 7;
    const rayAngles = [
      0,           // forward
      Math.PI / 4, // forward-right
      -Math.PI / 4, // forward-left
      Math.PI / 2, // right
      -Math.PI / 2, // left
      (3 * Math.PI) / 4, // backward-right
      -(3 * Math.PI) / 4  // backward-left
    ];

    return rayAngles.map(angle => ({
      angle,
      length: 150,
      distance: 0 // Normalized distance (0 = nothing nearby, 1 = collision)
    }));
  }

  update(roadBorders, traffic, speedMultiplier = 1, stopLines = []) {
    if (!this.damaged) {
      this.timeAlive += speedMultiplier;

      if (this.controlType === 'AI') {
        this.move();
        this.updateSensors(roadBorders, traffic, stopLines);
        this.aiControl();
      } else if (this.controlType === 'MANUAL') {
        this.move();
        this.updateSensors(roadBorders, traffic, stopLines);
        this.manualControl();
        this.calculateCollisionProximity();
        this.calculateSafeDirection();
      } else if (this.controlType === 'AI_ASSIST') {
        this.move();
        this.updateSensors(roadBorders, traffic, stopLines);
        this.aiAssistControl();
        this.calculateCollisionProximity();
        this.calculateSafeDirection();
      } else if (this.controlType === 'TRAFFIC') {
        // Slow/stop at red stop lines within 80 units ahead
        let shouldStop = false;
        for (const line of stopLines) {
          if (line[0].y < this.y && this.y - line[0].y < 80) {
            shouldStop = true;
            break;
          }
        }
        // Scale decel/accel by speedMultiplier so stop distance stays bounded at high speeds
        if (shouldStop) {
          this.speed = Math.max(0, this.speed - 0.1 * speedMultiplier);
        } else {
          this.speed = Math.min(this.maxSpeed, this.speed + 0.05 * speedMultiplier);
        }
        this.y -= this.speed * speedMultiplier;
      }

      // Track distance traveled (Euclidean accumulation — works on curved roads too)
      const dx = this.x - this.prevX;
      const dy = this.y - this.prevY;
      this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
      this.prevX = this.x;
      this.prevY = this.y;
      this.score = this.distanceTraveled + this.timeAlive * 0.1 - this.laneDeviation * 0.01;

      // Check collisions
      this.damaged = this.assessDamage(roadBorders, traffic);

      // Quick-kill stuck cars so camera doesn't linger on crashed/idle ones
      if (this.controlType === 'AI') {
        if (this.speed < 0.2) this.stuckFrames += speedMultiplier;
        else this.stuckFrames = 0;
        if (this.stuckFrames > 30) this.damaged = true;
      }

      // Kill cars with low average speed — catches crawlers that evade the old speed check
      if (this.controlType === 'AI' && this.timeAlive > 150) {
        if (this.distanceTraveled / this.timeAlive < 0.7) {
          this.damaged = true;
        }
      }
    }
  }

  move() {
    // Update speed
    this.speed -= this.friction;
    if (this.speed < 0) this.speed = 0;
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

    // Update angle (only when moving)
    if (this.speed > 0.5) {
      this.angle += this.angleSpeed;
    }

    // Update position
    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  aiControl() {
    // Prepare inputs: 7 sensor readings + current speed (normalized)
    const inputs = [
      ...this.sensorReadings.map(r => r ? r.distance : 0),
      this.speed / this.maxSpeed
    ];

    // Get neural network outputs
    const { outputs } = this.brain.predict(inputs);

    // Apply outputs with smoothing
    const steer = (outputs[0] - 0.5) * 2; // Convert 0-1 to -1 to 1
    const throttle = outputs[1];
    const brake = outputs[2];

    // Apply controls
    this.angleSpeed = steer * 0.03;

    if (throttle > 0.5) {
      this.speed += this.acceleration;
    }

    if (brake > 0.5) {
      this.speed -= this.acceleration * 2;
    }
  }

  manualControl() {
    // Reset angle speed
    this.angleSpeed = 0;

    // Steering
    if (this.manualControls.left) {
      this.angleSpeed = 0.03;
    }
    if (this.manualControls.right) {
      this.angleSpeed = -0.03;
    }

    // Throttle
    if (this.manualControls.forward) {
      this.speed += this.acceleration;
    }

    // Brake
    if (this.manualControls.backward) {
      this.speed -= this.acceleration * 2;
    }
  }

  aiAssistControl() {
    // Get AI suggestion
    const inputs = [
      ...this.sensorReadings.map(r => r ? r.distance : 0),
      this.speed / this.maxSpeed
    ];
    const { outputs } = this.brain.predict(inputs);
    const aiSteer = (outputs[0] - 0.5) * 2;
    const aiThrottle = outputs[1];
    const aiBrake = outputs[2];

    // Manual controls
    let manualSteer = 0;
    if (this.manualControls.left) manualSteer = -1;
    if (this.manualControls.right) manualSteer = 1;

    // Calculate assist strength based on collision proximity
    const assistStrength = this.collisionProximity; // 0 = no assist, 1 = full AI control

    // Blend manual and AI steering
    const blendedSteer = manualSteer * (1 - assistStrength) + aiSteer * assistStrength;
    this.angleSpeed = blendedSteer * 0.03;

    // Manual throttle/brake with AI override on danger
    if (this.manualControls.forward) {
      this.speed += this.acceleration * (1 - assistStrength * 0.5);
    }
    if (this.manualControls.backward) {
      this.speed -= this.acceleration * 2;
    }

    // AI brake on high danger
    if (assistStrength > 0.7 && aiBrake > 0.5) {
      this.speed -= this.acceleration * 2;
    }
  }

  calculateCollisionProximity() {
    // Find maximum sensor value (closest obstacle)
    // reading.distance is normalized closeness: 0 = far/nothing, 1 = touching
    let maxCloseness = 0;
    for (const reading of this.sensorReadings) {
      if (reading && reading.distance > maxCloseness) {
        maxCloseness = reading.distance;
      }
    }

    // Higher value = closer to obstacle
    // Use power curve to make it reactive mostly when getting quite close, but sooner than square
    this.collisionProximity = Math.pow(maxCloseness, 1.5);
  }

  calculateSafeDirection() {
    // Use weighted vector sum to find safest average direction
    let vectorX = 0;
    let vectorY = 0;

    // Check front sensor for forward bias scaling
    const frontSensorIndex = 0; // Assuming 0 is forward
    const frontReading = this.sensorReadings[frontSensorIndex];
    const frontClearance = frontReading ? (1 - frontReading.distance) : 1;

    // Add forward bias to encourage moving forward when open
    // Scale by front clearance: if blocked, don't bias forward
    const forwardBias = 0.5 * frontClearance;
    vectorX += Math.sin(0) * forwardBias;
    vectorY += Math.cos(0) * forwardBias;

    let totalWeight = 0;

    for (let i = 0; i < this.sensors.length; i++) {
      const sensor = this.sensors[i];
      const reading = this.sensorReadings[i];

      // Calculate clearance (0 = blocked, 1 = clear)
      const clearance = reading ? (1 - reading.distance) : 1;
      const blockage = 1 - clearance;

      // 1. Attraction to clear space
      const attractionWeight = Math.pow(clearance, 2);
      vectorX += Math.sin(sensor.angle) * attractionWeight;
      vectorY += Math.cos(sensor.angle) * attractionWeight;

      // 2. Repulsion from obstacles
      // Push vector in OPPOSITE direction of sensor angle
      // Stronger repulsion when closer
      const repulsionWeight = Math.pow(blockage, 2) * 2.0;
      vectorX -= Math.sin(sensor.angle) * repulsionWeight;
      vectorY -= Math.cos(sensor.angle) * repulsionWeight;

      totalWeight += attractionWeight + repulsionWeight;
    }

    // Always calculate an angle, even if we are mostly canceling out
    // ideally the repulsion vectors push us sideways/backwards when front is blocked
    const bestAngle = Math.atan2(vectorX, vectorY);
    this.safeDirection = { angle: bestAngle };
  }

  updateSensors(roadBorders, traffic, sensorOnlyBorders = []) {
    this.sensorReadings = this.sensors.map(sensor => {
      return this.castRay(sensor, roadBorders, traffic, sensorOnlyBorders);
    });
  }
  castRay(sensor, roadBorders, traffic, sensorOnlyBorders = []) {
    const rayAngle = this.angle + sensor.angle;
    const rayEnd = {
      x: this.x - Math.sin(rayAngle) * sensor.length,
      y: this.y - Math.cos(rayAngle) * sensor.length
    };

    let minDistance = sensor.length;
    let hit = null;

    // Check road borders (also cause damage on contact)
    for (const border of roadBorders) {
      const intersection = this.getIntersection(
        { x: this.x, y: this.y },
        rayEnd,
        border[0],
        border[1]
      );

      if (intersection) {
        const distance = this.getDistance({ x: this.x, y: this.y }, intersection);
        if (distance < minDistance) {
          minDistance = distance;
          hit = intersection;
        }
      }
    }

    // Sensor-only barriers (e.g. red stop lines) — detected by rays, NO damage
    for (const border of sensorOnlyBorders) {
      const intersection = this.getIntersection(
        { x: this.x, y: this.y },
        rayEnd,
        border[0],
        border[1]
      );

      if (intersection) {
        const distance = this.getDistance({ x: this.x, y: this.y }, intersection);
        if (distance < minDistance) {
          minDistance = distance;
          hit = intersection;
        }
      }
    }

    // Check traffic cars
    for (const car of traffic) {
      if (car.damaged) continue;
      const polygon = this.getCarPolygon(car);
      for (let i = 0; i < polygon.length; i++) {
        const intersection = this.getIntersection(
          { x: this.x, y: this.y },
          rayEnd,
          polygon[i],
          polygon[(i + 1) % polygon.length]
        );

        if (intersection) {
          const distance = this.getDistance({ x: this.x, y: this.y }, intersection);
          if (distance < minDistance) {
            minDistance = distance;
            hit = intersection;
          }
        }
      }
    }

    return hit ? {
      point: hit,
      distance: 1 - (minDistance / sensor.length) // Normalize: 0 = far, 1 = close
    } : null;
  }

  getIntersection(p1, p2, p3, p4) {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0) return null;

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y)
      };
    }
    return null;
  }

  getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  assessDamage(roadBorders, traffic) {
    const polygon = this.getCarPolygon(this);

    // Check road borders
    for (const border of roadBorders) {
      if (this.polygonIntersectsLine(polygon, border[0], border[1])) {
        return true;
      }
    }

    // Check traffic
    for (const car of traffic) {
      if (car.damaged) continue;
      const otherPolygon = this.getCarPolygon(car);
      if (this.polygonsIntersect(polygon, otherPolygon)) {
        return true;
      }
    }

    return false;
  }

  getCarPolygon(car) {
    const points = [];
    const rad = Math.hypot(car.width, car.height) / 2;
    const alpha = Math.atan2(car.width, car.height);

    points.push({
      x: car.x - Math.sin(car.angle - alpha) * rad,
      y: car.y - Math.cos(car.angle - alpha) * rad
    });
    points.push({
      x: car.x - Math.sin(car.angle + alpha) * rad,
      y: car.y - Math.cos(car.angle + alpha) * rad
    });
    points.push({
      x: car.x - Math.sin(Math.PI + car.angle - alpha) * rad,
      y: car.y - Math.cos(Math.PI + car.angle - alpha) * rad
    });
    points.push({
      x: car.x - Math.sin(Math.PI + car.angle + alpha) * rad,
      y: car.y - Math.cos(Math.PI + car.angle + alpha) * rad
    });

    return points;
  }

  polygonIntersectsLine(polygon, p1, p2) {
    for (let i = 0; i < polygon.length; i++) {
      if (this.getIntersection(polygon[i], polygon[(i + 1) % polygon.length], p1, p2)) {
        return true;
      }
    }
    return false;
  }

  polygonsIntersect(polygon1, polygon2) {
    for (let i = 0; i < polygon1.length; i++) {
      for (let j = 0; j < polygon2.length; j++) {
        if (this.getIntersection(
          polygon1[i],
          polygon1[(i + 1) % polygon1.length],
          polygon2[j],
          polygon2[(j + 1) % polygon2.length]
        )) {
          return true;
        }
      }
    }
    return false;
  }

  draw(ctx, drawSensors = false) {
    // Draw sensors
    if (drawSensors && !this.damaged && (this.controlType === 'AI' || this.controlType === 'MANUAL' || this.controlType === 'AI_ASSIST')) {
      this.sensors.forEach((sensor, i) => {
        const rayAngle = this.angle + sensor.angle;
        const reading = this.sensorReadings[i];

        let endX = this.x - Math.sin(rayAngle) * sensor.length;
        let endY = this.y - Math.cos(rayAngle) * sensor.length;

        if (reading) {
          endX = reading.point.x;
          endY = reading.point.y;

          // Draw hit point
          ctx.beginPath();
          ctx.arc(reading.point.x, reading.point.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
          ctx.fill();

          // Hit segment (yellow)
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(255, 255, 0, ${0.8 * reading.distance})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Full ray (cyan)
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    // Draw safe direction arrow for manual/assist modes
    if ((this.controlType === 'MANUAL' || this.controlType === 'AI_ASSIST') && !this.damaged && this.collisionProximity > 0.3 && this.safeDirection) {
      const arrowLength = 40;
      const arrowAngle = this.angle + this.safeDirection.angle;
      const arrowEndX = this.x - Math.sin(arrowAngle) * arrowLength;
      const arrowEndY = this.y - Math.cos(arrowAngle) * arrowLength;

      // Draw arrow shaft
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.strokeStyle = `rgba(0, 255, 0, ${this.collisionProximity})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw arrow head
      const headSize = 10;
      const headAngle1 = arrowAngle + Math.PI * 0.75;
      const headAngle2 = arrowAngle - Math.PI * 0.75;
      ctx.beginPath();
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(arrowEndX + Math.sin(headAngle1) * headSize, arrowEndY + Math.cos(headAngle1) * headSize);
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(arrowEndX + Math.sin(headAngle2) * headSize, arrowEndY + Math.cos(headAngle2) * headSize);
      ctx.strokeStyle = `rgba(0, 255, 0, ${this.collisionProximity})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Draw car
    const polygon = this.getCarPolygon(this);
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    ctx.closePath();

    // Apply collision proximity red tint for manual/assist modes
    if ((this.controlType === 'MANUAL' || this.controlType === 'AI_ASSIST') && !this.damaged) {
      const redIntensity = this.collisionProximity;
      const baseColor = this.parseColor(this.color);
      ctx.fillStyle = `rgba(${Math.min(255, baseColor.r + redIntensity * 200)}, ${baseColor.g * (1 - redIntensity * 0.7)}, ${baseColor.b * (1 - redIntensity * 0.7)}, 1)`;
    } else if (this.damaged) {
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
    } else {
      ctx.fillStyle = this.color;
    }
    ctx.fill();

    // Add glow effect for AI cars
    if (this.controlType === 'AI' && !this.damaged) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.color;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Add glow for manual/assist cars
    if ((this.controlType === 'MANUAL' || this.controlType === 'AI_ASSIST') && !this.damaged) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.collisionProximity > 0.5 ? '#ff0000' : this.color;
      ctx.strokeStyle = this.collisionProximity > 0.5 ? `rgba(255, 0, 0, ${this.collisionProximity})` : this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  parseColor(color) {
    // Simple color parser for hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    // Default to cyan
    return { r: 0, g: 255, b: 255 };
  }
}
