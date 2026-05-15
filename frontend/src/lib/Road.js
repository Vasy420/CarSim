export class Road {
  constructor(canvasWidth) {
    this.canvasWidth = canvasWidth;
    this.width = 300;
    this.laneCount = 3;
    this.x = canvasWidth / 2;

    const ctrl = this.buildWaypoints();
    this.waypoints = this.smoothPath(ctrl, 12);
    this.borders = this.generateBorders();
    this.forkY = null; // set when a fork exists
    this.intersections = [];
    this.aiOnlyBorders = [];     // damage/sensor only — never drawn
    this.decorativeBorders = []; // drawn — invisible to AI sensors/damage
  }

  // Precise vertical clip — keeps portions of seg OUTSIDE [yLow, yHigh]
  _clipSegmentVertical(seg, yLow, yHigh) {
    const [p1, p2] = seg;
    const y1 = p1.y, y2 = p2.y;
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    if (minY >= yLow && maxY <= yHigh) return [];
    if (maxY <= yLow || minY >= yHigh) return [seg];

    const ts = [0, 1];
    for (const yb of [yLow, yHigh]) {
      if ((y1 < yb && y2 > yb) || (y1 > yb && y2 < yb)) {
        ts.push((yb - y1) / (y2 - y1));
      }
    }
    ts.sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < ts.length - 1; i++) {
      const tA = ts[i], tB = ts[i + 1];
      const midY = y1 + ((tA + tB) / 2) * (y2 - y1);
      if (midY < yLow || midY > yHigh) {
        out.push([
          { x: p1.x + tA * (p2.x - p1.x), y: y1 + tA * (y2 - y1) },
          { x: p1.x + tB * (p2.x - p1.x), y: y1 + tB * (y2 - y1) }
        ]);
      }
    }
    return out;
  }

  // Add perpendicular cross-roads at given y positions.
  // Each intersection: 300×300 square opening in main road; cross-road borders extend ±extent.
  addIntersections(yPositions, halfH = 150, halfW = 150, extent = 800) {
    const halfMain = this.width / 2;

    // Precise clip of main borders for each intersection y range
    for (const yp of yPositions) {
      const yLow = yp - halfH, yHigh = yp + halfH;
      const next = [];
      for (const seg of this.borders) {
        next.push(...this._clipSegmentVertical(seg, yLow, yHigh));
      }
      this.borders = next;
    }

    for (const yp of yPositions) {
      // Use curved road center at this y so intersection aligns with road
      const centers = this.getLaneCenterAt(yp);
      const cx = (centers[0] + centers[centers.length - 1]) / 2;
      this.intersections.push({ x: cx, y: yp, halfW, halfH, extent });

      // Cross arm walls (top/bot + far-end) — drawn cyan, NOT in AI sensor/damage
      this.decorativeBorders.push(
        [ { x: cx - halfMain - extent, y: yp - halfH }, { x: cx - halfMain, y: yp - halfH } ],
        [ { x: cx - halfMain - extent, y: yp + halfH }, { x: cx - halfMain, y: yp + halfH } ],
        [ { x: cx + halfMain, y: yp - halfH }, { x: cx + halfMain + extent, y: yp - halfH } ],
        [ { x: cx + halfMain, y: yp + halfH }, { x: cx + halfMain + extent, y: yp + halfH } ],
        [ { x: cx - halfMain - extent, y: yp - halfH }, { x: cx - halfMain - extent, y: yp + halfH } ],
        [ { x: cx + halfMain + extent, y: yp - halfH }, { x: cx + halfMain + extent, y: yp + halfH } ]
      );
      // Inner walls inside intersection — AI damage/sensor only, not drawn
      this.aiOnlyBorders.push(
        [ { x: cx - halfMain, y: yp - halfH }, { x: cx - halfMain, y: yp + halfH } ],
        [ { x: cx + halfMain, y: yp - halfH }, { x: cx + halfMain, y: yp + halfH } ]
      );
    }
  }

  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * (2*p1.x + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
      y: 0.5 * (2*p1.y + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
    };
  }

  smoothPath(ctrl, steps = 12) {
    const pts = [];
    const n = ctrl.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)];
      const p1 = ctrl[i];
      const p2 = ctrl[i + 1];
      const p3 = ctrl[Math.min(n - 1, i + 2)];
      for (let s = 0; s < steps; s++) {
        pts.push(this.catmullRom(p0, p1, p2, p3, s / steps));
      }
    }
    pts.push(ctrl[n - 1]);
    return pts;
  }

  buildWaypoints() {
    const cx = this.x;
    return [
      { x: cx, y: 1000   },   // spawn zone
      { x: cx, y: 0      },   // screen top at start
      { x: cx, y: -700   },   // straight
      { x: cx - 60,  y: -1200 }, // begin gentle left
      { x: cx - 180, y: -1900 }, // apex left curve
      { x: cx - 180, y: -2600 }, // straight left section
      { x: cx - 80,  y: -3300 }, // begin right return
      { x: cx,       y: -4000 }, // back to center
      { x: cx,       y: -4800 }, // straight — fork starts here
      // branches added by addFork()
    ];
  }

  generateBorders() {
    const half = this.width / 2;
    const n = this.waypoints.length;
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i < n; i++) {
      // Average perpendicular from adjacent segments so shared endpoints eliminate gaps
      let nx = 0, ny = 0, count = 0;
      if (i > 0) {
        const a = this.waypoints[i - 1], b = this.waypoints[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) { nx += -dy / len; ny += dx / len; count++; }
      }
      if (i < n - 1) {
        const a = this.waypoints[i], b = this.waypoints[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) { nx += -dy / len; ny += dx / len; count++; }
      }
      if (count === 0) continue;
      const mag = Math.sqrt(nx * nx + ny * ny);
      nx /= mag; ny /= mag;
      const p = this.waypoints[i];
      leftPts.push({ x: p.x + nx * half, y: p.y + ny * half });
      rightPts.push({ x: p.x - nx * half, y: p.y - ny * half });
    }

    const borders = [];
    for (let i = 0; i < leftPts.length - 1; i++) {
      borders.push([leftPts[i], leftPts[i + 1]]);
      borders.push([rightPts[i], rightPts[i + 1]]);
    }
    return borders;
  }

  getRoadPerpAt(y) {
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const p1 = this.waypoints[i], p2 = this.waypoints[i + 1];
      if (y >= Math.min(p1.y, p2.y) && y <= Math.max(p1.y, p2.y)) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) return { nx: -dy / len, ny: dx / len };
      }
    }
    return { nx: 1, ny: 0 };
  }

  addFork() {
    const lastWP = this.waypoints[this.waypoints.length - 1];
    const forkY = lastWP.y;
    const forkX = lastWP.x;
    this.forkY = forkY;

    const branchW   = 120;
    const gap       = 60;
    const branchLen = 100000;

    const leftCX  = forkX - branchW / 2 - gap / 2;
    const rightCX = forkX + branchW / 2 + gap / 2;
    const halfB   = branchW / 2;

    this.forkBranches = [
      { cx: leftCX,  y: forkY, width: branchW, len: branchLen },
      { cx: rightCX, y: forkY, width: branchW, len: branchLen },
    ];
    this.forkIsland = {
      tipX: forkX, tipY: forkY - 120,
      leftX: leftCX + halfB,
      rightX: rightCX - halfB,
      baseY: forkY
    };

    this.borders.push(
      [ { x: leftCX - halfB, y: forkY }, { x: leftCX - halfB, y: forkY - branchLen } ],
      [ { x: leftCX + halfB, y: forkY }, { x: leftCX + halfB, y: forkY - branchLen } ]
    );
    this.borders.push(
      [ { x: rightCX - halfB, y: forkY }, { x: rightCX - halfB, y: forkY - branchLen } ],
      [ { x: rightCX + halfB, y: forkY }, { x: rightCX + halfB, y: forkY - branchLen } ]
    );
    this.borders.push(
      [ { x: forkX, y: forkY - 120 }, { x: leftCX  + halfB, y: forkY } ],
      [ { x: forkX, y: forkY - 120 }, { x: rightCX - halfB, y: forkY } ]
    );
  }

  // Returns x-coordinates of each lane center at the given y position.
  // Falls back to the initial straight road centers if outside the defined path.
  getLaneCenterAt(y) {
    // Find the segment in waypoints that straddles y (road goes upward = decreasing y)
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const p1 = this.waypoints[i];
      const p2 = this.waypoints[i + 1];
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      if (y >= minY && y <= maxY) {
        const t = (p2.y === p1.y) ? 0 : (y - p1.y) / (p2.y - p1.y);
        const cx = p1.x + t * (p2.x - p1.x);
        return this._centersAround(cx);
      }
    }
    // Default: use first waypoint x
    return this._centersAround(this.waypoints[0].x);
  }

  _centersAround(cx) {
    const lw = this.width / this.laneCount;
    return Array.from({ length: this.laneCount }, (_, i) =>
      cx - this.width / 2 + lw / 2 + i * lw
    );
  }

  // Convenience getters kept for backward compat with Simulator code
  getLaneCenters() {
    return this._centersAround(this.x);
  }
}
