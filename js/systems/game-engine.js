const MAX_POTATOES = 50;
const FIRE_INTERVAL = 300;
const PLANE_Z = 900;
const CAMERA_DISTANCE = 250;
const FOCAL_LENGTH = 700;
const GRAVITY = 760;
const POTATO_RADIUS = 15;
const COLLISION_LOSS = 0.78;

export class PotatoGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.potatoes = [];
    this.sparks = [];
    this.background = null;
    this.backgroundLoaded = false;
    this.potatoImage = null;
    this.pointer = { x: 0, y: 0 };
    this.isFiring = false;
    this.fireTimer = null;
    this.lastFrame = 0;
    this.animationFrame = 0;
    this.running = false;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.bindInput();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.planeScale = FOCAL_LENGTH / (PLANE_Z + CAMERA_DISTANCE);
  }

  bindInput() {
    this.canvas.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      this.setPointer(event);
      if (this.isFiring) return;
      this.isFiring = true;
      this.throwPotato();
      this.fireTimer = window.setInterval(() => this.throwPotato(), FIRE_INTERVAL);
      try { this.canvas.setPointerCapture(event.pointerId); } catch {}
    });
    this.canvas.addEventListener("pointermove", event => {
      if (this.isFiring) this.setPointer(event);
    });
    const stop = () => this.stopFiring();
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    this.canvas.addEventListener("contextmenu", event => event.preventDefault());
  }

  setPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
  }

  stopFiring() {
    this.isFiring = false;
    if (this.fireTimer !== null) window.clearInterval(this.fireTimer);
    this.fireTimer = null;
  }

  setBackground(image) {
    this.background = image;
    this.backgroundLoaded = Boolean(image);
  }

  setPotatoImage(image) {
    this.potatoImage = image || null;
  }

  throwPotato() {
    if (this.potatoes.length >= MAX_POTATOES) return;
    const flightTime = 1.05;
    const targetX = (this.pointer.x - this.centerX) / this.planeScale;
    const targetY = (this.pointer.y - this.centerY) / this.planeScale;
    // World-space Y is relative to the camera center. Convert the desired
    // bottom launch point into world units at the camera's starting depth.
    const startScreenY = this.height * 0.88;
    const startY = (startScreenY - this.centerY) / (FOCAL_LENGTH / CAMERA_DISTANCE);
    const mass = 0.72 + Math.random() * 0.9;
    const direction = Math.atan2(targetY - startY, targetX || 0.001);
    this.potatoes.push({
      x: 0,
      y: startY,
      z: 0,
      vx: targetX / flightTime,
      vy: (targetY - startY - 0.5 * GRAVITY * flightTime * flightTime) / flightTime,
      vz: PLANE_Z / flightTime,
      mass,
      radius: POTATO_RADIUS * (0.9 + Math.random() * 0.2),
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 2.2) + Math.cos(direction) * 0.6,
      bounced: false,
      age: 0
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    const frame = now => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastFrame) / 1000, 0.032);
      this.lastFrame = now;
      this.update(dt);
      this.draw();
      this.animationFrame = requestAnimationFrame(frame);
    };
    this.animationFrame = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    this.stopFiring();
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
  }

  project(potato) {
    const scale = FOCAL_LENGTH / (potato.z + CAMERA_DISTANCE);
    return {
      x: this.centerX + potato.x * scale,
      y: this.centerY + potato.y * scale,
      scale
    };
  }

  update(dt) {
    for (const potato of this.potatoes) {
      potato.age += dt;
      potato.vy += GRAVITY * dt;
      potato.x += potato.vx * dt;
      potato.y += potato.vy * dt;
      potato.z += potato.vz * dt;
      potato.angle += potato.spin * dt;

      if (!potato.bounced && potato.z >= PLANE_Z && potato.vz > 0) {
        potato.z = PLANE_Z;
        potato.vz = -Math.abs(potato.vz) * 0.62;
        potato.vx *= 0.86;
        potato.vy *= 0.9;
        potato.bounced = true;
        this.makeSparks(potato);
      }
    }

    this.resolvePotatoCollisions();
    this.potatoes = this.potatoes.filter(potato => {
      // The perspective projection is undefined once an object passes the camera plane.
      if (potato.z + CAMERA_DISTANCE <= 0) return false;
      const point = this.project(potato);
      // Bound the full enlarged sprite, including its rotated corners.
      const radius = potato.radius * Math.abs(point.scale) * 7;
      return point.x + radius >= 0 && point.x - radius <= this.width &&
        point.y + radius >= 0 && point.y - radius <= this.height;
    });

    for (const spark of this.sparks) spark.life -= dt;
    this.sparks = this.sparks.filter(spark => spark.life > 0);
  }

  resolvePotatoCollisions() {
    for (let i = 0; i < this.potatoes.length; i++) {
      for (let j = i + 1; j < this.potatoes.length; j++) {
        const a = this.potatoes[i];
        const b = this.potatoes[j];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const distance = Math.hypot(dx, dy, dz);
        const minDistance = a.radius + b.radius;
        if (distance <= 0 || distance >= minDistance) continue;
        const nx = dx / distance, ny = dy / distance, nz = dz / distance;
        const overlap = minDistance - distance;
        const totalMass = a.mass + b.mass;
        const correction = overlap * 0.52;
        a.x -= nx * correction * (b.mass / totalMass);
        a.y -= ny * correction * (b.mass / totalMass);
        a.z -= nz * correction * (b.mass / totalMass);
        b.x += nx * correction * (a.mass / totalMass);
        b.y += ny * correction * (a.mass / totalMass);
        b.z += nz * correction * (a.mass / totalMass);

        const relativeSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
        if (relativeSpeed >= 0) continue;
        const impulse = -(1 + COLLISION_LOSS) * relativeSpeed / (1 / a.mass + 1 / b.mass);
        a.vx -= impulse * nx / a.mass;
        a.vy -= impulse * ny / a.mass;
        a.vz -= impulse * nz / a.mass;
        b.vx += impulse * nx / b.mass;
        b.vy += impulse * ny / b.mass;
        b.vz += impulse * nz / b.mass;
        a.spin += (ny - nx) * impulse * 0.012 / a.mass;
        b.spin -= (ny - nx) * impulse * 0.012 / b.mass;
      }
    }
  }

  makeSparks(potato) {
    const point = this.project(potato);
    for (let i = 0; i < 9; i++) {
      const angle = (Math.PI * 2 * i) / 9 + Math.random() * 0.25;
      const speed = 35 + Math.random() * 65;
      this.sparks.push({
        x: point.x, y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.42,
        maxLife: 0.42,
        size: 2 + Math.random() * 3
      });
    }
  }

  drawBackground(ctx) {
    if (this.background) {
      const image = this.background;
      const scale = Math.max(this.width / image.width, this.height / image.height);
      const w = image.width * scale, h = image.height * scale;
      ctx.drawImage(image, (this.width - w) / 2, (this.height - h) / 2, w, h);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#8bc5df");
    sky.addColorStop(0.62, "#e5e8c9");
    sky.addColorStop(1, "#9dbb83");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#fff4d6";
    ctx.beginPath();
    ctx.arc(this.width * 0.78, this.height * 0.2, Math.min(this.width, this.height) * 0.065, 0, Math.PI * 2);
    ctx.fill();
    this.drawCloud(ctx, this.width * 0.22, this.height * 0.23, 1);
    this.drawCloud(ctx, this.width * 0.57, this.height * 0.34, 0.72);
    ctx.fillStyle = "#91ad79";
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.7);
    ctx.quadraticCurveTo(this.width * 0.22, this.height * 0.48, this.width * 0.48, this.height * 0.7);
    ctx.quadraticCurveTo(this.width * 0.76, this.height * 0.47, this.width, this.height * 0.68);
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.fill();
    ctx.fillStyle = "#73935f";
    ctx.fillRect(0, this.height * 0.78, this.width, this.height * 0.22);
    ctx.fillStyle = "#b8c98b";
    ctx.fillRect(0, this.height * 0.78, this.width, 4);
  }

  drawCloud(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffffb8";
    ctx.beginPath();
    ctx.arc(-25, 3, 17, 0, Math.PI * 2);
    ctx.arc(-5, -7, 23, 0, Math.PI * 2);
    ctx.arc(19, 2, 18, 0, Math.PI * 2);
    ctx.rect(-26, 2, 63, 19);
    ctx.fill();
    ctx.restore();
  }

  drawPotato(ctx, potato, point) {
    const size = potato.radius * point.scale * 6.6;
    if (this.potatoImage && this.potatoImage.complete) {
      const image = this.potatoImage;
      const fit = Math.min((size * 1.65) / image.naturalWidth, (size * 1.25) / image.naturalHeight);
      const width = image.naturalWidth * fit;
      const height = image.naturalHeight * fit;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(potato.angle);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(potato.angle);
    ctx.scale(size / 44, size / 44);
    ctx.shadowColor = "#40200d55";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#a95e2d";
    ctx.beginPath();
    ctx.moveTo(-21, 1);
    ctx.bezierCurveTo(-24, -12, -11, -21, 2, -18);
    ctx.bezierCurveTo(16, -23, 25, -12, 22, 1);
    ctx.bezierCurveTo(20, 13, 7, 20, -7, 17);
    ctx.bezierCurveTo(-19, 16, -25, 10, -21, 1);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#d58a48";
    ctx.beginPath();
    ctx.ellipse(-3, -5, 13, 7, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8ad6b";
    ctx.beginPath();
    ctx.ellipse(7, 7, 5, 2.5, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  draw() {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx);
    const ordered = [...this.potatoes].sort((a, b) => b.z - a.z);
    for (const potato of ordered) this.drawPotato(ctx, potato, this.project(potato));
    for (const spark of this.sparks) {
      const alpha = Math.max(0, spark.life / spark.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#fff6b5";
      ctx.lineWidth = Math.max(1, spark.size * 0.65);
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x + spark.vx * (1 - alpha) * 0.12, spark.y + spark.vy * (1 - alpha) * 0.12);
      ctx.stroke();
      ctx.restore();
      spark.x += spark.vx * 0.016;
      spark.y += spark.vy * 0.016;
    }
  }
}
