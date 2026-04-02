/**
 * Badge PNG Generator — uses canvas npm package
 * Generates store badges, condition badges, and price badges
 * Output: public/badges/
 */

import { createCanvas, CanvasRenderingContext2D } from "canvas";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "badges");
mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────

function save(canvas: ReturnType<typeof createCanvas>, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`);
  writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(`✅ ${name}.png`);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  outerR: number, innerR: number,
  points = 5
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ── 1. Store Star Badge (large, 320×320) ──────────────────────────────────
function makeStoreBadge(storeName: string, accentColor = "#F73A8A") {
  const SIZE = 320;
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;

  // Star fill
  drawStar(ctx, SIZE / 2, SIZE / 2, SIZE / 2 - 8, (SIZE / 2 - 8) * 0.44);
  const grad = ctx.createRadialGradient(SIZE / 2, SIZE / 2 - 20, 20, SIZE / 2, SIZE / 2, SIZE / 2);
  grad.addColorStop(0, "#FFE94D");
  grad.addColorStop(1, "#FFD700");
  ctx.fillStyle = grad;
  ctx.fill();

  // Star stroke
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();

  // Store name text
  const maxWidth = SIZE * 0.55;
  let fontSize = 52;
  ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  while (ctx.measureText(storeName).width > maxWidth && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
  }
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(storeName, SIZE / 2, SIZE / 2 + 2);

  save(canvas, `store-badge-${storeName.toLowerCase().replace(/\s+/g, "-")}`);
}

// ── 2. Condition Pill Badge ────────────────────────────────────────────────
function makeConditionBadge(condition: string, bg: string, fg = "#000") {
  const FONT_SIZE = 36;
  const PAD_X = 44;
  const PAD_Y = 20;
  const RADIUS = 60;

  const tmp = createCanvas(1, 1).getContext("2d");
  tmp.font = `700 ${FONT_SIZE}px Arial`;
  const textW = tmp.measureText(condition).width;

  const W = textW + PAD_X * 2;
  const H = FONT_SIZE + PAD_Y * 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  // Pill background
  roundRect(ctx, 2, 2, W - 4, H - 4, RADIUS);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  // Subtle inner gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(255,255,255,0.15)");
  grad.addColorStop(1, "rgba(0,0,0,0.05)");
  roundRect(ctx, 2, 2, W - 4, H - 4, RADIUS);
  ctx.fillStyle = grad;
  ctx.fill();

  // Text
  ctx.font = `700 ${FONT_SIZE}px Arial, sans-serif`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(condition, W / 2, H / 2 + 1);

  const slug = condition.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  save(canvas, `condition-${slug}`);
}

// ── 3. Price Badge ─────────────────────────────────────────────────────────
function makePriceBadge(price: string, accentColor = "#FFD700") {
  const LABEL_SIZE = 28;
  const PRICE_SIZE = 72;
  const PAD = 32;
  const W = 360;
  const H = 160;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Glassmorphism bg
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fill();

  roundRect(ctx, 0, 0, W, H, 24);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // "Only" label
  ctx.font = `400 ${LABEL_SIZE}px Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Only", W / 2, PAD + LABEL_SIZE);

  // Price
  ctx.font = `900 ${PRICE_SIZE}px Arial, sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = `${accentColor}88`;
  ctx.shadowBlur = 20;
  ctx.fillText(`$${price}`, W / 2, PAD + LABEL_SIZE + PRICE_SIZE);

  save(canvas, `price-${price.replace(".", "-")}`);
}

// ── 4. CTA Banner ─────────────────────────────────────────────────────────
function makeCTABadge(ctaText: string, storeName: string, accentColor = "#FFD700") {
  const W = 960;
  const H = 200;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#681FCB");
  grad.addColorStop(1, "#F73A8A");
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle border
  roundRect(ctx, 1, 1, W - 2, H - 2, 35);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Store name
  ctx.font = `900 52px Arial, sans-serif`;
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(storeName, W / 2, 74);

  // CTA text
  ctx.font = `700 38px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(ctaText, W / 2, 140);

  const slug = ctaText.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  save(canvas, `cta-${slug}`);
}

// ── 5. "LIVE ON EBAY" Urgency Banner ──────────────────────────────────────
function makeUrgencyBadge(text: string, color = "#FF4500") {
  const FONT_SIZE = 40;
  const PAD_X = 50;
  const PAD_Y = 22;

  const tmp = createCanvas(1, 1).getContext("2d");
  tmp.font = `900 ${FONT_SIZE}px Arial`;
  const textW = tmp.measureText(text).width;

  const W = textW + PAD_X * 2;
  const H = FONT_SIZE + PAD_Y * 2;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Pill with glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  roundRect(ctx, 2, 2, W - 4, H - 4, H / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = `900 ${FONT_SIZE}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 + 1);

  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  save(canvas, `urgency-${slug}`);
}

// ── Run all generators ─────────────────────────────────────────────────────
console.log(`\n🎨 Generating badges → public/badges/\n`);

// Store badges
makeStoreBadge("RenewFit", "#F73A8A");
makeStoreBadge("RenewFit", "#FFD700");

// Condition badges
makeConditionBadge("Pre-owned · Excellent", "#00C851", "#000");
makeConditionBadge("Pre-owned · Good",      "#FFD700", "#000");
makeConditionBadge("Pre-owned · Fair",      "#FF8C00", "#fff");
makeConditionBadge("New with Tags",          "#00BFFF", "#000");
makeConditionBadge("New without Tags",       "#40E0D0", "#000");

// Price badges
makePriceBadge("25.60", "#FFD700");
makePriceBadge("17.99", "#FFD700");
makePriceBadge("49.99", "#FF1493");
makePriceBadge("9.99",  "#00CED1");

// CTA banners
makeCTABadge("GRAB IT BEFORE IT'S GONE", "RenewFit", "#FFD700");
makeCTABadge("LINK IN BIO NOW 👇",        "RenewFit", "#FFD700");
makeCTABadge("STILL LIVE ON EBAY",        "RenewFit", "#FFD700");

// Urgency badges
makeUrgencyBadge("ONLY ONE LEFT",           "#FF4500");
makeUrgencyBadge("SELLING FAST",            "#FF1493");
makeUrgencyBadge("STILL LIVE ON EBAY",      "#7B68EE");
makeUrgencyBadge("GRAB IT BEFORE IT'S GONE","#FF4500");

console.log(`\n✅ All badges saved to public/badges/`);
console.log(`   Use in Remotion: <Img src={staticFile('badges/name.png')} />\n`);
