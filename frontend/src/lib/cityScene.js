// Procedural "city turns green" scene. Static layers are pre-rendered once (preload);
// each frame only composites them and draws progress-dependent elements.

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function layer(w, h, dpr, draw) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  draw(ctx);
  return c;
}

export function buildScene(w, h, dpr) {
  const r = rng(42);
  const ground = h * 0.8;
  const back = [];
  for (let x = -20; x < w + 20; ) {
    const bw = 26 + r() * 54;
    back.push({ x, w: bw, h: h * (0.16 + r() * 0.26) });
    x += bw + 2;
  }
  const front = [];
  for (let x = -10; x < w + 10; ) {
    const bw = 46 + r() * 74;
    front.push({ x, w: bw, h: h * (0.12 + r() * 0.3), solarAt: 0.42 + r() * 0.26, tone: r() });
    x += bw + 6 + r() * 14;
  }
  const cars = Array.from({ length: 10 }, (_, i) => ({
    offset: i / 10 + r() * 0.04, lane: i % 2, evAt: 0.16 + (i / 10) * 0.22, speed: 0.7 + r() * 0.5, len: 38 + r() * 12,
  }));
  const nTrees = Math.max(10, Math.round(w / 70));
  const trees = Array.from({ length: nTrees }, (_, i) => ({
    x: ((i + 0.5) / nTrees) * w + (r() - 0.5) * 24, growAt: 0.62 + r() * 0.2, s: 0.75 + r() * 0.5,
  }));
  const papers = Array.from({ length: 16 }, () => ({ x: r() * w, y: r() * ground * 0.7, rot: r() * 6, sp: 0.4 + r() }));
  const turbines = [
    { x: w * 0.08, s: 1.9 }, { x: w * 0.2, s: 1.4 }, { x: w * 0.74, s: 1.6 }, { x: w * 0.9, s: 1.2 },
  ];

  const backLayer = layer(w, h, dpr, (ctx) => {
    ctx.fillStyle = "#2B3A31";
    back.forEach((b) => ctx.fillRect(b.x, ground - b.h, b.w, b.h));
  });
  const frontLayer = layer(w, h, dpr, (ctx) => {
    front.forEach((b) => {
      ctx.fillStyle = b.tone > 0.5 ? "#16271D" : "#1B2F23";
      ctx.fillRect(b.x, ground - b.h, b.w, b.h);
      ctx.fillStyle = "rgba(245,226,160,0.55)";
      for (let wy = ground - b.h + 12; wy < ground - 14; wy += 16) {
        for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 13) {
          if (r() < 0.42) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    });
  });
  return { w, h, ground, front, cars, trees, papers, turbines, backLayer, frontLayer };
}

function drawTurbine(ctx, x, base, s, angle, alpha, rise) {
  const towerH = 120 * s;
  const top = base - towerH * rise;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#F5F0E6";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, top);
  ctx.stroke();
  ctx.lineWidth = 2.4 * s;
  for (let i = 0; i < 3; i++) {
    const a = angle + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + Math.cos(a) * 46 * s, top + Math.sin(a) * 46 * s);
    ctx.stroke();
  }
  ctx.fillStyle = "#C8F169";
  ctx.beginPath();
  ctx.arc(x, top, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCar(ctx, x, y, len, ev, dir, puff) {
  ctx.fillStyle = ev ? "#C8F169" : "#7A746B";
  ctx.beginPath();
  ctx.roundRect(x, y - 14, len, 14, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + len * 0.22, y - 24, len * 0.5, 11, 5);
  ctx.fill();
  ctx.fillStyle = "#0B1F14";
  [x + len * 0.22, x + len * 0.78].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  if (ev) {
    ctx.fillStyle = "rgba(200,241,105,0.25)";
    ctx.fillRect(x - 4, y + 5, len + 8, 3);
  } else {
    const tail = dir > 0 ? x - 6 : x + len + 6;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = `rgba(150,140,125,${0.45 - i * 0.12})`;
      ctx.beginPath();
      ctx.arc(tail - dir * (i * 9 + puff * 6), y - 6 - i * 4, 4 + i * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawScene(ctx, s, p) {
  const { w, h, ground } = s;
  const clean = ease(seg(p, 0.05, 0.9));

  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, mix("#4A4239", "#9FD3B5", clean));
  sky.addColorStop(1, mix("#9C8A70", "#F5F0E6", clean));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunY = ground + 40 - (ground - h * 0.18) * ease(seg(p, 0, 0.75));
  const glow = ctx.createRadialGradient(w * 0.62, sunY, 10, w * 0.62, sunY, 220);
  glow.addColorStop(0, mix("#E0A060", "#FFF3B0", clean));
  glow.addColorStop(1, "rgba(255,243,176,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = mix("#E0A060", "#FFE98A", clean);
  ctx.beginPath();
  ctx.arc(w * 0.62, sunY, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = mix("#5D564A", "#3E7A52", clean);
  ctx.beginPath();
  ctx.moveTo(0, ground);
  for (let x = 0; x <= w; x += 20) ctx.lineTo(x, ground - h * 0.2 - Math.sin(x / 170) * 34 - Math.cos(x / 90) * 12);
  ctx.lineTo(w, ground);
  ctx.fill();

  const tA = seg(p, 0.7, 0.88);
  s.turbines.forEach((t) => drawTurbine(ctx, t.x, ground - h * 0.16, t.s, p * Math.PI * 14, tA, ease(tA)));

  ctx.drawImage(s.backLayer, 0, 0, w, h);
  ctx.drawImage(s.frontLayer, 0, 0, w, h);

  s.front.forEach((b) => {
    const k = ease(seg(p, b.solarAt, b.solarAt + 0.08));
    if (!k) return;
    const pw = b.w * 0.74 * k;
    const px = b.x + (b.w - b.w * 0.74) / 2;
    const top = ground - b.h;
    ctx.fillStyle = "#1E4E79";
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px + 6, top - 10);
    ctx.lineTo(px + pw + 6, top - 10);
    ctx.lineTo(px + pw, top);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,241,105,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, top - 5);
    ctx.lineTo(px + pw + 3, top - 5);
    ctx.stroke();
  });

  const paperA = 1 - seg(p, 0.82, 0.95);
  if (paperA > 0) {
    s.papers.forEach((pp) => {
      ctx.save();
      ctx.globalAlpha = paperA * 0.85;
      ctx.translate(pp.x, (pp.y + p * 260 * pp.sp) % ground);
      ctx.rotate(pp.rot + p * 6);
      ctx.fillStyle = "#EDE6D6";
      ctx.fillRect(-6, -8, 12, 16);
      ctx.restore();
    });
  }

  const smog = 0.5 * (1 - seg(p, 0, 0.62));
  if (smog > 0) {
    ctx.fillStyle = `rgba(118,102,80,${smog})`;
    ctx.fillRect(0, 0, w, ground);
  }

  ctx.fillStyle = mix("#2A2724", "#1F3328", clean);
  ctx.fillRect(0, ground, w, h - ground);
  ctx.fillStyle = mix("#4A443C", "#C9BFA8", clean);
  ctx.fillRect(0, ground, w, 6);
  ctx.fillStyle = "rgba(245,240,230,0.35)";
  const laneY = ground + (h - ground) * 0.5;
  for (let x = -((p * 900) % 60); x < w; x += 60) ctx.fillRect(x, laneY, 28, 3);

  s.trees.forEach((t) => {
    const g = ease(seg(p, t.growAt, t.growAt + 0.12));
    if (!g) return;
    const r = 15 * t.s * g;
    ctx.fillStyle = "#3B2A1C";
    ctx.fillRect(t.x - 2, ground - 4 - 18 * t.s * g, 4, 18 * t.s * g + 4);
    ctx.fillStyle = mix("#2F6B47", "#7FBF5A", t.s - 0.75);
    ctx.beginPath();
    ctx.arc(t.x, ground - 18 * t.s * g - r * 0.6, r, 0, Math.PI * 2);
    ctx.fill();
  });

  s.cars.forEach((c) => {
    const dir = c.lane ? -1 : 1;
    const span = w + 240;
    let pos = ((c.offset + p * c.speed * 1.4) % 1) * span - 120;
    if (dir < 0) pos = w - pos;
    const y = c.lane ? ground + (h - ground) * 0.78 : ground + (h - ground) * 0.36;
    drawCar(ctx, pos, y, c.len, p > c.evAt, dir, (p * 40) % 1);
  });
}
