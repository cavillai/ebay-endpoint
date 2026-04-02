/**
 * EbayProductVideo — full rebuild per Master Prompt v1.0
 * 5 scenes, 450 frames, 15 seconds, 1080x1920
 * Hook(0-60) → Gallery(60-270) → Price(270-330) → Details(330-390) → CTA(390-450)
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import { LightLeak } from "@remotion/light-leaks";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { z } from "zod";

// ── Fonts — loaded at module level, blocks render until ready ─────────────
const { fontFamily: bebas } = loadBebas();
const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

// ── Zod schema — validates all props from batch render ─────────────────────
export const ebayProductSchema = z.object({
  storeName:   z.string(),
  platform:    z.enum(["tiktok", "instagram"]).default("tiktok"),
  title:       z.string(),
  price:       z.coerce.number(),
  condition:   z.string().default("Pre-owned"),
  brand:       z.string().optional().default(""),
  size:        z.string().optional().default(""),
  imageUrls:   z.array(z.string()).min(1),
  audioFile:   z.string().default("music/party-time.mp3"),
  hook:        z.string(),
  ctaText:     z.string(),
  accentColor: z.string().default("#FFD700"),
  bgColor:     z.string().default("#111111"),
  categoryName: z.string().optional().default(""),
});

export type EbayProductVideoProps = z.infer<typeof ebayProductSchema>;

// ── Scene frame constants ─────────────────────────────────────────────────
const HOOK_START    = 0;
const GALLERY_START = 60;
const PRICE_START   = 270;
const DETAILS_START = 330;
const CTA_START     = 390;

// Safe zones
const SAFE_TOP    = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES  = 60;

// ══════════════════════════════════════════════════════════════════════════
// SCENE 2 SUB-COMPONENT — ImageSlide with Ken Burns
// ══════════════════════════════════════════════════════════════════════════
const ImageSlide: React.FC<{
  src: string;
  index: number;
  total: number;
  framesPerImage: number;
  accentColor: string;
  storeName: string;
}> = ({ src, index, total, framesPerImage, accentColor, storeName }) => {
  const frame = useCurrentFrame();
  const even = index % 2 === 0;

  // Ken Burns — alternate zoom direction per image
  const scale = interpolate(
    frame, [0, framesPerImage],
    even ? [1.12, 1.0] : [1.0, 1.12],
    { extrapolateRight: "clamp" }
  );
  const panX = interpolate(
    frame, [0, framesPerImage],
    even ? [-30, 0] : [30, 0],
    { extrapolateRight: "clamp" }
  );
  const panY = interpolate(
    frame, [0, framesPerImage],
    index % 3 === 0 ? [-20, 0] : [20, 0],
    { extrapolateRight: "clamp" }
  );

  // Cross-fade — NEVER shows void frame
  const opacity = interpolate(
    frame,
    [0, 8, framesPerImage - 12, framesPerImage],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>

      {/* Product image — fills entire frame, no letterboxing */}
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)`,
        }}
      />

      {/* Gradient overlay for text legibility */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 70%, rgba(0,0,0,0.55) 100%)",
      }} />

      {/* Store watermark — top-left safe zone */}
      <div style={{
        position: "absolute",
        top: SAFE_TOP + 10,
        left: SAFE_SIDES + 10,
        fontFamily: inter,
        fontSize: 28,
        fontWeight: 600,
        color: "rgba(255,255,255,0.6)",
        letterSpacing: 3,
        textTransform: "uppercase",
      }}>
        {storeName}
      </div>

      {/* Progress dots — inside bottom safe zone */}
      <div style={{
        position: "absolute",
        bottom: SAFE_BOTTOM + 15,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}>
        {Array.from({ length: total }).map((_, di) => (
          <div
            key={di}
            style={{
              width:  di === index ? 10 : 6,
              height: di === index ? 10 : 6,
              borderRadius: "50%",
              background: di === index ? accentColor : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>

    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ══════════════════════════════════════════════════════════════════════════
export const EbayProductVideo: React.FC<EbayProductVideoProps> = ({
  storeName, platform, title, price, condition, brand, size,
  imageUrls, audioFile, hook, ctaText, accentColor, bgColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const allImages = imageUrls.filter(Boolean);
  const FRAMES_PER_IMAGE = Math.floor(210 / allImages.length);
  const lastImage  = allImages[allImages.length - 1];
  const firstImage = allImages[0];

  // ── SCENE 1: Hook animations ──────────────────────────────────────────
  const hookScale = spring({
    frame,
    fps,
    from: 4.0,
    to: 1.0,
    config: { damping: 10, stiffness: 200 },
  });

  // ── SCENE 3: Price ─────────────────────────────────────────────────────
  const shakeX =
    frame >= 310 && frame <= 322
      ? Math.sin(frame * 2.8) * interpolate(frame, [310, 322], [10, 0])
      : 0;

  const priceProgress = spring({
    frame: frame - 275,
    fps,
    config: { damping: 80, stiffness: 100 },
  });
  const displayPrice = interpolate(priceProgress, [0, 1], [0, price]);

  const badgeProgress = spring({
    frame: frame - 285,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const badgeY = interpolate(badgeProgress, [0, 1], [200, 0]);

  // ── SCENE 4: Details ───────────────────────────────────────────────────
  const makeBadgeX = (delay: number) => {
    const s = spring({
      frame: frame - (335 + delay),
      fps,
      config: { damping: 14, stiffness: 180 },
    });
    return interpolate(s, [0, 1], [400, 0]);
  };

  const detailBadges = [
    { label: brand || "Brand", color: accentColor, textColor: "#000", delay: 0 },
    { label: size ? `Size ${size}` : condition, color: "#FFFFFF", textColor: "#000", delay: 12 },
    { label: condition, color: condition.toLowerCase().includes("excellent") || condition.toLowerCase().includes("like new") ? "#00C851" : condition.toLowerCase().includes("good") ? "#FFD700" : "#FF8C00", textColor: "#000", delay: 24 },
  ].filter((b) => b.label);

  const midBrandOpacity = interpolate(
    frame, [355, 365, 375, 385], [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // ── SCENE 5: CTA ───────────────────────────────────────────────────────
  const nameScale = spring({
    frame: frame - 393,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const ctaProgress = spring({
    frame: frame - 405,
    fps,
    config: { damping: 14, stiffness: 160 },
  });
  const ctaSlide = interpolate(ctaProgress, [0, 1], [100, 0]);
  const bouncingArrow = Math.sin(frame * 0.25) * 18;
  const pulseBorder = Math.sin(frame * 0.2) * 0.5 + 0.5;
  const fadeOut = interpolate(frame, [440, 450], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: inter, overflow: "hidden" }}>

      {/* ── AUDIO: volume duck during gallery captions ── */}
      <Audio
        src={staticFile(audioFile)}
        volume={(f) =>
          interpolate(
            f,
            [0, 20, GALLERY_START * fps, (GALLERY_START + 10) * fps, PRICE_START * fps, (PRICE_START + 10) * fps],
            [0.65, 0.65, 0.2, 0.2, 0.65, 0.65],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
        loop
      />

      {/* ════════════════════════════════════════════════════════════
          SCENE 1 — HOOK (frames 0–60)
          Pure bgColor background — NO product image
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={HOOK_START} durationInFrames={60} premountFor={5}>
        <AbsoluteFill
          style={{
            backgroundColor: bgColor,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Radial glow */}
          <div style={{
            position: "absolute",
            width: 600, height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)`,
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
          }} />

          {/* Hook text — Bebas Neue 120px, springs from 4x */}
          <div style={{
            fontFamily: bebas,
            fontSize: 120,
            color: "#FFFFFF",
            letterSpacing: 4,
            textAlign: "center",
            paddingLeft: SAFE_SIDES,
            paddingRight: SAFE_SIDES,
            transform: `scale(${hookScale})`,
            lineHeight: 1.1,
            textShadow: `0 0 40px ${accentColor}`,
          }}>
            {hook}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════
          SCENE 2 — GALLERY (frames 60–270)
          All images cycle with Ken Burns + light leaks
      ════════════════════════════════════════════════════════════ */}
      {allImages.map((url, i) => (
        <Sequence
          key={i}
          from={GALLERY_START + i * FRAMES_PER_IMAGE}
          durationInFrames={FRAMES_PER_IMAGE + 15}
          premountFor={15}
        >
          <ImageSlide
            src={url}
            index={i}
            total={allImages.length}
            framesPerImage={FRAMES_PER_IMAGE}
            accentColor={accentColor}
            storeName={storeName}
          />
        </Sequence>
      ))}

      {/* Light leaks at every image transition */}
      {allImages.slice(1).map((_, i) => (
        <Sequence
          key={`leak-${i}`}
          from={GALLERY_START + (i + 1) * FRAMES_PER_IMAGE - 8}
          durationInFrames={18}
          premountFor={5}
        >
          <AbsoluteFill>
            <LightLeak durationInFrames={18} seed={i + 1} hueShift={i * 60} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* ════════════════════════════════════════════════════════════
          SCENE 3 — PRICE REVEAL (frames 270–330)
          Last gallery image stays as background
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={PRICE_START} durationInFrames={60} premountFor={10}>
        <AbsoluteFill style={{ transform: `translateX(${shakeX}px)` }}>

          {/* Background — last gallery image */}
          <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

          {/* Dark overlay */}
          <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />

          {/* Price card — glassmorphism */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 24,
              padding: "40px 60px",
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: inter, fontSize: 28,
                color: "rgba(255,255,255,0.7)", marginBottom: 8,
              }}>
                Only
              </div>
              <div style={{
                fontFamily: bebas,
                fontSize: 112,
                color: accentColor,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                textShadow: `0 0 60px ${accentColor}88`,
              }}>
                ${displayPrice.toFixed(2)}
              </div>
            </div>
          </AbsoluteFill>

          {/* 20 particle burst */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const pf = useCurrentFrame();
              const dist = interpolate(pf, [0, 30], [0, 220], { extrapolateRight: "clamp" });
              const pOp = interpolate(pf, [0, 15, 30], [0, 1, 0], { extrapolateRight: "clamp" });
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 10, height: 10,
                    borderRadius: "50%",
                    background: accentColor,
                    opacity: pOp,
                    transform: `translate(${Math.cos(angle) * dist - 5}px, ${Math.sin(angle) * dist - 5}px)`,
                  }}
                />
              );
            })}
          </AbsoluteFill>

          {/* Condition badge springs up */}
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: SAFE_BOTTOM + 50 }}>
            <div style={{
              transform: `translateY(${badgeY}px)`,
              background: accentColor,
              borderRadius: 100,
              padding: "12px 32px",
              fontFamily: inter,
              fontSize: 32, fontWeight: 700,
              color: "#000",
            }}>
              {condition}
            </div>
          </AbsoluteFill>

        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════
          SCENE 4 — DETAILS (frames 330–390)
          Badges stagger in from right with spring
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={DETAILS_START} durationInFrames={60} premountFor={10}>
        <AbsoluteFill>

          {/* Background image */}
          <Img
            src={allImages[Math.max(0, allImages.length - 2)]}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.65)" }} />

          {/* Badge stack */}
          <AbsoluteFill style={{
            paddingLeft: SAFE_SIDES,
            paddingRight: SAFE_SIDES,
            paddingTop: SAFE_TOP,
            paddingBottom: SAFE_BOTTOM,
            justifyContent: "center",
            alignItems: "flex-start",
            flexDirection: "column",
            gap: 20,
          }}>
            {detailBadges.map(({ label, color, textColor, delay }, i) => (
              <div
                key={i}
                style={{
                  transform: `translateX(${makeBadgeX(delay)}px) rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                  background: color,
                  color: textColor,
                  borderRadius: 100,
                  padding: "14px 36px",
                  fontFamily: inter,
                  fontSize: 36, fontWeight: 700,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
                }}
              >
                {label}
              </div>
            ))}
          </AbsoluteFill>

          {/* Mid-brand emphasis — frame 360 */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{
              fontFamily: bebas,
              fontSize: 72,
              color: "#fff",
              opacity: midBrandOpacity,
              letterSpacing: 4,
              textShadow: `0 0 30px ${accentColor}`,
            }}>
              {storeName}
            </div>
          </AbsoluteFill>

        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════
          SCENE 5 — CTA (frames 390–450)
          Product image BG, store name LARGE, bouncing arrow,
          pulsing border, fades out last 10 frames
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={CTA_START} durationInFrames={60} premountFor={10}>
        <AbsoluteFill style={{ opacity: fadeOut }}>

          {/* Background — first product image */}
          <Img src={firstImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

          {/* Dark vignette overlay */}
          <AbsoluteFill style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.88) 100%)",
          }} />

          {/* Pulsing border */}
          <AbsoluteFill style={{
            boxShadow: `inset 0 0 0 4px ${accentColor}`,
            opacity: pulseBorder,
            pointerEvents: "none",
          }} />

          {/* Content — safe zones enforced */}
          <AbsoluteFill style={{
            paddingTop: SAFE_TOP,
            paddingBottom: SAFE_BOTTOM,
            paddingLeft: SAFE_SIDES,
            paddingRight: SAFE_SIDES,
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 16,
          }}>

            {/* Store name — largest text in video, Bebas Neue 104px */}
            <div style={{
              fontFamily: bebas,
              fontSize: 104,
              color: "#FFFFFF",
              letterSpacing: 6,
              textAlign: "center",
              transform: `scale(${nameScale})`,
              textShadow: `0 0 40px ${accentColor}, 0 4px 20px rgba(0,0,0,0.9)`,
              lineHeight: 1,
            }}>
              {storeName}
            </div>

            {/* CTA text — platform-specific */}
            <div style={{
              fontFamily: bebas,
              fontSize: 56,
              color: accentColor,
              letterSpacing: 3,
              textAlign: "center",
              transform: `translateY(${ctaSlide}px)`,
              textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            }}>
              {ctaText}
            </div>

            {/* Bouncing arrow */}
            <div style={{
              fontSize: 64,
              transform: `translateY(${bouncingArrow}px)`,
              color: accentColor,
              marginTop: 8,
            }}>
              ↓
            </div>

          </AbsoluteFill>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
