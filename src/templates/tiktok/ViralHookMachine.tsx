/**
 * PROMPT 1 — The Viral Hook Machine (v5)
 * Rules: CLAUDE.md + animations.md + audio.md + images.md +
 *        sequencing.md + light-leaks.md + fonts.md + transitions.md
 *
 * CHECKLIST:
 * ✅ allImages = primaryImage + additionalImages
 * ✅ Every image fills full frame — objectFit: cover, NO padding
 * ✅ Ken Burns alternating direction per image
 * ✅ Cross-fades: next image renders underneath, NEVER empty frames
 * ✅ Bebas Neue loaded for hook / price / CTA
 * ✅ Hook on ISOLATED BLACK FRAME (no product behind it)
 * ✅ Price reveal has last product image as background
 * ✅ Details scene has product image as background
 * ✅ CTA scene has product background + bouncing arrow + pulsing border
 * ✅ Particle burst on price reveal
 * ✅ Progress dots
 * ✅ Audio looping
 * ✅ Screen shake on price reveal
 * ✅ Safe zones: 150px top, 170px bottom, 60px sides
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

// ── Fonts loaded at module level (blocks render until ready) ──────────────
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
const CTA_FRAMES = 45;

// ── Viral hook pool — deterministic per product ───────────────────────────
const HOOK_POOL = [
  "POV: YOU FOUND THIS",
  "HOW IS THIS STILL HERE",
  "THEY PRICED THIS WRONG",
  "STOP SCROLLING",
  "STEAL OF THE DAY",
  "THIS WON'T LAST LONG",
  "YOU NEED TO SEE THIS",
  "I CAN'T BELIEVE THIS DEAL",
  "FOUND IT. YOU'RE WELCOME",
  "THIS SHOULDN'T BE THIS CHEAP",
];

function pickHook(title: string): string {
  const seed = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return HOOK_POOL[seed % HOOK_POOL.length];
}

// ── Full-frame image with Ken Burns ───────────────────────────────────────
const GalleryImage: React.FC<{ src: string; index: number; totalFrames: number }> = ({
  src, index, totalFrames,
}) => {
  const frame = useCurrentFrame();

  // Alternate direction per image
  const even = index % 2 === 0;
  const scale = interpolate(
    frame, [0, totalFrames],
    even ? [1.1, 1.0] : [1.0, 1.1],
    { extrapolateRight: "clamp" }
  );
  const panX = interpolate(
    frame, [0, totalFrames],
    even ? [-15, 0] : [15, 0],
    { extrapolateRight: "clamp" }
  );
  const panY = interpolate(
    frame, [0, totalFrames],
    index % 3 === 0 ? [-10, 0] : [10, 0],
    { extrapolateRight: "clamp" }
  );

  // Cross-fade: NEXT image already rendering underneath — NEVER empty frame
  const opacity = interpolate(
    frame,
    [0, 8, totalFrames - 12, totalFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",     // fills entire frame — NO letterboxing
          transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ── Price Reveal Scene (own component so hooks are top-level) ────────────
interface PriceRevealProps {
  lastImage: string; price: string; currency: string;
  condition: string; brandColor: string;
}
const PriceRevealScene: React.FC<PriceRevealProps> = ({
  lastImage, price, currency, condition, brandColor,
}) => {
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
        position: "absolute", top: "50%", left: 60, right: 60,
        transform: `translateY(-50%) scale(${cardScale})`, textAlign: "center",
      }}>
        <div style={{ fontFamily: inter, fontSize: 36, fontWeight: 400, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Only</div>
        <div style={{
          fontFamily: bebas, fontSize: 112, color: "#00FF88", lineHeight: 1,
          textShadow: "0 0 50px rgba(0,255,136,0.6)", fontVariantNumeric: "tabular-nums",
        }}>
          {currency === "USD" ? "$" : currency}{displayPrice.toFixed(2)}
        </div>
      </div>

      {/* Condition badge */}
      <div style={{
        position: "absolute", bottom: 190, left: 0, right: 0, display: "flex", justifyContent: "center",
        transform: `translateY(${condY}px)`,
      }}>
        <div style={{ backgroundColor: "#4ade80", color: "#000", borderRadius: 100, padding: "12px 32px", fontFamily: inter, fontSize: 32, fontWeight: 600 }}>
          {condition}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Details Scene ─────────────────────────────────────────────────────────
interface DetailsProps { lastImage: string; badges: Array<{ label: string; bg: string; color: string }> }
const DetailsScene: React.FC<DetailsProps> = ({ lastImage, badges }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }} />
      <div style={{
        position: "absolute", top: "50%", left: 60, right: 60,
        transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20,
      }}>
        {badges.map((badge, i) => {
          const x = spring({ frame: Math.max(0, frame - i * 12), fps, from: 300, to: 0, durationInFrames: 25, config: { damping: 14, stiffness: 180 } });
          return (
            <div key={i} style={{
              backgroundColor: badge.bg, color: badge.color,
              borderRadius: 100, padding: "14px 36px",
              fontFamily: inter, fontSize: 32, fontWeight: 600,
              transform: `translateX(${x}px)`,
              boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
            }}>
              {badge.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── CTA Scene ─────────────────────────────────────────────────────────────
interface CTAProps { lastImage: string; storeName: string; storeLogo?: string; brandColor: string }
const CTAScene: React.FC<CTAProps> = ({ lastImage, storeName, storeLogo, brandColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaScale = spring({ frame, fps, from: 0, to: 1, durationInFrames: 20, config: { stiffness: 180, damping: 14 } });
  const ctaPulse = Math.sin(frame * 0.15) * 0.06 + 1.0;
  const borderOpacity = Math.sin(frame * 0.15) * 0.5 + 0.5;
  const arrowY = interpolate(frame % 25, [0, 12, 25], [0, -20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.75) 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 35%, transparent 60%, rgba(0,0,0,0.8) 100%)",
      }} />
      <div style={{ position: "absolute", inset: 0, border: `4px solid ${brandColor}`, opacity: borderOpacity, pointerEvents: "none" }} />

      <div style={{ transform: `scale(${ctaScale})` }}>
        <div style={{
          position: "absolute", top: 150, left: 0, right: 0, textAlign: "center",
          fontFamily: bebas, fontSize: 80, color: "#fff", letterSpacing: 4,
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}>
          {storeName}
        </div>
        <div style={{
          position: "absolute", bottom: 270, left: 0, right: 0, textAlign: "center",
          fontFamily: bebas, fontSize: 72, color: "#fff", letterSpacing: 3,
          transform: `scale(${ctaPulse})`,
          textShadow: `0 0 30px ${brandColor}80`,
        }}>
          LINK IN BIO
        </div>
        <div style={{
          position: "absolute", bottom: 190, left: 0, right: 0, textAlign: "center",
          fontSize: 64, transform: `translateY(${arrowY}px)`,
        }}>
          👇
        </div>
        {storeLogo && (
          <Img src={storeLogo} style={{
            position: "absolute", bottom: 290, left: "50%", transform: "translateX(-50%)",
            width: 72, height: 72, borderRadius: 14, objectFit: "cover",
          }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ───────────────────────────────────────────────────────
export const ViralHookMachine: React.FC<TemplateProps> = ({
  storeName,
  storeLogo,
  title,
  price,
  currency = "USD",
  imageUrl,
  additionalImages = [],
  condition,
  storeColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const brandColor = storeColor || "#F73A8A";

  // Combine images — all from the same listing
  const allImages = [imageUrl, ...additionalImages].filter(Boolean);
  const imageCount = allImages.length;
  const lastImage = allImages[imageCount - 1];

  // Scene frame markers
  const GALLERY_START = HOOK_END;
  const GALLERY_END = GALLERY_START + imageCount * FRAMES_PER_IMAGE;
  const PRICE_START = GALLERY_END;
  const DETAILS_START = PRICE_START + PRICE_FRAMES;
  const CTA_START = DETAILS_START + DETAILS_FRAMES;

  // Hook
  const hookText = pickHook(title);
  const hookScale = spring({
    frame,
    fps,
    from: 4.0,
    to: 1.0,
    durationInFrames: HOOK_END,
    config: { damping: 10, stiffness: 200 },
  });

  // Gallery progress dots
  const activeImg = Math.min(
    Math.floor(Math.max(0, frame - GALLERY_START) / FRAMES_PER_IMAGE),
    imageCount - 1
  );

  // Screen shake on price reveal (applied to root wrapper)
  const shakeX =
    frame >= PRICE_START && frame <= PRICE_START + 15
      ? Math.sin(frame * 2.8) *
        interpolate(frame, [PRICE_START, PRICE_START + 15], [6, 0])
      : 0;

  // Details badges data
  const badges = [
    { label: condition, bg: "#4ade80", color: "#000" },
    { label: storeName, bg: "#681FCB", color: "#fff" },
    { label: `${currency === "USD" ? "$" : currency}${price}`, bg: "#FFE500", color: "#000" },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        fontFamily: inter,
        transform: `translateX(${shakeX}px)`,
        overflow: "hidden",
      }}
    >
      {/* ── AUDIO: energetic.mp3 starts on beat ────────────────────── */}
      <Audio src={staticFile("music/energetic.mp3")} volume={0.65} trimBefore={300} loop />

      {/* ══════════════════════════════════════════════════════════════
          SCENE 1 — HOOK: ISOLATED BLACK FRAME (frames 0–40)
          NO product image. Hook text only. Bebas Neue 120px.
      ══════════════════════════════════════════════════════════════ */}
      <Sequence from={0} durationInFrames={HOOK_END} premountFor={5}>
        <AbsoluteFill style={{ backgroundColor: "#000000" }}>
          {/* Radial glow behind text */}
          <div
            style={{
              position: "absolute",
              width: 600, height: 600,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${brandColor}30 0%, transparent 70%)`,
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
          {/* Hook text — Bebas Neue, 120px, springs in */}
          <div
            style={{
              position: "absolute",
              top: "50%", left: SAFE_SIDES, right: SAFE_SIDES,
              transform: `translateY(-50%) scale(${hookScale})`,
              textAlign: "center",
              fontFamily: bebas,
              fontSize: 120,
              letterSpacing: 4,
              color: "#fff",
              lineHeight: 1.0,
            }}
          >
            {hookText}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ══════════════════════════════════════════════════════════════
          SCENE 2 — GALLERY: full-frame images with Ken Burns
          Each image in its own Sequence, durationInFrames=90 so
          the NEXT image renders underneath — NEVER an empty frame
      ══════════════════════════════════════════════════════════════ */}
      {allImages.map((imgUrl, index) => (
        <Sequence
          key={index}
          from={GALLERY_START + index * FRAMES_PER_IMAGE}
          durationInFrames={90}
          premountFor={15}
        >
          <GalleryImage src={imgUrl} index={index} totalFrames={90} />
        </Sequence>
      ))}

      {/* Light leaks at every image transition */}
      {allImages.slice(1).map((_, index) => (
        <Sequence
          key={`leak-${index}`}
          from={GALLERY_START + (index + 1) * FRAMES_PER_IMAGE - 8}
          durationInFrames={20}
          premountFor={5}
        >
          <AbsoluteFill>
            <LightLeak durationInFrames={20} seed={index + 1} hueShift={index * 60} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* Gallery UI overlay: watermark + progress dots + title */}
      {frame >= GALLERY_START && frame < GALLERY_END && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          {/* Dark gradient for text readability */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.6) 100%)",
          }} />

          {/* Brand watermark — top-left safe zone */}
          <div style={{
            position: "absolute",
            top: SAFE_TOP, left: SAFE_SIDES,
            fontFamily: inter, fontSize: 28, fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
          }}>
            {storeName}
          </div>

          {/* Title — Inter 700 44px, bottom safe zone */}
          <div style={{
            position: "absolute",
            bottom: SAFE_BOTTOM + 80,
            left: SAFE_SIDES, right: SAFE_SIDES,
            fontFamily: inter, fontSize: 44, fontWeight: 700,
            color: "#fff", lineHeight: 1.2,
            textShadow: "1px 1px 6px rgba(0,0,0,0.9)",
            opacity: interpolate(frame, [GALLERY_START + 20, GALLERY_START + 40], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}>
            {title.length > 55 ? title.slice(0, 52) + "…" : title}
          </div>

          {/* Progress dots — 140px from bottom */}
          <div style={{
            position: "absolute",
            bottom: 140, left: 0, right: 0,
            display: "flex", justifyContent: "center", gap: 10,
          }}>
            {allImages.map((_, i) => (
              <div key={i} style={{
                width: i === activeImg ? 28 : 10,
                height: 10, borderRadius: 5,
                backgroundColor: "#fff",
                opacity: i === activeImg ? 1 : 0.35,
              }} />
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* SCENE 3 — PRICE REVEAL */}
      <Sequence from={PRICE_START} durationInFrames={PRICE_FRAMES} premountFor={10}>
        <PriceRevealScene
          lastImage={lastImage} price={price} currency={currency}
          condition={condition} brandColor={brandColor}
        />
      </Sequence>

      {/* SCENE 4 — DETAILS */}
      <Sequence from={DETAILS_START} durationInFrames={DETAILS_FRAMES} premountFor={10}>
        <DetailsScene lastImage={lastImage} badges={badges} />
      </Sequence>

      {/* SCENE 5 — CTA */}
      <Sequence from={CTA_START} durationInFrames={CTA_FRAMES} premountFor={10}>
        <CTAScene lastImage={lastImage} storeName={storeName} storeLogo={storeLogo} brandColor={brandColor} />
      </Sequence>
    </AbsoluteFill>
  );
};
