const colors = { core: "#64e7ff", weapon: "#ffd27a", special: "#72f1c0" };
let moduleGlowEnabled = false;

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

function drawDiamond(ctx, x, y, radius, fill, stroke = fill) {
  polygon(ctx, [[x, y - radius], [x + radius, y], [x, y + radius], [x - radius, y]]);
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.stroke();
}

function drawSpark(ctx, x, y, radius, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = color;
  ctx.fillRect(-radius * .42, -radius * .42, radius * .84, radius * .84); ctx.restore();
}

function drawArrowHead(ctx, x, y, angle, size, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color;
  polygon(ctx, [[0, 0], [-size, -size * .45], [-size * .6, 0], [-size, size * .45]]); ctx.fill(); ctx.restore();
}

function drawSawDisc(ctx, x, y, radius, color, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.strokeStyle = color; ctx.lineWidth = 1.15;
  ctx.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const angle = i * Math.PI * 2 / 16; const r = i % 2 ? radius * .76 : radius;
    const px = Math.cos(angle) * r; const py = Math.sin(angle) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = "#102844"; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#e6ffff"; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(0, 0, radius * .55, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, radius * .2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawFighter(ctx, x, y, scale, fill, stroke) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.lineJoin = "round";
  polygon(ctx, [[0, -8], [3, 1], [8, 5], [2, 4], [0, 9], [-2, 4], [-8, 5], [-3, 1]]);
  ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = stroke; ctx.beginPath(); ctx.arc(0, -2, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawWave(ctx, color, amplitude = 5, cycles = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.25; ctx.lineCap = "round"; ctx.beginPath();
  for (let x = -12; x <= 12; x += 1) { const y = Math.sin((x + 12) / 24 * Math.PI * 2 * cycles) * amplitude; x === -12 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
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
  const type = module?.behavior?.type; const id = module?.id;
  const accent = id === "fusion-polar-saw" ? "#ffdf64" : id === "special-energy-aggregator" ? "#5fe8ff" : type === "electricWhirlwind" ? "#ffd84a" : type === "ricochet" ? "#ffd36e" : type === "psionic" ? "#72f1c0" : type === "nest" ? "#ff294d" : type === "flameCrossbow" ? "#ff3b32" : type === "waterShot" ? "#2468ff" : type === "ballLightning" ? "#b7a1ff" : type === "lightning" ? "#b86cff" : type === "blackHole" ? "#b57bff" : "#ffd27a";
  const fill = id === "fusion-polar-saw" ? "#3a2b08" : id === "special-energy-aggregator" ? "#092d3d" : type === "electricWhirlwind" ? "#3e2b0d" : type === "ricochet" ? "#3a2a13" : type === "psionic" ? "#123d3e" : type === "nest" || type === "flameCrossbow" ? "#090b13" : type === "waterShot" ? "#071b3c" : "#142d46";
  drawFrame(ctx, module, accent, fill);
  setModuleGlow(ctx, accent, 5);
  if (type === "single") drawBarrel(ctx, 0);
  else if (type === "twin") { drawBarrel(ctx, -5); drawBarrel(ctx, 5); }
  else if (type === "spread") { drawBarrel(ctx, -6, -0.27); drawBarrel(ctx, 0); drawBarrel(ctx, 6, 0.27); }
  else if (type === "missile") { polygon(ctx, [[-4, 7], [0, 11], [4, 7], [3, 1], [-3, 1]]); ctx.fillStyle = "#ff8d6d"; ctx.fill(); ctx.strokeStyle = "#ffe0bd"; ctx.stroke(); ctx.fillStyle = "#fff0c2"; ctx.fillRect(-1, -8, 2, 7); }
  else if (type === "electricWhirlwind") {
    ctx.save(); setModuleGlow(ctx, "#ffd84a", 9); ctx.lineCap = "round";
    for (const [radius, start, color, width] of [[12, -.45, "#ffd84a", 1.35], [9.5, 1.35, "#ff9e4a", 1.05], [7, 3.25, "#fff5bc", .85]]) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(0, 0, radius, start, start + 1.9); ctx.stroke(); }
    ctx.strokeStyle = "#ffe77a"; ctx.lineWidth = .75; ctx.setLineDash([2.4, 1.8]); ctx.beginPath(); ctx.arc(0, 0, 13, .2, 2.7); ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.rotate(-.35); ctx.fillStyle = "#7e5d18"; ctx.strokeStyle = "#fff0a0"; ctx.lineWidth = .9;
    for (let i = 0; i < 4; i += 1) { ctx.rotate(Math.PI / 2); polygon(ctx, [[1, -2], [5, -7], [10, -9], [7, -3], [3, 1]]); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = "#fff7c7"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.stroke();
    for (const [angle, color] of [[-.45, "#fff0a0"], [1.05, "#ffd84a"], [2.55, "#ff9e4a"], [4.05, "#fff5bc"]]) { const x = Math.cos(angle) * 10.8; const y = Math.sin(angle) * 10.8; drawSpark(ctx, x, y, 3.2, color); ctx.strokeStyle = color; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.fillStyle = "#fff5bc"; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-.7, -.8, .8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (type === "nest") {
    ctx.save(); setModuleGlow(ctx, "#ff294d", 8);
    [-8, 0, 8].forEach((x) => drawNestPod(ctx, x));
    ctx.fillStyle = "#090b13"; ctx.strokeStyle = "#ff294d"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 1.5, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff294d"; ctx.beginPath(); ctx.arc(0, 1.5, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffb2bd"; ctx.beginPath(); ctx.arc(-0.55, 0.9, 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  else if (type === "ricochet") {
    ctx.save(); setModuleGlow(ctx, "#ffd36e", 7); ctx.strokeStyle = "#ffd36e"; ctx.lineWidth = 1.25; ctx.setLineDash([2, 1.4]);
    ctx.beginPath(); ctx.moveTo(-11, 8); ctx.lineTo(-5, -7); ctx.lineTo(3, 5); ctx.lineTo(11, -8); ctx.stroke(); ctx.setLineDash([]);
    for (const [x, y, angle] of [[-5, -7, -.9], [3, 5, .55], [11, -8, -.8]]) { drawSpark(ctx, x, y, 3.1, "#fff2ac"); drawArrowHead(ctx, x, y, angle, 3.5, "#ffb947"); }
    ctx.strokeStyle = "#fff8d4"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-11, 8, 2.4, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  else if (type === "ballLightning") { ctx.fillStyle = "#b7a1ff"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#f5edff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 4; i += 1) { const a = i * Math.PI / 2 + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke(); } }
  else if (type === "psionic") {
    ctx.save(); setModuleGlow(ctx, "#72f1c0", 9);
    ctx.strokeStyle = "#b8ffe7"; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#72f1c0"; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#72f1c0"; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#effff7"; ctx.beginPath(); ctx.arc(-1, -1, 1.1, 0, Math.PI * 2); ctx.fill();
    for (const [x, y] of [[-10, -8], [10, -7], [-11, 8], [11, 8]]) drawSpark(ctx, x, y, 2.7, "#b8ffe7");
    ctx.restore();
  }
  else if (id === "fusion-polar-saw") {
    ctx.save(); setModuleGlow(ctx, "#ffdf64", 12); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 1.45;
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(-2.5, -5); ctx.lineTo(2, -3); ctx.lineTo(-2, 4); ctx.lineTo(0, 13); ctx.stroke();
    for (const points of [[[-4, -1], [-10, -6], [-8, 0], [-13, 5]], [[4, -1], [10, -6], [8, 0], [13, 5]]]) { ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); for (const [x, y] of points.slice(1)) ctx.lineTo(x, y); ctx.stroke(); }
    ctx.strokeStyle = "#ffdf64"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff4a6"; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-1.2, -1.4, 1.25, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (type === "lightning") drawLightningBolt(ctx, "#b86cff");
  else if (type === "blackHole") { ctx.fillStyle = "#080414"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#d0b0ff"; ctx.lineWidth = 1.6; for (const [radius, start] of [[9, .2], [12, 2.3]]) { ctx.beginPath(); ctx.arc(0, 0, radius, start, start + 4.3); ctx.stroke(); } ctx.fillStyle = "#fff0ff"; ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI * 2); ctx.fill(); }
  else if (type === "flameCrossbow") {
    ctx.save(); setModuleGlow(ctx, "#ff3b32", 8); ctx.strokeStyle = "#ff6a3d"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-11, -3); ctx.quadraticCurveTo(0, 4, 11, -3); ctx.stroke();
    ctx.strokeStyle = "#ffb34d"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(0, 3); ctx.lineTo(10, -4); ctx.stroke();
    for (const x of [-5, 0, 5]) { ctx.strokeStyle = "#ff3b32"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, 7); ctx.lineTo(x, -7); ctx.stroke(); ctx.fillStyle = "#fff0bd"; polygon(ctx, [[x, -11], [x - 1.8, -7], [x + 1.8, -7]]); ctx.fill(); ctx.fillStyle = "#ff6a2e"; ctx.beginPath(); ctx.moveTo(x - 2, 7); ctx.quadraticCurveTo(x, 3, x + 2, 7); ctx.quadraticCurveTo(x, 11, x - 2, 7); ctx.fill(); }
    ctx.restore();
  }
  else if (type === "waterShot") {
    ctx.save(); setModuleGlow(ctx, "#2468ff", 8); ctx.fillStyle = "#176dff"; ctx.strokeStyle = "#b7e9ff"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.bezierCurveTo(6, -4, 8, 0, 7, 4); ctx.bezierCurveTo(6, 10, -6, 10, -7, 4); ctx.bezierCurveTo(-8, 0, -6, -4, 0, -11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e8fbff"; ctx.beginPath(); ctx.arc(-2, -3, 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#56a8ff"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 5, 10, .15, Math.PI - .15); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 6, 6, .2, Math.PI - .2); ctx.stroke();
    for (const [x, y, r] of [[-10, -3, 1.2], [10, 0, 1.5], [8, 9, 1]]) { ctx.fillStyle = "#6ddfff"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  else if (id === "special-energy-aggregator") {
    ctx.save(); setModuleGlow(ctx, "#5fe8ff", 8); ctx.strokeStyle = "#75f2ff"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / 3; const x = Math.cos(angle) * 10; const y = Math.sin(angle) * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(Math.cos(angle + .42) * 4.5, Math.sin(angle + .42) * 4.5); ctx.stroke(); ctx.fillStyle = i === 1 ? "#ff74d8" : "#7effce"; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#4bcfff"; ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#efffff"; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-1.4, -1.5, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else drawBarrel(ctx, 0);
}

function drawSpecial(ctx, module) {
  const palettes = {
    "special-optical": { accent: "#9ee9ff", fill: "#182d62" },
    "special-wingman": { accent: "#74f4ff", fill: "#123f62" },
    "special-chainsaw": { accent: "#ff9f5a", fill: "#382019" },
    "special-sonic": { accent: "#d48cff", fill: "#2c1b56" },
    "special-zero": { accent: "#a9f4ff", fill: "#123e61" },
    "special-overclock": { accent: "#ffbd55", fill: "#482116" },
    "special-polarity-reverse": { accent: "#d3a8ff", fill: "#27184d" },
    "fusion-photon-chorus": { accent: "#ffe98a", fill: "#4d3a18" },
    "fusion-cryo-hive": { accent: "#a5f6ec", fill: "#123f4a" },
    "fusion-abyss-bloom": { accent: "#d09aff", fill: "#241044" },
    "fusion-mirage-anchor": { accent: "#8efff1", fill: "#123c43" },
    "fusion-polar-saw": { accent: "#ffdf64", fill: "#4d3a18" },
    "fusion-overflow-drive": { accent: "#32eaff", fill: "#123b67" },
  };
  const palette = palettes[module?.id] ?? { accent: "#72f1c0", fill: "#123d3e" };
  const accent = palette.accent; drawFrame(ctx, module, accent, palette.fill); setModuleGlow(ctx, accent, 6);
  if (module?.id === "fusion-abyss-bloom") {
    ctx.save(); setModuleGlow(ctx, "#d09aff", 12); ctx.strokeStyle = "#d09aff"; ctx.lineWidth = 1.15;
    for (let i = 0; i < 4; i += 1) { const angle = i * Math.PI / 2; const x = Math.cos(angle) * 8; const y = Math.sin(angle) * 8; ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2); ctx.fillStyle = i % 2 ? "#6f2d9b" : "#b96cff"; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(6, -1, 0, 8); ctx.quadraticCurveTo(-6, -1, 0, -8); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = "#180d2e"; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#f0ddff"; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "fusion-photon-chorus") {
    ctx.save(); setModuleGlow(ctx, "#ffe98a", 10); ctx.strokeStyle = "#ffe98a"; ctx.lineWidth = 1.1;
    for (let i = 0; i < 6; i += 1) { const angle = i * Math.PI / 3; const x = Math.cos(angle) * 9; const y = Math.sin(angle) * 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = i % 2 ? "#7ef8ff" : "#fff1a8"; ctx.beginPath(); ctx.arc(x, y, 2.15, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#fffbe0"; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (module?.id === "fusion-cryo-hive") {
    ctx.save(); setModuleGlow(ctx, "#a5f6ec", 10); ctx.strokeStyle = "#dffeff"; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / 3; const x = Math.cos(angle) * 9; const y = Math.sin(angle) * 9; drawDiamond(ctx, x, y, 4.1, "#56c9cf", "#eaffff"); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke(); }
    ctx.fillStyle = "#bffeff"; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (module?.id === "fusion-mirage-anchor") {
    ctx.save(); setModuleGlow(ctx, "#8efff1", 10); ctx.strokeStyle = "#8efff1"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 10, .2, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 6, Math.PI * 1.2, Math.PI * 2.9); ctx.stroke();
    ctx.fillStyle = "#d9ffff"; polygon(ctx, [[0, -8], [4, 0], [0, 8], [-4, 0]]); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-5, 0); ctx.moveTo(5, 0); ctx.lineTo(12, 0); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "fusion-polar-saw") {
    ctx.save(); setModuleGlow(ctx, "#ffdf64", 10); ctx.strokeStyle = "#ffdf64"; ctx.lineWidth = 1.25; ctx.setLineDash([2, 1.4]); ctx.beginPath(); ctx.moveTo(-11, -6); ctx.lineTo(11, 6); ctx.moveTo(-11, 6); ctx.lineTo(11, -6); ctx.stroke(); ctx.setLineDash([]); drawSawDisc(ctx, -8, 0, 4.5, "#70f5ff", -.3); drawSawDisc(ctx, 8, 0, 4.5, "#ffdf64", .3); ctx.fillStyle = "#fff6bb"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (module?.id === "fusion-overflow-drive") {
    ctx.save(); setModuleGlow(ctx, "#32eaff", 11); ctx.strokeStyle = "#32eaff"; ctx.lineWidth = 1.2; for (const radius of [5, 9, 12]) { ctx.beginPath(); ctx.arc(0, 0, radius, -1.15, 1.15); ctx.stroke(); }
    ctx.fillStyle = "#a8fbff"; polygon(ctx, [[0, -9], [4, -1], [1.5, 8], [-4, 1]]); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-6, 0); ctx.moveTo(6, 0); ctx.lineTo(12, 0); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "special-optical") {
    ctx.save(); setModuleGlow(ctx, "#9ee9ff", 9);
    ctx.strokeStyle = "#c9fbff"; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6.8, 0, 0, Math.PI * 2); ctx.stroke();
    const iris = ctx.createRadialGradient(-1, -1, 1, 0, 0, 5); iris.addColorStop(0, "#ffffff"); iris.addColorStop(.35, "#74f4ff"); iris.addColorStop(1, "#5267ff");
    ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(0, 0, 4.7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#eaffff"; ctx.stroke();
    ctx.strokeStyle = "#d3a8ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8, 9); ctx.lineTo(0, -1); ctx.lineTo(8, -9); ctx.stroke();
    ctx.globalAlpha = .55; ctx.strokeStyle = "#74f4ff"; ctx.beginPath(); ctx.ellipse(3, -2, 9, 5.4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "special-wingman") {
    ctx.save(); setModuleGlow(ctx, "#74f4ff", 8); ctx.strokeStyle = "#74f4ff"; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(-12, 9); ctx.lineTo(-7, 5); ctx.moveTo(12, 9); ctx.lineTo(7, 5); ctx.stroke(); ctx.setLineDash([]);
    drawFighter(ctx, 0, -1, 1.05, "#236b85", "#e8ffff"); drawFighter(ctx, -9, 5, .58, "#6a3f9d", "#d3a8ff"); drawFighter(ctx, 9, 5, .58, "#247e86", "#74f4ff");
    ctx.strokeStyle = "#d3a8ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 12, .35, 2.8); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "special-chainsaw") {
    ctx.save(); setModuleGlow(ctx, "#ff9f5a", 8); drawSawDisc(ctx, -7, 0, 7.3, "#ff9f5a", -.2); drawSawDisc(ctx, 7, 0, 7.3, "#74f4ff", .2);
    ctx.strokeStyle = "#fff0c4"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(0, -3); ctx.lineTo(3, -8); ctx.moveTo(-3, 8); ctx.lineTo(0, 3); ctx.lineTo(3, 8); ctx.stroke();
    ctx.fillStyle = "#f7ffff"; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (module?.id === "special-sonic") {
    ctx.save(); setModuleGlow(ctx, "#d48cff", 8); ctx.strokeStyle = "#c9a4ff"; ctx.lineWidth = 1;
    for (const y of [-8, 8]) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y); ctx.stroke(); }
    drawWave(ctx, "#f4d8ff", 5, 1.5); drawWave(ctx, "#72f4ff", 2.2, 2.5);
    ctx.fillStyle = "#d48cff"; ctx.beginPath(); ctx.arc(-8, -6, 1.7, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-6.6, -6, 1.2, 6); ctx.beginPath(); ctx.arc(8, 5, 1.7, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(9.4, 5, 1.2, 6);
    ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-2, -14); ctx.moveTo(5, 11); ctx.lineTo(8, 14); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "special-zero") {
    ctx.save(); setModuleGlow(ctx, "#a9f4ff", 9); ctx.strokeStyle = "#dffcff"; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i += 1) { const angle = i * Math.PI / 3; const x = Math.cos(angle) * 10; const y = Math.sin(angle) * 10; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke(); drawDiamond(ctx, x, y, 2.5, "#74dfff", "#eaffff"); }
    drawDiamond(ctx, 0, 0, 5, "#2f8bb5", "#efffff"); ctx.strokeStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(2, 2); ctx.moveTo(2, -2); ctx.lineTo(-2, 2); ctx.stroke(); ctx.restore();
  }
  else if (module?.id === "special-energy-aggregator") { ctx.strokeStyle = "#d9fff2"; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10); ctx.lineTo(Math.cos(angle + .44) * 4.5, Math.sin(angle + .44) * 4.5); ctx.stroke(); ctx.fillStyle = "#7effce"; ctx.beginPath(); ctx.arc(Math.cos(angle) * 10, Math.sin(angle) * 10, 2, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "#72f1c0"; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#f1fffb"; ctx.beginPath(); ctx.arc(-1, -1.2, 1.5, 0, Math.PI * 2); ctx.fill(); }
  else if (module?.id === "special-overclock") {
    ctx.save(); setModuleGlow(ctx, "#ffbd55", 10); ctx.strokeStyle = "#ffbd55"; ctx.lineWidth = 1.15;
    for (const [radius, start, end, color, width] of [[11.5, -.7, 1.8, "#ff7c3f", 1.2], [9.2, 1.95, 4.6, "#fff2bd", .85], [6.8, -.2, 2.1, "#ffbd55", 1.25]]) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(0, 0, radius, start, end); ctx.stroke(); }
    ctx.strokeStyle = "#ff8c45"; ctx.lineWidth = .8;
    for (let i = 0; i < 12; i += 1) { const angle = i * Math.PI * 2 / 12; const inner = i % 3 === 0 ? 8.8 : 9.8; const outer = 11.6; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); ctx.stroke(); }
    for (const angle of [-.55, .25, 1.05, 2.4, 3.2, 4.25]) { const x = Math.cos(angle) * 11.5; const y = Math.sin(angle) * 11.5; drawArrowHead(ctx, x, y, angle + Math.PI / 2, 3.2, "#ff7c3f"); }
    for (const angle of [.1, 1.65, 3.2, 4.75]) { const x = Math.cos(angle) * 7.8; const y = Math.sin(angle) * 7.8; ctx.fillStyle = "#ffe08b"; ctx.beginPath(); ctx.arc(x, y, 1.25, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff2bd"; ctx.lineWidth = .55; ctx.beginPath(); ctx.arc(x, y, 2.1, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "#7e2f1d"; ctx.beginPath(); ctx.arc(0, 0, 5.7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff2bd"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#ff7c3f"; ctx.beginPath(); ctx.arc(0, 0, 4.1, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#ffd86e"; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff9d5"; ctx.beginPath(); ctx.arc(-.8, -.9, 1.05, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  else if (module?.id === "special-polarity-reverse") {
    ctx.save(); setModuleGlow(ctx, "#d3a8ff", 8); ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#74e9ff"; ctx.beginPath(); ctx.arc(0, 0, 9, .35, Math.PI + .15); ctx.stroke();
    ctx.strokeStyle = "#ff78b8"; ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI + .35, Math.PI * 2 + .15); ctx.stroke();
    drawArrowHead(ctx, -9, 1, Math.PI, 4, "#74e9ff"); drawArrowHead(ctx, 9, -1, 0, 4, "#ff78b8");
    drawDiamond(ctx, -3.8, 0, 3.2, "#74e9ff", "#eaffff"); drawDiamond(ctx, 3.8, 0, 3.2, "#ff78b8", "#fff0f7");
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 5px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+", -3.8, .3); ctx.fillText("−", 3.8, .3); ctx.restore();
  }
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
