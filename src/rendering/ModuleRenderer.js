const colors = { core: "#64e7ff", weapon: "#ffd27a", special: "#72f1c0" };
let moduleGlowEnabled = true;

function setModuleGlow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = moduleGlowEnabled ? blur : 0;
}

export function setModuleGlowEnabled(enabled) {
  moduleGlowEnabled = Boolean(enabled);
  if (typeof document !== "undefined") document.documentElement.classList.toggle("module-glow-off", !moduleGlowEnabled);
}

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
}

function boundsOf(module) {
  const cells = module?.footprint?.cells ?? [[0, 0]];
  const xs = cells.map(([x]) => x); const ys = cells.map(([, y]) => y);
  return { width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 };
}

function drawFrame(ctx, module, accent, fill = "#10263c") {
  const bounds = boundsOf(module);
  const bevel = 3;
  ctx.fillStyle = fill; ctx.strokeStyle = accent; ctx.lineWidth = 1.2;
  polygon(ctx, [[-14 + bevel, -14], [14 - bevel, -14], [14, -14 + bevel], [14, 14 - bevel], [14 - bevel, 14], [-14 + bevel, 14], [-14, 14 - bevel], [-14, -14 + bevel]]);
  ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 0.28; ctx.strokeStyle = accent; ctx.lineWidth = 0.55;
  if (bounds.width > 1) for (let x = 1; x < bounds.width; x += 1) { const px = -14 + 28 * x / bounds.width; ctx.beginPath(); ctx.moveTo(px, -11); ctx.lineTo(px, 11); ctx.stroke(); }
  if (bounds.height > 1) for (let y = 1; y < bounds.height; y += 1) { const py = -14 + 28 * y / bounds.height; ctx.beginPath(); ctx.moveTo(-11, py); ctx.lineTo(11, py); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

function drawBarrel(ctx, x, angle = 0, color = "#ffd27a") {
  ctx.save(); ctx.translate(x, -1); ctx.rotate(angle); ctx.fillStyle = color; ctx.strokeStyle = "#fff1c1"; ctx.lineWidth = 0.7;
  ctx.fillRect(-1.5, -11, 3, 10); ctx.strokeRect(-1.5, -11, 3, 10); ctx.fillStyle = "#ffffff"; ctx.fillRect(-1, -12, 2, 2); ctx.restore();
}

function drawLightningBolt(ctx, color = "#a8f5ff") {
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-5, -3); ctx.lineTo(1, -4); ctx.lineTo(-4, 5); ctx.lineTo(1, 3); ctx.lineTo(0, 12); ctx.stroke();
  ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(-9, 2); ctx.moveTo(2, 3); ctx.lineTo(8, 7); ctx.stroke();
}

function drawNestPod(ctx, x) {
  // Three compact black/red launch pods echo the silhouette of the Nest missiles.
  ctx.save(); ctx.translate(x, 0); ctx.lineJoin = "round";
  ctx.fillStyle = "#090b13"; ctx.strokeStyle = "#ff294d"; ctx.lineWidth = 1.15;
  polygon(ctx, [[-2.7, 8], [-3.1, 2], [-1.8, -7], [0, -10], [1.8, -7], [3.1, 2], [2.7, 8]]);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#9f102c"; ctx.lineWidth = 0.85;
  ctx.beginPath(); ctx.moveTo(-2.2, 3); ctx.lineTo(-4.5, 6); ctx.lineTo(-2.3, 6); ctx.moveTo(2.2, 3); ctx.lineTo(4.5, 6); ctx.lineTo(2.3, 6); ctx.stroke();
  ctx.fillStyle = "#ef294d"; ctx.fillRect(-0.95, -5.2, 1.9, 7.5);
  ctx.fillStyle = "#ff9baa"; ctx.fillRect(-0.55, -6.1, 1.1, 2.2);
  ctx.fillStyle = "#ff294d"; ctx.beginPath(); ctx.arc(0, 8.2, 1.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWeapon(ctx, module) {
  const type = module?.behavior?.type; const accent = type === "nest" ? "#ff294d" : type === "ballLightning" ? "#b7a1ff" : type === "lightning" ? "#b86cff" : type === "blackHole" ? "#b57bff" : "#ffd27a";
  drawFrame(ctx, module, accent, type === "nest" ? "#090b13" : "#142d46");
  setModuleGlow(ctx, accent, 5);
  if (type === "single") drawBarrel(ctx, 0);
  else if (type === "twin") { drawBarrel(ctx, -5); drawBarrel(ctx, 5); }
  else if (type === "spread") { drawBarrel(ctx, -6, -0.27); drawBarrel(ctx, 0); drawBarrel(ctx, 6, 0.27); }
  else if (type === "missile") { polygon(ctx, [[-4, 7], [0, 11], [4, 7], [3, 1], [-3, 1]]); ctx.fillStyle = "#ff8d6d"; ctx.fill(); ctx.strokeStyle = "#ffe0bd"; ctx.stroke(); ctx.fillStyle = "#fff0c2"; ctx.fillRect(-1, -8, 2, 7); }
  else if (type === "electricWhirlwind") { ctx.strokeStyle = "#a8f5ff"; ctx.lineWidth = 2; for (const offset of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) { ctx.beginPath(); ctx.arc(0, 0, 10, offset, offset + 1.8); ctx.stroke(); } drawLightningBolt(ctx, "#f2ffff"); }
  else if (type === "nest") {
    ctx.save(); setModuleGlow(ctx, "#ff294d", 8);
    [-8, 0, 8].forEach((x) => drawNestPod(ctx, x));
    ctx.fillStyle = "#090b13"; ctx.strokeStyle = "#ff294d"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 1.5, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff294d"; ctx.beginPath(); ctx.arc(0, 1.5, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffb2bd"; ctx.beginPath(); ctx.arc(-0.55, 0.9, 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  else if (type === "ricochet") { ctx.strokeStyle = "#ffd36e"; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(-10, 7); ctx.lineTo(-3, -3); ctx.lineTo(3, 4); ctx.lineTo(10, -7); ctx.stroke(); ctx.fillStyle = "#fff0a5"; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill(); }
  else if (type === "ballLightning") { ctx.fillStyle = "#b7a1ff"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#f5edff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 4; i += 1) { const a = i * Math.PI / 2 + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); } }
  else if (type === "psionic") { ctx.fillStyle = "#72f1c0"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#e1fff4"; ctx.lineWidth = 1; for (const radius of [8, 11]) { ctx.beginPath(); ctx.arc(0, 0, radius, -.7, .7); ctx.stroke(); } drawBarrel(ctx, 0, 0, "#72f1c0"); }
  else if (type === "lightning") drawLightningBolt(ctx, "#b86cff");
  else if (type === "blackHole") { ctx.fillStyle = "#080414"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#d0b0ff"; ctx.lineWidth = 1.6; for (const [radius, start] of [[9, .2], [12, 2.3]]) { ctx.beginPath(); ctx.arc(0, 0, radius, start, start + 4.3); ctx.stroke(); } ctx.fillStyle = "#fff0ff"; ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI * 2); ctx.fill(); }
  else drawBarrel(ctx, 0);
}

function drawSpecial(ctx, module) {
  const accent = "#72f1c0"; drawFrame(ctx, module, accent, "#123d3e"); setModuleGlow(ctx, accent, 5);
  if (module?.id === "special-optical") { ctx.strokeStyle = "#b8ffe7"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, 9); ctx.lineTo(8, -9); ctx.stroke(); }
  else if (module?.id === "special-wingman") { polygon(ctx, [[0, -11], [11, 7], [2, 4], [0, 10], [-2, 4], [-11, 7]]); ctx.fillStyle = "#1b685d"; ctx.fill(); ctx.strokeStyle = "#b8ffe7"; ctx.stroke(); ctx.fillStyle = accent; ctx.fillRect(-12, 8, 5, 2); ctx.fillRect(7, 8, 5, 2); }
  else if (module?.id === "special-chainsaw") { ctx.strokeStyle = "#b8ffe7"; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-4, 0); ctx.lineTo(-10, 7); ctx.moveTo(10, -7); ctx.lineTo(4, 0); ctx.lineTo(10, 7); ctx.stroke(); ctx.lineWidth = 2.4; for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) { const y = -8 + i * 5; ctx.beginPath(); ctx.moveTo(side * 5, y); ctx.lineTo(side * 10, y + 2); ctx.stroke(); } }
  else if (module?.id === "special-sonic") { ctx.strokeStyle = "#b8ffe7"; ctx.lineWidth = 1.4; for (let y = -8; y <= 8; y += 8) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y); ctx.stroke(); } ctx.strokeStyle = accent; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-5, -6); ctx.lineTo(0, 0); ctx.lineTo(5, 6); ctx.lineTo(10, 0); ctx.stroke(); }
  else if (module?.id === "special-zero") { ctx.fillStyle = "#225e69"; polygon(ctx, [[0, -12], [5, -5], [11, -4], [6, 2], [7, 10], [0, 6], [-7, 10], [-6, 2], [-11, -4], [-5, -5]]); ctx.fill(); ctx.strokeStyle = "#b8ffe7"; ctx.stroke(); ctx.strokeStyle = "#d9ffff"; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke(); }
  else if (module?.id === "special-energy-aggregator") { ctx.strokeStyle = "#d9fff2"; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10); ctx.lineTo(Math.cos(angle + .44) * 4.5, Math.sin(angle + .44) * 4.5); ctx.stroke(); ctx.fillStyle = "#7effce"; ctx.beginPath(); ctx.arc(Math.cos(angle) * 10, Math.sin(angle) * 10, 2, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "#72f1c0"; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#f1fffb"; ctx.beginPath(); ctx.arc(-1, -1.2, 1.5, 0, Math.PI * 2); ctx.fill(); }
  else if (module?.id === "special-overclock") { ctx.strokeStyle = "#ffbd66"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-4, 0); ctx.lineTo(-9, 8); ctx.moveTo(10, -7); ctx.lineTo(4, 0); ctx.lineTo(9, 8); ctx.stroke(); ctx.fillStyle = "#ff8c4a"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff3bf"; ctx.fillRect(-1, -7, 2, 14); }
  else if (module?.id === "special-polarity-reverse") { ctx.strokeStyle = "#d1b8ff"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 9, .25, Math.PI * 1.15); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI + .25, Math.PI * 2.15); ctx.stroke(); ctx.fillStyle = "#9d7bff"; ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(3, -11); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-3, 11); ctx.lineTo(3, 11); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill(); }
  else { ctx.strokeStyle = accent; ctx.strokeRect(-8, -8, 16, 16); }
}

function drawCore(ctx) {
  ctx.fillStyle = "#12364c"; ctx.strokeStyle = "#d9fbff"; ctx.lineWidth = 1.4;
  polygon(ctx, [[0, -12], [9, -5], [7, 8], [0, 12], [-7, 8], [-9, -5]]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#64e7ff"; polygon(ctx, [[0, -7], [5, -2], [3, 6], [0, 8], [-3, 6], [-5, -2]]); ctx.fill();
  ctx.strokeStyle = "#efffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 6); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
}

// Canvas-only icons. The frame is always a module silhouette; CSS stretches it to the module footprint in the builder.
export function drawModuleIcon(ctx, module, size = 26, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.scale(size / 28, size / 28); setModuleGlow(ctx, colors[module?.type] ?? colors.core, 8);
  if (module?.type === "core") drawCore(ctx); else if (module?.type === "weapon") drawWeapon(ctx, module); else if (module?.type === "special") drawSpecial(ctx, module);
  ctx.restore();
}

export function paintModuleCanvas(canvas, module, size = canvas.width) {
  const ctx = canvas.getContext("2d"); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2);
  const builderIcon = canvas.classList.contains("placed-icon-canvas");
  const bounds = boundsOf(module); const maxDimension = Math.max(bounds.width, bounds.height);
  if (builderIcon) { ctx.scale(canvas.width / 28, canvas.height / 28); drawModuleIcon(ctx, module, 28); }
  else { ctx.scale(bounds.width / maxDimension, bounds.height / maxDimension); drawModuleIcon(ctx, module, Math.min(size, Math.min(canvas.width, canvas.height)) * 0.82); }
  ctx.restore();
}

export function moduleColor(type) { return colors[type] ?? colors.core; }
