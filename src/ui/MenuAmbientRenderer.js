// 主菜单专用的低干扰 Canvas 氛围层：不承载交互，也不依赖外部美术资源。
import { ASSEMBLY_BOARD, getFootprintBounds, getInstalledEntries } from "../config/module-config.js";
import { drawModuleIcon } from "../rendering/ModuleRenderer.js";

const PLAYER_DRAW_SCALE = 0.85;

export class MenuAmbientRenderer {
  constructor(canvas, host, target, loadoutGetter) {
    this.canvas = canvas;
    this.host = host;
    this.target = target;
    this.loadoutGetter = loadoutGetter;
    this.ctx = canvas?.getContext("2d");
    this.frame = null;
    this.running = false;
    this.flightSpeed = 180;
    this.lastTime = 0;
    this.layerOffsets = { far: 0, middle: 0, near: 0 };
    this.stars = Array.from({ length: 34 }, (_, index) => ({
      x: (index * 71 % 997) / 997,
      y: (index * 131 % 991) / 991,
      size: 0.55 + (index % 4) * 0.22,
      phase: index * 0.79,
      depth: .15 + (index % 7) / 8,
      tint: index % 4 === 0 ? "pink" : index % 2 === 0 ? "violet" : "blue",
    }));
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    this.observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(this.resize) : null;
    this.observer?.observe(this.host);
    window.addEventListener("resize", this.resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
      else if (!this.host?.closest(".is-hidden")) this.start();
    });
    this.resize();
  }

  resize() {
    if (!this.canvas || !this.host) return;
    const rect = this.host.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.width * ratio);
    this.canvas.height = Math.floor(this.height * ratio);
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  start() {
    if (!this.ctx || this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.render);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  drawPalm(ctx, x, ground, scale, flip = 1) {
    ctx.save();
    ctx.translate(x, ground);
    ctx.scale(scale * flip, scale);
    ctx.strokeStyle = "rgba(18, 8, 52, .58)";
    ctx.fillStyle = "rgba(22, 7, 61, .44)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-5, -31, 4, -69, -2, -104); ctx.stroke();
    ctx.translate(-2, -104);
    for (let branch = 0; branch < 8; branch += 1) {
      ctx.save(); ctx.rotate(-1.72 + branch * .47);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(18, -15, 39, -6); ctx.quadraticCurveTo(22, 2, 0, 0); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawLoadout(ctx, x, y, width, height, time) {
    ctx.save(); ctx.translate(x, y + Math.sin(time * .7) * .7); ctx.rotate(Math.sin(time * .55) * .008);
    ctx.scale(PLAYER_DRAW_SCALE, PLAYER_DRAW_SCALE);
    const entries = getInstalledEntries(this.loadoutGetter?.() ?? {});
    const core = ASSEMBLY_BOARD.corePosition;
    const footprints = entries.map((entry) => {
      const bounds = getFootprintBounds(entry.module);
      return { entry, bounds, minX: entry.x + bounds.minX - core.x, maxX: entry.x + bounds.maxX - core.x, minY: entry.y + bounds.minY - core.y, maxY: entry.y + bounds.maxY - core.y };
    });
    const minX = Math.min(...footprints.map((item) => item.minX)); const maxX = Math.max(...footprints.map((item) => item.maxX));
    const minY = Math.min(...footprints.map((item) => item.minY)); const maxY = Math.max(...footprints.map((item) => item.maxY));
    const cellSize = Math.min(17, width * .82 / Math.max(1, maxX - minX + 1), height * .82 / Math.max(1, maxY - minY + 1));
    ctx.translate(0, Math.sin(time * .7) * .7);
    ctx.shadowBlur = 14; ctx.shadowColor = "rgba(72, 225, 255, .52)";
    for (const { entry, bounds } of footprints) {
      const dx = entry.x + (bounds.minX + bounds.maxX) / 2 - core.x;
      const dy = entry.y + (bounds.minY + bounds.maxY) / 2 - core.y;
      ctx.save(); ctx.translate(dx * cellSize, dy * cellSize); ctx.scale(bounds.width * .72, bounds.height * .72);
      drawModuleIcon(ctx, entry.module, entry.module.type === "core" ? 22 : 18, entry.module.type === "core" ? 1 : .94);
      ctx.restore();
    }
    ctx.restore();
  }

  render(now) {
    if (!this.running || !this.ctx) return;
    const { ctx, width: w, height: h } = this;
    const deltaTime = Math.min(Math.max((now - this.lastTime) / 1000, 0), 0.05);
    this.lastTime = now;
    this.layerOffsets.far = (this.layerOffsets.far + this.flightSpeed * .15 * deltaTime) % h;
    this.layerOffsets.middle = (this.layerOffsets.middle + this.flightSpeed * .4 * deltaTime) % h;
    this.layerOffsets.near = (this.layerOffsets.near + this.flightSpeed * deltaTime) % h;
    const t = now * 0.001;
    ctx.clearRect(0, 0, w, h);


    // 深空中心辉光和两侧克制的机库弧线。
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.43, 8, w * 0.5, h * 0.43, Math.max(w, h) * 0.62);
    glow.addColorStop(0, "rgba(65, 211, 255, 0.075)");
    glow.addColorStop(0.52, "rgba(71, 105, 211, 0.025)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const sunX = w * 0.5;
    const sunY = h * 0.37;
    const sunR = Math.min(w * 0.31, h * 0.16);
    ctx.save();
    const sun = ctx.createRadialGradient(sunX - sunR * .18, sunY - sunR * .3, 0, sunX, sunY, sunR);
    sun.addColorStop(0, "rgba(255, 221, 82, .64)");
    sun.addColorStop(.36, "rgba(255, 103, 211, .58)");
    sun.addColorStop(1, "rgba(126, 55, 255, .18)");
    ctx.fillStyle = sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    for (let y = sunY + sunR * .12; y < sunY + sunR; y += 8) ctx.fillRect(sunX - sunR, y, sunR * 2, 2.3);
    ctx.restore();

    ctx.save();
    const top = h * .075; const base = h * .63; const half = Math.min(w * .39, h * .25);
    const triangle = ctx.createLinearGradient(sunX - half, base, sunX + half, base);
    triangle.addColorStop(0, "rgba(65, 161, 255, .6)");
    triangle.addColorStop(.5, "rgba(161, 73, 255, .8)");
    triangle.addColorStop(1, "rgba(255, 78, 190, .68)");
    ctx.strokeStyle = triangle; ctx.lineWidth = 2;
    ctx.shadowBlur = 16; ctx.shadowColor = "rgba(210, 68, 255, .52)";
    ctx.beginPath(); ctx.moveTo(sunX, top); ctx.lineTo(sunX + half, base); ctx.lineTo(sunX - half, base); ctx.closePath(); ctx.stroke();
    ctx.restore();

    // 两侧的低对比度棕榈剪影，给标题区域留出清晰的阅读空间。
    this.drawPalm(ctx, w * .08, h * .78, Math.min(1, w / 480) * .5, 1);
    this.drawPalm(ctx, w * .92, h * .8, Math.min(1, w / 480) * .44, -1);

    ctx.save();
    ctx.strokeStyle = "rgba(186, 76, 255, 0.28)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(-w * 0.12, h * 0.48, h * 0.54, -0.72, 0.72);
    ctx.arc(w * 1.12, h * 0.48, h * 0.54, Math.PI - 0.72, Math.PI + 0.72);
    ctx.stroke();
    ctx.restore();

    // 细小、缓慢明灭的星点，避免抢占按钮和标题的视觉焦点。
    for (const star of this.stars) {
      const alpha = 0.16 + (Math.sin(t * 0.8 + star.phase) + 1) * 0.09;
      const color = star.tint === "pink" ? "255, 95, 210" : star.tint === "violet" ? "181, 100, 255" : "74, 175, 255";
      ctx.fillStyle = `rgba(${color}, ${alpha + .08})`;
      ctx.beginPath();
      const y = (star.y * h + this.layerOffsets.far * star.depth) % h;
      ctx.arc(star.x * w, y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.depth > .72) {
        ctx.globalAlpha = alpha * .45;
        ctx.fillRect(star.x * w, y - star.depth * 11, star.size * .7, star.depth * 16);
        ctx.globalAlpha = 1;
      }
    }

    // 稀疏扫描线与短促故障条：只作为旧电子屏幕的质感，不干扰可读性。
    ctx.save();
    for (let y = 9; y < h; y += 6) {
      ctx.fillStyle = y % 12 ? "rgba(80, 104, 255, .045)" : "rgba(255, 89, 210, .06)";
      ctx.fillRect(0, y, w, 1);
    }
    const glitchY = h * .17 + Math.sin(t * .9) * 14;
    ctx.fillStyle = "rgba(255, 81, 203, .28)"; ctx.fillRect(w * .11, glitchY, 26, 1);
    ctx.fillStyle = "rgba(62, 199, 255, .28)"; ctx.fillRect(w * .76, glitchY + 19, 18, 1);
    ctx.restore();

    // 下方航道网格，只留在背景边缘，形成纵深而不干扰菜单内容。
    const horizon = h * 0.83;
    ctx.save();
    const horizonGlow = ctx.createLinearGradient(0, horizon, w, horizon);
    horizonGlow.addColorStop(0, "rgba(69, 143, 255, 0)");
    horizonGlow.addColorStop(.32, "rgba(75, 126, 255, .62)");
    horizonGlow.addColorStop(.5, "rgba(255, 74, 200, .9)");
    horizonGlow.addColorStop(.68, "rgba(75, 126, 255, .62)");
    horizonGlow.addColorStop(1, "rgba(69, 143, 255, 0)");
    ctx.strokeStyle = horizonGlow; ctx.shadowBlur = 13; ctx.shadowColor = "rgba(255, 63, 193, .75)";
    ctx.beginPath(); ctx.moveTo(w * .05, horizon); ctx.lineTo(w * .95, horizon); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(76, 192, 255, .22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      const progress = (i / 12 + this.layerOffsets.near / h) % 1;
      const y = horizon + progress ** 1.72 * (h - horizon);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = -w; x <= w * 2; x += 48) {
      const sway = Math.sin(t * .22 + x * .01) * 2;
      ctx.beginPath(); ctx.moveTo(w * 0.5 + sway, horizon); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(109, 229, 255, .3)";
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const y = horizon - 17 - Math.abs(x - w * .5) * .035 + Math.sin(x * .055 + this.layerOffsets.middle * .008) * 12 + Math.sin(x * .14 + this.layerOffsets.middle * .003) * 5;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Near-field speed lines arrive from the horizon and leave through the bottom edge.
    ctx.save();
    for (let i = 0; i < 13; i += 1) {
      const progress = (i / 13 + this.layerOffsets.near / h * 1.6) % 1;
      const y = horizon + progress ** 1.55 * (h - horizon);
      const length = 3 + progress * 20;
      const x = (i * 67 + 19) % w;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(255, 113, 218, .34)" : "rgba(94, 223, 255, .34)";
      ctx.lineWidth = .7 + progress * .7;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + length); ctx.stroke();
    }
    ctx.restore();

    if (this.target) {
      const hostRect = this.host.getBoundingClientRect();
      const targetRect = this.target.getBoundingClientRect();
      const targetX = targetRect.left - hostRect.left + targetRect.width * .5;
      const targetY = targetRect.top - hostRect.top + targetRect.height * .5;
      this.drawLoadout(ctx, targetX, targetY, targetRect.width, targetRect.height, t);
    }

    this.frame = requestAnimationFrame(this.render);
  }
}
