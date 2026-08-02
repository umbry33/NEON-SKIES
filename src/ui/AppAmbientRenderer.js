const clampRatio = () => Math.min(window.devicePixelRatio || 1, 2);

export class AppAmbientRenderer {
  constructor(canvas, host) {
    this.canvas = canvas;
    this.host = host;
    this.ctx = canvas?.getContext("2d");
    this.running = false;
    this.frame = null;
    this.particles = Array.from({ length: 28 }, (_, index) => ({
      x: ((index * 89) % 997) / 997,
      y: ((index * 151) % 991) / 991,
      speed: .004 + (index % 5) * .0015,
      size: .6 + (index % 3) * .35,
      phase: index * .67,
      tint: index % 4,
    }));
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    this.observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(this.resize) : null;
    this.observer?.observe(host);
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", () => document.hidden ? this.stop() : this.start());
    this.resize();
  }

  resize() {
    if (!this.canvas || !this.host) return;
    const rect = this.host.getBoundingClientRect();
    const ratio = clampRatio();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.width * ratio);
    this.canvas.height = Math.floor(this.height * ratio);
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  start() {
    if (!this.ctx || this.running) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.render);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  drawPalm(ctx, x, groundY, scale, flip = 1) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(scale * flip, scale);
    ctx.strokeStyle = "rgba(37, 8, 61, .66)";
    ctx.fillStyle = "rgba(40, 6, 66, .48)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-6, -40, 5, -78, -3, -116); ctx.stroke();
    ctx.translate(-3, -116);
    for (let branch = 0; branch < 8; branch += 1) {
      const angle = -1.7 + branch * .48;
      ctx.save(); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(21, -17, 44, -7); ctx.quadraticCurveTo(24, 2, 0, 0); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  render(now) {
    if (!this.running || !this.ctx) return;
    const { ctx, width: w, height: h } = this;
    const t = now * .001;
    ctx.clearRect(0, 0, w, h);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#201052");
    sky.addColorStop(.42, "#342070");
    sky.addColorStop(.7, "#8b2b91");
    sky.addColorStop(1, "#140b3c");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    const halo = ctx.createRadialGradient(w * .5, h * (.31 + Math.sin(t * .16) * .008), 2, w * .5, h * .39, Math.max(w, h) * .6);
    halo.addColorStop(0, "rgba(255, 116, 222, .36)");
    halo.addColorStop(.3, "rgba(108, 88, 255, .18)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);

    const horizon = h * .69;
    ctx.save();
    const glow = ctx.createLinearGradient(0, horizon, w, horizon);
    glow.addColorStop(0, "rgba(38, 230, 237, 0)");
    glow.addColorStop(.28, "rgba(38, 230, 237, .68)");
    glow.addColorStop(.5, "rgba(255, 72, 205, .82)");
    glow.addColorStop(.72, "rgba(38, 230, 237, .68)");
    glow.addColorStop(1, "rgba(38, 230, 237, 0)");
    ctx.strokeStyle = glow; ctx.lineWidth = 1.25; ctx.shadowBlur = 14; ctx.shadowColor = "rgba(255, 74, 207, .75)";
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(54, 231, 244, .24)";
    for (let row = 1; row <= 10; row += 1) {
      const y = horizon + (row / 10) ** 1.85 * (h - horizon);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = -w; x < w * 2; x += Math.max(34, w / 9)) {
      ctx.beginPath(); ctx.moveTo(w * .5, horizon); ctx.lineTo(x + Math.sin(t * .13) * 6, h); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(72, 221, 243, .24)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 11) {
      const edge = Math.abs(x - w * .5) / w;
      const y = horizon - 17 - edge * 38 + Math.sin(x * .06 + t * .22) * 13 + Math.sin(x * .15) * 5;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();

    this.drawPalm(ctx, w * .075, horizon + 42, Math.min(1, w / 480) * .72, 1);
    this.drawPalm(ctx, w * .925, horizon + 55, Math.min(1, w / 480) * .64, -1);

    ctx.save();
    for (const particle of this.particles) {
      const colors = ["255, 110, 218", "105, 228, 255", "170, 105, 255", "133, 255, 208"];
      const alpha = .16 + (Math.sin(t * .8 + particle.phase) + 1) * .1;
      ctx.fillStyle = `rgba(${colors[particle.tint]}, ${alpha})`;
      ctx.fillRect(particle.x * w, ((particle.y + t * particle.speed) % 1) * h, particle.size, particle.size);
    }
    ctx.restore();

    // One restrained floating geometric shard, with a slow dream-like drift.
    ctx.save(); ctx.translate(w * .84, h * (.24 + Math.sin(t * .28) * .012)); ctx.rotate(t * .08);
    ctx.strokeStyle = "rgba(135, 255, 223, .34)"; ctx.fillStyle = "rgba(199, 98, 255, .08)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(17, 13); ctx.lineTo(-17, 13); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();

    this.frame = requestAnimationFrame(this.render);
  }
}
