/**
 * PROMPT 1 — The Viral Hook Machine (v7)
 * Single video per listing — all randomness confirmed in console output.
 * Rules: CLAUDE.md + animations.md + audio.md + images.md + sequencing.md
 *        + light-leaks.md + fonts.md + transitions.md
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import { LightLeak } from "@remotion/light-leaks";
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { TemplateProps } from "../shared/types";

// ── Fonts ─────────────────────────────────────────────────────────────────
const { fontFamily: bebas } = loadBebasNeue();
const { fontFamily: inter } = loadInter("normal", { weights: ["400","600","700"], subsets: ["latin"] });
const { fontFamily: oswald } = loadOswald("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: montserrat } = loadMontserrat("normal", { weights: ["800","900"], subsets: ["latin"] });

// ── Font pool — randomised per product ────────────────────────────────────
const FONT_POOL = [bebas, oswald, montserrat, bebas, bebas]; // bebas weighted higher for readability
export function pickFont(title: string): string {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 7;
  return FONT_POOL[seed % FONT_POOL.length];
}

// ── Scene constants ───────────────────────────────────────────────────────
const SAFE_TOP = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES = 60;
const FRAMES_PER_IMAGE = 70;   // slightly faster gallery for earlier price
const HOOK_END = 40;
const PRICE_FRAMES = 70;       // bit longer to enjoy price reveal
const DETAILS_FRAMES = 45;
const CTA_FRAMES = 120;        // 4 seconds

// ── 20 upbeat music tracks (CC0 — effacestudios) ──────────────────────────
export const MUSIC_TRACKS = [
  "party-time.mp3", "happy-life.mp3", "gamer-guy.mp3", "sports-spirit.mp3",
  "the-champion.mp3", "dubstepper.mp3", "technologist.mp3", "fury.mp3",
  "commercial.mp3", "breaker.mp3", "starter.mp3", "newness.mp3",
  "beeper.mp3", "bubbles.mp3", "outsider.mp3", "planning.mp3",
  "my-inventions.mp3", "worship-me.mp3", "yo-vender-music.mp3", "sudden-tour.mp3",
];
export function pickMusic(title: string): string {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 13;
  return MUSIC_TRACKS[seed % MUSIC_TRACKS.length];
}

// ── All hooks (single pool — one video, full variety) ─────────────────────
const ALL_HOOKS = [
  // Curiosity
  "HOW IS THIS STILL HERE", "POV: YOU FOUND THIS", "WAIT BEFORE YOU SCROLL",
  "YOU NEED TO SEE THIS", "THIS SHOULDN'T EXIST",
  // Value
  "THIS PRICE IS A MISTAKE", "THEY PRICED THIS WRONG", "STEAL OF THE DAY",
  "I CAN'T BELIEVE THIS DEAL", "HALF THE RETAIL PRICE",
  // Scarcity
  "LAST ONE IN STOCK", "THIS WON'T LAST LONG", "GONE IN 24 HOURS",
  "SOMEONE WILL GRAB THIS", "DON'T SLEEP ON THIS",
];
export function pickHook(title: string): { text: string; trigger: string } {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 3;
  const text = ALL_HOOKS[seed % ALL_HOOKS.length];
  const trigger = seed % 3 === 0 ? "Curiosity" : seed % 3 === 1 ? "Value" : "Scarcity";
  return { text, trigger };
}

/** Clean eBay title — strip pipe-delimited junk, smart 2-line wrap */
function cleanTitle(raw: string): string {
  const clean = raw.split("|")[0].trim();
  const words = clean.split(" ");
  if (words.length <= 5) return clean;
  const mid = Math.ceil(words.length / 2);
  return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
}

// ── Transition pool — randomised per image index ──────────────────────────
const TRANSITION_LABELS = ["slide-right", "wipe-left", "flip-bottom", "clock-wipe", "slide-left", "fade"];
export function pickTransitionLabel(title: string, imageIndex: number): string {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return TRANSITION_LABELS[(seed + imageIndex * 7) % TRANSITION_LABELS.length];
}

// ── Star Store Badge — large, readable ────────────────────────────────────
const StarBadge: React.FC<{ storeName: string; size?: number; animate?: boolean }> = ({
  storeName, size = 160, animate = false,
}) => {
  const frame = useCurrentFrame();
  const pulse = animate ? 1 + Math.sin(frame * 0.1) * 0.04 : 1;

  // Font size adapts: short names get big text, long names get smaller
  const chars = storeName.length;
  const fontSize = chars <= 5 ? 36 : chars <= 8 ? 30 : chars <= 11 ? 24 : chars <= 14 ? 20 : 16;

  // 5-pointed star (centered in viewBox)
  const cx = 50, cy = 50, outer = 47, inner = 21;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }

  return (
    <div style={{ display: "inline-flex", transform: `scale(${pulse})` }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Drop shadow effect */}
        <polygon points={points.join(" ")} fill="rgba(0,0,0,0.4)" transform="translate(2,3)" />
        {/* Star fill */}
        <polygon points={points.join(" ")} fill="#FFE500" stroke="#F73A8A" strokeWidth={2.5} />
        {/* Store name text */}
        <text
          x="50" y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000"
          fontSize={fontSize}
          fontWeight="900"
          fontFamily="Inter, sans-serif"
          style={{ letterSpacing: -0.5 } as React.CSSProperties}
        >
          {storeName.length > 14 ? storeName.slice(0, 13) + "…" : storeName}
        </text>
      </svg>
    </div>
  );
};

// ── Full-frame gallery image with Ken Burns ───────────────────────────────
const GalleryImage: React.FC<{ src: string; index: number }> = ({ src, index }) => {
  const frame = useCurrentFrame();
  const even = index % 2 === 0;
  const scale = interpolate(frame, [0, 90], even ? [1.1, 1.0] : [1.0, 1.1], { extrapolateRight: "clamp" });
  const panX = interpolate(frame, [0, 90], even ? [-15, 0] : [15, 0], { extrapolateRight: "clamp" });
  const panY = interpolate(frame, [0, 90], index % 3 === 0 ? [-10, 0] : [10, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 8, FRAMES_PER_IMAGE - 10, FRAMES_PER_IMAGE], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)` }} />
    </AbsoluteFill>
  );
};

// ── Price Reveal Scene ────────────────────────────────────────────────────
const PriceRevealScene: React.FC<{
  lastImage: string; price: string; currency: string;
  condition: string; brandColor: string; titleFont: string;
}> = ({ lastImage, price, currency, condition, brandColor, titleFont }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const priceNum = parseFloat(price);
  const priceSpring = spring({ frame, fps, config: { damping: 80 } });
  const displayPrice = interpolate(priceSpring, [0, 1], [0, priceNum]);
  const cardScale = spring({ frame, fps, from: 0.5, to: 1, durationInFrames: 18, config: { stiffness: 200, damping: 14 } });
  const condY = spring({ frame: Math.max(0, frame - 18), fps, from: 120, to: 0, durationInFrames: 22, config: { damping: 14, stiffness: 180 } });

  return (
    <AbsoluteFill>
      <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
      {/* Particles */}
      <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%,-50%)" }}>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const dist = interpolate(frame, [5, 40], [0, 220], { extrapolateRight: "clamp" });
          const op = interpolate(frame, [5, 22, 50], [0, 1, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              position: "absolute", width: 10, height: 10, borderRadius: "50%",
              background: brandColor, opacity: op,
              transform: `translate(${Math.cos(angle) * dist - 5}px, ${Math.sin(angle) * dist - 5}px)`,
            }} />
          );
        })}
      </div>
      {/* Price card */}
      <div style={{ position: "absolute", top: "48%", left: SAFE_SIDES, right: SAFE_SIDES, transform: `translateY(-50%) scale(${cardScale})`, textAlign: "center" }}>
        <div style={{ fontFamily: inter, fontSize: 34, fontWeight: 400, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Only</div>
        <div style={{ fontFamily: titleFont, fontSize: 116, color: "#00FF88", lineHeight: 1, textShadow: "0 0 60px rgba(0,255,136,0.7)", fontVariantNumeric: "tabular-nums" }}>
          {currency === "USD" ? "$" : currency}{displayPrice.toFixed(2)}
        </div>
      </div>
      {/* Condition badge */}
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM + 20, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `translateY(${condY}px)` }}>
        <div style={{ backgroundColor: "#4ade80", color: "#000", borderRadius: 100, padding: "12px 32px", fontFamily: inter, fontSize: 32, fontWeight: 600 }}>
          {condition}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Details Scene ─────────────────────────────────────────────────────────
const DetailsScene: React.FC<{
  lastImage: string;
  badges: Array<{ label: string; bg: string; color: string }>;
}> = ({ lastImage, badges }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "absolute", top: "50%", left: SAFE_SIDES, right: SAFE_SIDES, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20 }}>
        {badges.map((badge, i) => {
          const x = spring({ frame: Math.max(0, frame - i * 12), fps, from: 300, to: 0, durationInFrames: 25, config: { damping: 14, stiffness: 180 } });
          return (
            <div key={i} style={{ backgroundColor: badge.bg, color: badge.color, borderRadius: 100, padding: "14px 36px", fontFamily: inter, fontSize: 32, fontWeight: 600, transform: `translateX(${x}px)`, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
              {badge.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Urgency CTA copy pool ─────────────────────────────────────────────────
const CTA_URGENCY_POOL = [
  "GRAB IT BEFORE IT'S GONE",
  "ONLY ONE AVAILABLE",
  "STILL LIVE ON EBAY",
  "DON'T MISS THIS",
  "SELLING FAST — SHOP NOW",
  "LIVE ON EBAY NOW",
  "LAST CHANCE — LINK IN BIO",
  "SELLING OUT FAST",
];
export function pickUrgencyCTA(title: string): string {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 17;
  return CTA_URGENCY_POOL[seed % CTA_URGENCY_POOL.length];
}

// ── CTA Scene (v2 — FAIL-SAFE, 4s, high-impact) ───────────────────────────
// MANDATORY last scene. Store name = largest text in entire video.
// Text within 9 frames (300ms). Flash-cut transition in. Urgency copy only.
const CTAScene: React.FC<{
  lastImage: string; storeName: string; brandColor: string;
  titleFont: string; categoryName?: string; urgencyCTA: string;
}> = ({ lastImage, storeName, brandColor, titleFont, categoryName, urgencyCTA }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Flash cut transition IN (frames 0-4): white flash enters CTA ──────
  const flashOpacity = interpolate(frame, [0, 3, 8], [1, 0.6, 0], { extrapolateRight: "clamp" });

  // ── Background zoom: 1.08→1.0 over entire CTA (subtle Ken Burns) ──────
  const bgScale = interpolate(frame, [0, CTA_FRAMES], [1.08, 1.0], { extrapolateRight: "clamp" });

  // ── Pulsing border ────────────────────────────────────────────────────
  const borderOpacity = Math.sin(frame * 0.12) * 0.5 + 0.5;

  // ── STORE NAME: appears within 9 frames (300ms), pops 1.0→1.1→1.0 ───
  // Must be LARGEST text in entire video — 120px
  const storeNameScale = spring({ frame, fps, from: 0.3, to: 1, durationInFrames: 9, config: { stiffness: 400, damping: 18 } });
  const storeNamePop = interpolate(frame, [0, 9, 25, CTA_FRAMES], [0, 1.1, 1.0, 1.0], { extrapolateRight: "clamp" });
  const storeNameOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });

  // ── Urgency CTA: slams in at frame 18 ────────────────────────────────
  const urgencyScale = spring({ frame: Math.max(0, frame - 18), fps, from: 2.0, to: 1, durationInFrames: 12, config: { stiffness: 350, damping: 14 } });
  const urgencyOpacity = interpolate(frame, [18, 28], [0, 1], { extrapolateRight: "clamp" });
  // Urgency text pulses to reinforce FOMO
  const urgencyPulse = 1 + Math.sin(frame * 0.18) * 0.04;

  // ── "on eBay" sub-line at frame 35 ───────────────────────────────────
  const subLineOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });
  const subLineY = interpolate(frame, [35, 50], [20, 0], { extrapolateRight: "clamp" });

  // ── Bouncing arrow ────────────────────────────────────────────────────
  const arrowOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" });
  const arrowY = interpolate(frame % 28, [0, 14, 28], [0, -20, 0], { extrapolateRight: "clamp" });

  // ── Star badge with category ──────────────────────────────────────────
  const starScale2 = spring({ frame: Math.max(0, frame - 40), fps, from: 0, to: 1, durationInFrames: 18, config: { stiffness: 200, damping: 12 } });
  const categoryDisplay = categoryName ? categoryName.split(" > ").pop() || categoryName : null;

  // ── Seamless loop fade (last 12 frames → black = matches hook frame 0) ─
  const loopFade = interpolate(frame, [CTA_FRAMES - 12, CTA_FRAMES], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: loopFade }}>
      {/* Background product image — slow Ken Burns zoom */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, overflow: "hidden" }}>
        <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Heavy dark overlay for contrast — rgba ≥ 0.75 */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.78)" }} />
      {/* Radial highlight in center */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 45%, ${brandColor}25 0%, transparent 65%)` }} />

      {/* Pulsing brand border — 4px */}
      <div style={{ position: "absolute", inset: 0, border: `4px solid ${brandColor}`, opacity: borderOpacity, pointerEvents: "none" }} />
      {/* Corner accents */}
      {[
        { top: 6, left: 6, borderTop: `4px solid ${brandColor}`, borderLeft: `4px solid ${brandColor}` },
        { top: 6, right: 6, borderTop: `4px solid ${brandColor}`, borderRight: `4px solid ${brandColor}` },
        { bottom: 6, left: 6, borderBottom: `4px solid ${brandColor}`, borderLeft: `4px solid ${brandColor}` },
        { bottom: 6, right: 6, borderBottom: `4px solid ${brandColor}`, borderRight: `4px solid ${brandColor}` },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 60, height: 60, opacity: borderOpacity, ...s }} />
      ))}

      {/* ── FLASH CUT overlay (frames 0-8) ── */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#fff", opacity: flashOpacity, pointerEvents: "none" }} />

      {/* ── STAR BADGE (top-left, category below) ── */}
      <div style={{ position: "absolute", top: SAFE_TOP - 20, left: SAFE_SIDES - 15, transform: `scale(${starScale2})`, transformOrigin: "top left" }}>
        <StarBadge storeName={storeName} size={160} animate />
        {categoryDisplay && (
          <div style={{ marginTop: 6, marginLeft: 8, fontFamily: inter, fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.7)", maxWidth: 160 }}>
            {categoryDisplay}
          </div>
        )}
      </div>

      {/* ══ PRIMARY CTA BLOCK (vertically centered) ══════════════════════ */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: SAFE_SIDES, right: SAFE_SIDES,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12,
      }}>

        {/* STORE NAME — LARGEST TEXT in entire video (120px)
            Appears within 300ms (9 frames). Scale pop 1.0→1.1→1.0 */}
        <div style={{
          fontFamily: titleFont,
          fontSize: 120,
          fontWeight: 900,
          color: "#FFE500",
          letterSpacing: 3,
          textAlign: "center",
          lineHeight: 1,
          textShadow: `0 0 60px ${brandColor}, 0 0 30px ${brandColor}80, 0 4px 20px rgba(0,0,0,0.9)`,
          transform: `scale(${Math.min(storeNameScale, storeNamePop)})`,
          opacity: storeNameOpacity,
        }}>
          {storeName}
        </div>

        {/* URGENCY CTA — slams in at frame 18, pulses */}
        <div style={{
          fontFamily: bebas,
          fontSize: 60,
          color: "#fff",
          letterSpacing: 4,
          textAlign: "center",
          textShadow: "0 2px 16px rgba(0,0,0,0.95)",
          transform: `scale(${Math.min(urgencyScale, urgencyPulse)})`,
          opacity: urgencyOpacity,
        }}>
          {urgencyCTA}
        </div>

        {/* "on eBay" sub-line */}
        <div style={{
          fontFamily: inter,
          fontSize: 36,
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
          letterSpacing: 3,
          textTransform: "uppercase",
          textAlign: "center",
          opacity: subLineOpacity,
          transform: `translateY(${subLineY}px)`,
        }}>
          on eBay · Link in Bio
        </div>
      </div>

      {/* Bouncing arrow — safe zone bottom */}
      <div style={{
        position: "absolute", bottom: SAFE_BOTTOM + 10, left: 0, right: 0, textAlign: "center",
        fontSize: 60, transform: `translateY(${arrowY}px)`, opacity: arrowOpacity,
      }}>
        👇
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ───────────────────────────────────────────────────────
export const ViralHookMachine: React.FC<TemplateProps & { categoryName?: string }> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, additionalImages = [], condition, storeColor, categoryName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = storeColor || "#F73A8A";
  const allImages = [imageUrl, ...additionalImages].filter(Boolean);
  const imageCount = allImages.length;
  const lastImage = allImages[imageCount - 1];

  // ── Randomness selections (deterministic per title) ──
  const musicFile = pickMusic(title);
  const { text: hookText, trigger: hookTrigger } = pickHook(title);
  const titleFont = pickFont(title);
  const urgencyCTA = pickUrgencyCTA(title);
  const displayTitle = cleanTitle(title);

  // Scene markers — faster gallery so price comes sooner
  const GALLERY_START = HOOK_END;
  const GALLERY_END = GALLERY_START + imageCount * FRAMES_PER_IMAGE;
  const PRICE_START = GALLERY_END;
  const DETAILS_START = PRICE_START + PRICE_FRAMES;
  const CTA_START = DETAILS_START + DETAILS_FRAMES;

  const activeImg = Math.min(Math.floor(Math.max(0, frame - GALLERY_START) / FRAMES_PER_IMAGE), imageCount - 1);
  const hookScale = spring({ frame, fps, from: 4.0, to: 1.0, durationInFrames: HOOK_END, config: { damping: 10, stiffness: 200 } });
  const shakeX = frame >= PRICE_START && frame <= PRICE_START + 15
    ? Math.sin(frame * 2.8) * interpolate(frame, [PRICE_START, PRICE_START + 15], [6, 0])
    : 0;

  const badges = [
    { label: condition, bg: "#4ade80", color: "#000" },
    { label: storeName, bg: "#681FCB", color: "#fff" },
    { label: `${currency === "USD" ? "$" : currency}${price}`, bg: "#FFE500", color: "#000" },
  ];

  // ── Log randomness for this render ──
  React.useEffect(() => {
    if (frame === 0) {
      console.log(`\n🎲 Randomness for "${title.slice(0, 45)}":`);
      console.log(`   🪝 Hook [${hookTrigger}]: "${hookText}"`);
      console.log(`   📣 CTA: "${urgencyCTA}"`);
      console.log(`   🎵 Music: ${musicFile}`);
      console.log(`   🔤 Font: ${titleFont === bebas ? "Bebas Neue" : titleFont === oswald ? "Oswald" : "Montserrat"}`);
      console.log(`   🖼️  Transitions: ${allImages.map((_, i) => pickTransitionLabel(title, i)).join(" → ")}\n`);
    }
  }, [frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: inter, transform: `translateX(${shakeX}px)`, overflow: "hidden" }}>

      {/* ── AUDIO: random upbeat track ─── */}
      <Audio src={staticFile(`music/${musicFile}`)} volume={0.65} trimBefore={300} loop />

      {/* ════ SCENE 1 — HOOK: isolated black frame ════ */}
      <Sequence from={0} durationInFrames={HOOK_END} premountFor={5}>
        <AbsoluteFill style={{ backgroundColor: "#000000" }}>
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${brandColor}35 0%, transparent 70%)`, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
          <div style={{ position: "absolute", top: "50%", left: SAFE_SIDES, right: SAFE_SIDES, transform: `translateY(-50%) scale(${hookScale})`, textAlign: "center", fontFamily: titleFont, fontSize: 120, letterSpacing: 4, color: "#fff", lineHeight: 1.0 }}>
            {hookText}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════ SCENE 2 — GALLERY ════ */}
      {allImages.map((imgUrl, index) => (
        <Sequence key={index} from={GALLERY_START + index * FRAMES_PER_IMAGE} durationInFrames={FRAMES_PER_IMAGE + 12} premountFor={15}>
          <GalleryImage src={imgUrl} index={index} />
        </Sequence>
      ))}

      {/* Light leaks at transitions */}
      {allImages.slice(1).map((_, index) => (
        <Sequence key={`leak-${index}`} from={GALLERY_START + (index + 1) * FRAMES_PER_IMAGE - 8} durationInFrames={18} premountFor={5}>
          <AbsoluteFill><LightLeak durationInFrames={18} seed={index + 1} hueShift={index * 60} /></AbsoluteFill>
        </Sequence>
      ))}

      {/* Gallery UI overlay */}
      {frame >= GALLERY_START && frame < GALLERY_END && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.65) 100%)" }} />

          {/* Large star badge top-left */}
          <div style={{ position: "absolute", top: SAFE_TOP - 20, left: SAFE_SIDES - 15, opacity: 0.95 }}>
            <StarBadge storeName={storeName} size={160} />
          </div>

          {/* Cleaned title — 2 lines, no truncation */}
          <div style={{
            position: "absolute", bottom: SAFE_BOTTOM + 80, left: SAFE_SIDES, right: SAFE_SIDES,
            fontFamily: inter, fontSize: 40, fontWeight: 700, color: "#fff",
            lineHeight: 1.3, whiteSpace: "pre-line",
            textShadow: "1px 1px 8px rgba(0,0,0,0.98), 0 0 20px rgba(0,0,0,0.8)",
            opacity: interpolate(frame, [GALLERY_START + 20, GALLERY_START + 38], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            {displayTitle}
          </div>

          {/* Progress dots */}
          <div style={{ position: "absolute", bottom: 140, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
            {allImages.map((_, i) => (
              <div key={i} style={{ width: i === activeImg ? 28 : 10, height: 10, borderRadius: 5, backgroundColor: "#fff", opacity: i === activeImg ? 1 : 0.35 }} />
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ════ SCENE 3 — PRICE REVEAL ════ */}
      <Sequence from={PRICE_START} durationInFrames={PRICE_FRAMES} premountFor={10}>
        <PriceRevealScene lastImage={lastImage} price={price} currency={currency} condition={condition} brandColor={brandColor} titleFont={titleFont} />
      </Sequence>

      {/* ════ SCENE 4 — DETAILS ════ */}
      <Sequence from={DETAILS_START} durationInFrames={DETAILS_FRAMES} premountFor={10}>
        <DetailsScene lastImage={lastImage} badges={badges} />
      </Sequence>

      {/* ════ SCENE 5 — CTA (4s) ════ */}
      <Sequence from={CTA_START} durationInFrames={CTA_FRAMES} premountFor={10}>
        <CTAScene lastImage={lastImage} storeName={storeName} brandColor={brandColor} titleFont={titleFont} categoryName={categoryName} urgencyCTA={urgencyCTA} />
      </Sequence>

    </AbsoluteFill>
  );
};
