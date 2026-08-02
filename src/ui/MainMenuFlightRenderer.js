import { ASSEMBLY_BOARD, getFootprintBounds, getInstalledEntries } from "../config/module-config.js";
import { drawModuleIcon } from "../rendering/ModuleRenderer.js";

// A dedicated flight scene for the main menu. The airframe stays fixed while the world moves.
export class MainMenuFlightRenderer {
  constructor(canvas, host, target, loadoutGetter) {
    this.canvas = canvas;
    this.host = host;
    this.target = target;
    this.loadoutGetter = loadoutGetter;
    this.ctx = canvas?.getContext("2d");
    this.running = false;
    this.frame = null;
    this.lastTime = 0;
    this.flightSpeed = 180;
    // All moving scenery uses the same forward-flight clock. Increasing the
    // offsets moves every layer from the top of the screen toward the bottom.
    this.distance = 0;
    this.farDistance = 0;
    this.particles = Array.from({ length: 44 }, (_, index) => ({
      x: ((index * 83) % 997) / 997,
      depth: .08 + ((index * 17) % 92) / 100,
      size: .55 + (index % 4) * .25,
      phase: index * .63,
      tint: index % 4,
    }));
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    this.observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(this.resize) : null;
    this.observer?.observe(host);
    window.addEventListener("resize", this.resize, { passive: true });
    // Visibility changes are reliable on desktop and mobile. Do not use
    // window.blur here: mobile browser chrome and touch transitions can emit
    // blur while the game is still visible, which would leave the scene frozen.
    document.addEventListener("visibilitychange", () => document.hidden ? this.stop() : this.start());
    this.resize();
  }

  resize() {
    if (!this.canvas || !this.host) return;
    const rect = this.host.getBoundingClientRect();
    // Keep the animation smooth on high-DPI phones by limiting the backing
    // buffer. The CSS canvas still fills the same space, but each frame has a
    // predictable pixel budget.
    const rawRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    const ratio = Math.min(rawRatio, Math.sqrt(1400000 / Math.max(1, this.width * this.height)));
    if (this.canvas.width === Math.floor(this.width * ratio) && this.canvas.height === Math.floor(this.height * ratio) && this.pixelRatio === ratio) return;
    this.pixelRatio = ratio;
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

  drawLoadout(ctx, x, y, width, height, time) {
    const entries = getInstalledEntries(this.loadoutGetter?.() ?? {}).filter((entry) => entry.module);
    const core = ASSEMBLY_BOARD.corePosition;
    const items = entries.map((entry) => {
      const bounds = getFootprintBounds(entry.module);
      return { entry, bounds, minX: entry.x + bounds.minX - core.x, maxX: entry.x + bounds.maxX - core.x, minY: entry.y + bounds.minY - core.y, maxY: entry.y + bounds.maxY - core.y };
    });
    if (!items.length) return;
    const minX = Math.min(...items.map((item) => item.minX)); const maxX = Math.max(...items.map((item) => item.maxX));
    const minY = Math.min(...items.map((item) => item.minY)); const maxY = Math.max(...items.map((item) => item.maxY));
    const spanX = Math.max(1, maxX - minX + 1); const spanY = Math.max(1, maxY - minY + 1);
    const cellSize = Math.min(17, width * .82 / spanX, height * .82 / spanY);
    const sceneCenterX = (minX + maxX) / 2; const sceneCenterY = (minY + maxY) / 2;
    ctx.save(); ctx.translate(x, y + Math.sin(time * .7) * .7); ctx.rotate(Math.sin(time * .55) * .008);
    ctx.shadowBlur = 12; ctx.shadowColor = "rgba(72, 225, 255, .54)";

    for (const { entry, bounds } of items) {
      // Entry x/y is the footprint anchor. Convert its complete footprint
      // center into the same grid coordinate system used by the builder.
      // Scaling the 28px icon to the exact footprint size prevents horizontal
      // and vertical modules from drifting into neighboring modules.
      const moduleCenterX = entry.x + (bounds.minX + bounds.maxX) / 2 - core.x;
      const moduleCenterY = entry.y + (bounds.minY + bounds.maxY) / 2 - core.y;
      ctx.save();
      ctx.translate((moduleCenterX - sceneCenterX) * cellSize, (moduleCenterY - sceneCenterY) * cellSize);
      ctx.scale(bounds.width * cellSize / 28, bounds.height * cellSize / 28);
      drawModuleIcon(ctx, entry.module, 28, entry.module.type === "core" ? 1 : .96);
      ctx.restore();
    }
    ctx.restore();
  }

  render(now) {
    if (!this.running || !this.ctx) return;
    try {
      this.renderFrame(now);
    } catch (error) {
      // A malformed preview/loadout must not permanently kill the RAF loop.
      // Keep the next frame alive and surface the actual error for debugging.
      console.error("主菜单飞行背景渲染失败，已继续动画循环", error);
      this.lastTime = now;
    }
    if (this.running) this.frame = requestAnimationFrame(this.render);
  }

  renderFrame(now) {
    if (!this.running || !this.ctx || document.hidden) return;
    const dt = Math.min(Math.max((now - this.lastTime) / 1000, 0), .05);
    this.lastTime = now;
    const { ctx, width: w, height: h } = this;
    const t = now * .001;
    this.distance = (this.distance + this.flightSpeed * dt / Math.max(h, 1)) % 1;
    this.farDistance = (this.farDistance + this.flightSpeed * .15 * dt / Math.max(h, 1)) % 1;
    ctx.clearRect(0, 0, w, h);

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#080b35"); sky.addColorStop(.46, "#101b62"); sky.addColorStop(.68, "#462078"); sky.addColorStop(1, "#080b32");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    const horizon = h * .64;
    const skyGlow = ctx.createRadialGradient(w * .5, horizon - 30, 2, w * .5, horizon, Math.max(w, h) * .55);
    skyGlow.addColorStop(0, "rgba(69, 207, 255, .3)"); skyGlow.addColorStop(.34, "rgba(159, 83, 255, .2)"); skyGlow.addColorStop(1, "rgba(255, 71, 200, 0)");
    ctx.fillStyle = skyGlow; ctx.fillRect(0, 0, w, h);

    // Large vaporwave sunset: a warm yellow upper disc fades into pink and
    // violet, while the lower half is cut by slowly drifting dark bands.
    const pulse = 1 + Math.sin(t * .65) * .035;
    const sunR = Math.min(w * .41, h * .245) * .5625 * pulse;
    const sunY = h * .5;
    const sunGlow = ctx.createRadialGradient(w * .5, sunY, sunR * .12, w * .5, sunY, sunR * 1.55);
    sunGlow.addColorStop(0, "rgba(255, 238, 111, .34)");
    sunGlow.addColorStop(.34, "rgba(255, 124, 182, .2)");
    sunGlow.addColorStop(.68, "rgba(158, 76, 255, .12)");
    sunGlow.addColorStop(1, "rgba(80, 102, 255, 0)");
    ctx.fillStyle = sunGlow; ctx.fillRect(w * .5 - sunR * 1.6, sunY - sunR * 1.6, sunR * 3.2, sunR * 3.2);

    ctx.save();
    ctx.beginPath(); ctx.arc(w * .5, sunY, sunR, 0, Math.PI * 2); ctx.clip();
    const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sun.addColorStop(0, "rgba(255, 239, 107, .96)");
    sun.addColorStop(.3, "rgba(255, 205, 91, .94)");
    sun.addColorStop(.58, "rgba(255, 139, 143, .94)");
    sun.addColorStop(.82, "rgba(244, 82, 189, .92)");
    sun.addColorStop(1, "rgba(161, 66, 232, .82)");
    ctx.fillStyle = sun; ctx.fillRect(w * .5 - sunR, sunY - sunR, sunR * 2, sunR * 2);

    const stripeOffset = (t * 5.2) % 9;
    ctx.fillStyle = "rgba(58, 24, 103, .52)";
    for (let stripeY = sunY - sunR * .02 + stripeOffset; stripeY < sunY + sunR; stripeY += 9) {
      const stripeHeight = 2.2 + Math.sin(t * .45 + stripeY * .02) * .25;
      ctx.fillRect(w * .5 - sunR, stripeY, sunR * 2, stripeHeight);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(255, 223, 128, .28)"; ctx.lineWidth = 1.2;
    ctx.shadowBlur = 18; ctx.shadowColor = "rgba(255, 91, 205, .38)";
    ctx.beginPath(); ctx.arc(w * .5, sunY, sunR + .8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Far stars and near particles both enter from above and pass downward.
    // The farther layer moves more slowly, preserving the sense of depth.
    const colors = ["95, 232, 255", "170, 124, 255", "255, 117, 215", "139, 255, 221"];
    for (const particle of this.particles) {
      const farY = (particle.phase * h + this.farDistance * h * particle.depth) % h;
      const depth = (particle.phase + this.distance * (0.35 + particle.depth)) % 1;
      const perspective = .18 + depth * 1.65;
      const x = w * .5 + (particle.x - .5) * w * perspective;
      const y = horizon + depth ** 1.7 * (h - horizon);
      const alpha = .14 + (Math.sin(t * .7 + particle.phase) + 1) * .08;
      ctx.fillStyle = `rgba(${colors[particle.tint]}, ${alpha})`;
      ctx.fillRect(particle.x * w, farY, particle.size, particle.size);
      if (depth > .58 && x > -20 && x < w + 20) {
        ctx.strokeStyle = `rgba(${colors[particle.tint]}, ${.12 + depth * .28})`;
        ctx.lineWidth = .6 + depth * .8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 4 + depth * 25); ctx.stroke();
      }
    }

    // The horizon is the fixed vanishing point; every floor line starts there and grows toward the viewer.
    ctx.save();
    const horizonLine = ctx.createLinearGradient(0, horizon, w, horizon);
    horizonLine.addColorStop(0, "rgba(72, 203, 255, 0)"); horizonLine.addColorStop(.5, "rgba(72, 231, 255, .9)"); horizonLine.addColorStop(1, "rgba(72, 203, 255, 0)");
    ctx.strokeStyle = horizonLine; ctx.shadowBlur = 15; ctx.shadowColor = "rgba(65, 222, 255, .72)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke(); ctx.shadowBlur = 0;
    for (let index = 0; index < 16; index += 1) {
      const progress = (index / 16 + this.distance * 1.45) % 1;
      const y = horizon + progress ** 1.72 * (h - horizon);
      ctx.strokeStyle = `rgba(80, ${180 + Math.floor(progress * 55)}, 255, ${.18 + progress * .18})`;
      ctx.lineWidth = .6 + progress * .8;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = -w; x <= w * 2; x += Math.max(40, w / 8)) {
      ctx.strokeStyle = "rgba(61, 209, 255, .28)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w * .5, horizon); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.restore();

    // Stronger foreground streaks make the forward direction unmistakable:
    // every streak starts near the horizon and falls toward the viewer.
    ctx.save();
    for (let index = 0; index < 17; index += 1) {
      const progress = (index / 17 + this.distance * 2.1) % 1;
      const x = w * .5 + ((index * 71) % 101 - 50) / 100 * w * (.25 + progress * 1.5);
      const y = horizon + progress ** 1.5 * (h - horizon);
      ctx.strokeStyle = index % 4 === 0 ? "rgba(255, 119, 219, .45)" : "rgba(93, 230, 255, .4)";
      ctx.lineWidth = .7 + progress * 1.3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5 + progress * 35); ctx.stroke();
    }
    ctx.restore();

    // CRT scan lines also travel downward, while remaining subtle and behind input.
    ctx.save(); ctx.globalAlpha = .13;
    for (let y = (this.farDistance * h) % 6; y < h; y += 6) ctx.fillRect(0, y, w, 1);
    ctx.restore();

    if (this.target) {
      const hostRect = this.host.getBoundingClientRect(); const targetRect = this.target.getBoundingClientRect();
      this.drawLoadout(ctx, targetRect.left - hostRect.left + targetRect.width * .5, targetRect.top - hostRect.top + targetRect.height * .5, targetRect.width, targetRect.height, t);
    }
  }
}
