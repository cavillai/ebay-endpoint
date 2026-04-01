/**
 * PROMPT 1 — The Viral Hook Machine (v2)
 * Rules applied: animations.md, audio.md, images.md, sequencing.md,
 *                light-leaks.md, fonts.md
 *
 * ALL animations driven by useCurrentFrame() — NO CSS transitions.
 * spring() on every entrance. Ken Burns on every image. Safe zones enforced.
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
} from "remotion";
import { LightLeak } from "@remotion/light-leaks";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TemplateProps } from "../shared/types";

// Load Inter font (blocks render until ready per fonts.md)
const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

// ─── Constants ────────────────────────────────────────────────────────────
const SAFE_TOP = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES = 60;
const FRAMES_PER_IMAGE = 75; // 2.5s at 30fps
const HOOK_FRAMES = 30;
const PRICE_FRAMES = 60;
const DETAILS_FRAMES = 90;
const CTA_FRAMES = 45;

// ─── ImageSlide: Ken Burns + cross-fade per rules/images.md ───────────────
const ImageSlide: React.FC<{ src: string; index: number }> = ({ src, index }) => {
  const frame = useCurrentFrame();

  // Alternate zoom direction per image
  const startScale = index % 2 === 0 ? 1.15 : 1.0;
  const endScale = index % 2 === 0 ? 1.0 : 1.15;
  const scale = interpolate(frame, [0, FRAMES_PER_IMAGE], [startScale, endScale], {
    extrapolateRight: "clamp",
  });

  // Alternate pan direction
  const panX = interpolate(
    frame, [0, FRAMES_PER_IMAGE],
    [index % 2 === 0 ? -20 : 20, 0],
    { extrapolateRight: "clamp" }
  );
  const panY = interpolate(
    frame, [0, FRAMES_PER_IMAGE],
    [index % 3 === 0 ? -15 : 15, 0],
    { extrapolateRight: "clamp" }
  );

  // Cross-fade: in for 10 frames, out for 15
  const opacity = interpolate(
    frame,
    [0, 10, FRAMES_PER_IMAGE - 15, FRAMES_PER_IMAGE],
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
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── WordByWordCaption: createTikTokStyleCaptions() equivalent ─────────────
const WordCaption: React.FC<{ text: string; startFrame: number }> = ({
  text, startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const wordIdx = Math.floor((frame - startFrame) / 8);

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center",
        gap: 8, fontFamily, fontWeight: 900, fontSize: 48, lineHeight: 1.2,
        textAlign: "center", color: "#fff",
        textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
      }}
    >
      {words.map((word, i) => {
        const isActive = i === wordIdx;
        const wordScale = isActive
          ? spring({ frame: frame - (startFrame + i * 8), fps, from: 1.3, to: 1, durationInFrames: 10 })
          : 1;
        return (
          <span
            key={i}
            style={{
              opacity: i <= wordIdx ? 1 : 0,
              display: "inline-block",
              transform: `scale(${isActive ? wordScale : 1})`,
              color: isActive ? "#FFE500" : "#fff",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Main Composition ─────────────────────────────────────────────────────
export const ViralHookMachine: React.FC<TemplateProps> = ({
  storeName,
  storeLogo,
  title,
  price,
  currency = "USD",
  imageUrl,
  additionalImages = [],
  condition,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Combine primary + additional images per spec
  const allImages = [imageUrl, ...additionalImages].filter(Boolean);
  const imageCount = allImages.length;

  // Scene frame markers
  const GALLERY_START = HOOK_FRAMES;
  const GALLERY_END = GALLERY_START + imageCount * FRAMES_PER_IMAGE;
  const PRICE_START = GALLERY_END;
  const DETAILS_START = PRICE_START + PRICE_FRAMES;
  const CTA_START = DETAILS_START + DETAILS_FRAMES;

  // ── Animated gradient background ──────────────────────────────────────
  const gradientAngle = interpolate(frame, [0, durationInFrames], [0, 360]);

  // ── Hook (0–30): "WAIT 👀" explodes from 300% → 100% ─────────────────
  const hookScale = spring({
    frame,
    fps,
    from: 3.0,
    to: 1.0,
    durationInFrames: HOOK_FRAMES,
    config: { damping: 12, stiffness: 200 },
  });

  // ── Progress dots: active image index ─────────────────────────────────
  const activeImageIdx = Math.min(
    Math.floor(Math.max(0, frame - GALLERY_START) / FRAMES_PER_IMAGE),
    imageCount - 1
  );

  // ── Screen shake on price reveal ──────────────────────────────────────
  const shakeX =
    frame >= PRICE_START && frame <= PRICE_START + 15
      ? Math.sin(frame * 2.8) * interpolate(frame, [PRICE_START, PRICE_START + 15], [8, 0])
      : 0;

  // ── Price count-up with spring ────────────────────────────────────────
  const priceNum = parseFloat(price);
  const priceSpring = spring({
    frame: Math.max(0, frame - PRICE_START),
    fps,
    config: { damping: 80 },
  });
  const displayPrice = interpolate(priceSpring, [0, 1], [0, priceNum]);

  // ── Sticker badge data ────────────────────────────────────────────────
  const badges = [
    { label: condition, bg: "#4ade80", color: "#000" },
    { label: storeName, bg: "#681FCB", color: "#fff" },
    { label: currency === "USD" ? `$${price}` : `${currency} ${price}`, bg: "#FFE500", color: "#000" },
  ];

  // ── CTA pulse ────────────────────────────────────────────────────────
  const pulse = Math.sin(frame * 0.15) * 0.08 + 1.0;

  // ── Logo spring entrance ──────────────────────────────────────────────
  const logoScale = spring({
    frame: Math.max(0, frame - CTA_START),
    fps,
    from: 0,
    to: 1,
    durationInFrames: 20,
    config: { stiffness: 200, damping: 15 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #0a0a0a, #1a0a2e)`,
        fontFamily,
        transform: `translateX(${shakeX}px)`,
        overflow: "hidden",
      }}
    >
      {/* ── AUDIO (uncomment when public/music/beat.mp3 exists) ──────── */}
      {/*
      <Audio src={staticFile("music/beat.mp3")} volume={musicVolume} loop />
      */}

      {/* ════════════════════════════════════════════════════════════════
          SCENE 1 — HOOK (frames 0–30)
      ════════════════════════════════════════════════════════════════ */}
      <Sequence from={0} durationInFrames={HOOK_FRAMES + 10} premountFor={5}>
        <AbsoluteFill
          style={{
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: "#fff",
              transform: `scale(${hookScale})`,
              letterSpacing: -2,
              textAlign: "center",
              lineHeight: 1,
            }}
          >
            WAIT 👀
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════════
          SCENE 2 — IMAGE GALLERY (frames 30 → GALLERY_END)
          Each image in its own <Sequence> per sequencing.md
      ════════════════════════════════════════════════════════════════ */}
      {frame >= GALLERY_START && frame < GALLERY_END + 20 && (
        <AbsoluteFill>
          {allImages.map((imgUrl, index) => (
            <Sequence
              key={index}
              from={GALLERY_START + index * FRAMES_PER_IMAGE}
              durationInFrames={FRAMES_PER_IMAGE + 15}
              premountFor={15}
            >
              <ImageSlide src={imgUrl} index={index} />
            </Sequence>
          ))}

          {/* Light leak at every image transition per light-leaks.md */}
          {allImages.map((_, index) => {
            if (index === 0) return null;
            const transitionFrame = GALLERY_START + index * FRAMES_PER_IMAGE;
            return (
              <Sequence
                key={`leak-${index}`}
                from={transitionFrame - 5}
                durationInFrames={20}
              >
                <AbsoluteFill>
                  <LightLeak durationInFrames={20} seed={index} hueShift={index * 60} />
                </AbsoluteFill>
              </Sequence>
            );
          })}

          {/* Dark gradient overlay */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.65) 100%)",
            }}
          />

          {/* Title — word by word, safe zone top */}
          <div
            style={{
              position: "absolute", top: SAFE_TOP + 10,
              left: SAFE_SIDES, right: SAFE_SIDES, textAlign: "center",
            }}
          >
            <WordCaption
              text={title.length > 55 ? title.slice(0, 52) + "…" : title}
              startFrame={GALLERY_START + 20}
            />
          </div>

          {/* Progress dots — safe zone bottom */}
          <div
            style={{
              position: "absolute", bottom: SAFE_BOTTOM + 20,
              left: 0, right: 0, display: "flex",
              justifyContent: "center", gap: 10,
            }}
          >
            {allImages.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === activeImageIdx ? 28 : 10,
                  height: 10, borderRadius: 5,
                  backgroundColor: "#fff",
                  opacity: i === activeImageIdx ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SCENE 3 — PRICE REVEAL (GALLERY_END → GALLERY_END+60)
      ════════════════════════════════════════════════════════════════ */}
      <Sequence from={PRICE_START} durationInFrames={PRICE_FRAMES + 5} premountFor={10}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          {/* Glassmorphism price card */}
          <div
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 20,
              padding: "40px 60px",
              textAlign: "center",
              transform: `scale(${spring({ frame: useCurrentFrame(), fps, from: 0.5, to: 1, durationInFrames: 20, config: { stiffness: 200, damping: 15 } })})`,
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
              Only
            </div>
            <div
              style={{
                color: "#00FF88",
                fontSize: 80,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                textShadow: "0 0 40px rgba(0,255,136,0.5)",
              }}
            >
              {currency === "USD" ? "$" : currency}{displayPrice.toFixed(2)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 28, marginTop: 8 }}>
              {condition}
            </div>
          </div>

          {/* Particle burst — 20 gold circles */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const f = useCurrentFrame();
              const distance = interpolate(f, [10, 50], [0, 180], { extrapolateRight: "clamp" });
              const pOpacity = interpolate(f, [10, 30, 50], [0, 1, 0], { extrapolateRight: "clamp" });
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 8, height: 8,
                    borderRadius: "50%",
                    background: "#FFD700",
                    opacity: pOpacity,
                    transform: `translate(${Math.cos(angle) * distance - 4}px, ${Math.sin(angle) * distance - 4}px)`,
                  }}
                />
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════════
          SCENE 4 — DETAILS / STICKER BADGE DROPS (DETAILS_START → +90)
      ════════════════════════════════════════════════════════════════ */}
      <Sequence from={DETAILS_START} durationInFrames={DETAILS_FRAMES + 5} premountFor={10}>
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              top: "50%", left: 0, right: 0,
              transform: "translateY(-50%)",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 24,
              paddingLeft: SAFE_SIDES, paddingRight: SAFE_SIDES,
            }}
          >
            {badges.map((badge, i) => {
              const lf = useCurrentFrame();
              const badgeSpring = spring({
                frame: Math.max(0, lf - i * 20),
                fps,
                config: { damping: 14, stiffness: 180 },
              });
              const badgeY = interpolate(badgeSpring, [0, 1], [-200, 0]);
              const rotation = i % 2 === 0 ? -4 : 4;
              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    borderRadius: 100,
                    padding: "14px 36px",
                    fontSize: 36,
                    fontWeight: 800,
                    transform: `translateY(${badgeY}px) rotate(${rotation}deg)`,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                  }}
                >
                  {badge.label}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════════
          SCENE 5 — CTA (last 45 frames)
      ════════════════════════════════════════════════════════════════ */}
      <Sequence from={CTA_START} durationInFrames={CTA_FRAMES} premountFor={10}>
        <AbsoluteFill
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: SAFE_BOTTOM + 20,
          }}
        >
          {/* Logo spring entrance */}
          <div
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 20,
              transform: `scale(${logoScale})`,
            }}
          >
            {/* Pulsing CTA button */}
            <div
              style={{
                background: "linear-gradient(135deg, #681FCB, #F73A8A)",
                borderRadius: 50,
                padding: "20px 56px",
                color: "#fff",
                fontSize: 44,
                fontWeight: 900,
                transform: `scale(${pulse})`,
                boxShadow: "0 8px 40px rgba(247,58,138,0.4)",
                textAlign: "center",
              }}
            >
              Shop {storeName} → Link in bio 👇
            </div>

            {/* Store logo or name badge */}
            {storeLogo ? (
              <Img
                src={storeLogo}
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {storeName} on eBay
              </div>
            )}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
