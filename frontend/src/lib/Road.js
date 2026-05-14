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
    const branchLen = 100000; // extend far enough that cars never escape

    const leftCX  = forkX - branchW / 2 - gap / 2;
    const rightCX = forkX + branchW / 2 + gap / 2;
    const halfB   = branchW / 2;

    // Store for rendering
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

    // ── Left branch borders ──────────────────────────────────
    this.borders.push(
      [ { x: leftCX - halfB, y: forkY }, { x: leftCX - halfB, y: forkY - branchLen } ],
      [ { x: leftCX + halfB, y: forkY }, { x: leftCX + halfB, y: forkY - branchLen } ]
    );

    // ── Right branch borders ─────────────────────────────────
    this.borders.push(
      [ { x: rightCX - halfB, y: forkY }, { x: rightCX - halfB, y: forkY - branchLen } ],
      [ { x: rightCX + halfB, y: forkY }, { x: rightCX + halfB, y: forkY - branchLen } ]
    );

    // ── Island funnel ────────────────────────────────────────
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
