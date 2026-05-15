export class TrafficLight {
  constructor(x, y, roadWidth = 300, greenTime = 300, redTime = 300, perpX = 1, perpY = 0) {
    this.x = x;
    this.y = y;
    this.roadWidth = roadWidth;
    this.greenTime = greenTime;
    this.yellowTime = 60;
    this.redTime = redTime;
    this.timer = Math.floor(Math.random() * (greenTime + redTime));
    this.state = 'green';
    this.perpX = perpX;
    this.perpY = perpY;
  }

  update(speedMultiplier = 1) {
    this.timer += speedMultiplier;
    const cycle = this.greenTime + this.yellowTime + this.redTime;
    const t = this.timer % cycle;
    if (t < this.greenTime) this.state = 'green';
    else if (t < this.greenTime + this.yellowTime) this.state = 'yellow';
    else this.state = 'red';
  }

  isRed() {
    return this.state === 'red' || this.state === 'yellow';
  }

  // Frames until light next becomes green
  framesUntilGreen() {
    const cycle = this.greenTime + this.yellowTime + this.redTime;
    const t = this.timer % cycle;
    if (t < this.greenTime) return 0;
    return cycle - t;
  }

  // Returns stop-line as a road-border-compatible segment [p1, p2]
  // Always horizontal so the y-based stop check in Car.js is reliable
  getStopLine() {
    const half = this.roadWidth / 2;
    return [
      { x: this.x - half, y: this.y },
      { x: this.x + half, y: this.y }
    ];
  }

  draw(ctx) {
    const colors = { green: '#00ff44', yellow: '#ffff00', red: '#ff2244' };
    const half = this.roadWidth / 2;
    // Pole sits just outside the left road edge, perpendicular to road
    const poleX = this.x - this.perpX * (half + 24);
    const poleY = this.y - this.perpY * (half + 24);

    // Pole
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(poleX, poleY);
    ctx.lineTo(poleX, poleY - 45);
    ctx.stroke();

    // Housing (dark rect)
    ctx.fillStyle = '#111';
    ctx.fillRect(poleX - 12, poleY - 80, 24, 40);

    // Light bulb
    ctx.beginPath();
    ctx.arc(poleX, poleY - 62, 9, 0, Math.PI * 2);
    ctx.fillStyle = colors[this.state];
    ctx.shadowBlur = 18;
    ctx.shadowColor = colors[this.state];
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stop line when red/yellow — aligned with road perpendicular
    if (this.isRed()) {
      ctx.strokeStyle = 'rgba(255, 34, 68, 0.8)';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(this.x - this.perpX * half, this.y - this.perpY * half);
      ctx.lineTo(this.x + this.perpX * half, this.y + this.perpY * half);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
