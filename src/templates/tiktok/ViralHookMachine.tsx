/**
 * PROMPT 1 — The Viral Hook Machine (v6)
 * Rules: CLAUDE.md + all rules/*.md
 *
 * FIXES v6:
 * ✅ Smart title: strips eBay pipe-delimited junk, wraps 2 lines, no truncation
 * ✅ CTA extended to 120 frames (4s) with cinematic graphic pop
 * ✅ 20-track music pool, randomised per product (deterministic)
 * ✅ Star store badge (SVG) — any store name fits inside
 * ✅ Seamless loop fade
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
import { TemplateProps } from "../shared/types";

// ── Fonts ─────────────────────────────────────────────────────────────────
const { fontFamily: bebas } = loadBebasNeue();
const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

// ── Constants ─────────────────────────────────────────────────────────────
const SAFE_TOP = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES = 60;
const FRAMES_PER_IMAGE = 75;
const HOOK_END = 40;
const PRICE_FRAMES = 60;
const DETAILS_FRAMES = 45;
const CTA_FRAMES = 120; // 4 seconds — enough time to read

// ── 20 upbeat music tracks (CC0, from effacestudios pack) ─────────────────
export const MUSIC_TRACKS = [
  "party-time.mp3",
  "happy-life.mp3",
  "gamer-guy.mp3",
  "sports-spirit.mp3",
  "the-champion.mp3",
  "dubstepper.mp3",
  "technologist.mp3",
  "fury.mp3",
  "commercial.mp3",
  "breaker.mp3",
  "starter.mp3",
  "newness.mp3",
  "beeper.mp3",
  "bubbles.mp3",
  "outsider.mp3",
  "planning.mp3",
  "my-inventions.mp3",
  "worship-me.mp3",
  "yo-vender-music.mp3",
  "sudden-tour.mp3",
];

/** Deterministic music selection — varies per product, consistent per render */
export function pickMusic(title: string): string {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return MUSIC_TRACKS[seed % MUSIC_TRACKS.length];
}

// ── Hook variant pools ────────────────────────────────────────────────────
export const HOOK_VARIANTS = {
  a: ["HOW IS THIS STILL HERE", "POV: YOU FOUND THIS", "WAIT BEFORE YOU SCROLL", "YOU NEED TO SEE THIS", "THIS SHOULDN'T EXIST"],
  b: ["THIS PRICE IS A MISTAKE", "THEY PRICED THIS WRONG", "I CAN'T BELIEVE THIS DEAL", "STEAL OF THE DAY", "HALF THE RETAIL PRICE"],
  c: ["LAST ONE IN STOCK", "THIS WON'T LAST LONG", "GONE IN 24 HOURS", "SOMEONE WILL GRAB THIS", "DON'T SLEEP ON THIS"],
} as const;

export type HookVariant = keyof typeof HOOK_VARIANTS;

export function pickHook(title: string, variant: HookVariant = "a"): string {
  const pool = HOOK_VARIANTS[variant];
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

/** Clean eBay title: remove everything after pipe | and trim */
function cleanTitle(raw: string): string {
  const parts = raw.split("|");
  const clean = parts[0].trim();
  // Split into 2 lines at a natural word boundary around the middle
  const words = clean.split(" ");
  if (words.length <= 4) return clean;
  const mid = Math.ceil(words.length / 2);
  return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
}

// ── Star Store Badge (SVG) — store name always fits inside ────────────────
const StarBadge: React.FC<{ storeName: string; opacity?: number }> = ({
  storeName, opacity = 1,
}) => {
  // Dynamic font size based on name length
  const fontSize = storeName.length <= 6 ? 22 : storeName.length <= 10 ? 18 : storeName.length <= 14 ? 14 : 11;

  // 5-pointed star path (100x100 viewBox, centered at 50,50)
  const star = () => {
    const cx = 50, cy = 50, outer = 48, inner = 20;
    const points: string[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return points.join(" ");
  };

  return (
    <div style={{ opacity, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={90} height={90} viewBox="0 0 100 100">
        <polygon
          points={star()}
          fill="#FFE500"
          stroke="#F73A8A"
          strokeWidth={2}
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000"
          fontSize={fontSize}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          style={{ whiteSpace: "pre" } as React.CSSProperties}
        >
          {storeName.length > 16 ? storeName.slice(0, 15) + "…" : storeName}
        </text>
      </svg>
    </div>
  );
};

// ── Full-frame image with Ken Burns ───────────────────────────────────────
const GalleryImage: React.FC<{ src: string; index: number }> = ({ src, index }) => {
  const frame = useCurrentFrame();
  const even = index % 2 === 0;
  const scale = interpolate(frame, [0, 90], even ? [1.1, 1.0] : [1.0, 1.1], { extrapolateRight: "clamp" });
  const panX = interpolate(frame, [0, 90], even ? [-15, 0] : [15, 0], { extrapolateRight: "clamp" });
  const panY = interpolate(frame, [0, 90], index % 3 === 0 ? [-10, 0] : [10, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 8, 75, 90], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ── Price Reveal Scene ────────────────────────────────────────────────────
const PriceRevealScene: React.FC<{
  lastImage: string; price: string; currency: string;
  condition: string; brandColor: string;
}> = ({ lastImage, price, currency, condition, brandColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const priceNum = parseFloat(price);
  const priceSpring = spring({ frame, fps, config: { damping: 80 } });
  const displayPrice = interpolate(priceSpring, [0, 1], [0, priceNum]);
  const cardScale = spring({ frame, fps, from: 0.6, to: 1, durationInFrames: 20, config: { stiffness: 180, damping: 14 } });
  const condY = spring({ frame: Math.max(0, frame - 20), fps, from: 120, to: 0, durationInFrames: 25, config: { damping: 14, stiffness: 180 } });

  return (
    <AbsoluteFill>
      <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
      {/* Particle burst */}
      <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%,-50%)" }}>
        {Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const dist = interpolate(frame, [5, 40], [0, 200], { extrapolateRight: "clamp" });
          const op = interpolate(frame, [5, 25, 50], [0, 1, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              position: "absolute", width: 10, height: 10, borderRadius: "50%",
              background: brandColor, opacity: op,
              transform: `translate(${Math.cos(angle) * dist - 5}px, ${Math.sin(angle) * dist - 5}px)`,
            }} />
          );
        })}
      </div>
      {/* Price */}
      <div style={{
        position: "absolute", top: "50%", left: SAFE_SIDES, right: SAFE_SIDES,
        transform: `translateY(-50%) scale(${cardScale})`, textAlign: "center",
      }}>
        <div style={{ fontFamily: inter, fontSize: 36, fontWeight: 400, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Only</div>
        <div style={{ fontFamily: bebas, fontSize: 112, color: "#00FF88", lineHeight: 1, textShadow: "0 0 50px rgba(0,255,136,0.6)", fontVariantNumeric: "tabular-nums" }}>
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

// ── CTA Scene (120 frames = 4s, cinematic pop) ────────────────────────────
const CTAScene: React.FC<{
  lastImage: string; storeName: string; storeLogo?: string;
  brandColor: string; hookText: string;
}> = ({ lastImage, storeName, brandColor, hookText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring (0-20 frames)
  const sceneScale = spring({ frame, fps, from: 1.08, to: 1, durationInFrames: 25, config: { stiffness: 180, damping: 14 } });

  // Pulsing border
  const borderOpacity = Math.sin(frame * 0.12) * 0.5 + 0.5;

  // Bouncing arrow
  const arrowY = interpolate(frame % 30, [0, 15, 30], [0, -22, 0], { extrapolateRight: "clamp" });

  // CTA text pulse
  const ctaPulse = Math.sin(frame * 0.12) * 0.05 + 1.0;

  // Star badge spring entrance
  const starScale = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20, config: { stiffness: 200, damping: 12 } });

  // Seamless loop fade
  const loopFade = interpolate(frame, [CTA_FRAMES - 12, CTA_FRAMES], [1, 0], { extrapolateRight: "clamp" });

  // Hook reprise fade in at frame 40
  const hookRepriseOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });

  // "LINK IN BIO" text slam at frame 25
  const ctaSlam = spring({ frame: Math.max(0, frame - 20), fps, from: 2, to: 1, durationInFrames: 15, config: { stiffness: 300, damping: 12 } });
  const ctaSlide = spring({ frame: Math.max(0, frame - 20), fps, from: 80, to: 0, durationInFrames: 20, config: { stiffness: 180, damping: 14 } });

  return (
    <AbsoluteFill style={{ opacity: loopFade }}>
      {/* Product image background with Ken Burns */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${sceneScale})`, overflow: "hidden" }}>
        <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Radial vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.8) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.92) 100%)" }} />

      {/* Pulsing brand border — 4px, full frame */}
      <div style={{ position: "absolute", inset: 0, border: `4px solid ${brandColor}`, opacity: borderOpacity, pointerEvents: "none" }} />

      {/* Animated corner accents */}
      {[
        { top: 8, left: 8, borderTop: `4px solid ${brandColor}`, borderLeft: `4px solid ${brandColor}` },
        { top: 8, right: 8, borderTop: `4px solid ${brandColor}`, borderRight: `4px solid ${brandColor}` },
        { bottom: 8, left: 8, borderBottom: `4px solid ${brandColor}`, borderLeft: `4px solid ${brandColor}` },
        { bottom: 8, right: 8, borderBottom: `4px solid ${brandColor}`, borderRight: `4px solid ${brandColor}` },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 50, height: 50, opacity: borderOpacity, ...s }} />
      ))}

      {/* Star store badge — top left safe zone */}
      <div style={{
        position: "absolute", top: SAFE_TOP, left: SAFE_SIDES,
        transform: `scale(${starScale})`, transformOrigin: "top left",
      }}>
        <StarBadge storeName={storeName} />
      </div>

      {/* Hook reprise — smaller italic, fades in mid-CTA */}
      <div style={{
        position: "absolute", top: SAFE_TOP + 10, left: 0, right: 0, textAlign: "center",
        fontFamily: inter, fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.65)",
        fontStyle: "italic", opacity: hookRepriseOpacity,
        paddingLeft: 160, // account for star badge
      }}>
        {hookText}
      </div>

      {/* LINK IN BIO — slams in, Bebas Neue 72px */}
      <div style={{
        position: "absolute", bottom: SAFE_BOTTOM + 130, left: 0, right: 0, textAlign: "center",
        fontFamily: bebas, fontSize: 72, color: "#fff", letterSpacing: 4,
        transform: `scale(${ctaSlam}) translateY(${ctaSlide}px) scale(${ctaPulse})`,
        textShadow: `0 0 40px ${brandColor}, 0 4px 20px rgba(0,0,0,0.8)`,
      }}>
        LINK IN BIO
      </div>

      {/* Search instruction */}
      <div style={{
        position: "absolute", bottom: SAFE_BOTTOM + 60, left: 0, right: 0, textAlign: "center",
        fontFamily: inter, fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,0.8)",
        opacity: interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        Search <span style={{ color: "#FFE500", fontWeight: 700 }}>{storeName}</span> on eBay
      </div>

      {/* Bouncing arrow */}
      <div style={{
        position: "absolute", bottom: SAFE_BOTTOM + 5, left: 0, right: 0, textAlign: "center",
        fontSize: 56, transform: `translateY(${arrowY}px)`,
        opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        👇
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ───────────────────────────────────────────────────────
export const ViralHookMachine: React.FC<TemplateProps & { hookVariant?: HookVariant }> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, additionalImages = [], condition, storeColor, hookVariant = "a",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = storeColor || "#F73A8A";
  const allImages = [imageUrl, ...additionalImages].filter(Boolean);
  const imageCount = allImages.length;
  const lastImage = allImages[imageCount - 1];

  // Scene markers
  const GALLERY_START = HOOK_END;
  const GALLERY_END = GALLERY_START + imageCount * FRAMES_PER_IMAGE;
  const PRICE_START = GALLERY_END;
  const DETAILS_START = PRICE_START + PRICE_FRAMES;
  const CTA_START = DETAILS_START + DETAILS_FRAMES;

  // Deterministic music selection
  const musicFile = pickMusic(title);

  // Hook text
  const hookText = pickHook(title, hookVariant);

  // Clean title — strip eBay pipe-delimited info, smart 2-line wrap
  const displayTitle = cleanTitle(title);

  // Progress dots
  const activeImg = Math.min(Math.floor(Math.max(0, frame - GALLERY_START) / FRAMES_PER_IMAGE), imageCount - 1);

  // Hook animation
  const hookScale = spring({ frame, fps, from: 4.0, to: 1.0, durationInFrames: HOOK_END, config: { damping: 10, stiffness: 200 } });

  // Screen shake
  const shakeX = frame >= PRICE_START && frame <= PRICE_START + 15
    ? Math.sin(frame * 2.8) * interpolate(frame, [PRICE_START, PRICE_START + 15], [6, 0])
    : 0;

  const badges = [
    { label: condition, bg: "#4ade80", color: "#000" },
    { label: storeName, bg: "#681FCB", color: "#fff" },
    { label: `${currency === "USD" ? "$" : currency}${price}`, bg: "#FFE500", color: "#000" },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: inter, transform: `translateX(${shakeX}px)`, overflow: "hidden" }}>

      {/* ── AUDIO: random upbeat track per product ─── */}
      <Audio src={staticFile(`music/${musicFile}`)} volume={0.65} trimBefore={300} loop />

      {/* ════ SCENE 1 — HOOK: isolated black frame ════ */}
      <Sequence from={0} durationInFrames={HOOK_END} premountFor={5}>
        <AbsoluteFill style={{ backgroundColor: "#000000" }}>
          <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${brandColor}35 0%, transparent 70%)`, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
          <div style={{ position: "absolute", top: "50%", left: SAFE_SIDES, right: SAFE_SIDES, transform: `translateY(-50%) scale(${hookScale})`, textAlign: "center", fontFamily: bebas, fontSize: 120, letterSpacing: 4, color: "#fff", lineHeight: 1.0 }}>
            {hookText}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════ SCENE 2 — GALLERY ════ */}
      {allImages.map((imgUrl, index) => (
        <Sequence key={index} from={GALLERY_START + index * FRAMES_PER_IMAGE} durationInFrames={90} premountFor={15}>
          <GalleryImage src={imgUrl} index={index} />
        </Sequence>
      ))}

      {/* Light leaks at transitions */}
      {allImages.slice(1).map((_, index) => (
        <Sequence key={`leak-${index}`} from={GALLERY_START + (index + 1) * FRAMES_PER_IMAGE - 8} durationInFrames={20} premountFor={5}>
          <AbsoluteFill><LightLeak durationInFrames={20} seed={index + 1} hueShift={index * 60} /></AbsoluteFill>
        </Sequence>
      ))}

      {/* Gallery UI overlay */}
      {frame >= GALLERY_START && frame < GALLERY_END && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.6) 100%)" }} />

          {/* Star store badge top-left */}
          <div style={{ position: "absolute", top: SAFE_TOP - 20, left: SAFE_SIDES - 10, opacity: 0.9 }}>
            <StarBadge storeName={storeName} />
          </div>

          {/* Title — cleaned, 2 lines, no truncation */}
          <div style={{
            position: "absolute", bottom: SAFE_BOTTOM + 80, left: SAFE_SIDES, right: SAFE_SIDES,
            fontFamily: inter, fontSize: 40, fontWeight: 700, color: "#fff",
            lineHeight: 1.25, whiteSpace: "pre-line",
            textShadow: "1px 1px 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.8)",
            opacity: interpolate(frame, [GALLERY_START + 20, GALLERY_START + 40], [0, 1], { extrapolateRight: "clamp" }),
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
        <PriceRevealScene lastImage={lastImage} price={price} currency={currency} condition={condition} brandColor={brandColor} />
      </Sequence>

      {/* ════ SCENE 4 — DETAILS ════ */}
      <Sequence from={DETAILS_START} durationInFrames={DETAILS_FRAMES} premountFor={10}>
        <DetailsScene lastImage={lastImage} badges={badges} />
      </Sequence>

      {/* ════ SCENE 5 — CTA (120 frames = 4s) ════ */}
      <Sequence from={CTA_START} durationInFrames={CTA_FRAMES} premountFor={10}>
        <CTAScene lastImage={lastImage} storeName={storeName} storeLogo={storeLogo} brandColor={brandColor} hookText={hookText} />
      </Sequence>

    </AbsoluteFill>
  );
};
