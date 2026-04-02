/**
 * Asset Builder — renders all transition MP4s + generates all PNG overlays/badges
 *
 * npm run build-assets
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { createCanvas } from "canvas";

const ROOT = process.cwd();
const OUT = (p: string) => path.join(ROOT, "public/assets", p);

mkdirSync(OUT("transitions/wipes"),   { recursive: true });
mkdirSync(OUT("transitions/flashes"), { recursive: true });
mkdirSync(OUT("transitions/glitch"),  { recursive: true });
mkdirSync(OUT("transitions/leaks"),   { recursive: true });
mkdirSync(OUT("transitions/overlays"),{ recursive: true });
mkdirSync(OUT("transitions/shapes"),  { recursive: true });
mkdirSync(OUT("badges"),              { recursive: true });
mkdirSync(OUT("overlays"),            { recursive: true });

// ── Helper to render one Remotion composition to MP4 ──────────────────────
function render(compositionId: string, outputPath: string) {
  console.log(`🎬 Rendering ${compositionId}...`);
  execSync(
    `npx remotion render src/index.ts ${compositionId} --output=${outputPath} --codec=h264`,
    { stdio: "pipe" }
  );
  console.log(`   ✅ ${path.basename(outputPath)}`);
}

// ── PHASE 1: Render all transition MP4s ───────────────────────────────────
console.log("\n═══ PHASE 1: Transition MP4s ═══\n");

// Wipes
render("WipeLeft",     OUT("transitions/wipes/wipe-left.mp4"));
render("WipeRight",    OUT("transitions/wipes/wipe-right.mp4"));
render("WipeUp",       OUT("transitions/wipes/wipe-up.mp4"));
render("WipeDiagonal", OUT("transitions/wipes/wipe-diagonal.mp4"));

// Flashes
render("WhiteFlash", OUT("transitions/flashes/white-flash.mp4"));
render("BlackFlash", OUT("transitions/flashes/black-flash.mp4"));
render("ColorFlash", OUT("transitions/flashes/color-flash.mp4"));

// Glitch
render("Glitch01", OUT("transitions/glitch/glitch-01.mp4"));
render("Glitch02", OUT("transitions/glitch/glitch-02.mp4"));
render("Glitch03", OUT("transitions/glitch/glitch-03.mp4"));

// Light leaks
render("LeakOrange", OUT("transitions/leaks/leak-orange.mp4"));
render("LeakWhite",  OUT("transitions/leaks/leak-white.mp4"));
render("LeakGold",   OUT("transitions/leaks/leak-gold.mp4"));
render("LeakPink",   OUT("transitions/leaks/leak-pink.mp4"));

// Overlays
render("GrainOverlay",     OUT("transitions/overlays/grain-overlay.mp4"));
render("ScanlinesOverlay", OUT("transitions/overlays/scanlines.mp4"));
render("VHSStatic",        OUT("transitions/overlays/vhs-static.mp4"));

// Shape reveals
render("CircleReveal", OUT("transitions/shapes/circle-reveal.mp4"));
render("SlashReveal",  OUT("transitions/shapes/slash-reveal.mp4"));
render("InkReveal",    OUT("transitions/shapes/ink-reveal.mp4"));

// ── PHASE 2: Generate PNG overlays via canvas ─────────────────────────────
console.log("\n═══ PHASE 2: PNG Overlays ═══\n");

function savePng(canvas: ReturnType<typeof createCanvas>, name: string) {
  writeFileSync(OUT(name), canvas.toBuffer("image/png") as unknown as NodeJS.ArrayBufferView);
  console.log(`   ✅ ${path.basename(name)}`);
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
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

// Film grain overlay (tileable noise texture)
(function makeFilmGrain() {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(W, H);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imageData.data[i] = v;
    imageData.data[i+1] = v;
    imageData.data[i+2] = v;
    imageData.data[i+3] = Math.floor(Math.random() * 30 + 5);
  }
  ctx.putImageData(imageData, 0, 0);
  savePng(canvas, "overlays/film-grain.png");
})();

// Vignette overlay
(function makeVignette() {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.8);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.6, "rgba(0,0,0,0.1)");
  grad.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  savePng(canvas, "overlays/vignette.png");
})();

// Light leak PNGs (3 variants)
function makeLightLeak(name: string, color: string, angle: number) {
  const W = 1080, H = 1920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(W * 0.3, 0);
  ctx.rotate((angle * Math.PI) / 180);
  const grad = ctx.createLinearGradient(-W, 0, W * 1.5, H);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.3, `${color}00`);
  grad.addColorStop(0.5, `${color}aa`);
  grad.addColorStop(0.7, `${color}33`);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.restore();
  savePng(canvas, `overlays/${name}.png`);
}
makeLightLeak("light-leak-1", "#FF6B00", 15);
makeLightLeak("light-leak-2", "#FFD700", -10);
makeLightLeak("light-leak-3", "#FF1493", 25);

// ── PHASE 3: Generate badge PNGs ──────────────────────────────────────────
console.log("\n═══ PHASE 3: Badge PNGs ═══\n");

function makePill(text: string, bg: string, fg: string, name: string, icon?: string) {
  const FONT = 36;
  const PAD_X = 44, PAD_Y = 18;
  const tmp = createCanvas(1,1).getContext("2d");
  tmp.font = `700 ${FONT}px Arial`;
  const fullText = icon ? `${icon} ${text}` : text;
  const tw = tmp.measureText(fullText).width;
  const W = tw + PAD_X * 2, H = FONT + PAD_Y * 2;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  roundRect(ctx, 2, 2, W-4, H-4, H/2);
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `700 ${FONT}px Arial, sans-serif`;
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(fullText, W/2, H/2 + 1);
  savePng(canvas, `badges/${name}.png`);
}

makePill("VERIFIED SELLER", "#0064D2", "#fff", "verified-badge", "✓");
makePill("SALE", "#FF4500", "#fff", "sale-sticker", "🔥");
makePill("NEW ARRIVAL", "#00C851", "#000", "new-arrival", "✨");
makePill("HOT DEAL", "#FF1493", "#fff", "hot-deal", "🔥");
makePill("LAST ONE", "#FFD700", "#000", "last-one", "⚡");

console.log("\n✅ All assets built!\n");
console.log("📁 public/assets/transitions/  — MP4 transitions");
console.log("📁 public/assets/overlays/      — PNG overlays");
console.log("📁 public/assets/badges/        — PNG badges");
console.log("\nUse in Remotion:");
console.log('  <Video src={staticFile("assets/transitions/wipes/wipe-left.mp4")} />');
console.log('  <Img   src={staticFile("assets/overlays/film-grain.png")} />');
console.log('  <Img   src={staticFile("assets/badges/sale-sticker.png")} />');
